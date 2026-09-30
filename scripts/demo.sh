#!/usr/bin/env bash
# Run one demo step on the deployed contracts: scripts/demo.sh <1..5>
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
set -a; [ -f .env ] && source .env; set +a
RPC="${RPC:-${ROBINHOOD_TESTNET_RPC:-https://rpc.testnet.chain.robinhood.com/rpc}}"
STEP="${1:?usage: scripts/demo.sh <step 1-5>}"
forge script script/Demo.s.sol --sig "step(uint8)" "$STEP" --rpc-url "$RPC" --broadcast --private-key "$PRIVATE_KEY"
