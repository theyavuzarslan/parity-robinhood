// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Parity} from "../contracts/Parity.sol";
import {AdminPriceSource} from "../contracts/oracles/AdminPriceSource.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";

/// @notice The four-minute demo on TSLA/USD, driven from the deployer key (hedger, maker and admin in one).
///   forge script script/Demo.s.sol --sig "step(uint8)" <n> --rpc-url $ROBINHOOD_TESTNET_RPC --broadcast --private-key $PRIVATE_KEY
///
///   1  reset to spot 300, open 1,000 TSLA sold forward 90 days at 303.00 (both sides post 15,000 USDG)
///   2  day 30, spot 310: hedger is margin called (loss 9,067 > 7,500)
///   3  spot 315 (two prints): breach; partial liquidation closes 30%, realizes 4,230 + 900 penalty
///   4  gap to 335: full liquidation through the waterfall (margin, insurance fund, haircut)
///   5  open a fresh position at 303.00
///   6  jump to that position's maturity at spot 310 and settle in cash (separate run, so the
///      clock is read from the mined position rather than from the local simulation)
contract Demo is Script {
    int256 constant D = 1e7;
    bytes32 constant TSLA = "TSLA";
    bytes32 constant USD = "USD";

    function _load() internal view returns (Parity parity, AdminPriceSource prices, MockERC20 usdg) {
        string memory j = vm.readFile(string.concat("deployments/", vm.toString(block.chainid), ".json"));
        parity = Parity(vm.parseJsonAddress(j, ".parity"));
        prices = AdminPriceSource(vm.parseJsonAddress(j, ".priceSource"));
        usdg = MockERC20(vm.parseJsonAddress(j, ".usdg"));
    }

    function step(uint8 n) external {
        (Parity parity, AdminPriceSource prices, MockERC20 usdg) = _load();
        bytes32 pid = parity.pairId(TSLA, USD);
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        if (n == 6) {
            uint256 last = parity.nextPositionId() - 1;
            parity.setDemoTime(parity.getPosition(last).maturityTime);
            prices.setSpot(pid, 310 * D);
            parity.settle(last);
            console2.log("settled: hedger pays 7,000, both margins returned net");
        } else if (n == 1 || n == 5) {
            parity.setDemoTime(0);
            prices.setSpot(pid, 300 * D);
            usdg.approve(address(parity), type(uint256).max);
            uint256 req = parity.postRequest(TSLA, USD, Parity.Direction.SellBase, 1000 * D, 90);
            uint256 q = parity.submitQuote(req, 0, 0);
            uint256 pos = parity.acceptQuote(req, q);
            console2.log("position", pos, "locked forward", uint256(parity.getPosition(pos).lockedForward));
        } else {
            uint256 pos = parity.nextPositionId() - 1;
            if (n == 2) {
                parity.setDemoTime(parity.getPosition(pos).openTime + 30 days);
                prices.setSpot(pid, 310 * D);
                parity.markPosition(pos);
                console2.log("day 30, spot 310: hedger called");
            } else if (n == 3) {
                prices.setSpot(pid, 315 * D);
                prices.setSpot(pid, 315 * D);
                parity.liquidate(pos);
                console2.log("partial liquidation, remaining notional", uint256(parity.getPosition(pos).notional));
            } else if (n == 4) {
                prices.setSpot(pid, 335 * D);
                prices.setSpot(pid, 335 * D);
                parity.liquidate(pos);
                console2.log("full liquidation; insurance left", uint256(parity.insuranceBalance()));
            }
        }
        vm.stopBroadcast();
    }
}
