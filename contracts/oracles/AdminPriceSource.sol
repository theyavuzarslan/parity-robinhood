// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPriceSource} from "../interfaces/IPriceSource.sol";

/// @title AdminPriceSource
/// @notice Owner-set prices for the testnet demo and integration tests. Keeps the last three prints so
///         the liquidation price is a median, exactly like the Chainlink adapter.
/// @dev Chainlink feeds for Stock Tokens exist on Robinhood Chain mainnet only; on testnet the demo
///      drives this source. It is never wired into a demoMode=false deployment.
contract AdminPriceSource is IPriceSource, Ownable {
    struct History {
        int256[3] prints;
        uint8 len;
        uint256 updatedAt;
    }

    mapping(bytes32 => History) internal _h;

    event SpotSet(bytes32 indexed pairId, int256 price7);

    error PriceNotSet(bytes32 pairId);
    error InvalidPrice();

    constructor(address owner_) Ownable(owner_) {}

    function setSpot(bytes32 pairId, int256 price7) external onlyOwner {
        if (price7 <= 0) revert InvalidPrice();
        History storage h = _h[pairId];
        if (h.len < 3) {
            h.prints[h.len] = price7;
            h.len++;
        } else {
            h.prints[0] = h.prints[1];
            h.prints[1] = h.prints[2];
            h.prints[2] = price7;
        }
        h.updatedAt = block.timestamp;
        emit SpotSet(pairId, price7);
    }

    function spot(bytes32 pairId) external view override returns (int256, uint256) {
        History storage h = _h[pairId];
        if (h.len == 0) revert PriceNotSet(pairId);
        return (h.prints[h.len - 1], h.updatedAt);
    }

    function liquidationSpot(bytes32 pairId) external view override returns (int256) {
        History storage h = _h[pairId];
        if (h.len == 0) revert PriceNotSet(pairId);
        if (h.len == 1) return h.prints[0];
        if (h.len == 2) return h.prints[0] < h.prints[1] ? h.prints[0] : h.prints[1];
        int256 a = h.prints[0];
        int256 b = h.prints[1];
        int256 c = h.prints[2];
        if ((a <= b && b <= c) || (c <= b && b <= a)) return b;
        if ((b <= a && a <= c) || (c <= a && a <= b)) return a;
        return c;
    }

    function history(bytes32 pairId) external view returns (int256[3] memory prints, uint8 len) {
        History storage h = _h[pairId];
        return (h.prints, h.len);
    }
}
