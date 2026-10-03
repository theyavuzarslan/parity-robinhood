# HackQuest submission text (paste-ready)

**Project name:** Parity

**One-liner:** Forwards on Robinhood Stock Tokens, priced on-chain from interest-rate parity instead of quoted by a dealer.

**Track:** Open Category (Robinhood Chain)

**Network / contract:** Robinhood Chain testnet (46630), Parity at `0xC8d380BA72275D2967CA6Ea3cFB66a968835A802` (verified on Blockscout)

**Repo:** https://github.com/theyavuzarslan/parity-robinhood

## Description

Stock Tokens trade 24/7 on Robinhood Chain, but nothing on-chain lets you lock a future price for them. Perps have no maturity and a funding rate that moves every hour. Parity is a two-sided, margined forward market for Stock Tokens.

The price is not anyone's quote. Robinhood Stock Tokens are total-return tokens: dividends reinvest through the ERC-8056 multiplier, and the Chainlink feed already includes it. So the parity forward is spot plus the cost of carry, F = S × (1 + r_USD × t/360). Both inputs are on-chain on Robinhood Chain mainnet: spot from the Chainlink Stock Token feed, and r_USD from the Morpho USDG market's supply rate. Our mainnet fork tests read both live.

Positions open by request for quote. A hedger posts pair, size and tenor, the contract publishes the parity forward, and makers compete only on the spread over it. Accepting opens the position in one transaction, with 5% margin from each side. The contract marks to market and flags margin calls. Anyone can liquidate a breached side: the first breach closes 30% and keeps the rest collateralized, and a gap past the margin runs a fixed waterfall (loser's margin, then insurance fund, then a haircut on the winner). At maturity it settles in cash.

## What we built

- Solidity engine plus a Chainlink adapter (staleness, corporate-action pause, sequencer check, three-print median), a live Morpho rate source and testnet price and rate sources.
- 33 unit tests (lifecycle, both waterfall branches, fuzzed arithmetic, every oracle guard) and 4 Robinhood mainnet fork tests (real TSLA and NVDA feeds, live USDG rate).
- Deployed and verified on Robinhood Chain testnet. The full demo (open, margin call, partial liquidation, gap liquidation through the waterfall, settlement) ran on-chain; the README links every transaction.
- A Next.js frontend wired to the deployment: market, maker, positions and demo controls.

Forked from our Stellar FX-forward project Parity and rebuilt for EVM and Robinhood Chain during the buildathon.

**Team:** Nur Kardelen, Atakan Yavuzarslan
