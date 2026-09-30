// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseTest} from "./Base.t.sol";
import {Parity} from "../contracts/Parity.sol";
import {AdminPriceSource} from "../contracts/oracles/AdminPriceSource.sol";
import {GovernanceRateSource} from "../contracts/rates/GovernanceRateSource.sol";

contract ParityTest is BaseTest {
    int256 constant NOTIONAL = 1000 * 1e7; // 1,000 TSLA

    // ── RFQ ──

    function test_post_request_publishes_parity_forward_and_margin() public {
        vm.prank(hedger);
        uint256 id = parity.postRequest(TSLA, USD, Parity.Direction.SellBase, NOTIONAL, 90);
        Parity.Request memory r = parity.getRequest(id);
        assertEq(r.parityForward, 303 * D);
        assertEq(r.initialMargin, 15_000 * D);
        assertEq(parity.getOpenRequestIds().length, 1);
    }

    function test_quote_reserves_maker_margin_and_cancel_returns_it() public {
        vm.prank(hedger);
        uint256 id = parity.postRequest(TSLA, USD, Parity.Direction.SellBase, NOTIONAL, 90);
        uint256 before = usdg.balanceOf(maker);
        vm.prank(maker);
        uint256 q = parity.submitQuote(id, 10, 0);
        assertEq(before - usdg.balanceOf(maker), 15_000e6);
        assertConserved("after quote");
        assertEq(parity.getQuote(id, q).lockedForward, 303 * D + 303 * D * 10 / 10_000);
        vm.prank(maker);
        parity.cancelQuote(id, q);
        assertEq(usdg.balanceOf(maker), before);
        assertConserved("after cancel");
    }

    function test_accept_opens_position_takes_hedger_margin_and_fee() public {
        (uint256 pos, uint256 req) = openTsla(NOTIONAL, 90, 0);
        Parity.Position memory p = parity.getPosition(pos);
        assertEq(uint8(p.status), uint8(Parity.PositionStatus.Active));
        assertEq(p.hedgerMargin, 15_000 * D);
        assertEq(p.makerMargin, 15_000 * D);
        assertEq(p.lockedForward, 303 * D);
        assertEq(p.maturityTime, p.openTime + 90 days);
        assertEq(parity.insuranceBalance(), 60 * D); // 2 bps of 300,000
        assertEq(usdg.balanceOf(hedger), 1_000_000e6 - 15_060e6);
        assertEq(uint8(parity.getRequest(req).status), uint8(Parity.RequestStatus.Filled));
        assertEq(parity.getOpenRequestIds().length, 0);
        assertEq(parity.positionsOf(hedger).length, 1);
        assertEq(parity.positionsOf(maker).length, 1);
        assertConserved("after open");
    }

    function test_accept_rejects_expired_cancelled_and_double_accept() public {
        vm.prank(hedger);
        uint256 id = parity.postRequest(TSLA, USD, Parity.Direction.SellBase, NOTIONAL, 90);
        vm.prank(maker);
        uint256 qExp = parity.submitQuote(id, 0, block.timestamp + 1 hours);
        vm.prank(maker2);
        uint256 qCan = parity.submitQuote(id, 5, 0);
        vm.prank(maker);
        uint256 qOk = parity.submitQuote(id, 7, 0);

        vm.prank(maker2);
        parity.cancelQuote(id, qCan);
        vm.prank(hedger);
        vm.expectRevert(abi.encodeWithSelector(Parity.QuoteNotLive.selector, id, qCan));
        parity.acceptQuote(id, qCan);

        warpTo(block.timestamp + 2 hours);
        vm.prank(hedger);
        vm.expectRevert(abi.encodeWithSelector(Parity.QuoteExpired.selector, id, qExp));
        parity.acceptQuote(id, qExp);

        vm.prank(maker2);
        vm.expectRevert(Parity.NotRequestHedger.selector);
        parity.acceptQuote(id, qOk);

        vm.prank(hedger);
        parity.acceptQuote(id, qOk);
        vm.prank(hedger);
        vm.expectRevert(abi.encodeWithSelector(Parity.RequestNotOpen.selector, id));
        parity.acceptQuote(id, qOk);

        // The expired quote's maker still gets the reserved margin back by cancelling.
        vm.prank(maker);
        parity.cancelQuote(id, qExp);
        assertConserved("end");
    }

    function test_eligibility_and_pair_gates() public {
        vm.prank(rando);
        vm.expectRevert(abi.encodeWithSelector(Parity.NotEligible.selector, rando));
        parity.postRequest(TSLA, USD, Parity.Direction.SellBase, NOTIONAL, 90);

        vm.prank(admin);
        parity.setOpenAccess(true);
        vm.prank(rando);
        parity.postRequest(TSLA, USD, Parity.Direction.SellBase, NOTIONAL, 90);

        bytes32 nope = parity.pairId("NVDA", USD);
        vm.prank(hedger);
        vm.expectRevert(abi.encodeWithSelector(Parity.PairDisabled.selector, nope));
        parity.postRequest("NVDA", USD, Parity.Direction.SellBase, NOTIONAL, 90);
    }

    function test_demo_time_is_compiled_out_of_production() public {
        Parity prod = new Parity(address(usdg), address(prices), address(rates), P, false, admin);
        vm.prank(admin);
        vm.expectRevert(Parity.NotDemoMode.selector);
        prod.setDemoTime(1);
    }

    // ── Mark to market ──

    function test_mark_day30_margin_call_then_topup() public {
        (uint256 pos,) = openTsla(NOTIONAL, 90, 0);
        Parity.Position memory p0 = parity.getPosition(pos);
        warpTo(p0.openTime + 30 days);
        setSpot(tslaUsd, 310 * D);
        vm.prank(rando);
        int256 v = parity.markPosition(pos);
        assertApproxEqAbs(v, -9_066_666_6666, 1e4);
        Parity.Position memory p = parity.getPosition(pos);
        assertEq(uint8(p.hedgerState), uint8(Parity.SideState.Called));
        assertEq(uint8(p.makerState), uint8(Parity.SideState.Safe));

        vm.prank(hedger);
        parity.topUpMargin(pos, 5_000e6);
        p = parity.getPosition(pos);
        assertEq(p.hedgerMargin, 20_000 * D);
        // Threshold is on loss, not on margin balance: the call stands until the price recovers.
        assertEq(uint8(p.hedgerState), uint8(Parity.SideState.Called));
        setSpot(tslaUsd, 305 * D);
        parity.markPosition(pos);
        assertEq(uint8(parity.getPosition(pos).hedgerState), uint8(Parity.SideState.Safe));
        assertConserved("end");
    }

    function test_mark_fx_corridor_matches_spec_table() public {
        vm.prank(hedger);
        uint256 id = parity.postRequest(USD, MXN, Parity.Direction.SellBase, 100_000 * D, 90);
        assertApproxEqAbs(parity.getRequest(id).parityForward, 202_970_297, 5);
        assertEq(parity.getRequest(id).initialMargin, 5_000 * D);
        vm.prank(maker);
        uint256 q = parity.submitQuote(id, 0, 0);
        vm.prank(hedger);
        uint256 pos = parity.acceptQuote(id, q);
        warpTo(parity.getPosition(pos).openTime + 30 days);
        setSpot(usdMxn, 1961 * D / 100);
        int256 v = parity.markPosition(pos);
        assertApproxEqRel(v, 2_500 * D, 0.02e18); // hedger up ~2,500, maker called
        assertEq(uint8(parity.getPosition(pos).makerState), uint8(Parity.SideState.Called));
    }

    // ── Liquidation ──

    function test_single_print_cannot_liquidate() public {
        (uint256 pos,) = openTsla(NOTIONAL, 90, 0);
        warpTo(parity.getPosition(pos).openTime + 30 days);
        setSpot(tslaUsd, 310 * D);
        setSpot(tslaUsd, 315 * D); // history 300, 310, 315 -> median 310 -> not liquidatable
        vm.expectRevert(abi.encodeWithSelector(Parity.NotLiquidatable.selector, pos));
        parity.liquidate(pos);
    }

    function test_partial_then_full_liquidation_with_waterfall() public {
        (uint256 pos,) = openTsla(NOTIONAL, 90, 0);
        warpTo(parity.getPosition(pos).openTime + 30 days);
        setSpot(tslaUsd, 310 * D);
        setSpot(tslaUsd, 315 * D);
        setSpot(tslaUsd, 315 * D); // median 315 -> hedger loss 14,100 >= 11,250
        parity.markPosition(pos);
        assertEq(uint8(parity.getPosition(pos).hedgerState), uint8(Parity.SideState.Breached));

        uint256 makerBefore = usdg.balanceOf(maker);
        vm.prank(rando);
        parity.liquidate(pos);
        Parity.Position memory p = parity.getPosition(pos);
        assertEq(uint8(p.status), uint8(Parity.PositionStatus.Active), "still active after partial");
        assertEq(p.notional, 700 * D, "30% closed");
        assertEq(p.hedgerMargin, 15_000 * D - 4_230 * D - 900 * D, "slice loss + penalty realized");
        assertTrue(p.hedgerPartialDone);
        assertEq(p.initialMargin, 10_500 * D);
        assertEq(p.makerMargin, 10_500 * D, "winner excess returned");
        assertEq(usdg.balanceOf(maker) - makerBefore, 4_230e6 + 4_500e6);
        assertEq(parity.insuranceBalance(), 60 * D + 900 * D);
        assertConserved("after partial");

        // Gap through the residual position: 335 with 60 days left -> loss 23,963 on 700 TSLA.
        setSpot(tslaUsd, 335 * D);
        setSpot(tslaUsd, 335 * D);
        uint256 hedgerBefore = usdg.balanceOf(hedger);
        makerBefore = usdg.balanceOf(maker);
        vm.expectEmit(true, false, false, false);
        emit Parity.BadDebt(pos, 0, 0);
        parity.liquidate(pos);
        p = parity.getPosition(pos);
        assertEq(uint8(p.status), uint8(Parity.PositionStatus.Liquidated));
        assertEq(p.hedgerMargin, 0);
        assertEq(p.makerMargin, 0);
        assertEq(parity.insuranceBalance(), 0, "insurance drained");
        assertEq(usdg.balanceOf(hedger), hedgerBefore, "loser gets nothing back");
        // Winner: own margin 10,500 + loser's remaining 9,870 + insurance 960; the rest is a haircut.
        assertEq(usdg.balanceOf(maker) - makerBefore, 10_500e6 + 9_870e6 + 960e6);
        assertEq(usdg.balanceOf(address(parity)), 0, "nothing stranded");
    }

    function test_full_liquidation_when_margin_cannot_fund_partial() public {
        (uint256 pos,) = openTsla(NOTIONAL, 90, 0);
        warpTo(parity.getPosition(pos).openTime + 30 days);
        // Straight gap to 360: loss ~62,900 on the whole position, far past the 15,000 margin.
        setSpot(tslaUsd, 360 * D);
        setSpot(tslaUsd, 360 * D);
        setSpot(tslaUsd, 360 * D);
        parity.liquidate(pos);
        Parity.Position memory p = parity.getPosition(pos);
        assertEq(uint8(p.status), uint8(Parity.PositionStatus.Liquidated));
        assertFalse(p.hedgerPartialDone, "went straight to full");
        assertEq(usdg.balanceOf(address(parity)), 0);
    }

    function test_maker_side_liquidation() public {
        (uint256 pos,) = openTsla(NOTIONAL, 90, 0);
        warpTo(parity.getPosition(pos).openTime + 30 days);
        setSpot(tslaUsd, 280 * D);
        setSpot(tslaUsd, 280 * D);
        setSpot(tslaUsd, 280 * D); // maker (long) loses 303-281.87 = 21.13 x 1000
        parity.liquidate(pos);
        Parity.Position memory p = parity.getPosition(pos);
        assertTrue(p.makerPartialDone);
        assertEq(p.notional, 700 * D);
        assertConserved("after maker partial");
    }

    // ── Settlement ──

    function test_settle_pays_difference_and_returns_margins() public {
        (uint256 pos,) = openTsla(NOTIONAL, 90, 0);
        Parity.Position memory p0 = parity.getPosition(pos);
        vm.expectRevert(abi.encodeWithSelector(Parity.NotMature.selector, pos));
        parity.settle(pos);
        warpTo(p0.maturityTime);
        setSpot(tslaUsd, 310 * D); // hedger sold at 303 -> owes 7,000
        uint256 h = usdg.balanceOf(hedger);
        uint256 m = usdg.balanceOf(maker);
        parity.settle(pos);
        assertEq(usdg.balanceOf(hedger) - h, 8_000e6);
        assertEq(usdg.balanceOf(maker) - m, 22_000e6);
        assertEq(uint8(parity.getPosition(pos).status), uint8(Parity.PositionStatus.Settled));
        assertEq(usdg.balanceOf(address(parity)), 60e6, "only the insurance fund remains");
    }

    function test_settle_waterfall_haircuts_winner_when_fund_is_dry() public {
        (uint256 pos,) = openTsla(NOTIONAL, 90, 0);
        warpTo(parity.getPosition(pos).maturityTime);
        setSpot(tslaUsd, 330 * D); // hedger owes 27,000 against 15,000 margin, fund holds 60
        uint256 m = usdg.balanceOf(maker);
        vm.expectEmit(true, false, false, true);
        emit Parity.BadDebt(pos, 60 * D, 11_940 * D);
        parity.settle(pos);
        assertEq(usdg.balanceOf(maker) - m, 15_000e6 + 15_000e6 + 60e6);
        assertEq(parity.insuranceBalance(), 0);
        assertEq(usdg.balanceOf(address(parity)), 0);
    }

    function test_seeded_insurance_absorbs_gap_before_haircut() public {
        usdg.mint(rando, 50_000e6);
        vm.startPrank(rando);
        usdg.approve(address(parity), type(uint256).max);
        parity.seedInsurance(50_000e6);
        vm.stopPrank();
        (uint256 pos,) = openTsla(NOTIONAL, 90, 0);
        warpTo(parity.getPosition(pos).maturityTime);
        setSpot(tslaUsd, 330 * D);
        uint256 m = usdg.balanceOf(maker);
        parity.settle(pos);
        assertEq(usdg.balanceOf(maker) - m, 15_000e6 + 27_000e6, "winner made whole by the fund");
        assertEq(parity.insuranceBalance(), 50_060 * D - 12_000 * D);
    }

    function test_non_zero_spread_shifts_locked_rate() public {
        (uint256 pos,) = openTsla(NOTIONAL, 90, 20); // maker asks 20 bps over parity
        Parity.Position memory p = parity.getPosition(pos);
        assertEq(p.lockedForward, 303 * D + 303 * D * 20 / 10_000);
        // Hedger sold at a higher rate than parity: at unchanged spot the hedger is slightly ahead.
        int256 v = parity.markPosition(pos);
        assertGt(v, 0);
    }
}
