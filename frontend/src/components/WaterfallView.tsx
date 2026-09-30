"use client";

import { formatUSDC } from "@/lib/format";

interface WaterfallViewProps {
  loserMargin: number;
  insuranceUsed: number;
  winnerHaircut: number;
  hedgerPayout: number;
  makerPayout: number;
}

export default function WaterfallView({
  loserMargin,
  insuranceUsed,
  winnerHaircut,
  hedgerPayout,
  makerPayout,
}: WaterfallViewProps) {
  const total = loserMargin + insuranceUsed + winnerHaircut || 1;
  const loserPct = (loserMargin / total) * 100;
  const insurancePct = (insuranceUsed / total) * 100;
  const haircutPct = (winnerHaircut / total) * 100;

  const segments = [
    {
      pct: loserPct,
      color: "var(--danger)",
      label: "Margin",
      labelColor: "var(--danger)",
      sublabel: "Loser Margin",
      value: loserMargin,
    },
    {
      pct: insurancePct,
      color: "var(--warn)",
      label: "Insurance",
      labelColor: "var(--warn)",
      sublabel: "Insurance Fund",
      value: insuranceUsed,
    },
    {
      pct: haircutPct,
      color: "rgba(232,109,122,0.50)",
      label: "Haircut",
      labelColor: "var(--muted)",
      sublabel: "Winner Haircut",
      value: winnerHaircut,
    },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h4
        className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--subtle)" }}
      >
        Settlement Waterfall
      </h4>

      {/* Stacked bar */}
      <div className="h-7 rounded-xl overflow-hidden flex mb-4" style={{ background: "var(--surface-muted)" }}>
        {segments.map(({ pct, color, label }) =>
          pct > 0 ? (
            <div
              key={label}
              className="flex items-center justify-center transition-all"
              style={{ width: `${pct}%`, background: color }}
            >
              {pct > 14 && (
                <span className="text-xs font-bold" style={{ color: "#0d1b2f" }}>
                  {label}
                </span>
              )}
            </div>
          ) : null
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {segments.map(({ color, sublabel, value, labelColor }) => (
          <div key={sublabel} className="flex items-start gap-2">
            <div className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" style={{ background: color }} />
            <div>
              <span className="text-xs block" style={{ color: "var(--subtle)" }}>
                {sublabel}
              </span>
              <span className="mono text-xs font-bold" style={{ color: labelColor }}>
                {formatUSDC(value)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Payouts */}
      <div
        className="grid grid-cols-2 gap-4 pt-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div>
          <span className="text-xs mb-1 block" style={{ color: "var(--subtle)" }}>Hedger Payout</span>
          <span
            className="mono text-base font-bold"
            style={{ color: hedgerPayout >= 0 ? "var(--success)" : "var(--danger)" }}
          >
            {hedgerPayout >= 0 ? "+" : ""}{formatUSDC(hedgerPayout)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs mb-1 block" style={{ color: "var(--subtle)" }}>Maker Payout</span>
          <span
            className="mono text-base font-bold"
            style={{ color: makerPayout >= 0 ? "var(--success)" : "var(--danger)" }}
          >
            {makerPayout >= 0 ? "+" : ""}{formatUSDC(makerPayout)}
          </span>
        </div>
      </div>
    </div>
  );
}
