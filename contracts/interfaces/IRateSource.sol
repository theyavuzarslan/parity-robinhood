// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Annual simple interest rate per currency or asset symbol, 7 decimals (0.04 = 400_000).
/// @dev For Robinhood Stock Tokens the rate is 0: dividends are reinvested into the token through the
///      ERC-8056 multiplier, so the token is a total-return instrument and carries no separate yield.
interface IRateSource {
    function rate(bytes32 symbol) external view returns (int256 rate7);
}
