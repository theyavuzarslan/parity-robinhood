import { robinhoodTestnet, robinhood, anvil } from "viem/chains";
import type { Chain } from "viem";
import deployments from "@/deployments/deployments.json";

/** Chains the app knows how to talk to. Robinhood Chain testnet is the submission target. */
export const CHAINS: Record<number, Chain> = {
  [robinhoodTestnet.id]: robinhoodTestnet,
  [robinhood.id]: robinhood,
  [anvil.id]: anvil,
};

export const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || robinhoodTestnet.id);

export interface Deployment {
  chainId: number;
  deployer: `0x${string}`;
  parity: `0x${string}`;
  usdg: `0x${string}`;
  priceSource: `0x${string}`;
  rateSource: `0x${string}`;
  block: number;
}

const ENV_DEPLOYMENT: Deployment | null = process.env.NEXT_PUBLIC_PARITY_ADDRESS
  ? {
      chainId: DEFAULT_CHAIN_ID,
      deployer: "0x0000000000000000000000000000000000000000",
      parity: process.env.NEXT_PUBLIC_PARITY_ADDRESS as `0x${string}`,
      usdg: (process.env.NEXT_PUBLIC_USDG_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      priceSource: (process.env.NEXT_PUBLIC_PRICE_SOURCE || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      rateSource: (process.env.NEXT_PUBLIC_RATE_SOURCE || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      block: 0,
    }
  : null;

/** Deployment record for a chain: env override first, then deployments/<chainId>.json synced from Foundry. */
export function getDeployment(chainId: number = DEFAULT_CHAIN_ID): Deployment | null {
  if (ENV_DEPLOYMENT && ENV_DEPLOYMENT.chainId === chainId) return ENV_DEPLOYMENT;
  const d = (deployments as Record<string, Deployment>)[String(chainId)];
  return d ?? null;
}

export function explorerUrl(chainId: number): string {
  return CHAINS[chainId]?.blockExplorers?.default.url ?? "";
}

export function rpcUrl(chainId: number): string {
  if (chainId === robinhoodTestnet.id) return process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC || "https://rpc.testnet.chain.robinhood.com/rpc";
  return CHAINS[chainId]?.rpcUrls.default.http[0] ?? "";
}

// ── Market configuration ──────────────────────────────────────────────────

export interface PairDef {
  /** Display id, e.g. "TSLA/USD" */
  id: string;
  base: string;
  quote: string;
  /** Margin token is the quote currency (stock corridors) or the base (fiat corridors with USD margin). */
  marginInQuote: boolean;
  kind: "stock" | "fx";
  /** Human unit for the notional. */
  unit: string;
  description: string;
}

export const PAIRS: PairDef[] = [
  { id: "TSLA/USD", base: "TSLA", quote: "USD", marginInQuote: true, kind: "stock", unit: "TSLA", description: "Tesla Stock Token" },
  { id: "AMZN/USD", base: "AMZN", quote: "USD", marginInQuote: true, kind: "stock", unit: "AMZN", description: "Amazon Stock Token" },
  { id: "NFLX/USD", base: "NFLX", quote: "USD", marginInQuote: true, kind: "stock", unit: "NFLX", description: "Netflix Stock Token" },
  { id: "PLTR/USD", base: "PLTR", quote: "USD", marginInQuote: true, kind: "stock", unit: "PLTR", description: "Palantir Stock Token" },
  { id: "AMD/USD", base: "AMD", quote: "USD", marginInQuote: true, kind: "stock", unit: "AMD", description: "AMD Stock Token" },
  { id: "USD/MXN", base: "USD", quote: "MXN", marginInQuote: false, kind: "fx", unit: "USD", description: "Peso corridor from the Stellar original" },
];

export const STOCK_PAIRS = PAIRS.filter((p) => p.kind === "stock");
export const DEFAULT_PAIR = PAIRS[0];
export const TENORS = [7, 30, 60, 90, 180] as const;
export const RATE_SYMBOLS = ["USD", "MXN"] as const;

export function findPair(base: string, quote: string): PairDef | undefined {
  return PAIRS.find((p) => p.base === base && p.quote === quote);
}

/** Protocol parameters as deployed (mirrors Parity.Params in script/Deploy.s.sol). */
export const PARAMS = {
  marginBps: 500,      // 5% initial margin
  callBps: 250,        // margin call at a 2.5% loss (half the initial margin)
  liqBps: 375,         // liquidatable at a 3.75% loss (75% of the initial margin)
  openFeeBps: 2,
  partialLiqBps: 3000, // first breach closes 30%
  liqPenaltyBps: 100,
};

export const INTERNAL_DECIMALS = 1e7;
export const USDG_DECIMALS = 6;
