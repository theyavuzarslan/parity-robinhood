// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Parity} from "../contracts/Parity.sol";
import {AdminPriceSource} from "../contracts/oracles/AdminPriceSource.sol";
import {GovernanceRateSource} from "../contracts/rates/GovernanceRateSource.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";

/// @notice Demo deployment for Robinhood Chain testnet (46630), Arbitrum Sepolia (421614) or a local anvil.
///
///   forge script script/Deploy.s.sol --rpc-url $ROBINHOOD_TESTNET_RPC --broadcast --private-key $PRIVATE_KEY
///
/// Deploys a mintable USDG stand-in (the testnet faucet drips ETH and Stock Tokens, not a stablecoin),
/// an admin price source (Stock Token Chainlink feeds exist on mainnet only), governance rates, and the
/// engine in demoMode. Pairs: the five faucet Stock Tokens against USD, plus the USD/MXN fiat corridor.
/// Writes deployments/<chainId>.json for the frontend.
contract Deploy is Script {
    int256 constant D = 1e7;

    // Canonical faucet Stock Tokens on Robinhood Chain testnet (verified: 220k+ holders, ERC-8056 surface).
    address constant T_TSLA = 0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E;
    address constant T_AMZN = 0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02;
    address constant T_NFLX = 0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93;
    address constant T_PLTR = 0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0;
    address constant T_AMD = 0x71178BAc73cBeb415514eB542a8995b82669778d;

    struct Seed {
        bytes32 symbol;
        address testnetToken;
        int256 spot7; // demo seed price
    }

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        bool isRobinhoodTestnet = block.chainid == 46630;

        vm.startBroadcast(pk);

        MockERC20 usdg = new MockERC20("Global Dollar (Parity testnet)", "USDG", 6);
        AdminPriceSource prices = new AdminPriceSource(deployer);
        GovernanceRateSource rates = new GovernanceRateSource(deployer);
        Parity.Params memory p = Parity.Params({marginBps: 500, callBps: 250, liqBps: 375, openFeeBps: 2, partialLiqBps: 3000, liqPenaltyBps: 100});
        Parity parity = new Parity(address(usdg), address(prices), address(rates), p, true, deployer);

        // Rates: USD 4% (governance-set on testnet; Morpho USDG supply rate on mainnet), stocks 0.
        rates.setRate("USD", 400_000);
        rates.setRate("MXN", 1_000_000);

        // Stock corridors. Seeds are the Chainlink mainnet prints of 30 Sep 2026 where a feed exists (NFLX has none yet).
        Seed[5] memory seeds = [
            Seed("TSLA", T_TSLA, 354_385 * D / 1000),
            Seed("AMZN", T_AMZN, 247_545 * D / 1000),
            Seed("NFLX", T_NFLX, 1_150 * D),
            Seed("PLTR", T_PLTR, 187_126 * D / 1000),
            Seed("AMD", T_AMD, 608_090 * D / 1000)
        ];
        for (uint256 i = 0; i < seeds.length; i++) {
            parity.setPair(seeds[i].symbol, "USD", true, isRobinhoodTestnet ? seeds[i].testnetToken : address(0), true);
            rates.setRate(seeds[i].symbol, 0);
            prices.setSpot(parity.pairId(seeds[i].symbol, "USD"), seeds[i].spot7);
        }

        // Fiat corridor from the Stellar original: USD/MXN, margin in the base currency.
        parity.setPair("USD", "MXN", false, address(0), true);
        prices.setSpot(parity.pairId("USD", "MXN"), 20 * D);

        // Access: open on testnet so judges can trade; the allowlist stays available via setOpenAccess(false).
        parity.setOpenAccess(true);
        parity.setEligible(deployer, true);
        usdg.mint(deployer, 10_000_000e6);

        string memory extra = vm.envOr("ELIGIBLE_EXTRA", string(""));
        if (bytes(extra).length > 0) {
            string[] memory addrs = vm.split(extra, ",");
            for (uint256 i = 0; i < addrs.length; i++) {
                address a = vm.parseAddress(addrs[i]);
                parity.setEligible(a, true);
                usdg.mint(a, 1_000_000e6);
            }
        }

        // Seed the insurance fund with 5,000 USDG so the demo's gap step shows the fund draining.
        usdg.approve(address(parity), 5_000e6);
        parity.seedInsurance(5_000e6);

        vm.stopBroadcast();

        string memory json = "deployment";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "deployer", deployer);
        vm.serializeAddress(json, "parity", address(parity));
        vm.serializeAddress(json, "usdg", address(usdg));
        vm.serializeAddress(json, "priceSource", address(prices));
        vm.serializeAddress(json, "rateSource", address(rates));
        string memory out = vm.serializeUint(json, "block", block.number);
        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), ".json"));

        console2.log("chainId     ", block.chainid);
        console2.log("Parity      ", address(parity));
        console2.log("USDG (mock) ", address(usdg));
        console2.log("PriceSource ", address(prices));
        console2.log("RateSource  ", address(rates));
    }
}
