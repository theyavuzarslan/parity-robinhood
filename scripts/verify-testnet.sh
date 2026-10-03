#!/usr/bin/env bash
# Verify the deployed contracts on Robinhood Chain testnet Blockscout.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
CHAIN="${CHAIN:-46630}"
RPC="${RPC:-https://rpc.testnet.chain.robinhood.com/rpc}"
EXPLORER_API="${EXPLORER_API:-https://explorer.testnet.chain.robinhood.com/api/}"
J="deployments/$CHAIN.json"
get() { python3 -c "import json;print(json.load(open('$J'))['$1'])"; }
for entry in "parity:contracts/Parity.sol:Parity" \
             "priceSource:contracts/oracles/AdminPriceSource.sol:AdminPriceSource" \
             "rateSource:contracts/rates/GovernanceRateSource.sol:GovernanceRateSource" \
             "usdg:contracts/mocks/MockERC20.sol:MockERC20"; do
  key="${entry%%:*}"; contract="${entry#*:}"
  echo "== $contract"
  forge verify-contract "$(get "$key")" "$contract" \
    --verifier blockscout --verifier-url "$EXPLORER_API" \
    --rpc-url "$RPC" --guess-constructor-args --watch 2>&1 | grep -iE "verified|success|error|fail|already|pass" | head -3
done
