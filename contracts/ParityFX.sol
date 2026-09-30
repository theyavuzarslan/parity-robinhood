// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ParityFX
 * @notice Two-sided margined FX forward market on Arc using USDC.
 * Forward price = S × (1 + r_quote × t/360) / (1 + r_base × t/360)  (Covered Interest Parity)
 *
 * Ported from the Soroban/Stellar implementation at nurkardelens/parity-stellar.
 * Uses 7-decimal fixed-point arithmetic (1e7 = 1.0), matching the original.
 *
 * Key parameters (set at construction):
 *   marginPct       – initial margin in bps, e.g. 500 = 5%
 *   maintMarginPct  – maintenance margin in bps, e.g. 250 = 2.5%
 *   openFeeBps      – open fee in bps, e.g. 2 = 0.02%
 *   partialLiqPct   – partial liquidation in bps, e.g. 3000 = 30%
 */
contract ParityFX is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant DECIMALS   = 1e7;   // 7 decimal places
    uint256 public constant DAY_BASIS  = 360;
    uint256 public constant BPS_SCALE  = 10_000;

    // ── Config ───────────────────────────────────────────────────────────────
    IERC20  public immutable usdc;
    uint256 public immutable marginPct;      // bps, e.g. 500 = 5%
    uint256 public immutable maintMarginPct; // bps, e.g. 250 = 2.5%
    uint256 public immutable openFeeBps;     // bps, e.g. 2
    uint256 public immutable partialLiqPct;  // bps, e.g. 3000 = 30%

    // ── Oracle & rates ───────────────────────────────────────────────────────
    // All prices/rates in 7-decimal fixed-point.
    // Spot history: keeps last 3 prints for 3-print liquidation price (median).
    int256  public spotPrice;
    int256[3] private _spotHistory;
    uint8   private _spotHistoryLen;

    // Governance rates: currency symbol hash => rate (7 dec)
    // e.g. keccak256("MXN"), keccak256("USD")
    mapping(bytes32 => int256) public rates;

    // Demo time override (0 = use block.timestamp)
    uint256 public demoTime;

    // ── Eligibility allowlist ─────────────────────────────────────────────────
    mapping(address => bool) public eligible;

    // ── Enums ────────────────────────────────────────────────────────────────
    enum Direction     { SellBase, BuyBase }
    enum RequestStatus { Open, Filled, Cancelled }
    enum QuoteStatus   { Live, Cancelled, Accepted, Expired }
    enum SideState     { Safe, Called, Liquidated }
    enum PositionStatus{ Active, Settled, Liquidated }

    // ── Structs ───────────────────────────────────────────────────────────────
    struct Request {
        uint256 id;
        address hedger;
        bytes32 pairBase;      // keccak256("USD")
        bytes32 pairQuote;     // keccak256("MXN")
        Direction direction;
        int256  notional;      // 7 dec
        uint32  tenorDays;
        int256  parityForward; // computed at post time, 7 dec
        RequestStatus status;
        uint256 createdAt;
        uint256 quoteCount;
    }

    struct Quote {
        uint256 id;
        uint256 requestId;
        address maker;
        int256  spreadBps;
        int256  lockedForward; // 7 dec
        uint256 expiry;        // unix timestamp
        QuoteStatus status;
    }

    struct Position {
        uint256 id;
        address hedger;
        address maker;
        bytes32 pairBase;
        bytes32 pairQuote;
        Direction direction;
        int256  notional;      // 7 dec
        int256  lockedForward; // 7 dec
        uint32  tenorDays;
        uint256 openTime;
        uint256 maturityTime;
        int256  hedgerMargin;  // 7 dec (USDC in 7-dec view, NOT ERC-20 6-dec)
        int256  makerMargin;
        SideState hedgerState;
        SideState makerState;
        PositionStatus status;
        int256  lastMarkValue;
        uint256 lastMarkTime;
    }

    // ── Storage ───────────────────────────────────────────────────────────────
    uint256 public nextRequestId;
    uint256 public nextPositionId;
    int256  public insuranceBalance; // 7-dec units

    mapping(uint256 => Request)  public requests;
    mapping(bytes32 => Quote)    internal _quotes;   // key = keccak256(requestId, quoteId)
    mapping(uint256 => Position) public positions;
    uint256[] public openRequestIds;

    // ── Events ────────────────────────────────────────────────────────────────
    event RequestPosted(uint256 indexed requestId, int256 parityForward);
    event QuoteSubmitted(uint256 indexed requestId, uint256 indexed quoteId, int256 spreadBps);
    event QuoteCancelled(uint256 indexed requestId, uint256 indexed quoteId);
    event PositionOpened(uint256 indexed positionId, int256 lockedForward);
    event MarginCall(uint256 indexed positionId, string side, int256 loss);
    event TopUp(uint256 indexed positionId, string side, int256 amount);
    event Liquidation(uint256 indexed positionId, string side, int256 amount, bool isPartial);
    event Settlement(uint256 indexed positionId, int256 hedgerPayout, int256 makerPayout);
    event SpotSet(int256 price);
    event RateSet(bytes32 indexed currency, int256 rate);
    event EligibleAdded(address indexed account);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address _usdc,
        uint256 _marginPct,
        uint256 _maintMarginPct,
        uint256 _openFeeBps,
        uint256 _partialLiqPct,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_usdc != address(0), "zero usdc");
        require(_marginPct > 0 && _marginPct <= BPS_SCALE, "bad marginPct");
        require(_maintMarginPct < _marginPct, "maint >= margin");
        usdc            = IERC20(_usdc);
        marginPct       = _marginPct;
        maintMarginPct  = _maintMarginPct;
        openFeeBps      = _openFeeBps;
        partialLiqPct   = _partialLiqPct;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyEligible() {
        require(eligible[msg.sender], "not eligible");
        _;
    }

    // ── Internal time ─────────────────────────────────────────────────────────
    function _now() internal view returns (uint256) {
        return demoTime != 0 ? demoTime : block.timestamp;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setSpotPrice(int256 price) external onlyOwner {
        require(price > 0, "price must be positive");
        // Rotate history (last 3 prints)
        if (_spotHistoryLen < 3) {
            _spotHistory[_spotHistoryLen] = price;
            _spotHistoryLen++;
        } else {
            _spotHistory[0] = _spotHistory[1];
            _spotHistory[1] = _spotHistory[2];
            _spotHistory[2] = price;
        }
        spotPrice = price;
        emit SpotSet(price);
    }

    function setRate(bytes32 currency, int256 rate) external onlyOwner {
        require(rate >= 0, "rate must be non-negative");
        rates[currency] = rate;
        emit RateSet(currency, rate);
    }

    function setDemoTime(uint256 ts) external onlyOwner {
        demoTime = ts;
    }

    function addEligible(address account) external onlyOwner {
        eligible[account] = true;
        emit EligibleAdded(account);
    }

    // ── Arithmetic ────────────────────────────────────────────────────────────

    /**
     * @notice F = S × (1 + r_quote × t/360) / (1 + r_base × t/360)
     * All values 7-decimal fixed-point.
     */
    function computeForward(
        int256 spot,
        int256 rateBase,
        int256 rateQuote,
        uint32 tenorDays
    ) public pure returns (int256) {
        int256 t    = int256(uint256(tenorDays));
        int256 d    = int256(DECIMALS);
        int256 db   = int256(DAY_BASIS);
        int256 num  = d * db + rateQuote * t;  // (DECIMALS*360 + r_quote*t)
        int256 den  = d * db + rateBase  * t;  // (DECIMALS*360 + r_base *t)
        require(den > 0, "zero denominator");
        return spot * num / den;
    }

    /**
     * @notice Position value from hedger's perspective (7-dec USDC units).
     * SellBase: value = (locked - current) * notional / spot
     * BuyBase:  value = (current - locked) * notional / spot
     */
    function valuePosition(
        int256 lockedForward,
        int256 currentForward,
        int256 notional,
        int256 spot,
        Direction direction
    ) public pure returns (int256) {
        int256 diff = direction == Direction.SellBase
            ? lockedForward - currentForward
            : currentForward - lockedForward;
        return diff * notional / spot;
    }

    /// @dev Convert 7-dec internal units to 6-dec USDC token units (round down)
    function _toUsdc(int256 amount7dec) internal pure returns (uint256) {
        require(amount7dec >= 0, "negative payout");
        return uint256(amount7dec) / 10;  // 1e7 / 10 = 1e6
    }

    /// @dev Convert 6-dec USDC token units to 7-dec internal units
    function _from6dec(uint256 amount) internal pure returns (int256) {
        return int256(amount * 10);  // 1e6 * 10 = 1e7
    }

    function _initialMargin(int256 notional) internal view returns (int256) {
        return notional * int256(marginPct) / int256(BPS_SCALE);
    }

    function _maintMargin(int256 notional) internal view returns (int256) {
        return notional * int256(maintMarginPct) / int256(BPS_SCALE);
    }

    function _openFee(int256 notional) internal view returns (int256) {
        return notional * int256(openFeeBps) / int256(BPS_SCALE);
    }

    function _applySpread(int256 forward, int256 spreadBps) internal pure returns (int256) {
        return forward + forward * spreadBps / int256(BPS_SCALE);
    }

    /// @dev Median of last N prints (up to 3). Returns spotPrice if history is empty.
    function _liquidationPrice() internal view returns (int256) {
        if (_spotHistoryLen == 0) return spotPrice;
        if (_spotHistoryLen == 1) return _spotHistory[0];
        if (_spotHistoryLen == 2) {
            // median of 2 = lower
            return _spotHistory[0] < _spotHistory[1] ? _spotHistory[0] : _spotHistory[1];
        }
        // median of 3
        int256 a = _spotHistory[0];
        int256 b = _spotHistory[1];
        int256 c = _spotHistory[2];
        if ((a <= b && b <= c) || (c <= b && b <= a)) return b;
        if ((b <= a && a <= c) || (c <= a && a <= b)) return a;
        return c;
    }

    function _quoteKey(uint256 requestId, uint256 quoteId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(requestId, quoteId));
    }

    // ── RFQ ──────────────────────────────────────────────────────────────────

    /**
     * @notice Hedger posts a request for quote.
     * @param pairBase  keccak256 of the base currency symbol, e.g. keccak256("USD")
     * @param pairQuote keccak256 of the quote currency symbol, e.g. keccak256("MXN")
     */
    function postRequest(
        bytes32 pairBase,
        bytes32 pairQuote,
        Direction direction,
        int256  notional,
        uint32  tenorDays
    ) external onlyEligible returns (uint256) {
        require(notional > 0, "notional must be positive");
        require(tenorDays > 0, "tenor must be positive");
        require(spotPrice > 0, "spot not set");

        int256 rBase  = rates[pairBase];
        int256 rQuote = rates[pairQuote];
        int256 fwd    = computeForward(spotPrice, rBase, rQuote, tenorDays);

        uint256 id = nextRequestId++;
        requests[id] = Request({
            id:            id,
            hedger:        msg.sender,
            pairBase:      pairBase,
            pairQuote:     pairQuote,
            direction:     direction,
            notional:      notional,
            tenorDays:     tenorDays,
            parityForward: fwd,
            status:        RequestStatus.Open,
            createdAt:     _now(),
            quoteCount:    0
        });
        openRequestIds.push(id);
        emit RequestPosted(id, fwd);
        return id;
    }

    /**
     * @notice Maker submits a quote. Maker's margin is reserved in this call.
     * @param spreadBps spread over parity forward, in bps
     */
    function submitQuote(
        uint256 requestId,
        int256  spreadBps,
        uint256 expiry
    ) external onlyEligible nonReentrant returns (uint256) {
        Request storage req = requests[requestId];
        require(req.status == RequestStatus.Open, "request not open");

        int256 lockedFwd    = _applySpread(req.parityForward, spreadBps);
        int256 initMargin7  = _initialMargin(req.notional);
        uint256 marginUsdc  = _toUsdc(initMargin7);

        // Reserve maker's margin
        usdc.safeTransferFrom(msg.sender, address(this), marginUsdc);

        uint256 qid = req.quoteCount;
        _quotes[_quoteKey(requestId, qid)] = Quote({
            id:            qid,
            requestId:     requestId,
            maker:         msg.sender,
            spreadBps:     spreadBps,
            lockedForward: lockedFwd,
            expiry:        expiry,
            status:        QuoteStatus.Live
        });
        req.quoteCount = qid + 1;

        emit QuoteSubmitted(requestId, qid, spreadBps);
        return qid;
    }

    /**
     * @notice Maker cancels a live quote. Reserved margin is returned.
     */
    function cancelQuote(uint256 requestId, uint256 quoteId) external nonReentrant {
        Request storage req = requests[requestId];
        bytes32 key  = _quoteKey(requestId, quoteId);
        Quote storage q = _quotes[key];
        require(q.status == QuoteStatus.Live, "quote not live");
        require(q.maker  == msg.sender,       "not quote maker");

        uint256 marginUsdc = _toUsdc(_initialMargin(req.notional));
        q.status = QuoteStatus.Cancelled;
        usdc.safeTransfer(msg.sender, marginUsdc);
        emit QuoteCancelled(requestId, quoteId);
    }

    /**
     * @notice Hedger accepts a quote — opens position, reserves hedger margin.
     * Maker's margin was already reserved at submitQuote.
     */
    function acceptQuote(
        uint256 requestId,
        uint256 quoteId
    ) external onlyEligible nonReentrant returns (uint256) {
        Request storage req = requests[requestId];
        require(req.status   == RequestStatus.Open, "request not open");
        require(req.hedger   == msg.sender,          "not request hedger");

        bytes32 key = _quoteKey(requestId, quoteId);
        Quote storage q = _quotes[key];
        require(q.status == QuoteStatus.Live, "quote not live");

        uint256 nowTs = _now();
        if (q.expiry > 0 && nowTs > q.expiry) {
            q.status = QuoteStatus.Expired;
            revert("quote expired");
        }

        int256  initMargin7 = _initialMargin(req.notional);
        int256  fee7        = _openFee(req.notional);
        uint256 hedgerUsdc  = _toUsdc(initMargin7 + fee7);

        // Take hedger margin + fee
        usdc.safeTransferFrom(msg.sender, address(this), hedgerUsdc);

        // Fee → insurance fund
        insuranceBalance += fee7;

        // Open position
        uint256 maturity = nowTs + uint256(req.tenorDays) * 1 days;
        uint256 posId    = nextPositionId++;

        positions[posId] = Position({
            id:            posId,
            hedger:        msg.sender,
            maker:         q.maker,
            pairBase:      req.pairBase,
            pairQuote:     req.pairQuote,
            direction:     req.direction,
            notional:      req.notional,
            lockedForward: q.lockedForward,
            tenorDays:     req.tenorDays,
            openTime:      nowTs,
            maturityTime:  maturity,
            hedgerMargin:  initMargin7,
            makerMargin:   initMargin7,
            hedgerState:   SideState.Safe,
            makerState:    SideState.Safe,
            status:        PositionStatus.Active,
            lastMarkValue: 0,
            lastMarkTime:  nowTs
        });

        q.status   = QuoteStatus.Accepted;
        req.status = RequestStatus.Filled;

        // Remove from open requests list
        _removeOpenRequest(requestId);

        emit PositionOpened(posId, q.lockedForward);
        return posId;
    }

    // ── Mark-to-Market & Margin ───────────────────────────────────────────────

    /**
     * @notice Anyone can call. Recomputes current forward and updates side states.
     */
    function markPosition(uint256 positionId) external returns (int256 value) {
        Position storage pos = positions[positionId];
        require(pos.status == PositionStatus.Active, "position not active");

        uint256 nowTs   = _now();
        int256  rBase   = rates[pos.pairBase];
        int256  rQuote  = rates[pos.pairQuote];

        uint256 remainSec  = pos.maturityTime > nowTs ? pos.maturityTime - nowTs : 0;
        uint32  remainDays = uint32(remainSec / 1 days);

        int256 curFwd = remainDays > 0
            ? computeForward(spotPrice, rBase, rQuote, remainDays)
            : spotPrice;

        value = valuePosition(pos.lockedForward, curFwd, pos.notional, spotPrice, pos.direction);

        int256 initMargin = _initialMargin(pos.notional);
        int256 maintThres = _maintMargin(pos.notional);

        int256 hedgerLoss = value < 0 ? -value : int256(0);
        int256 makerLoss  = value > 0 ?  value : int256(0);

        // Update hedger state
        if (hedgerLoss >= initMargin) {
            if (pos.hedgerState != SideState.Liquidated) {
                pos.hedgerState = SideState.Liquidated;
                emit MarginCall(positionId, "hedger", hedgerLoss);
            }
        } else if (hedgerLoss >= maintThres) {
            if (pos.hedgerState == SideState.Safe) {
                pos.hedgerState = SideState.Called;
                emit MarginCall(positionId, "hedger", hedgerLoss);
            }
        } else {
            pos.hedgerState = SideState.Safe;
        }

        // Update maker state
        if (makerLoss >= initMargin) {
            if (pos.makerState != SideState.Liquidated) {
                pos.makerState = SideState.Liquidated;
                emit MarginCall(positionId, "maker", makerLoss);
            }
        } else if (makerLoss >= maintThres) {
            if (pos.makerState == SideState.Safe) {
                pos.makerState = SideState.Called;
                emit MarginCall(positionId, "maker", makerLoss);
            }
        } else {
            pos.makerState = SideState.Safe;
        }

        pos.lastMarkValue = value;
        pos.lastMarkTime  = nowTs;
    }

    /**
     * @notice Position party tops up their own margin.
     */
    function topUpMargin(uint256 positionId, uint256 usdcAmount) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.status == PositionStatus.Active, "position not active");
        require(msg.sender == pos.hedger || msg.sender == pos.maker, "not a party");

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        int256 amount7 = _from6dec(usdcAmount);

        if (msg.sender == pos.hedger) {
            pos.hedgerMargin += amount7;
            pos.hedgerState   = SideState.Safe;
            emit TopUp(positionId, "hedger", amount7);
        } else {
            pos.makerMargin  += amount7;
            pos.makerState    = SideState.Safe;
            emit TopUp(positionId, "maker", amount7);
        }
    }

    /**
     * @notice Anyone can call when conditions are met. Partial 30% on first breach, full thereafter.
     */
    function liquidate(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.status == PositionStatus.Active, "position not active");

        int256 liqSpot  = _liquidationPrice();
        int256 rBase    = rates[pos.pairBase];
        int256 rQuote   = rates[pos.pairQuote];

        uint256 nowTs  = _now();
        uint256 remSec = pos.maturityTime > nowTs ? pos.maturityTime - nowTs : 0;
        uint32 remDays = uint32(remSec / 1 days);

        int256 curFwd = remDays > 0
            ? computeForward(liqSpot, rBase, rQuote, remDays)
            : liqSpot;

        int256 value      = valuePosition(pos.lockedForward, curFwd, pos.notional, liqSpot, pos.direction);
        int256 initMargin = _initialMargin(pos.notional);

        int256 hedgerLoss = value < 0 ? -value : int256(0);
        int256 makerLoss  = value > 0 ?  value : int256(0);

        if (hedgerLoss >= initMargin) {
            _liquidateSide(pos, positionId, true);
        } else if (makerLoss >= initMargin) {
            _liquidateSide(pos, positionId, false);
        } else {
            revert("liquidation conditions not met");
        }
    }

    function _liquidateSide(Position storage pos, uint256 posId, bool isHedger) internal {
        bool isPartialLiq = isHedger
            ? pos.hedgerState != SideState.Liquidated
            : pos.makerState  != SideState.Liquidated;

        int256 liqAmount = isPartialLiq
            ? pos.notional * int256(partialLiqPct) / int256(BPS_SCALE)
            : pos.notional;

        // 1% of liquidated notional → insurance fund
        int256 penalty = liqAmount / 100;

        int256 marginAvail = isHedger ? pos.hedgerMargin : pos.makerMargin;
        address winner     = isHedger ? pos.maker        : pos.hedger;

        int256 actualPenalty = marginAvail < penalty ? marginAvail : penalty;
        int256 payout        = marginAvail - actualPenalty;

        if (payout > 0) {
            usdc.safeTransfer(winner, _toUsdc(payout));
        }
        if (actualPenalty > 0) {
            insuranceBalance += actualPenalty;
        }

        if (isHedger) {
            pos.hedgerMargin = 0;
            if (isPartialLiq) {
                pos.notional    -= liqAmount;
                pos.hedgerState  = SideState.Liquidated;
            } else {
                pos.status = PositionStatus.Liquidated;
            }
        } else {
            pos.makerMargin = 0;
            if (isPartialLiq) {
                pos.notional   -= liqAmount;
                pos.makerState  = SideState.Liquidated;
            } else {
                pos.status = PositionStatus.Liquidated;
            }
        }

        emit Liquidation(posId, isHedger ? "hedger" : "maker", liqAmount, isPartialLiq);
    }

    // ── Settlement ────────────────────────────────────────────────────────────

    /**
     * @notice Cash settlement at maturity. Waterfall: loser's margin → insurance → haircut.
     */
    function settle(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.status     == PositionStatus.Active, "position not active");
        require(_now()         >= pos.maturityTime,      "not mature");

        // At maturity, forward converges to spot
        int256 value = valuePosition(pos.lockedForward, spotPrice, pos.notional, spotPrice, pos.direction);

        int256 hedgerPayout;
        int256 makerPayout;
        int256 insuranceUsed;

        if (value >= 0) {
            // Hedger gains
            int256 hedgerGain = value;
            if (hedgerGain <= pos.makerMargin) {
                hedgerPayout = pos.hedgerMargin + hedgerGain;
                makerPayout  = pos.makerMargin  - hedgerGain;
            } else {
                int256 shortfall = hedgerGain - pos.makerMargin;
                int256 covered   = _coverInsurance(shortfall);
                insuranceUsed    = covered;
                int256 remaining = shortfall - covered;
                if (remaining > 0) {
                    // Haircut: winner gets what's available
                    hedgerPayout = pos.hedgerMargin + pos.makerMargin + covered;
                    makerPayout  = 0;
                } else {
                    hedgerPayout = pos.hedgerMargin + hedgerGain;
                    makerPayout  = 0;
                }
            }
        } else {
            // Maker gains
            int256 makerGain = -value;
            if (makerGain <= pos.hedgerMargin) {
                hedgerPayout = pos.hedgerMargin - makerGain;
                makerPayout  = pos.makerMargin  + makerGain;
            } else {
                int256 shortfall = makerGain - pos.hedgerMargin;
                int256 covered   = _coverInsurance(shortfall);
                insuranceUsed    = covered;
                int256 remaining = shortfall - covered;
                if (remaining > 0) {
                    makerPayout  = pos.makerMargin + pos.hedgerMargin + covered;
                    hedgerPayout = 0;
                } else {
                    makerPayout  = pos.makerMargin + makerGain;
                    hedgerPayout = 0;
                }
            }
        }

        if (hedgerPayout > 0) usdc.safeTransfer(pos.hedger, _toUsdc(hedgerPayout));
        if (makerPayout  > 0) usdc.safeTransfer(pos.maker,  _toUsdc(makerPayout));

        pos.status        = PositionStatus.Settled;
        pos.hedgerMargin  = 0;
        pos.makerMargin   = 0;
        pos.lastMarkValue = value;
        pos.lastMarkTime  = _now();

        emit Settlement(positionId, hedgerPayout, makerPayout);
        insuranceUsed; // suppress unused-var warning
    }

    function _coverInsurance(int256 shortfall) internal returns (int256 covered) {
        if (insuranceBalance <= 0) return 0;
        covered = shortfall < insuranceBalance ? shortfall : insuranceBalance;
        insuranceBalance -= covered;
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getQuote(uint256 requestId, uint256 quoteId) external view returns (Quote memory) {
        return _quotes[_quoteKey(requestId, quoteId)];
    }

    function getOpenRequestIds() external view returns (uint256[] memory) {
        return openRequestIds;
    }

    function openRequestCount() external view returns (uint256) {
        return openRequestIds.length;
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    function _removeOpenRequest(uint256 requestId) internal {
        uint256 len = openRequestIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (openRequestIds[i] == requestId) {
                openRequestIds[i] = openRequestIds[len - 1];
                openRequestIds.pop();
                return;
            }
        }
    }
}
