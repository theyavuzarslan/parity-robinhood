"use client";
/**
 * Read-side helpers for Parity. All on-chain values are 7-decimal fixed point (1e7 = 1.0);
 * these helpers convert to plain numbers for the UI. Writes live in hooks.ts.
 */
import { createPublicClient, http, type PublicClient } from "viem";
import { parityAbi } from "@/abi/parity";
import { erc20Abi } from "@/abi/erc20";
import { CHAINS, DEFAULT_CHAIN_ID, getDeployment, rpcUrl, findPair, type PairDef } from "./constants";
import { fromD, fromBytes32, toBytes32 } from "./format";

const clients: Record<number, PublicClient> = {};

export function getClient(chainId: number = DEFAULT_CHAIN_ID): PublicClient {
  if (!clients[chainId]) {
    clients[chainId] = createPublicClient({ chain: CHAINS[chainId], transport: http(rpcUrl(chainId)) });
  }
  return clients[chainId];
}

export type Direction = "SellBase" | "BuyBase";
export const DIRECTION_INDEX: Record<Direction, number> = { SellBase: 0, BuyBase: 1 };
export type SideState = "Safe" | "Called" | "Breached";
const SIDE_STATES: SideState[] = ["Safe", "Called", "Breached"];
export type PositionStatus = "Active" | "Settled" | "Liquidated";
const POSITION_STATUSES: PositionStatus[] = ["Active", "Settled", "Liquidated"];
export type RequestStatus = "Open" | "Filled" | "Cancelled";
const REQUEST_STATUSES: RequestStatus[] = ["Open", "Filled", "Cancelled"];
export type QuoteStatus = "Live" | "Cancelled" | "Accepted";
const QUOTE_STATUSES: QuoteStatus[] = ["Live", "Cancelled", "Accepted"];

export interface Quote {
  id: number;
  requestId: number;
  maker: `0x${string}`;
  spreadBps: number;
  lockedForward: number;
  expiry: number;
  status: QuoteStatus;
}

export interface Request {
  id: number;
  hedger: `0x${string}`;
  base: string;
  quote: string;
  pair: PairDef | undefined;
  direction: Direction;
  notional: number;
  tenorDays: number;
  parityForward: number;
  initialMargin: number;
  status: RequestStatus;
  createdAt: number;
  quotes: Quote[];
}

export interface Position {
  id: number;
  hedger: `0x${string}`;
  maker: `0x${string}`;
  base: string;
  quote: string;
  pair: PairDef | undefined;
  direction: Direction;
  notional: number;
  notionalValue: number;
  lockedForward: number;
  tenorDays: number;
  openTime: number;
  maturityTime: number;
  initialMargin: number;
  callThreshold: number;
  liqThreshold: number;
  hedgerMargin: number;
  makerMargin: number;
  hedgerState: SideState;
  makerState: SideState;
  hedgerPartialDone: boolean;
  makerPartialDone: boolean;
  status: PositionStatus;
  lastMarkValue: number;
  lastMarkTime: number;
  /** Live mark from previewMark (hedger's perspective), if it could be read. */
  markValue: number | null;
  currentForward: number | null;
  spot: number | null;
}

export interface ForwardPreview {
  forward: number;
  spot: number;
  rateBase: number;
  rateQuote: number;
}

function contractOf(chainId: number) {
  const d = getDeployment(chainId);
  if (!d) throw new Error(`no Parity deployment for chain ${chainId}`);
  return { address: d.parity, abi: parityAbi } as const;
}

export async function previewForward(base: string, quote: string, tenorDays: number, chainId = DEFAULT_CHAIN_ID): Promise<ForwardPreview | null> {
  try {
    const [forward, spot, rateBase, rateQuote] = await getClient(chainId).readContract({
      ...contractOf(chainId),
      functionName: "previewForward",
      args: [toBytes32(base), toBytes32(quote), tenorDays],
    });
    return { forward: fromD(forward), spot: fromD(spot), rateBase: fromD(rateBase), rateQuote: fromD(rateQuote) };
  } catch (err) {
    console.warn("previewForward failed", base, quote, err);
    return null;
  }
}

export async function getInsuranceBalance(chainId = DEFAULT_CHAIN_ID): Promise<number | null> {
  try {
    const v = await getClient(chainId).readContract({ ...contractOf(chainId), functionName: "insuranceBalance" });
    return fromD(v);
  } catch {
    return null;
  }
}

export async function getCurrentTime(chainId = DEFAULT_CHAIN_ID): Promise<number | null> {
  try {
    const v = await getClient(chainId).readContract({ ...contractOf(chainId), functionName: "currentTime" });
    return Number(v);
  } catch {
    return null;
  }
}

export async function getOpenAccess(chainId = DEFAULT_CHAIN_ID): Promise<boolean> {
  try {
    return await getClient(chainId).readContract({ ...contractOf(chainId), functionName: "openAccess" });
  } catch {
    return false;
  }
}

export async function isEligible(account: `0x${string}`, chainId = DEFAULT_CHAIN_ID): Promise<boolean> {
  try {
    const [open, elig] = await Promise.all([
      getClient(chainId).readContract({ ...contractOf(chainId), functionName: "openAccess" }),
      getClient(chainId).readContract({ ...contractOf(chainId), functionName: "eligible", args: [account] }),
    ]);
    return open || elig;
  } catch {
    return false;
  }
}

export async function getOwner(chainId = DEFAULT_CHAIN_ID): Promise<`0x${string}` | null> {
  try {
    return await getClient(chainId).readContract({ ...contractOf(chainId), functionName: "owner" });
  } catch {
    return null;
  }
}

