#!/usr/bin/env bash
# Copy ABIs and deployment records into the frontend. Run after `forge build` or a deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
forge build -q
mkdir -p frontend/src/abi frontend/src/deployments
node - <<'JS'
const fs = require('fs');
const gen = (art, name, out, note) => {
  const abi = JSON.parse(fs.readFileSync(`out/${art}`)).abi;
  fs.writeFileSync(`frontend/src/abi/${out}.ts`, `// Generated from out/${art} by scripts/sync-frontend.sh${note ? ' ' + note : ''}\nexport const ${name} = ${JSON.stringify(abi, null, 1)} as const;\n`);
};
gen('Parity.sol/Parity.json', 'parityAbi', 'parity');
gen('AdminPriceSource.sol/AdminPriceSource.json', 'adminPriceSourceAbi', 'adminPriceSource');
gen('GovernanceRateSource.sol/GovernanceRateSource.json', 'governanceRateSourceAbi', 'governanceRateSource');
gen('MockERC20.sol/MockERC20.json', 'erc20Abi', 'erc20', '(mintable ERC-20 used as the testnet USDG)');
const deployments = {};
for (const f of fs.readdirSync('deployments')) {
  if (!f.endsWith('.json')) continue;
  const d = JSON.parse(fs.readFileSync(`deployments/${f}`));
  deployments[String(d.chainId)] = d;
}
fs.writeFileSync('frontend/src/deployments/deployments.json', JSON.stringify(deployments, null, 2) + '\n');
console.log('synced chains:', Object.keys(deployments).join(', ') || '(none)');
JS
