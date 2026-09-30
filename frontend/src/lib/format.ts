import { hexToString, stringToHex } from "viem";

export const D = 1e7;

/** 7-decimal on-chain integer -> JS number. */
export function fromD(v: bigint | number): number {
  return Number(v) / D;
}

/** JS number -> 7-decimal on-chain integer. */
export function toD(v: number): bigint {
  return BigInt(Math.round(v * D));
}

export function toBytes32(sym: string): `0x${string}` {
  return stringToHex(sym, { size: 32 });
}

export function fromBytes32(hex: `0x${string}`): string {
  return hexToString(hex, { size: 32 });
}

/** USDG token units (6 dec) from a human amount. */
export function toUsdg(v: number): bigint {
  return BigInt(Math.round(v * 1e6));
}

export function formatPrice(value: number, decimals: number = 4): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatUSD(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPct(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatBps(bps: number): string {
  return `${bps} bps`;
}

export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Matured";
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((secondsLeft % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function shortError(err: unknown): string {
  const e = err as { shortMessage?: string; message?: string };
  const msg = e?.shortMessage || e?.message || String(err);
  const m = msg.match(/reverted with the following reason:\s*([^\n]+)/) || msg.match(/Error: ([A-Za-z]+\([^)]*\))/);
  return (m ? m[1] : msg).slice(0, 160);
}
