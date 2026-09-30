#!/usr/bin/env bash
# Deploy the demo to Robinhood Chain testnet (or another chain via RPC=...).
# Needs PRIVATE_KEY in .env, funded at https://faucet.testnet.chain.robinhood.com (0.01 ETH per day).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
set -a; [ -f .env ] && source .env; set +a
RPC="${RPC:-${ROBINHOOD_TESTNET_RPC:-https://rpc.testnet.chain.robinhood.com/rpc}}"
: "${PRIVATE_KEY:?set PRIVATE_KEY in .env}"
forge script script/Deploy.s.sol --rpc-url "$RPC" --broadcast --private-key "$PRIVATE_KEY" "$@"
CHAIN=$(cast chain-id --rpc-url "$RPC")
echo
echo "Deployment written to deployments/$CHAIN.json"
echo "Frontend: cp deployments/$CHAIN.json frontend/src/deployments/  (or run scripts/sync-frontend.sh)"
