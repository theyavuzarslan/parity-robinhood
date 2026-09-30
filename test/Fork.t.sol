// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Parity} from "../contracts/Parity.sol";
import {ChainlinkPriceSource} from "../contracts/oracles/ChainlinkPriceSource.sol";
import {GovernanceRateSource} from "../contracts/rates/GovernanceRateSource.sol";
import {MorphoRateSource} from "../contracts/rates/MorphoRateSource.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";
import {IStockToken} from "../contracts/interfaces/IStockToken.sol";
import {AggregatorV3Interface} from "../contracts/interfaces/AggregatorV3Interface.sol";

/// @notice Runs against Robinhood Chain mainnet (chain 4663) when ROBINHOOD_RPC is set:
///           ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com forge test --match-contract Fork -vv
///         Reads the real TSLA Stock Token and its Chainlink feed, and prices a 90-day forward from them.
contract ForkTest is Test {
    // From docs.robinhood.com/chain and the Chainlink feed directory for chain 4663.
    address constant TSLA_TOKEN = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address constant TSLA_FEED = 0x4A1166a659A55625345e9515b32adECea5547C38;
    address constant NVDA_TOKEN = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant MORPHO_BLUE = 0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010;

    bytes32 constant TSLA = "TSLA";
    bytes32 constant NVDA = "NVDA";
    bytes32 constant USD = "USD";

    ChainlinkPriceSource prices;
    GovernanceRateSource rates;
    Parity parity;
    address admin = address(this);

    function setUp() public {
        string memory rpc = vm.envOr("ROBINHOOD_RPC", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        assertEq(block.chainid, 4663, "not Robinhood Chain mainnet");

        prices = new ChainlinkPriceSource(admin);
        prices.setFeed(keccak256(abi.encodePacked(TSLA, USD)), TSLA_FEED, TSLA_TOKEN, 4 days);
        prices.setFeed(keccak256(abi.encodePacked(NVDA, USD)), NVDA_FEED, NVDA_TOKEN, 4 days);
        rates = new GovernanceRateSource(admin);
        rates.setRate(USD, 400_000);

        Parity.Params memory p = Parity.Params({marginBps: 500, callBps: 250, liqBps: 375, openFeeBps: 2, partialLiqBps: 3000, liqPenaltyBps: 100});
        // demoMode = false: this is the production shape. Margin token is the real USDG.
        parity = new Parity(USDG, address(prices), address(rates), p, false, admin);
        parity.setPair(TSLA, USD, true, TSLA_TOKEN, true);
        parity.setPair(NVDA, USD, true, NVDA_TOKEN, true);
    }

    modifier onFork() {
        if (bytes(vm.envOr("ROBINHOOD_RPC", string(""))).length == 0) {
            vm.skip(true);
            return;
        }
        _;
    }

    function test_fork_reads_real_tsla_feed_and_token() public onFork {
        (int256 spot, uint256 upd) = prices.spot(keccak256(abi.encodePacked(TSLA, USD)));
        assertGt(spot, 50 * 1e7, "TSLA above $50");
        assertLt(spot, 5000 * 1e7, "TSLA below $5,000");
        assertLe(block.timestamp - upd, 4 days, "fresh within the 24/5 allowance");
        assertEq(AggregatorV3Interface(TSLA_FEED).decimals(), 8);
        assertGe(IStockToken(TSLA_TOKEN).uiMultiplier(), 1e18, "multiplier only rises");
        assertFalse(IStockToken(TSLA_TOKEN).oraclePaused());
        int256 liq = prices.liquidationSpot(keccak256(abi.encodePacked(TSLA, USD)));
        assertGt(liq, 0);
    }

    function test_fork_prices_forward_from_live_feed() public onFork {
        (int256 fwd, int256 spot, int256 rb, int256 rq) = parity.previewForward(TSLA, USD, 90);
        assertEq(rb, 0, "stock token has no separate yield");
        assertEq(rq, 400_000);
        // F = S x (1 + 0.04 x 90/360) = S x 1.01
        assertEq(fwd, spot * 101 / 100);
        (int256 fwdNvda, int256 spotNvda,,) = parity.previewForward(NVDA, USD, 30);
        assertGt(fwdNvda, spotNvda);
    }

    function test_fork_demo_time_cannot_be_set_on_production_shape() public onFork {
        vm.expectRevert(Parity.NotDemoMode.selector);
        parity.setDemoTime(1);
    }

    /// @dev Live USD leg from Morpho: needs MORPHO_USDG_MARKET (a market id whose loan asset is USDG).
    function test_fork_morpho_usdg_supply_rate() public onFork {
        bytes32 id = vm.envOr("MORPHO_USDG_MARKET", bytes32(0));
        if (id == bytes32(0)) {
            vm.skip(true);
            return;
        }
        MorphoRateSource live = new MorphoRateSource(MORPHO_BLUE, address(rates), admin);
        live.setMarket(USD, id);
        int256 r = live.rate(USD);
        emit log_named_decimal_int("USDG supply rate (annual)", r, 7);
        assertGt(r, 0, "market has borrowers");
        assertLt(r, 5 * 1e7, "below 500%");
        parity.setSources(address(prices), address(live));
        (int256 fwd, int256 spot,, int256 rq) = parity.previewForward(TSLA, USD, 90);
        assertEq(rq, r);
        assertGt(fwd, spot, "positive carry");
    }
}
