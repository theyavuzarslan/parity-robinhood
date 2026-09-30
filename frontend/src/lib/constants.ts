// Arc Testnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002;

// USDC on Arc (same address on mainnet and testnet — it's a native predeploy)
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

// ParityFX contract deployed on Arc Testnet
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x734f920687253a7057e716af74771a0bfda390de"
) as `0x${string}`;

// Decimal convention: all on-chain values use 7-decimal fixed-point (1e7 = 1.0)
// USDC ERC-20 uses 6 decimals. Conversion: 7dec / 10 = 6dec.
export const INTERNAL_DECIMALS = 1e7;
export const USDC_DECIMALS     = 6;

// Currency symbol hashes: keccak256(abi.encodePacked("SYMBOL"))
// Matches how the Solidity contract keys its rates mapping.
export const CURRENCY_HASHES: Record<string, `0x${string}`> = {
  USD: "0xc4ae21aac0c6549d71dd96035b7e0bdb6c79ebdba8891b666115bc976d16a29e",
  MXN: "0xa94b0702860cb929d0ee0c60504dd565775a058bf1d2a2df074c1db0a66ad582",
  TRY: "0x128d6c262d1afe2351c6e93ceea68e00992708cfcbc0688408b9a23c0c543db2",
};

// Pairs shown in the UI
export const PAIRS = ["MXN/USD", "TRY/USD"] as const;
export type Pair = (typeof PAIRS)[number];
export const TENORS = [30, 60, 90, 180, 360] as const;

// Protocol parameters (mirror constructor args used during deploy)
export const MARGIN_PCT      = 500;   // 5% in bps
export const MAINT_MARGIN_PCT = 250;  // 2.5% in bps
export const OPEN_FEE_BPS    = 2;     // 0.02% in bps
export const PARTIAL_LIQ_PCT = 3000;  // 30% in bps

// Legacy threshold constants (kept for UI components)
export const MARGIN_CALL_THRESHOLD  = 0.5;  // 50% loss triggers margin call
export const LIQUIDATION_THRESHOLD  = 1.0;  // 100% loss triggers liquidation

// Arc Testnet RPC & explorer
export const ARC_TESTNET_RPC      = "https://rpc.testnet.arc.io";
export const ARC_TESTNET_EXPLORER = "https://explorer.testnet.arc.io";
