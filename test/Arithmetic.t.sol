// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseTest} from "./Base.t.sol";
import {Parity} from "../contracts/Parity.sol";

contract ArithmeticTest is BaseTest {
    function test_forward_fx_matches_spec() public view {
        // 20.00 x (1 + 0.10 x 90/360) / (1 + 0.04 x 90/360) = 20.2970297
        int256 f = parity.computeForward(20 * D, 400_000, 1_000_000, 90);
        assertApproxEqAbs(f, 202_970_297, 5);
    }

    function test_forward_stock_is_cost_of_carry() public view {
        // Total-return token: base rate 0, so F = S x (1 + r_USD x t/360) = 303.00
        int256 f = parity.computeForward(300 * D, 0, 400_000, 90);
        assertEq(f, 303 * D);
    }

    function test_forward_moves_with_rate() public view {
        int256 f4 = parity.computeForward(300 * D, 0, 400_000, 90);
        int256 f7 = parity.computeForward(300 * D, 0, 750_000, 90);
        assertGt(f7, f4);
    }

    function test_value_zero_at_inception() public view {
        int256 f = parity.computeForward(300 * D, 0, 400_000, 90);
        assertEq(parity.valuePosition(f, f, 1000 * D, 300 * D, Parity.Direction.SellBase, true), 0);
        int256 g = parity.computeForward(20 * D, 400_000, 1_000_000, 90);
        assertEq(parity.valuePosition(g, g, 100_000 * D, 20 * D, Parity.Direction.BuyBase, false), 0);
    }

    function test_value_stock_day30() public view {
        // 1,000 TSLA sold forward at 303; spot 310 with 60 days left -> forward 312.0667 -> hedger -9,066.67
        int256 locked = 303 * D;
        int256 cur = parity.computeForward(310 * D, 0, 400_000, 60);
        int256 v = parity.valuePosition(locked, cur, 1000 * D, 310 * D, Parity.Direction.SellBase, true);
        assertApproxEqAbs(v, -9_066_666_6666, 1e4); // -9,066.6666666 in 7 dec
    }

    function test_value_fx_day30_matches_spec_table() public view {
        // Spec: day 30, spot 19.61 -> +2,500 to the hedger who sold USD at 20.297
        int256 locked = parity.computeForward(20 * D, 400_000, 1_000_000, 90);
        int256 cur = parity.computeForward(1961 * D / 100, 400_000, 1_000_000, 60);
        int256 v = parity.valuePosition(locked, cur, 100_000 * D, 1961 * D / 100, Parity.Direction.SellBase, false);
        assertApproxEqRel(v, 2_500 * D, 0.02e18);
    }

    function testFuzz_sides_sum_to_zero_and_no_overflow(int256 spot, int256 rb, int256 rq, uint32 tenor, int256 notional, bool sell, bool miq) public view {
        spot = bound(spot, 1, 1e6 * D);           // up to 1,000,000.00
        rb = bound(rb, 0, 5 * D);                  // up to 500% annual
        rq = bound(rq, 0, 5 * D);
        tenor = uint32(bound(tenor, 1, 3650));
        notional = bound(notional, 1, 1e9 * D);   // up to 1e9 units
        int256 locked = parity.computeForward(spot, rb, rq, tenor);
        int256 spot2 = bound(spot * 3 / 2, 1, 1e6 * D);
        int256 cur = parity.computeForward(spot2, rb, rq, tenor / 2 + 1);
        Parity.Direction dir = sell ? Parity.Direction.SellBase : Parity.Direction.BuyBase;
        int256 h = parity.valuePosition(locked, cur, notional, spot2, dir, miq);
        Parity.Direction other = sell ? Parity.Direction.BuyBase : Parity.Direction.SellBase;
        int256 m = parity.valuePosition(locked, cur, notional, spot2, other, miq);
        assertEq(h + m, 0);
    }

    function testFuzz_spread_is_monotone(int256 fwd, int256 bps) public view {
        fwd = bound(fwd, 1, 1e9 * D);
        bps = bound(bps, -5000, 5000);
        int256 s = parity.applySpread(fwd, bps);
        if (bps > 0) assertGe(s, fwd);
        else assertLe(s, fwd);
    }
}
