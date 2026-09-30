// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPriceSource} from "./interfaces/IPriceSource.sol";
import {IRateSource} from "./interfaces/IRateSource.sol";

/// @title Parity
/// @notice A two-sided, margined forward market where the forward price is computed on-chain from
///         interest-rate parity instead of quoted by a dealer, and positions open through request for quote.
///
///         F = S x (1 + r_quote x t/360) / (1 + r_base x t/360)
///
///         Robinhood Stock Tokens are total-return tokens (dividends reinvest through the ERC-8056
///         multiplier, and the Chainlink feed prices the token including it), so for TSLA/USD the base
///         rate is 0 and the forward collapses to S x (1 + r_USD x t/360): cost of carry, read from chain.
///         The same engine prices fiat corridors such as USD/MXN with both legs live.
///
///         Lifecycle: post request -> makers quote a spread over the parity forward (margin reserved at
///         quote time) -> hedger accepts (opens in one transaction) -> mark to market -> margin call ->
///         partial then full liquidation -> cash settlement at maturity. Unfunded losses follow a fixed
///         waterfall: loser's margin, then the insurance fund, then a haircut on the winner's payout.
///
/// @dev All prices, rates and amounts are 7-decimal fixed point (1e7 = 1.0), wider intermediates,
///      multiply before divide. Margin token amounts are converted at the boundary.
///      Ported from the Soroban original (nurkardelens/parity-stellar) and reworked for Robinhood Chain.
contract Parity is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Constants ──────────────────────────────────────────────────────────
    int256 public constant DECIMALS = 1e7;
    int256 public constant DAY_BASIS = 360;
    int256 public constant BPS = 10_000;

    // ── Config ─────────────────────────────────────────────────────────────
    IERC20 public immutable marginToken;
    uint8 public immutable marginTokenDecimals;
    bool public immutable demoMode; // enables the admin time override; never true on a production deployment

    IPriceSource public priceSource;
    IRateSource public rateSource;

    struct Params {
        uint16 marginBps;     // initial margin, share of notional value. 500 = 5%
        uint16 callBps;       // loss that flags a margin call. 250 = 2.5% (half of initial)
        uint16 liqBps;        // loss that makes a side liquidatable. 375 = 3.75% (75% of initial)
        uint16 openFeeBps;    // fee on open, to the insurance fund. 2 = 0.02%
        uint16 partialLiqBps; // share of notional closed on the first breach. 3000 = 30%
        uint16 liqPenaltyBps; // penalty on liquidated notional value, to the insurance fund. 100 = 1%
    }

    Params public params;
    uint256 public demoTime; // demoMode only; 0 = use block.timestamp

    struct PairConfig {
        bool enabled;
        bool marginInQuote; // true: margin token is the quote currency (TSLA/USD). false: base (USD/MXN with USDC margin)
        address baseToken;  // informational: the Stock Token behind the base symbol, if any
    }

    mapping(bytes32 => PairConfig) public pairs;
    mapping(address => bool) public eligible;
    bool public openAccess;

    // ── Types ──────────────────────────────────────────────────────────────
    enum Direction { SellBase, BuyBase }
    enum RequestStatus { Open, Filled, Cancelled }
    enum QuoteStatus { Live, Cancelled, Accepted }
    enum SideState { Safe, Called, Breached }
    enum PositionStatus { Active, Settled, Liquidated }

    struct Request {
        uint256 id;
        address hedger;
        bytes32 base;
        bytes32 quote;
        Direction direction;
        int256 notional;      // base units, 7 dec
        uint32 tenorDays;
        int256 parityForward; // 7 dec, computed at post time
        int256 initialMargin; // margin units, 7 dec, per side
        RequestStatus status;
        uint256 createdAt;
    }

    struct Quote {
        uint256 id;
        uint256 requestId;
        address maker;
        int256 spreadBps;
        int256 lockedForward; // 7 dec
        uint256 expiry;       // 0 = none
        QuoteStatus status;
    }

    struct Position {
        uint256 id;
        address hedger;
        address maker;
        bytes32 base;
        bytes32 quote;
        Direction direction;
        int256 notional;       // base units, 7 dec (shrinks on partial liquidation)
        int256 notionalValue;  // margin units, 7 dec, at open spot (shrinks with notional)
        int256 lockedForward;
        uint32 tenorDays;
        uint256 openTime;
        uint256 maturityTime;
        int256 initialMargin;  // per side, margin units
        int256 callThreshold;
        int256 liqThreshold;
        int256 hedgerMargin;
        int256 makerMargin;
        SideState hedgerState;
        SideState makerState;
        bool hedgerPartialDone;
        bool makerPartialDone;
        PositionStatus status;
        int256 lastMarkValue;  // hedger's perspective; maker is the negative
        uint256 lastMarkTime;
    }

    // ── Storage ────────────────────────────────────────────────────────────
    uint256 public nextRequestId;
    uint256 public nextPositionId;
    int256 public insuranceBalance; // margin units, 7 dec

    mapping(uint256 => Request) internal _requests;
    mapping(uint256 => Quote[]) internal _quotes;
    mapping(uint256 => Position) internal _positions;
    uint256[] internal _openRequestIds;
    mapping(address => uint256[]) internal _positionsOf;

    // ── Events ─────────────────────────────────────────────────────────────
    event PairSet(bytes32 indexed pairId, bytes32 base, bytes32 quote, bool marginInQuote, address baseToken, bool enabled);
    event SourcesSet(address priceSource, address rateSource);
    event ParamsSet(Params params);
    event EligibilitySet(address indexed account, bool eligible);
    event OpenAccessSet(bool open);
    event DemoTimeSet(uint256 timestamp);
    event InsuranceSeeded(address indexed from, int256 amount);

    event RequestPosted(uint256 indexed requestId, address indexed hedger, bytes32 base, bytes32 quote, Direction direction, int256 notional, uint32 tenorDays, int256 parityForward, int256 initialMargin);
    event RequestCancelled(uint256 indexed requestId);
    event QuoteSubmitted(uint256 indexed requestId, uint256 indexed quoteId, address indexed maker, int256 spreadBps, int256 lockedForward, uint256 expiry);
    event QuoteCancelled(uint256 indexed requestId, uint256 indexed quoteId);
    event PositionOpened(uint256 indexed positionId, uint256 indexed requestId, uint256 quoteId, address hedger, address maker, int256 lockedForward, uint256 maturityTime);
    event Marked(uint256 indexed positionId, int256 value, SideState hedgerState, SideState makerState);
    event MarginCall(uint256 indexed positionId, bool hedgerSide, int256 loss);
    event Breach(uint256 indexed positionId, bool hedgerSide, int256 loss);
    event TopUp(uint256 indexed positionId, bool hedgerSide, int256 amount);
    event Liquidated(uint256 indexed positionId, bool hedgerSide, bool isPartial, int256 realizedLoss, int256 penalty, int256 remainingNotional);
    event BadDebt(uint256 indexed positionId, int256 insuranceUsed, int256 haircut);
    event Settled(uint256 indexed positionId, int256 value, int256 hedgerPayout, int256 makerPayout);

    // ── Errors ─────────────────────────────────────────────────────────────
    error NotEligible(address account);
    error PairDisabled(bytes32 pairId);
    error InvalidInput();
    error RequestNotOpen(uint256 requestId);
    error NotRequestHedger();
    error QuoteNotLive(uint256 requestId, uint256 quoteId);
    error QuoteExpired(uint256 requestId, uint256 quoteId);
    error NotQuoteMaker();
    error PositionNotActive(uint256 positionId);
    error NotPositionParty();
    error NotLiquidatable(uint256 positionId);
    error NotMature(uint256 positionId);
    error NotDemoMode();

    // ── Constructor ────────────────────────────────────────────────────────
    constructor(
        address marginToken_,
        address priceSource_,
        address rateSource_,
        Params memory params_,
        bool demoMode_,
        address owner_
    ) Ownable(owner_) {
        if (marginToken_ == address(0) || priceSource_ == address(0) || rateSource_ == address(0)) revert InvalidInput();
        marginToken = IERC20(marginToken_);
        marginTokenDecimals = IERC20Metadata(marginToken_).decimals();
        priceSource = IPriceSource(priceSource_);
        rateSource = IRateSource(rateSource_);
        demoMode = demoMode_;
        _setParams(params_);
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    function setPair(bytes32 base, bytes32 quote, bool marginInQuote, address baseToken, bool enabled) external onlyOwner {
        bytes32 id = pairId(base, quote);
        pairs[id] = PairConfig({enabled: enabled, marginInQuote: marginInQuote, baseToken: baseToken});
        emit PairSet(id, base, quote, marginInQuote, baseToken, enabled);
    }

    function setSources(address priceSource_, address rateSource_) external onlyOwner {
        if (priceSource_ == address(0) || rateSource_ == address(0)) revert InvalidInput();
        priceSource = IPriceSource(priceSource_);
        rateSource = IRateSource(rateSource_);
        emit SourcesSet(priceSource_, rateSource_);
    }

    function setParams(Params calldata p) external onlyOwner {
        _setParams(p);
    }

    function setEligible(address account, bool isEligible) external onlyOwner {
        eligible[account] = isEligible;
        emit EligibilitySet(account, isEligible);
    }

    function setOpenAccess(bool open) external onlyOwner {
        openAccess = open;
        emit OpenAccessSet(open);
    }

    /// @notice Demo only: a 90-day contract does not fit a four-minute demo. Compiled out of production
    ///         deployments by the immutable `demoMode` flag.
    function setDemoTime(uint256 timestamp) external onlyOwner {
        if (!demoMode) revert NotDemoMode();
        demoTime = timestamp;
        emit DemoTimeSet(timestamp);
    }

    /// @notice Anyone can seed the insurance fund (e.g. a foundation grant); amount in margin token units.
    function seedInsurance(uint256 tokenAmount) external nonReentrant {
        marginToken.safeTransferFrom(msg.sender, address(this), tokenAmount);
        int256 amt = _fromToken(tokenAmount);
        insuranceBalance += amt;
        emit InsuranceSeeded(msg.sender, amt);
    }

    function _setParams(Params memory p) internal {
        if (p.marginBps == 0 || p.marginBps > 10_000 || p.callBps >= p.liqBps || p.liqBps > p.marginBps) revert InvalidInput();
        if (p.partialLiqBps == 0 || p.partialLiqBps >= 10_000) revert InvalidInput();
        params = p;
        emit ParamsSet(p);
    }

    // ── Pricing (pure) ─────────────────────────────────────────────────────

    /// @notice F = S x (1 + r_quote x t/360) / (1 + r_base x t/360), all 7 dec.
    function computeForward(int256 spot, int256 rateBase, int256 rateQuote, uint32 tenorDays) public pure returns (int256) {
        int256 t = int256(uint256(tenorDays));
        int256 num = DECIMALS * DAY_BASIS + rateQuote * t;
        int256 den = DECIMALS * DAY_BASIS + rateBase * t;
        if (den <= 0 || spot <= 0) revert InvalidInput();
        return spot * num / den;
    }

    /// @notice Position value from the hedger's perspective, in margin units (7 dec). The maker's value
    ///         is the negative, so the two sides always sum to zero.
    /// @param marginInQuote true when the margin token is the quote currency (value stays in quote units);
    ///        false when it is the base currency (quote value converted at spot).
    function valuePosition(
        int256 lockedForward,
        int256 currentForward,
        int256 notional,
        int256 spot,
        Direction direction,
        bool marginInQuote
    ) public pure returns (int256) {
        int256 diff = direction == Direction.SellBase ? lockedForward - currentForward : currentForward - lockedForward;
        if (marginInQuote) return diff * notional / DECIMALS;
        if (spot <= 0) revert InvalidInput();
        return diff * notional / spot;
    }

    function applySpread(int256 forward, int256 spreadBps) public pure returns (int256) {
        return forward + forward * spreadBps / BPS;
    }

    function pairId(bytes32 base, bytes32 quote) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(base, quote));
    }

    // ── Views ──────────────────────────────────────────────────────────────

    /// @notice The parity forward for a pair and tenor from the live sources. This is the number that
    ///         moves when an on-chain rate moves.
    function previewForward(bytes32 base, bytes32 quote, uint32 tenorDays)
        external
        view
        returns (int256 forward, int256 spot, int256 rateBase, int256 rateQuote)
    {
        (spot,) = priceSource.spot(pairId(base, quote));
        rateBase = rateSource.rate(base);
        rateQuote = rateSource.rate(quote);
        forward = computeForward(spot, rateBase, rateQuote, tenorDays);
    }

    function getRequest(uint256 id) external view returns (Request memory) { return _requests[id]; }
    function getQuotes(uint256 requestId) external view returns (Quote[] memory) { return _quotes[requestId]; }
    function getQuote(uint256 requestId, uint256 quoteId) external view returns (Quote memory) { return _quotes[requestId][quoteId]; }
    function getPosition(uint256 id) external view returns (Position memory) { return _positions[id]; }
    function getOpenRequestIds() external view returns (uint256[] memory) { return _openRequestIds; }
    function positionsOf(address account) external view returns (uint256[] memory) { return _positionsOf[account]; }

    function currentTime() public view returns (uint256) {
        return (demoMode && demoTime != 0) ? demoTime : block.timestamp;
    }

    /// @notice Current mark of a position without writing state.
    function previewMark(uint256 positionId) external view returns (int256 value, int256 currentForward, int256 spot) {
        Position storage pos = _positions[positionId];
        (spot,) = priceSource.spot(pairId(pos.base, pos.quote));
        currentForward = _currentForward(pos, spot);
        value = valuePosition(pos.lockedForward, currentForward, pos.notional, spot, pos.direction, pairs[pairId(pos.base, pos.quote)].marginInQuote);
    }

    // ── RFQ ────────────────────────────────────────────────────────────────

    function postRequest(bytes32 base, bytes32 quote, Direction direction, int256 notional, uint32 tenorDays)
        external
        returns (uint256 id)
    {
        _requireEligible(msg.sender);
        bytes32 pid = pairId(base, quote);
        PairConfig memory pc = pairs[pid];
        if (!pc.enabled) revert PairDisabled(pid);
        if (notional <= 0 || tenorDays == 0) revert InvalidInput();

        (int256 spot,) = priceSource.spot(pid);
        int256 fwd = computeForward(spot, rateSource.rate(base), rateSource.rate(quote), tenorDays);
        int256 nv = _notionalValue(notional, spot, pc.marginInQuote);
        int256 im = nv * int256(uint256(params.marginBps)) / BPS;

        id = nextRequestId++;
        _requests[id] = Request({
            id: id,
            hedger: msg.sender,
            base: base,
            quote: quote,
            direction: direction,
            notional: notional,
            tenorDays: tenorDays,
            parityForward: fwd,
            initialMargin: im,
            status: RequestStatus.Open,
            createdAt: currentTime()
        });
        _openRequestIds.push(id);
        emit RequestPosted(id, msg.sender, base, quote, direction, notional, tenorDays, fwd, im);
    }

    function cancelRequest(uint256 requestId) external {
        Request storage req = _requests[requestId];
        if (req.status != RequestStatus.Open) revert RequestNotOpen(requestId);
        if (req.hedger != msg.sender) revert NotRequestHedger();
        req.status = RequestStatus.Cancelled;
        _removeOpenRequest(requestId);
        emit RequestCancelled(requestId);
    }

    /// @notice Maker quotes a spread (bps) over the parity forward. The maker's initial margin is
    ///         reserved here so that accept can open the position in one transaction without a second
    ///         approval from the maker. Cancel returns it.
    function submitQuote(uint256 requestId, int256 spreadBps, uint256 expiry) external nonReentrant returns (uint256 quoteId) {
        _requireEligible(msg.sender);
        Request storage req = _requests[requestId];
        if (req.status != RequestStatus.Open) revert RequestNotOpen(requestId);
        if (expiry != 0 && expiry <= currentTime()) revert InvalidInput();

        marginToken.safeTransferFrom(msg.sender, address(this), _toToken(req.initialMargin));

        quoteId = _quotes[requestId].length;
        int256 locked = applySpread(req.parityForward, spreadBps);
        _quotes[requestId].push(Quote({
            id: quoteId,
            requestId: requestId,
            maker: msg.sender,
            spreadBps: spreadBps,
            lockedForward: locked,
            expiry: expiry,
            status: QuoteStatus.Live
        }));
        emit QuoteSubmitted(requestId, quoteId, msg.sender, spreadBps, locked, expiry);
    }

    function cancelQuote(uint256 requestId, uint256 quoteId) external nonReentrant {
        Quote storage q = _quotes[requestId][quoteId];
        if (q.status != QuoteStatus.Live) revert QuoteNotLive(requestId, quoteId);
        if (q.maker != msg.sender) revert NotQuoteMaker();
        q.status = QuoteStatus.Cancelled;
        marginToken.safeTransfer(msg.sender, _toToken(_requests[requestId].initialMargin));
        emit QuoteCancelled(requestId, quoteId);
    }

    /// @notice Hedger accepts one quote: the position opens, the hedger's margin plus the open fee are
    ///         taken, and the request closes, all in this transaction. Expired, cancelled or already
    ///         accepted quotes are rejected.
    function acceptQuote(uint256 requestId, uint256 quoteId) external nonReentrant returns (uint256 positionId) {
        _requireEligible(msg.sender);
        Request storage req = _requests[requestId];
        if (req.status != RequestStatus.Open) revert RequestNotOpen(requestId);
        if (req.hedger != msg.sender) revert NotRequestHedger();
        Quote storage q = _quotes[requestId][quoteId];
        if (q.status != QuoteStatus.Live) revert QuoteNotLive(requestId, quoteId);
        uint256 nowTs = currentTime();
        if (q.expiry != 0 && nowTs > q.expiry) revert QuoteExpired(requestId, quoteId);

        bytes32 pid = pairId(req.base, req.quote);
        PairConfig memory pc = pairs[pid];
        (int256 spot,) = priceSource.spot(pid);
        int256 nv = _notionalValue(req.notional, spot, pc.marginInQuote);
        int256 fee = nv * int256(uint256(params.openFeeBps)) / BPS;

        marginToken.safeTransferFrom(msg.sender, address(this), _toToken(req.initialMargin + fee));
        insuranceBalance += fee;

        positionId = nextPositionId++;
        Position storage pos = _positions[positionId];
        pos.id = positionId;
        pos.hedger = msg.sender;
        pos.maker = q.maker;
        pos.base = req.base;
        pos.quote = req.quote;
        pos.direction = req.direction;
        pos.notional = req.notional;
        pos.notionalValue = nv;
        pos.lockedForward = q.lockedForward;
        pos.tenorDays = req.tenorDays;
        pos.openTime = nowTs;
        pos.maturityTime = nowTs + uint256(req.tenorDays) * 1 days;
        pos.initialMargin = req.initialMargin;
        pos.callThreshold = nv * int256(uint256(params.callBps)) / BPS;
        pos.liqThreshold = nv * int256(uint256(params.liqBps)) / BPS;
        pos.hedgerMargin = req.initialMargin;
        pos.makerMargin = req.initialMargin;
        pos.status = PositionStatus.Active;
        pos.lastMarkTime = nowTs;

        q.status = QuoteStatus.Accepted;
        req.status = RequestStatus.Filled;
        _removeOpenRequest(requestId);
        _positionsOf[msg.sender].push(positionId);
        _positionsOf[q.maker].push(positionId);

        emit PositionOpened(positionId, requestId, quoteId, msg.sender, q.maker, q.lockedForward, pos.maturityTime);
    }

    // ── Mark to market, margin ─────────────────────────────────────────────

    /// @notice Anyone can mark. Recomputes the forward for the remaining tenor and updates both sides.
    function markPosition(uint256 positionId) external returns (int256 value) {
        Position storage pos = _positions[positionId];
        if (pos.status != PositionStatus.Active) revert PositionNotActive(positionId);
        (int256 spot,) = priceSource.spot(pairId(pos.base, pos.quote));
        value = _mark(pos, spot);
    }

    function topUpMargin(uint256 positionId, uint256 tokenAmount) external nonReentrant {
        Position storage pos = _positions[positionId];
        if (pos.status != PositionStatus.Active) revert PositionNotActive(positionId);
        bool isHedger = msg.sender == pos.hedger;
        if (!isHedger && msg.sender != pos.maker) revert NotPositionParty();
        marginToken.safeTransferFrom(msg.sender, address(this), tokenAmount);
        int256 amt = _fromToken(tokenAmount);
        if (isHedger) pos.hedgerMargin += amt; else pos.makerMargin += amt;
        emit TopUp(positionId, isHedger, amt);
        (int256 spot,) = priceSource.spot(pairId(pos.base, pos.quote));
        _mark(pos, spot);
    }

    /// @notice Anyone can liquidate a breached side. The liquidation price is the median of the last
    ///         three prints. First breach closes `partialLiqBps` of the notional and realizes that
    ///         slice's loss from the loser's margin, leaving the rest of the position collateralized;
    ///         a second breach, or a loss the margin cannot cover, closes the whole position through
    ///         the bad-debt waterfall.
    function liquidate(uint256 positionId) external nonReentrant {
        Position storage pos = _positions[positionId];
        if (pos.status != PositionStatus.Active) revert PositionNotActive(positionId);
        bytes32 pid = pairId(pos.base, pos.quote);
        int256 liqSpot = priceSource.liquidationSpot(pid);
        int256 value = valuePosition(pos.lockedForward, _currentForward(pos, liqSpot), pos.notional, liqSpot, pos.direction, pairs[pid].marginInQuote);

        bool hedgerSide;
        int256 loss;
        if (value < 0 && -value >= pos.liqThreshold) { hedgerSide = true; loss = -value; }
        else if (value > 0 && value >= pos.liqThreshold) { hedgerSide = false; loss = value; }
        else revert NotLiquidatable(positionId);

        bool partialDone = hedgerSide ? pos.hedgerPartialDone : pos.makerPartialDone;
        int256 loserMargin = hedgerSide ? pos.hedgerMargin : pos.makerMargin;
        int256 sliceBps = partialDone ? BPS : int256(uint256(params.partialLiqBps));
        int256 realized = loss * sliceBps / BPS;
        int256 penalty = pos.notionalValue * sliceBps / BPS * int256(uint256(params.liqPenaltyBps)) / BPS;

        // A partial liquidation only makes sense while the loser can pay for it.
        bool isPartial = !partialDone && realized + penalty <= loserMargin;
        if (!isPartial) {
            realized = loss;
            penalty = pos.notionalValue * int256(uint256(params.liqPenaltyBps)) / BPS;
            _close(pos, hedgerSide, realized, penalty, PositionStatus.Liquidated);
            emit Liquidated(positionId, hedgerSide, false, realized, penalty, 0);
            return;
        }

        // Partial: realize the slice, shrink the position, keep both sides collateralized for the rest.
        address winner = hedgerSide ? pos.maker : pos.hedger;
        if (hedgerSide) { pos.hedgerMargin -= realized + penalty; pos.hedgerPartialDone = true; }
        else { pos.makerMargin -= realized + penalty; pos.makerPartialDone = true; }
        insuranceBalance += penalty;
        marginToken.safeTransfer(winner, _toToken(realized));

        int256 keepBps = BPS - sliceBps;
        pos.notional = pos.notional * keepBps / BPS;
        pos.notionalValue = pos.notionalValue * keepBps / BPS;
        pos.initialMargin = pos.initialMargin * keepBps / BPS;
        pos.callThreshold = pos.callThreshold * keepBps / BPS;
        pos.liqThreshold = pos.liqThreshold * keepBps / BPS;

        // The winner is now over-collateralized for the smaller position; return the excess.
        int256 winnerMargin = hedgerSide ? pos.makerMargin : pos.hedgerMargin;
        if (winnerMargin > pos.initialMargin) {
            int256 excess = winnerMargin - pos.initialMargin;
            if (hedgerSide) pos.makerMargin -= excess; else pos.hedgerMargin -= excess;
            marginToken.safeTransfer(winner, _toToken(excess));
        }

        emit Liquidated(positionId, hedgerSide, true, realized, penalty, pos.notional);
        _mark(pos, liqSpot);
    }

    // ── Settlement ─────────────────────────────────────────────────────────

    /// @notice Cash settlement at maturity: the forward has converged to spot, the difference is paid in
    ///         the margin token, both margins are returned net. Shortfalls follow the waterfall.
    function settle(uint256 positionId) external nonReentrant {
        Position storage pos = _positions[positionId];
        if (pos.status != PositionStatus.Active) revert PositionNotActive(positionId);
        if (currentTime() < pos.maturityTime) revert NotMature(positionId);
        bytes32 pid = pairId(pos.base, pos.quote);
        (int256 spot,) = priceSource.spot(pid);
        int256 value = valuePosition(pos.lockedForward, spot, pos.notional, spot, pos.direction, pairs[pid].marginInQuote);
        pos.lastMarkValue = value;
        pos.lastMarkTime = currentTime();
        if (value >= 0) _close(pos, false, value, 0, PositionStatus.Settled);
        else _close(pos, true, -value, 0, PositionStatus.Settled);
    }

    // ── Internals ──────────────────────────────────────────────────────────

    /// @dev Closes the position paying `loss` from the loser to the winner and `penalty` to the insurance
    ///      fund, then returns whatever margin remains to each side. Waterfall on shortfall:
    ///      loser's margin -> insurance fund -> haircut on the winner.
    function _close(Position storage pos, bool hedgerLoses, int256 loss, int256 penalty, PositionStatus finalStatus) internal {
        int256 loserMargin = hedgerLoses ? pos.hedgerMargin : pos.makerMargin;
        int256 winnerMargin = hedgerLoses ? pos.makerMargin : pos.hedgerMargin;
        address loser = hedgerLoses ? pos.hedger : pos.maker;
        address winner = hedgerLoses ? pos.maker : pos.hedger;

        int256 paidByLoser = loss <= loserMargin ? loss : loserMargin;
        loserMargin -= paidByLoser;
        int256 shortfall = loss - paidByLoser;

        int256 insuranceUsed;
        int256 haircut;
        if (shortfall > 0) {
            insuranceUsed = shortfall <= insuranceBalance ? shortfall : insuranceBalance;
            insuranceBalance -= insuranceUsed;
            haircut = shortfall - insuranceUsed;
            emit BadDebt(pos.id, insuranceUsed, haircut);
        }

        int256 paidPenalty = penalty <= loserMargin ? penalty : loserMargin;
        loserMargin -= paidPenalty;
        insuranceBalance += paidPenalty;

        int256 winnerPayout = winnerMargin + paidByLoser + insuranceUsed;
        int256 loserPayout = loserMargin;

        pos.hedgerMargin = 0;
        pos.makerMargin = 0;
        pos.status = finalStatus;

        if (winnerPayout > 0) marginToken.safeTransfer(winner, _toToken(winnerPayout));
        if (loserPayout > 0) marginToken.safeTransfer(loser, _toToken(loserPayout));

        (int256 hedgerPayout, int256 makerPayout) = hedgerLoses ? (loserPayout, winnerPayout) : (winnerPayout, loserPayout);
        emit Settled(pos.id, hedgerLoses ? -loss : loss, hedgerPayout, makerPayout);
    }

    function _mark(Position storage pos, int256 spot) internal returns (int256 value) {
        bool marginInQuote = pairs[pairId(pos.base, pos.quote)].marginInQuote;
        value = valuePosition(pos.lockedForward, _currentForward(pos, spot), pos.notional, spot, pos.direction, marginInQuote);
        int256 hedgerLoss = value < 0 ? -value : int256(0);
        int256 makerLoss = value > 0 ? value : int256(0);
        pos.hedgerState = _sideState(pos, true, hedgerLoss, pos.hedgerState);
        pos.makerState = _sideState(pos, false, makerLoss, pos.makerState);
        pos.lastMarkValue = value;
        pos.lastMarkTime = currentTime();
        emit Marked(pos.id, value, pos.hedgerState, pos.makerState);
    }

    function _sideState(Position storage pos, bool hedgerSide, int256 loss, SideState prev) internal returns (SideState next) {
        if (loss >= pos.liqThreshold) next = SideState.Breached;
        else if (loss >= pos.callThreshold) next = SideState.Called;
        else next = SideState.Safe;
        if (next == SideState.Breached && prev != SideState.Breached) emit Breach(pos.id, hedgerSide, loss);
        else if (next == SideState.Called && prev == SideState.Safe) emit MarginCall(pos.id, hedgerSide, loss);
    }

    function _currentForward(Position storage pos, int256 spot) internal view returns (int256) {
        uint256 nowTs = currentTime();
        uint256 remaining = pos.maturityTime > nowTs ? (pos.maturityTime - nowTs) / 1 days : 0;
        if (remaining == 0) return spot; // at maturity the forward is the spot
        return computeForward(spot, rateSource.rate(pos.base), rateSource.rate(pos.quote), uint32(remaining));
    }

    function _notionalValue(int256 notional, int256 spot, bool marginInQuote) internal pure returns (int256) {
        return marginInQuote ? notional * spot / DECIMALS : notional;
    }

    function _requireEligible(address account) internal view {
        if (!openAccess && !eligible[account]) revert NotEligible(account);
    }

    function _removeOpenRequest(uint256 requestId) internal {
        uint256 len = _openRequestIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (_openRequestIds[i] == requestId) {
                _openRequestIds[i] = _openRequestIds[len - 1];
                _openRequestIds.pop();
                return;
            }
        }
    }

    /// @dev 7-dec internal units -> margin token units (rounds down).
    function _toToken(int256 amount7) internal view returns (uint256) {
        if (amount7 < 0) revert InvalidInput();
        uint256 a = uint256(amount7);
        if (marginTokenDecimals >= 7) return a * 10 ** (marginTokenDecimals - 7);
        return a / 10 ** (7 - marginTokenDecimals);
    }

    /// @dev margin token units -> 7-dec internal units (rounds down).
    function _fromToken(uint256 tokenAmount) internal view returns (int256) {
        if (marginTokenDecimals >= 7) return int256(tokenAmount / 10 ** (marginTokenDecimals - 7));
        return int256(tokenAmount * 10 ** (7 - marginTokenDecimals));
    }
}
