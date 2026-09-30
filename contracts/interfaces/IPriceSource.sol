// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Spot price provider for a pair. Prices are quote-per-base in 7-decimal fixed point (1e7 = 1.0).
/// @dev pairId = keccak256(abi.encodePacked(baseSymbol, quoteSymbol)), e.g. ("TSLA","USD") or ("USD","MXN").
interface IPriceSource {
    /// @return price7 Latest spot, 7 decimals. Must revert if the price is unavailable or stale.
    /// @return updatedAt Timestamp of the print.
    function spot(bytes32 pairId) external view returns (int256 price7, uint256 updatedAt);

    /// @return Median of the last three prints (falls back to fewer when history is short).
    ///         A single bad print cannot trigger a liquidation on its own.
    function liquidationSpot(bytes32 pairId) external view returns (int256);
}
