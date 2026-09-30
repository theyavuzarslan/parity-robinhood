// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ChainlinkPriceSource} from "../contracts/oracles/ChainlinkPriceSource.sol";
import {MockAggregator} from "../contracts/mocks/MockAggregator.sol";
import {MockStockToken} from "../contracts/mocks/MockStockToken.sol";

contract ChainlinkPriceSourceTest is Test {
    ChainlinkPriceSource src;
    MockAggregator feed;
    MockAggregator uptime;
    MockStockToken tsla;
    bytes32 pid = keccak256(abi.encodePacked(bytes32("TSLA"), bytes32("USD")));

    function setUp() public {
        vm.warp(1_790_000_000);
        src = new ChainlinkPriceSource(address(this));
        feed = new MockAggregator(8, "RHTSLA / USD");
        uptime = new MockAggregator(0, "L2 Sequencer Uptime Status Feed");
        tsla = new MockStockToken("Tesla", "TSLA");
        src.setFeed(pid, address(feed), address(tsla), 4 days);
        feed.push(35_438_500_000); // $354.385 at 8 decimals, the live mainnet print on 30 Sep 2026
    }

    function test_scales_8_decimals_to_7() public view {
        (int256 p, uint256 upd) = src.spot(pid);
        assertEq(p, 3_543_850_000);
        assertEq(upd, block.timestamp);
    }

    function test_rejects_stale_beyond_max_age() public {
        feed.pushAt(35_000_000_000, block.timestamp - 5 days);
        vm.expectRevert(abi.encodeWithSelector(ChainlinkPriceSource.StalePrice.selector, pid, block.timestamp - 5 days, 4 days));
        src.spot(pid);
    }

    function test_weekend_gap_within_max_age_is_fine() public {
        feed.pushAt(35_000_000_000, block.timestamp - 3 days); // Friday close read on Monday
        (int256 p,) = src.spot(pid);
        assertEq(p, 3_500_000_000);
    }

    function test_rejects_non_positive_answer() public {
        feed.push(0);
        vm.expectRevert(abi.encodeWithSelector(ChainlinkPriceSource.InvalidAnswer.selector, pid, int256(0)));
        src.spot(pid);
    }

    function test_rejects_while_corporate_action_pauses_oracle() public {
        tsla.setOraclePaused(true);
        vm.expectRevert(abi.encodeWithSelector(ChainlinkPriceSource.OraclePaused.selector, pid));
        src.spot(pid);
        tsla.setOraclePaused(false);
        src.spot(pid);
    }

    function test_token_without_pause_flag_is_tolerated() public {
        src.setFeed(pid, address(feed), address(0xBEEF), 4 days); // no code at that address
        (int256 p,) = src.spot(pid);
        assertEq(p, 3_543_850_000);
    }

    function test_sequencer_guard() public {
        src.setSequencerUptimeFeed(address(uptime), 1 hours);
        uptime.pushAt(1, block.timestamp - 2 hours); // down
        vm.expectRevert(ChainlinkPriceSource.SequencerDown.selector);
        src.spot(pid);
        uptime.pushAt(0, block.timestamp - 10 minutes); // back up, inside grace period
        vm.expectRevert(ChainlinkPriceSource.SequencerGracePeriod.selector);
        src.spot(pid);
        uptime.pushAt(0, block.timestamp - 2 hours);
        src.spot(pid);
    }

    function test_liquidation_price_is_median_of_three_rounds() public {
        feed.push(31_000_000_000);
        feed.push(31_500_000_000); // rounds: 354.385, 310, 315 -> median 315
        assertEq(src.liquidationSpot(pid), 3_150_000_000);
        feed.push(40_000_000_000); // 310, 315, 400 -> 315: one wild print does not move it
        assertEq(src.liquidationSpot(pid), 3_150_000_000);
    }

    function test_unset_pair_reverts() public {
        bytes32 other = keccak256("NVDA/USD");
        vm.expectRevert(abi.encodeWithSelector(ChainlinkPriceSource.FeedNotSet.selector, other));
        src.spot(other);
    }
}
