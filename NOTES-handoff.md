# Hand-off notes (30 Sep 2026, session paused at usage limit)

## Done
- `contracts/`: Parity engine, ChainlinkPriceSource, AdminPriceSource, GovernanceRateSource, MorphoRateSource, mocks.
- `test/`: 33 unit tests + 4 Robinhood mainnet fork tests, all green.
  - `forge test --no-match-contract Fork`
  - `ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com MORPHO_USDG_MARKET=0xc845da65a020ddca5f132efa8fea79676d8edfdea504226a4c01e7a9e34cddd6 forge test --match-contract Fork -vv`
- `script/Deploy.s.sol`, `script/Demo.s.sol`, `scripts/*.sh`; `scripts/local.sh` runs deploy + 5 demo steps on anvil.
- Frontend: Stellar deps removed, packages installed, ABIs generated (`src/abi`), `src/lib/{constants,format,contract}.ts` rewritten for Robinhood Chain.

## Left
1. Frontend: `src/lib/hooks.ts` (wagmi writes: approve, postRequest, submitQuote, acceptQuote, cancelQuote, markPosition, topUpMargin, liquidate, settle, admin setSpot/setRate/setDemoTime, USDG mint), then pages and components still import the old Arc/mock API (`page.tsx`, `maker`, `positions`, `admin`, components). `Web3Provider.tsx` still targets `arcTestnet`; switch to `robinhoodTestnet` from `viem/chains`.
2. Deploy to Robinhood Chain testnet: needs a funded key (`.env` PRIVATE_KEY, faucet is browser-only), then `scripts/deploy-testnet.sh` and `scripts/sync-frontend.sh`.
3. README.md and SUBMISSION.md rewrite for the Open House (judging: contract quality, PMF, innovation, real problem). `docs/pitch-deck-content.md` still describes the Stellar version.
4. Register on HackQuest by 2 Oct; submit by 4 Oct.
