// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice ERC-20 with the ERC-8056 surface Robinhood Stock Tokens expose, for tests.
contract MockStockToken is ERC20 {
    uint256 public uiMultiplier = 1e18;
    bool public oraclePaused;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setMultiplier(uint256 m) external {
        uiMultiplier = m;
    }

    function setOraclePaused(bool p) external {
        oraclePaused = p;
    }
}
