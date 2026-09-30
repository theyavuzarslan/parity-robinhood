"use client";

import { formatUSDC, formatPercent } from "@/lib/format";
import { MARGIN_CALL_THRESHOLD, LIQUIDATION_THRESHOLD } from "@/lib/constants";

interface MarginBarProps {
  posted: number;
  initial: number;
  state: "Safe" | "Called" | "Liquidated";
  label: string;
}

export default function MarginBar({ posted, initial, state, label }: MarginBarProps) {
  const ratio = initial > 0 ? posted / initial : 1;
  const fillPct = Math.min(Math.max(ratio * 100, 0), 100);

  const trackColor = "rgba(255,255,255,0.07)";
  const fillColor =
    state === "Liquidated" ? "var(--danger)"
    : state === "Called"     ? "var(--warn)"
    :                          "var(--success)";

  const stateStyle = {
    Safe:       { color: "var(--success)", bg: "rgba(141,216,159,0.12)", border: "rgba(141,216,159,0.25)" },
    Called:     { color: "var(--warn)",    bg: "rgba(244,201,122,0.12)", border: "rgba(244,201,122,0.25)" },
    Liquidated: { color: "var(--danger)",  bg: "rgba(232,109,122,0.12)", border: "rgba(232,109,122,0.25)" },
  }[state];

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--subtle)" }}>{label}</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: stateStyle.color,
            background: stateStyle.bg,
            border: `1px solid ${stateStyle.border}`,
          }}
        >
          {state}
        </span>
      </div>

      {/* Track */}
      <div
        className="relative h-2.5 rounded-full overflow-visible"
        style={{ background: trackColor, border: "1px solid var(--border)" }}
      >
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${fillPct}%`, background: fillColor }}
        />

        {/* Threshold markers */}
        <div
          className="absolute inset-y-[-2px] w-px rounded-full"
          style={{ left: `${(1 - MARGIN_CALL_THRESHOLD) * 100}%`, background: "var(--warn)" }}
          title="Margin Call threshold"
        />
        <div
          className="absolute inset-y-[-2px] w-px rounded-full"
          style={{ left: `${(1 - LIQUIDATION_THRESHOLD) * 100}%`, background: "var(--danger)" }}
          title="Liquidation threshold"
        />
      </div>

      <div className="flex items-center justify-between mt-1.5 text-xs" style={{ color: "var(--subtle)" }}>
        <span>
          <span className="mono font-medium" style={{ color: "var(--muted)" }}>{formatUSDC(posted)}</span>
          {" / "}
          {formatUSDC(initial)} USDC
        </span>
        <span className="mono font-semibold" style={{ color: stateStyle.color }}>
          {formatPercent(ratio)} remaining
        </span>
      </div>
    </div>
  );
}
