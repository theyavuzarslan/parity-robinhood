"use client";
/**
 * EVM contract interaction helpers for ParityFX on Arc Testnet.
 * All on-chain values use 7-decimal fixed-point (DECIMALS = 1e7).
 * USDC margin amounts are in 7-decimal units; convert to 6-decimal USDC
 * by dividing by 10 (1e7 / 10 = 1e6).
 */

import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";
import { CONTRACT_ADDRESS, ARC_TESTNET_RPC, CURRENCY_HASHES, INTERNAL_DECIMALS } from "./constants";

// ─── RPC client (read-only) ─────────────────────────────────────────────────

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(ARC_TESTNET_RPC),
});

// ─── Minimal ABI for read calls (JSON ABI format — no parseAbi tuple syntax) ─

const PARITY_ABI = [
  {
    name: "getSpot",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "int256" }],
  },
  {
    name: "getRate",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "currency", type: "bytes32" }],
    outputs: [{ name: "", type: "int256" }],
  },
  {
    name: "getInsuranceBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "int256" }],
  },
  {
    name: "getPosition",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "hedger", type: "address" },
          { name: "maker", type: "address" },
          { name: "pairBase", type: "bytes32" },
          { name: "pairQuote", type: "bytes32" },
          { name: "direction", type: "uint8" },
          { name: "notional", type: "int256" },
          { name: "lockedForward", type: "int256" },
          { name: "tenorDays", type: "uint32" },
          { name: "openTime", type: "uint64" },
          { name: "maturityTime", type: "uint64" },
          { name: "hedgerMargin", type: "int256" },
          { name: "makerMargin", type: "int256" },
          { name: "hedgerState", type: "uint8" },
          { name: "makerState", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "lastMarkValue", type: "int256" },
          { name: "lastMarkTime", type: "uint64" },
        ],
      },
    ],
  },
  {
    name: "getRequest",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "hedger", type: "address" },
          { name: "pairBase", type: "bytes32" },
          { name: "pairQuote", type: "bytes32" },
          { name: "direction", type: "uint8" },
          { name: "notional", type: "int256" },
          { name: "tenorDays", type: "uint32" },
          { name: "parityForward", type: "int256" },
          { name: "createdAt", type: "uint64" },
          { name: "quoteCount", type: "uint64" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    name: "getOpenRequests",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
] as const;

// ─── Pure forward computation (CIP formula, no RPC needed) ──────────────────
// All values in human-decimal (e.g. spot = 20.0, rate = 0.10)
// Returns human-decimal forward price.

export function computeForward(
  spot: number,
  rateBase: number,
  rateQuote: number,
  tenorDays: number
): number {
  const t = tenorDays / 360;
  return spot * (1 + rateQuote * t) / (1 + rateBase * t);
}

// ─── On-chain view helpers ───────────────────────────────────────────────────

async function readContract<T>(
  functionName: string,
  args: unknown[] = []
): Promise<T | null> {
  if (!CONTRACT_ADDRESS) return null;
  try {
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: PARITY_ABI,
      functionName: functionName as Parameters<typeof client.readContract>[0]["functionName"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: args as any,
    });
    return result as T;
  } catch (err) {
    console.error(`readContract ${functionName} failed:`, err);
    return null;
  }
}

/** Returns spot price as a human decimal (e.g. 20.0 for MXN/USD). */
export async function getSpot(): Promise<number | null> {
  const raw = await readContract<bigint>("getSpot");
  if (raw === null) return null;
  return Number(raw) / INTERNAL_DECIMALS;
}

/** Returns the governance rate for a currency symbol (e.g. "MXN") as a decimal (e.g. 0.10). */
export async function getRate(currency: string): Promise<number | null> {
  const hash = CURRENCY_HASHES[currency];
  if (!hash) return null;
  const raw = await readContract<bigint>("getRate", [hash]);
  if (raw === null) return null;
  return Number(raw) / INTERNAL_DECIMALS;
}

/** Returns the insurance fund balance in USDC (6 decimals). */
export async function getInsuranceBalance(): Promise<number | null> {
  const raw = await readContract<bigint>("getInsuranceBalance");
  if (raw === null) return null;
  // Contract stores in 7-decimal USDC-equiv; convert to human USDC
  return Number(raw) / INTERNAL_DECIMALS;
}

/** Returns raw position data for a given position ID, or null if not found. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPosition(positionId: number): Promise<any | null> {
  return readContract("getPosition", [BigInt(positionId)]);
}

/** Returns raw request data for a given request ID, or null if not found. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRequest(requestId: number): Promise<any | null> {
  return readContract("getRequest", [BigInt(requestId)]);
}

/** Returns the list of open request IDs. */
export async function getOpenRequests(): Promise<number[] | null> {
  const result = await readContract<bigint[]>("getOpenRequests");
  if (result === null) return null;
  return result.map(Number);
}

// ─── Write function stubs ────────────────────────────────────────────────────
// These are called from AdminPanel; full implementation requires the connected
// wallet to sign transactions (wagmi useWriteContract). The stubs show an alert
// until the contract is deployed and wallet write wiring is complete.

export async function setSpotPrice(_admin: string, _price: number): Promise<boolean> {
  alert("Admin write functions require wallet signing — deploy the contract first.");
  return false;
}

export async function setRate(_admin: string, _currency: string, _rate: number): Promise<boolean> {
  alert("Admin write functions require wallet signing — deploy the contract first.");
  return false;
}

export async function setTime(_admin: string, _timestamp: number): Promise<boolean> {
  alert("Admin write functions require wallet signing — deploy the contract first.");
  return false;
}

export async function addEligible(_admin: string, _account: string): Promise<boolean> {
  alert("Admin write functions require wallet signing — deploy the contract first.");
  return false;
}

// ── Position action stubs (require wagmi useWriteContract) ───────────────────
// Full implementation needs the connected wallet to sign; stubs for now.

export async function markPosition(_positionId: number): Promise<boolean> {
  alert("markPosition: connect wallet and use the Positions page to mark on-chain.");
  return false;
}

export async function topUpMargin(_caller: string, _positionId: number, _amount: number): Promise<boolean> {
  alert("topUpMargin: connect wallet and approve USDC first.");
  return false;
}

export async function liquidate(_positionId: number): Promise<boolean> {
  alert("liquidate: connect wallet. Anyone can liquidate a breached position.");
  return false;
}

export async function settle(_positionId: number): Promise<boolean> {
  alert("settle: connect wallet. Position must be at or past maturity.");
  return false;
}

export async function postRequest(
  _hedger: string, _pairBase: string, _pairQuote: string,
  _direction: string, _notional: number, _tenorDays: number, _marginToken: string,
): Promise<boolean> {
  alert("postRequest: connect wallet. Your address must be on the eligibility allowlist.");
  return false;
}

export async function submitQuote(
  _maker: string, _requestId: number, _spreadBps: number, _expiry: number,
): Promise<boolean> {
  alert("submitQuote: connect wallet. Maker margin is reserved at submission.");
  return false;
}

export async function cancelQuote(_maker: string, _requestId: number, _quoteId: number): Promise<void> {
  alert("cancelQuote: connect wallet. Only the maker can cancel their own live quote.");
}

export async function acceptQuote(_hedger: string, _requestId: number, _quoteId: number): Promise<boolean> {
  alert("acceptQuote: connect wallet. Approve USDC first — hedger margin + open fee are taken here.");
  return false;
}
