// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal Morpho Blue surface used by MorphoRateSource.
struct MarketParams {
    address loanToken;
    address collateralToken;
    address oracle;
    address irm;
    uint256 lltv;
}

struct Market {
    uint128 totalSupplyAssets;
    uint128 totalSupplyShares;
    uint128 totalBorrowAssets;
    uint128 totalBorrowShares;
    uint128 lastUpdate;
    uint128 fee;
}

interface IMorpho {
    function idToMarketParams(bytes32 id) external view returns (MarketParams memory);
    function market(bytes32 id) external view returns (Market memory);
}

interface IIrm {
    /// @return borrow rate per second, WAD (1e18)
    function borrowRateView(MarketParams memory marketParams, Market memory market) external view returns (uint256);
}
