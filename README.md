# Parity: forwards on Robinhood Stock Tokens

A two-sided, margined forward market on Robinhood Chain. The forward price is computed on-chain from interest-rate parity instead of quoted by a dealer, positions open through request for quote (RFQ), and the contract handles margin calls, liquidation, bad debt and cash settlement.

Built for **Arbitrum Open House Singapore** (Robinhood Chain). Forked from Parity, our Stellar FX-forward market ([nurkardelens/parity-stellar](https://github.com/nurkardelens/parity-stellar)), and rebuilt for EVM.

## Why it works on Robinhood Chain

Robinhood Stock Tokens are **total-return** ERC-20s. Dividends reinvest through the ERC-8056 `uiMultiplier`, and each token's Chainlink feed already prices that in. A Stock Token therefore has no separate yield, and the parity forward collapses to the cost of carry:

```
F = S × (1 + r_quote × t/360) / (1 + r_base × t/360)
TSLA/USD, r_TSLA = 0:   F = S × (1 + r_USD × t/360)
```

Both inputs are on-chain on Robinhood Chain mainnet:

| Input | Source | Read in tests |
| --- | --- | --- |
| Spot `S` | Chainlink `Robinhood TSLA / USD` feed | $354.385 (30 Sep 2026) |
| USD rate `r_USD` | Morpho Blue USDG market, supply rate from its interest rate model | 3.59% annual (4 Oct 2026) |

So the 90-day TSLA forward is **not anyone's quote**. It falls out of two numbers the chain already publishes. Makers compete only on the spread they quote over it.

## Who uses it

- **A holder who needs to sell later at a known price**: an employee with vesting stock, a treasury, or a fund with a redemption date sells forward and locks the price today without selling the token now.
- **A buyer who wants exposure later without paying now**: they buy forward and post 5% margin instead of the full notional.
- **Makers** (market makers, basis traders, vaults) quote a spread over the parity forward and earn it. They can hedge with the spot token on Robinhood Chain's DEXs or with Morpho borrowing.

Stock Tokens trade 24/7 on Robinhood Chain, but nothing on-chain fixes a future price for them. Perps exist, but a perp has no maturity, a funding rate that moves every hour, and no locked price. A forward has all three.

## Contracts

| Contract | Role |
| --- | --- |
| [`Parity.sol`](contracts/Parity.sol) | The engine: RFQ, positions, mark to market, margin calls, partial and full liquidation, insurance fund, cash settlement |
| [`ChainlinkPriceSource.sol`](contracts/oracles/ChainlinkPriceSource.sol) | Mainnet price adapter. Rejects stale prints (per-pair max age, weekend aware), non-positive answers and prices during corporate actions (`oraclePaused()`); optional L2 sequencer check. Liquidation uses the median of the last three rounds |
| [`MorphoRateSource.sol`](contracts/rates/MorphoRateSource.sol) | Live USD leg: the USDG supply rate of a Morpho Blue market, borrow rate × utilization × (1 − fee), annualised |
| [`GovernanceRateSource.sol`](contracts/rates/GovernanceRateSource.sol) | Owner-set rates; the fallback and the testnet source |
| [`AdminPriceSource.sol`](contracts/oracles/AdminPriceSource.sol) | Owner-set prices with the same three-print median, for testnet (Stock Token feeds exist on mainnet only) |

### Lifecycle

1. **Post request.** The hedger names pair, direction, notional and tenor. The contract reads spot and both rates, computes the parity forward, and publishes it with the request.
2. **Quote.** Makers quote a spread in basis points over that forward. The maker's initial margin is reserved at quote time, so acceptance needs no second signature. Cancel returns it.
3. **Accept.** The hedger accepts one quote. The position opens, the hedger's margin and a 2 bps open fee (to the insurance fund) are taken, and the request closes, all in one transaction. Expired, cancelled and already-accepted quotes revert.
4. **Mark.** Anyone can mark. The forward is recomputed for the remaining tenor; each side becomes `Safe`, `Called` (loss ≥ 2.5% of notional value) or `Breached` (≥ 3.75%).
5. **Liquidate.** Anyone can liquidate a breached side at the three-print median price. The first breach closes 30% of the position and realizes that slice's loss plus a 1% penalty from the loser's margin, leaving the rest of the position collateralized. The second breach, or a gap the margin cannot cover, closes everything.
6. **Settle.** At maturity the forward equals spot; the difference is paid in USDG and both margins are returned net.

Unfunded losses follow one waterfall everywhere: **loser's margin → insurance fund → haircut on the winner's payout**. Nothing is socialized beyond the two counterparties and the fund.

### Parameters

| Parameter | Value |
| --- | --- |
| Initial margin | 5% of notional value, per side |
| Margin call | loss ≥ 2.5% |
| Liquidatable | loss ≥ 3.75% |
| First liquidation | closes 30% |
| Liquidation penalty | 1% of liquidated notional value, to the insurance fund |
| Open fee | 2 bps, to the insurance fund |
| Numerics | 7-decimal fixed point, multiply before divide |

`setDemoTime` lets the demo jump to day 30 or day 90. It only works when the immutable `demoMode` flag was set at deployment; a production deployment cannot move its clock (tested on a mainnet fork).

## Deployed on Robinhood Chain testnet (46630)

All four contracts are verified on Blockscout.

| Contract | Address |
| --- | --- |
| Parity | [`0xC8d380BA72275D2967CA6Ea3cFB66a968835A802`](https://explorer.testnet.chain.robinhood.com/address/0xC8d380BA72275D2967CA6Ea3cFB66a968835A802) |
| AdminPriceSource | [`0x0Fa0E7Db5b2c2146D77E41579030A842492E2120`](https://explorer.testnet.chain.robinhood.com/address/0x0Fa0E7Db5b2c2146D77E41579030A842492E2120) |
| GovernanceRateSource | [`0x41F968CcA0a95d4289D356c24668b1c72e645DbF`](https://explorer.testnet.chain.robinhood.com/address/0x41F968CcA0a95d4289D356c24668b1c72e645DbF) |
| USDG (mintable testnet stand-in, 6 dec) | [`0x71da6a936f1196881C236c62a084ddEB448772Ba`](https://explorer.testnet.chain.robinhood.com/address/0x71da6a936f1196881C236c62a084ddEB448772Ba) |

Pairs: TSLA, AMZN, NFLX, PLTR and AMD against USD (bound to the canonical faucet Stock Tokens), plus USD/MXN from the Stellar original. Access is open on testnet; the allowlist is one call away (`setOpenAccess(false)`).

### The demo, on-chain

1,000 TSLA sold forward for 90 days. Spot 300, USD rate 4%, so the parity forward is **303.00** and each side posts 15,000 USDG.

| Step | What happens | Transaction |
| --- | --- | --- |
| 1 | Post request; the forward computes to 303.00 | [postRequest](https://explorer.testnet.chain.robinhood.com/tx/0x4bd4625af27645b80980fb5e8ae8877d452824fed01f0b7c5e5651b3463a2f5e) |
| 1 | Maker quotes at zero spread, reserving 15,000 USDG | [submitQuote](https://explorer.testnet.chain.robinhood.com/tx/0x260348578439d4a185879b6b3f0e22fa01ce29900f3aa977577da06f6b55c646) |
| 1 | Hedger accepts; position opens in one transaction | [acceptQuote](https://explorer.testnet.chain.robinhood.com/tx/0x75b3ba852c5f69cc619cee62ebc12aa2092adb992fd3986d7b98d3548fb81c01) |
| 2 | Day 30, spot 310: hedger down 9,067, **margin call** | [markPosition](https://explorer.testnet.chain.robinhood.com/tx/0xace2126c339483a5edd927ebff74c8de6cc7bf49d4030d9b519136d986296ca2) |
| 3 | Spot 315 on two prints: **partial liquidation**, 30% closed, 4,230 loss + 900 penalty realized | [liquidate](https://explorer.testnet.chain.robinhood.com/tx/0x791681a5d76b1a50a41741db8923386bcc477f1a4d5d99a657c819ccfe012643) |
| 4 | Gap to 335: **full liquidation** through the waterfall; insurance fund drained, winner haircut | [liquidate](https://explorer.testnet.chain.robinhood.com/tx/0x20acb9ebd71b844e6161803ace566d7188588efc442db7f1d9ec69260ed48c7c) |
| 5 | Fresh position at 303.00 | [acceptQuote](https://explorer.testnet.chain.robinhood.com/tx/0x0b19c02bd7852ed79234d349cb6d8ba26cfd7ff3f4297b06f87c575ff988d3ca) |
| 6 | Day 90, spot 310: **cash settlement**, hedger pays 7,000, margins returned | [settle](https://explorer.testnet.chain.robinhood.com/tx/0xb282f7c6ba9995e076cb766fe548c77c224b9053a8b24e016c695fa9eeaad66b) |

The whole deployment cost about 0.00014 ETH in gas.

## Tests

```bash
forge test --no-match-contract Fork
```

33 tests: forward and valuation arithmetic (including fuzzed "both sides sum to zero" and "no overflow"), the full RFQ lifecycle, stale, cancelled and double-accept rejection, margin call and top-up, partial then full liquidation, maker-side liquidation, settlement, both waterfall branches (fund covers / winner haircut), a seeded insurance fund, the demo-mode gate, and every Chainlink adapter guard. The lifecycle tests also assert that the contract's token balance equals open margins + reserved quote margins + the insurance fund, or reaches zero after a full close.

```bash
ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com \
MORPHO_USDG_MARKET=0xc845da65a020ddca5f132efa8fea79676d8edfdea504226a4c01e7a9e34cddd6 \
forge test --match-contract Fork -vv
```

4 tests on a **Robinhood Chain mainnet fork**: read the real TSLA token (`uiMultiplier`, `oraclePaused`) and its Chainlink feed, price 90-day TSLA and 30-day NVDA forwards from them, read the live USDG supply rate from Morpho and feed it into the forward, and confirm a production-shaped deployment (`demoMode = false`) cannot move its clock.

## Run it yourself

```bash
git submodule update --init   # OpenZeppelin v5.1.0, forge-std
scripts/local.sh         # anvil + deploy + the six demo steps
cp .env.example .env     # add PRIVATE_KEY funded at faucet.testnet.chain.robinhood.com
scripts/deploy-testnet.sh
for s in 1 2 3 4 5 6; do scripts/demo.sh $s; done
scripts/verify-testnet.sh
```

## What is not done

- **Frontend.** `frontend/` is a Next.js app carried over from the Arc port. Its chain config, ABIs and read layer are rebuilt for Robinhood Chain; the pages are not yet wired to them, so the demo runs through the scripts and the explorer links above.
- **Physical settlement.** Delivering the Stock Token itself against USDG at maturity is a natural next step, since the tokens are plain ERC-20s. Today settlement is cash only.
- **Mainnet.** Not deployed. Stock Tokens are tokenized debt securities restricted for US persons and some other jurisdictions; a mainnet version needs an eligibility policy for who can take the long side, which the allowlist already supports. Not legal advice.
- **No audit.**

## Team

- Nur Kardelen
- Atakan Yavuzarslan

MIT licensed.
