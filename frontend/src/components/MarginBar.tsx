"use client";

import { formatUSD } from "@/lib/format";
import type { SideState } from "@/lib/contract";

/** One side's loss against the call and liquidation thresholds. */
export default function MarginBar({
  label,
  margin,
  loss,
  callAt,
  liqAt,
  state,
}: {
  label: string;
  margin: number;
  loss: number;
  callAt: number;
  liqAt: number;
  state: SideState;
}) {
  const scale = Math.max(liqAt * 1.25, loss, 1);
  const pct = (v: number) => `${Math.min(Math.max((v / scale) * 100, 0), 100)}%`;
  const color = state === "Breached" ? "var(--danger)" : state === "Called" ? "var(--warn)" : "var(--success)";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span style={{ color: "var(--subtle)" }}>{label}</span>
        <span className="font-semibold px-2 py-0.5 rounded-full" style={{ color, border: `1px solid ${color}` }}>
          {state}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)" }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: pct(loss), background: color }} />
        <div className="absolute inset-y-[-3px] w-px" style={{ left: pct(callAt), background: "var(--warn)" }} title="Margin call" />
        <div className="absolute inset-y-[-3px] w-px" style={{ left: pct(liqAt), background: "var(--danger)" }} title="Liquidation" />
      </div>
      <div className="flex justify-between mt-1.5 text-xs mono" style={{ color: "var(--subtle)" }}>
        <span>loss {formatUSD(loss)}</span>
        <span>margin {formatUSD(margin)}</span>
      </div>
    </div>
  );
}
