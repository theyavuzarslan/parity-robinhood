// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @notice Settable Chainlink-compatible feed with round history, for tests and the testnet deploy
///         (Stock Token feeds exist on Robinhood Chain mainnet only).
contract MockAggregator is AggregatorV3Interface {
    uint8 public immutable override decimals;
    string public override description;

    struct Round {
        int256 answer;
        uint256 updatedAt;
    }

    uint80 public latestRound;
    mapping(uint80 => Round) public rounds;

    constructor(uint8 decimals_, string memory description_) {
        decimals = decimals_;
        description = description_;
    }

    function push(int256 answer) external {
        pushAt(answer, block.timestamp);
    }

    function pushAt(int256 answer, uint256 updatedAt) public {
        latestRound++;
        rounds[latestRound] = Round(answer, updatedAt);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        Round memory r = rounds[latestRound];
        return (latestRound, r.answer, r.updatedAt, r.updatedAt, latestRound);
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        require(_roundId > 0 && _roundId <= latestRound, "no data");
        Round memory r = rounds[_roundId];
        return (_roundId, r.answer, r.updatedAt, r.updatedAt, _roundId);
    }
}
