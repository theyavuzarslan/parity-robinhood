#!/usr/bin/env bash
# Local dry run: anvil + deploy + the five demo steps. Proves the deploy script and demo path end to end.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
anvil --silent --port 8545 &
ANVIL=$!
trap 'kill $ANVIL' EXIT
sleep 2
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key "$PRIVATE_KEY" -q
for s in 1 2 3 4 5 6; do
  forge script script/Demo.s.sol --sig "step(uint8)" $s --rpc-url http://127.0.0.1:8545 --broadcast --private-key "$PRIVATE_KEY" -q 2>&1 | grep -E "^  [a-z]" || true
done
echo "local run complete"
