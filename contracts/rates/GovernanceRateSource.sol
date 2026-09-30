// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRateSource} from "../interfaces/IRateSource.sol";

/// @title GovernanceRateSource
/// @notice Owner-set annual rates, 7 decimals. The fallback leg when no live on-chain rate exists
///         (every Stock Token has rate 0 by construction; fiat legs such as MXN or TRY are set here).
contract GovernanceRateSource is IRateSource, Ownable {
    mapping(bytes32 => int256) public rates;

    event RateSet(bytes32 indexed symbol, int256 rate7);

    constructor(address owner_) Ownable(owner_) {}

    function setRate(bytes32 symbol, int256 rate7) external onlyOwner {
        require(rate7 >= 0, "negative rate");
        rates[symbol] = rate7;
        emit RateSet(symbol, rate7);
    }

    function rate(bytes32 symbol) external view override returns (int256) {
        return rates[symbol];
    }
}
