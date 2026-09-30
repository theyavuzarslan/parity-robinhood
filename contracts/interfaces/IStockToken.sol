// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice The ERC-8056 (Scaled UI Amount) surface plus Robinhood's oracle-pause flag on Stock Tokens.
interface IStockToken {
    /// @return shares-per-token ratio, 18 decimals (1e18 = 1.0). Rises with splits and reinvested dividends.
    function uiMultiplier() external view returns (uint256);
    /// @return true while a corporate action is being processed; the Chainlink feed holds its last value.
    function oraclePaused() external view returns (bool);
}
