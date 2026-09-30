"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount } from "wagmi";
import { Filter, AlertTriangle, XCircle, CheckCircle2, BarChart3, Loader2, X } from "lucide-react";
import PositionCard from "@/components/PositionCard";
import WaterfallView from "@/components/WaterfallView";
import { MOCK_POSITIONS, type MockPosition } from "@/lib/mock";
import { getPosition } from "@/lib/contract";
import { formatUSDC } from "@/lib/format";

type FilterType = "all" | "active" | "called" | "liquidated" | "matured";

/* ── Stat chip ──────────────────────────────────────────────────────────── */
function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--subtle)" }}>
        {label}
      </span>
      <span className="display text-2xl font-bold tabular-nums" style={{ color, letterSpacing: "-0.02em" }}>
        {value}
      </span>
    </div>
  );
}

export default function PositionsPage() {
  const { address: walletAddress } = useAccount();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [chainPositions, setChainPositions] = useState<MockPosition[]>([]);
  const [chainLoading, setChainLoading] = useState(true);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(interval);
  }, []);

  const loadChainPositions = useCallback(async () => {
    setChainLoading(true);
    const loaded: MockPosition[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        const pos = await getPosition(i);
        if (pos) {
          loaded.push({
            id: i,
            hedger: String(pos.hedger || "").slice(0, 8) + "…" + String(pos.hedger || "").slice(-4),
            maker: String(pos.maker || "").slice(0, 8) + "…" + String(pos.maker || "").slice(-4),
            pair: `${pos.pair_quote || "MXN"}/${pos.pair_base || "USD"}`,
            direction: pos.direction === "SellBase" || (pos.direction as Record<string, unknown>)?.SellBase !== undefined ? "sell" : "buy",
            notional: Number(pos.notional || 0) / 1e7,
            locked_forward: Number(pos.locked_forward || 0) / 1e7,
            maturity: Number(pos.maturity_time || 0),
            initial_margin: Math.max(Number(pos.hedger_margin || 0), Number(pos.maker_margin || 0)) / 1e7 || Number(pos.notional || 0) / 1e7 * 0.05,
            hedger_margin: Number(pos.hedger_margin || 0) / 1e7,
            maker_margin: Number(pos.maker_margin || 0) / 1e7,
            hedger_state: parseState(pos.hedger_state),
            maker_state: parseState(pos.maker_state),
            current_forward: Number(pos.locked_forward || 0) / 1e7,
            settled: isSettled(pos),
          });
        }
      } catch { break; }
    }
    setChainPositions(loaded);
    setChainLoading(false);
  }, []);

  useEffect(() => { loadChainPositions(); }, [loadChainPositions]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function isSettled(pos: any): boolean {
    const status = pos.status;
    if (typeof status === "string" && status.toLowerCase().includes("settled")) return true;
    if (typeof status === "object" && status && ("Settled" in status || "settled" in status)) return true;
    if (Number(pos.hedger_margin) === 0 && Number(pos.maker_margin) === 0) return true;
    return false;
  }

  function parseState(s: unknown): "Safe" | "Called" | "Liquidated" {
    if (!s) return "Safe";
    if (typeof s === "string") return s as "Safe" | "Called" | "Liquidated";
    if (typeof s === "object") {
      if ("Called" in (s as object)) return "Called";
      if ("Liquidated" in (s as object)) return "Liquidated";
    }
    return "Safe";
  }

  const allPositions = useMemo(() => [
    ...chainPositions.map(p => ({ ...p, source: "chain" as const })),
    ...MOCK_POSITIONS.map(p => ({ ...p, source: "demo" as const })),
  ], [chainPositions]);

  const positions = useMemo(() => {
    if (now === 0) return [];
    return allPositions.filter((p) => {
      switch (filter) {
        case "active":   return !p.settled && p.maturity > now && p.hedger_state === "Safe" && p.maker_state === "Safe";
        case "called":   return p.hedger_state === "Called" || p.maker_state === "Called";
        case "liquidated": return p.hedger_state === "Liquidated" || p.maker_state === "Liquidated";
        case "matured":  return p.maturity <= now && !p.settled;
        default:         return true;
      }
    });
  }, [filter, now, allPositions]);

  const stats = useMemo(() => {
    if (now === 0) return { active: 0, called: 0, liquidated: 0, matured: 0, totalNotional: 0 };
    return {
      active:        allPositions.filter(p => !p.settled && p.maturity > now && p.hedger_state === "Safe" && p.maker_state === "Safe").length,
      called:        allPositions.filter(p => p.hedger_state === "Called" || p.maker_state === "Called").length,
      liquidated:    allPositions.filter(p => p.hedger_state === "Liquidated" || p.maker_state === "Liquidated").length,
      matured:       allPositions.filter(p => now > 0 && p.maturity <= now && !p.settled).length,
      totalNotional: allPositions.filter(p => !p.settled).reduce((sum, p) => sum + p.notional, 0),
    };
  }, [now, allPositions]);

  const selectedWaterfall = selectedPosition !== null
    ? { loserMargin: 5000, insuranceUsed: 200, winnerHaircut: 0, hedgerPayout: 6485, makerPayout: 3515 }
    : null;

  const FILTERS: { key: FilterType; label: string; count: number; icon: React.ElementType }[] = [
    { key: "all",        label: "All",       count: allPositions.length, icon: BarChart3 },
    { key: "active",     label: "Active",    count: stats.active,        icon: CheckCircle2 },
    { key: "called",     label: "Called",    count: stats.called,        icon: AlertTriangle },
    { key: "liquidated", label: "Liquidated",count: stats.liquidated,    icon: XCircle },
    { key: "matured",    label: "Matured",   count: stats.matured,       icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="display text-2xl font-bold" style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Positions
        </h1>
        <div className="flex items-center gap-3 text-sm">
          {chainLoading ? (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--warn)" }}>
              <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
              Loading chain…
            </span>
          ) : chainPositions.length > 0 ? (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--success)" }}>
              <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
              {chainPositions.length} on-chain
            </span>
          ) : null}
          <span className="text-xs" style={{ color: "var(--subtle)" }}>
            Notional:{" "}
            <span className="mono font-semibold" style={{ color: "var(--muted)" }}>
              {formatUSDC(stats.totalNotional)}
            </span>
          </span>
        </div>
      </div>

      {/* ── Stat chips ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip label="Active"       value={stats.active}     color="var(--success)" />
        <StatChip label="Margin Called"value={stats.called}     color="var(--warn)" />
        <StatChip label="Liquidated"   value={stats.liquidated} color="var(--danger)" />
        <StatChip label="Ready to Settle" value={stats.matured} color="var(--accent)" />
      </div>

      {/* ── Filter chips ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter style={{ width: 14, height: 14, color: "var(--subtle)" }} />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: filter === f.key ? "var(--surface-strong)" : "transparent",
              border: `1px solid ${filter === f.key ? "var(--border-strong)" : "transparent"}`,
              color: filter === f.key ? "var(--ink)" : "var(--subtle)",
            }}
          >
            <f.icon style={{ width: 11, height: 11 }} />
            {f.label}
            <span className="mono" style={{ opacity: 0.6 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* ── Position list ─────────────────────────────────────────────── */}
      <div className="grid gap-4">
        {positions.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--subtle)" }}>
              No positions match this filter
            </p>
          </div>
        ) : (
          positions.map((pos) => (
            <div key={`${pos.source}-${pos.id}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={pos.source === "chain" ? {
                    background: "rgba(141,216,159,0.12)",
                    border: "1px solid rgba(141,216,159,0.25)",
                    color: "var(--success)",
                  } : {
                    background: "var(--surface-muted)",
                    border: "1px solid var(--border)",
                    color: "var(--subtle)",
                  }}
                >
                  {pos.source === "chain" ? "On-Chain" : "Demo Data"}
                </span>
                {pos.source === "demo" && (
                  <span className="text-xs" style={{ color: "var(--subtle)", opacity: 0.5 }}>
                    Buttons simulate only
                  </span>
                )}
              </div>
              <div onClick={() => setSelectedPosition(pos.id)} className="cursor-pointer">
                <PositionCard
                  position={pos}
                  userAddress={walletAddress}
                  showActions={pos.source === "chain" && !pos.settled}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Waterfall panel ───────────────────────────────────────────── */}
      {selectedWaterfall && selectedPosition !== null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="display text-base font-semibold" style={{ color: "var(--ink)" }}>
              Settlement Waterfall — Position #{selectedPosition}
            </h2>
            <button
              onClick={() => setSelectedPosition(null)}
              className="flex items-center gap-1 text-xs font-medium transition-all hover:opacity-70"
              style={{ color: "var(--subtle)" }}
            >
              <X style={{ width: 13, height: 13 }} /> Close
            </button>
          </div>
          <WaterfallView {...selectedWaterfall} />
        </div>
      )}
    </div>
  );
}
