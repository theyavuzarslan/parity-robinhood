// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPriceSource} from "../interfaces/IPriceSource.sol";
import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";
import {IStockToken} from "../interfaces/IStockToken.sol";

/// @title ChainlinkPriceSource
/// @notice Reads Robinhood Chain's Chainlink feeds for the engine. One feed per pair.
/// @dev Guards, in order: sequencer uptime (optional), positive answer, staleness against a per-pair
///      max age (equity feeds update 24/5, so weekends need a multi-day allowance), and the Stock
///      Token's `oraclePaused()` flag during corporate actions. The feed price already includes the
///      ERC-8056 multiplier, so it is used as-is: it is the price of one token, which is what the
///      engine's notional is denominated in.
contract ChainlinkPriceSource is IPriceSource, Ownable {
    int256 public constant DECIMALS = 1e7;

    struct FeedConfig {
        AggregatorV3Interface feed;
        address stockToken; // optional: checked for oraclePaused()
        uint256 maxAge;     // seconds; 0 = no staleness check
        uint8 feedDecimals;
    }

    mapping(bytes32 => FeedConfig) public feeds;
    AggregatorV3Interface public sequencerUptimeFeed; // optional
    uint256 public gracePeriod = 1 hours;

    error FeedNotSet(bytes32 pairId);
    error InvalidAnswer(bytes32 pairId, int256 answer);
    error StalePrice(bytes32 pairId, uint256 updatedAt, uint256 maxAge);
    error OraclePaused(bytes32 pairId);
    error SequencerDown();
    error SequencerGracePeriod();

    event FeedSet(bytes32 indexed pairId, address feed, address stockToken, uint256 maxAge);
    event SequencerFeedSet(address feed, uint256 gracePeriod);

    constructor(address owner_) Ownable(owner_) {}

    function setFeed(bytes32 pairId, address feed, address stockToken, uint256 maxAge) external onlyOwner {
        uint8 dec = AggregatorV3Interface(feed).decimals();
        feeds[pairId] = FeedConfig({feed: AggregatorV3Interface(feed), stockToken: stockToken, maxAge: maxAge, feedDecimals: dec});
        emit FeedSet(pairId, feed, stockToken, maxAge);
    }

    function setSequencerUptimeFeed(address feed, uint256 gracePeriod_) external onlyOwner {
        sequencerUptimeFeed = AggregatorV3Interface(feed);
        gracePeriod = gracePeriod_;
        emit SequencerFeedSet(feed, gracePeriod_);
    }

    function spot(bytes32 pairId) public view override returns (int256 price7, uint256 updatedAt) {
        FeedConfig memory cfg = _cfg(pairId);
        _checkSequencer();
        (, int256 answer,, uint256 upd,) = cfg.feed.latestRoundData();
        _validate(pairId, cfg, answer, upd);
        _checkPause(pairId, cfg.stockToken);
        return (_scale(answer, cfg.feedDecimals), upd);
    }

    /// @dev Median of the latest three rounds. Round ids on a proxy are phase-encoded, so a lookup can
    ///      revert at a phase boundary; those rounds are simply skipped.
    function liquidationSpot(bytes32 pairId) external view override returns (int256) {
        FeedConfig memory cfg = _cfg(pairId);
        _checkSequencer();
        (uint80 roundId, int256 a0,, uint256 upd0,) = cfg.feed.latestRoundData();
        _validate(pairId, cfg, a0, upd0);
        _checkPause(pairId, cfg.stockToken);

        int256 a1 = _round(cfg.feed, roundId, 1);
        int256 a2 = _round(cfg.feed, roundId, 2);
        int256 med;
        if (a1 > 0 && a2 > 0) med = _median3(a0, a1, a2);
        else if (a1 > 0) med = a0 < a1 ? a0 : a1; // two prints: the more conservative (lower) one
        else med = a0;
        return _scale(med, cfg.feedDecimals);
    }

    // ── internals ──

    function _cfg(bytes32 pairId) internal view returns (FeedConfig memory cfg) {
        cfg = feeds[pairId];
        if (address(cfg.feed) == address(0)) revert FeedNotSet(pairId);
    }

    function _validate(bytes32 pairId, FeedConfig memory cfg, int256 answer, uint256 upd) internal view {
        if (answer <= 0) revert InvalidAnswer(pairId, answer);
        if (cfg.maxAge != 0 && block.timestamp > upd + cfg.maxAge) revert StalePrice(pairId, upd, cfg.maxAge);
    }

    function _checkPause(bytes32 pairId, address stockToken) internal view {
        if (stockToken == address(0) || stockToken.code.length == 0) return;
        // Testnet faucet tokens do not expose oraclePaused(); treat a revert as "not paused".
        try IStockToken(stockToken).oraclePaused() returns (bool paused) {
            if (paused) revert OraclePaused(pairId);
        } catch {}
    }

    function _checkSequencer() internal view {
        if (address(sequencerUptimeFeed) == address(0)) return;
        (, int256 status, uint256 startedAt,,) = sequencerUptimeFeed.latestRoundData();
        if (status != 0) revert SequencerDown();
        if (block.timestamp - startedAt <= gracePeriod) revert SequencerGracePeriod();
    }

    function _round(AggregatorV3Interface feed, uint80 latest, uint80 back) internal view returns (int256) {
        if (latest < back) return 0;
        try feed.getRoundData(latest - back) returns (uint80, int256 ans, uint256, uint256 upd, uint80) {
            if (upd == 0) return 0;
            return ans;
        } catch {
            return 0;
        }
    }

    function _median3(int256 a, int256 b, int256 c) internal pure returns (int256) {
        if ((a <= b && b <= c) || (c <= b && b <= a)) return b;
        if ((b <= a && a <= c) || (c <= a && a <= b)) return a;
        return c;
    }

    function _scale(int256 answer, uint8 dec) internal pure returns (int256) {
        if (dec == 7) return answer;
        if (dec > 7) return answer / int256(10 ** (dec - 7));
        return answer * int256(10 ** (7 - dec));
    }
}