export async function getUsdgBalance(account: `0x${string}`, chainId = DEFAULT_CHAIN_ID): Promise<number | null> {
  const d = getDeployment(chainId);
  if (!d) return null;
  try {
    const v = await getClient(chainId).readContract({ address: d.usdg, abi: erc20Abi, functionName: "balanceOf", args: [account] });
    return Number(v) / 1e6;
  } catch {
    return null;
  }
}

export async function getRequest(id: number, chainId = DEFAULT_CHAIN_ID): Promise<Request | null> {
  try {
    const client = getClient(chainId);
    const [r, qs] = await Promise.all([
      client.readContract({ ...contractOf(chainId), functionName: "getRequest", args: [BigInt(id)] }),
      client.readContract({ ...contractOf(chainId), functionName: "getQuotes", args: [BigInt(id)] }),
    ]);
    const base = fromBytes32(r.base);
    const quote = fromBytes32(r.quote);
    return {
      id: Number(r.id),
      hedger: r.hedger,
      base,
      quote,
      pair: findPair(base, quote),
      direction: r.direction === 0 ? "SellBase" : "BuyBase",
      notional: fromD(r.notional),
      tenorDays: Number(r.tenorDays),
      parityForward: fromD(r.parityForward),
      initialMargin: fromD(r.initialMargin),
      status: REQUEST_STATUSES[r.status] ?? "Open",
      createdAt: Number(r.createdAt),
      quotes: qs.map((q) => ({
        id: Number(q.id),
        requestId: Number(q.requestId),
        maker: q.maker,
        spreadBps: Number(q.spreadBps),
        lockedForward: fromD(q.lockedForward),
        expiry: Number(q.expiry),
        status: QUOTE_STATUSES[q.status] ?? "Live",
      })),
    };
  } catch (err) {
    console.warn("getRequest failed", id, err);
    return null;
  }
}

export async function getOpenRequests(chainId = DEFAULT_CHAIN_ID): Promise<Request[]> {
  try {
    const ids = await getClient(chainId).readContract({ ...contractOf(chainId), functionName: "getOpenRequestIds" });
    const reqs = await Promise.all(ids.map((i) => getRequest(Number(i), chainId)));
    return reqs.filter((r): r is Request => r !== null).sort((a, b) => b.id - a.id);
  } catch {
    return [];
  }
}

export async function getPosition(id: number, chainId = DEFAULT_CHAIN_ID): Promise<Position | null> {
  try {
    const client = getClient(chainId);
    const p = await client.readContract({ ...contractOf(chainId), functionName: "getPosition", args: [BigInt(id)] });
    if (p.hedger === "0x0000000000000000000000000000000000000000") return null;
    const base = fromBytes32(p.base);
    const quote = fromBytes32(p.quote);
    let markValue: number | null = null;
    let currentForward: number | null = null;
    let spot: number | null = null;
    if (p.status === 0) {
      try {
        const [v, f, s] = await client.readContract({ ...contractOf(chainId), functionName: "previewMark", args: [BigInt(id)] });
        markValue = fromD(v);
        currentForward = fromD(f);
        spot = fromD(s);
      } catch {
        /* price unavailable: leave the stored mark */
      }
    }
    return {
      id: Number(p.id),
      hedger: p.hedger,
      maker: p.maker,
      base,
      quote,
      pair: findPair(base, quote),
      direction: p.direction === 0 ? "SellBase" : "BuyBase",
      notional: fromD(p.notional),
      notionalValue: fromD(p.notionalValue),
      lockedForward: fromD(p.lockedForward),
      tenorDays: Number(p.tenorDays),
      openTime: Number(p.openTime),
      maturityTime: Number(p.maturityTime),
      initialMargin: fromD(p.initialMargin),
      callThreshold: fromD(p.callThreshold),
      liqThreshold: fromD(p.liqThreshold),
      hedgerMargin: fromD(p.hedgerMargin),
      makerMargin: fromD(p.makerMargin),
      hedgerState: SIDE_STATES[p.hedgerState] ?? "Safe",
      makerState: SIDE_STATES[p.makerState] ?? "Safe",
      hedgerPartialDone: p.hedgerPartialDone,
      makerPartialDone: p.makerPartialDone,
      status: POSITION_STATUSES[p.status] ?? "Active",
      lastMarkValue: fromD(p.lastMarkValue),
      lastMarkTime: Number(p.lastMarkTime),
      markValue,
      currentForward,
      spot,
    };
  } catch (err) {
    console.warn("getPosition failed", id, err);
    return null;
  }
}

export async function getAllPositions(chainId = DEFAULT_CHAIN_ID): Promise<Position[]> {
  try {
    const n = Number(await getClient(chainId).readContract({ ...contractOf(chainId), functionName: "nextPositionId" }));
    const ids = Array.from({ length: n }, (_, i) => n - 1 - i);
    const ps = await Promise.all(ids.map((i) => getPosition(i, chainId)));
    return ps.filter((p): p is Position => p !== null);
  } catch {
    return [];
  }
}

/** Pure forward, same formula as the contract, for instant UI feedback between chain refreshes. */
export function computeForward(spot: number, rateBase: number, rateQuote: number, tenorDays: number): number {
  const t = tenorDays / 360;
  return (spot * (1 + rateQuote * t)) / (1 + rateBase * t);
}

/** Position value from the hedger's perspective, in margin units. Mirrors Parity.valuePosition. */
export function valuePosition(locked: number, current: number, notional: number, spot: number, direction: Direction, marginInQuote: boolean): number {
  const diff = direction === "SellBase" ? locked - current : current - locked;
  return marginInQuote ? diff * notional : (diff * notional) / spot;
}
