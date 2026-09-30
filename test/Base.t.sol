// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Parity} from "../contracts/Parity.sol";
import {AdminPriceSource} from "../contracts/oracles/AdminPriceSource.sol";
import {GovernanceRateSource} from "../contracts/rates/GovernanceRateSource.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";
import {MockStockToken} from "../contracts/mocks/MockStockToken.sol";

/// @dev Shared fixture: USDG (6 dec) margin, admin price source, governance rates, two corridors.
///      TSLA/USD: 1,000 TSLA at 300, r_USD 4%, r_TSLA 0, 90 days -> forward 303.00, IM 15,000 USDG.
///      USD/MXN: 100,000 USD at 20.00, r_USD 4%, r_MXN 10%, 90 days -> forward 20.297, IM 5,000 USDG.
abstract contract BaseTest is Test {
    int256 constant D = 1e7;

    bytes32 constant TSLA = "TSLA";
    bytes32 constant USD = "USD";
    bytes32 constant MXN = "MXN";

    Parity parity;
    AdminPriceSource prices;
    GovernanceRateSource rates;
    MockERC20 usdg;
    MockStockToken tsla;

    address admin = makeAddr("admin");
    address hedger = makeAddr("hedger");
    address maker = makeAddr("maker");
    address maker2 = makeAddr("maker2");
    address rando = makeAddr("rando");

    bytes32 tslaUsd;
    bytes32 usdMxn;

    Parity.Params P = Parity.Params({marginBps: 500, callBps: 250, liqBps: 375, openFeeBps: 2, partialLiqBps: 3000, liqPenaltyBps: 100});

    function setUp() public virtual {
        usdg = new MockERC20("Global Dollar", "USDG", 6);
        tsla = new MockStockToken("Tesla", "TSLA");
        prices = new AdminPriceSource(admin);
        rates = new GovernanceRateSource(admin);
        parity = new Parity(address(usdg), address(prices), address(rates), P, true, admin);

        tslaUsd = parity.pairId(TSLA, USD);
        usdMxn = parity.pairId(USD, MXN);

        vm.startPrank(admin);
        parity.setPair(TSLA, USD, true, address(tsla), true);
        parity.setPair(USD, MXN, false, address(0), true);
        parity.setEligible(hedger, true);
        parity.setEligible(maker, true);
        parity.setEligible(maker2, true);
        rates.setRate(USD, 400_000); // 4%
        rates.setRate(TSLA, 0);
        rates.setRate(MXN, 1_000_000); // 10%
        prices.setSpot(tslaUsd, 300 * D);
        prices.setSpot(usdMxn, 20 * D);
        vm.stopPrank();

        for (uint256 i = 0; i < 3; i++) {
            address a = [hedger, maker, maker2][i];
            usdg.mint(a, 1_000_000e6);
            vm.prank(a);
            usdg.approve(address(parity), type(uint256).max);
        }
    }

    // ── helpers ──

    function openTsla(int256 notional, uint32 tenor, int256 spreadBps) internal returns (uint256 posId, uint256 reqId) {
        vm.prank(hedger);
        reqId = parity.postRequest(TSLA, USD, Parity.Direction.SellBase, notional, tenor);
        vm.prank(maker);
        uint256 q = parity.submitQuote(reqId, spreadBps, 0);
        vm.prank(hedger);
        posId = parity.acceptQuote(reqId, q);
    }

    function warpTo(uint256 ts) internal {
        vm.prank(admin);
        parity.setDemoTime(ts);
    }

    function setSpot(bytes32 pid, int256 price) internal {
        vm.prank(admin);
        prices.setSpot(pid, price);
    }

    /// @dev Every token the contract holds is accounted for: active margins + reserved quote margins + insurance.
    function assertConserved(string memory label) internal view {
        int256 acc = parity.insuranceBalance();
        for (uint256 i = 0; i < parity.nextPositionId(); i++) {
            Parity.Position memory p = parity.getPosition(i);
            acc += p.hedgerMargin + p.makerMargin;
        }
        for (uint256 r = 0; r < parity.nextRequestId(); r++) {
            Parity.Request memory req = parity.getRequest(r);
            Parity.Quote[] memory qs = parity.getQuotes(r);
            for (uint256 j = 0; j < qs.length; j++) {
                if (qs[j].status == Parity.QuoteStatus.Live) acc += req.initialMargin;
            }
        }
        assertEq(usdg.balanceOf(address(parity)), uint256(acc) / 10, label);
    }
}
