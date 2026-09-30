// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRateSource} from "../interfaces/IRateSource.sol";
import {IMorpho, IIrm, MarketParams, Market} from "../interfaces/IMorpho.sol";

/// @title MorphoRateSource
/// @notice The live USD leg: the USDG supply rate of a Morpho Blue market on Robinhood Chain, read from
///         the market's interest rate model. supplyRate = borrowRate x utilization x (1 - fee).
///         Symbols without a mapped market fall through to a governance-set fallback source.
/// @dev Rates are per-second WAD on Morpho; the engine wants an annual simple rate in 7 decimals.
contract MorphoRateSource is IRateSource, Ownable {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant YEAR = 365 days;

    IMorpho public immutable morpho;
    IRateSource public fallbackSource;
    mapping(bytes32 => bytes32) public marketOf; // symbol => Morpho market id

    event MarketSet(bytes32 indexed symbol, bytes32 marketId);
    event FallbackSet(address source);

    constructor(address morpho_, address fallback_, address owner_) Ownable(owner_) {
        morpho = IMorpho(morpho_);
        fallbackSource = IRateSource(fallback_);
    }

    function setMarket(bytes32 symbol, bytes32 marketId) external onlyOwner {
        marketOf[symbol] = marketId;
        emit MarketSet(symbol, marketId);
    }

    function setFallback(address source) external onlyOwner {
        fallbackSource = IRateSource(source);
        emit FallbackSet(source);
    }

    function rate(bytes32 symbol) external view override returns (int256) {
        bytes32 id = marketOf[symbol];
        if (id == bytes32(0)) return address(fallbackSource) == address(0) ? int256(0) : fallbackSource.rate(symbol);
        return int256(supplyRateAnnual7(id));
    }

    /// @return Annual simple supply rate of the market, 7 decimals.
    function supplyRateAnnual7(bytes32 id) public view returns (uint256) {
        MarketParams memory p = morpho.idToMarketParams(id);
        Market memory m = morpho.market(id);
        if (m.totalSupplyAssets == 0) return 0;
        uint256 borrowPerSec = IIrm(p.irm).borrowRateView(p, m); // WAD per second
        uint256 utilization = (uint256(m.totalBorrowAssets) * WAD) / uint256(m.totalSupplyAssets);
        uint256 supplyPerSec = (borrowPerSec * utilization / WAD) * (WAD - uint256(m.fee)) / WAD;
        return supplyPerSec * YEAR * 1e7 / WAD;
    }
}
