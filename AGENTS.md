# Parity FX — Arc Port

## Deployed Contracts

| Contract | Network     | Address                                    | Explorer |
|----------|-------------|---------------------------------------------|---------|
| ParityFX | Arc Testnet | 0x734f920687253a7057e716af74771a0bfda390de | https://explorer.testnet.arc.io/address/0x734f920687253a7057e716af74771a0bfda390de |

## Constructor Args (at deploy)
- admin: 0x5B12Ce46C7194aD57d143bC22847224047b1Ef42 (platform deployer)
- marginPct: 500 (5% initial margin)
- maintMarginPct: 250 (2.5% maintenance margin)
- openFeeBps: 2 (0.02% open fee)
- partialLiqPct: 3000 (30% partial liquidation)
- usdc: 0x3600000000000000000000000000000000000000 (USDC on Arc)

## Architecture

Original chain: Stellar (Soroban) — ported to Arc (EVM/Solidity).

- contracts/ParityFX.sol — full port of the Soroban contract
- frontend/ — Next.js 14 with wagmi v2 + ConnectKit for Arc Testnet

## Key Design

- 7-decimal fixed-point arithmetic (1e7 = 1.0) — same as Stellar port
- USDC (6 decimals ERC-20) used for all margin and settlement
- CIP forward formula: F = S * (1 + r_quote * t/360) / (1 + r_base * t/360)
- Rates stored as keccak256(abi.encodePacked("SYMBOL")) keys in mapping
