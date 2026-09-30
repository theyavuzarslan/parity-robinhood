"use client";

import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatPrice, formatUSDC, formatCountdown } from "@/lib/format";
import { markPosition, topUpMargin, liquidate, settle } from "@/lib/contract";
import MarginBar from "./MarginBar";
import type { MockPosition } from "@/lib/mock";

interface PositionCardProps {
  position: MockPosition;
  userAddress?: string | null;
  showActions?: boolean;
}

export default function PositionCard({
  position,
  userAddress,
  showActions = true,
}: PositionCardProps) {
  void userAddress;
  const [topUpAmount, setTopUpAmount] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const isMatured = now > 0 && position.maturity <= now;
  const timeToMaturity = now > 0 ? position.maturity - now : 0;

  const mtmPnl =
    position.direction === "buy"
      ? (position.current_forward - position.locked_forward) * position.notional
      : (position.locked_forward - position.current_forward) * position.notional;

  const isAlert =
    position.hedger_state === "Liquidated" || position.maker_state === "Liquidated";
  const isWarning =
    !isAlert && (position.hedger_state === "Called" || position.maker_state === "Called");

  const borderColor = isAlert
    ? "rgba(232,109,122,0.40)"
    : isWarning
    ? "rgba(244,201,122,0.35)"
    : "var(--border)";

  const handleMark = async () => {
    setLoading("mark");
    try { await markPosition(position.id); } finally { setLoading(null); }
  };
  const handleTopUp = async () => {
    if (!topUpAmount) return;
    setLoading("topup");
    try { await topUpMargin("", position.id, parseFloat(topUpAmount)); setTopUpAmount(""); }
    finally { setLoading(null); }
  };
  const handleLiquidate = async () => {
    setLoading("liquidate");
    try { await liquidate(position.id); } finally { setLoading(null); }
  };
  const handleSettle = async () => {
    setLoading("settle");
    try { await settle(position.id); } finally { setLoading(null); }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--surface)",
        border: `1px solid ${borderColor}`,
        opacity: position.settled ? 0.55 : 1,
      }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="mono text-sm font-bold" style={{ color: "var(--ink)" }}>
              #{position.id}
            </span>
            <span
              className="mono text-xs px-2 py-0.5 rounded-md font-semibold"
              style={{ background: "rgba(172,198,233,0.12)", color: "var(--accent)" }}
            >
              {position.pair}
            </span>
            <span
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: position.direction === "buy" ? "var(--success)" : "var(--danger)" }}
            >
              {position.direction === "buy"
                ? <ArrowUpRight style={{ width: 12, height: 12 }} />
                : <ArrowDownRight style={{ width: 12, height: 12 }} />}
              {position.direction.toUpperCase()}
            </span>
            {position.settled && (
              <span
                className="text-xs px-2 py-0.5 rounded-md font-semibold"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--subtle)",
                  border: "1px solid var(--border)",
                }}
              >
                SETTLED
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--subtle)" }}>
            <Clock style={{ width: 11, height: 11 }} />
            {now === 0 ? (
              <span>…</span>
            ) : isMatured ? (
              <span style={{ color: "var(--warn)" }}>Matured</span>
            ) : (
              <span className="mono">{formatCountdown(timeToMaturity)}</span>
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          {[
            { label: "Notional", value: position.notional.toLocaleString(), mono: true },
            { label: "Locked Fwd", value: formatPrice(position.locked_forward), mono: true, accent: true },
            { label: "Current Fwd", value: formatPrice(position.current_forward), mono: true },
            {
              label: "Hedger MtM",
              value: (mtmPnl >= 0 ? "+" : "") + formatUSDC(mtmPnl),
              mono: true,
              pnl: mtmPnl,
            },
          ].map(({ label, value, mono, accent, pnl }) => (
            <div key={label}>
              <span className="text-xs block mb-0.5" style={{ color: "var(--subtle)" }}>{label}</span>
              <span
                className={mono ? "mono text-sm font-semibold" : "text-sm font-semibold"}
                style={{
                  color:
                    pnl !== undefined
                      ? pnl >= 0 ? "var(--success)" : "var(--danger)"
                      : accent
                      ? "var(--ink)"
                      : "var(--muted)",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-2 text-xs mono" style={{ color: "var(--subtle)", opacity: 0.7 }}>
          <span>H: {position.hedger}</span>
          <span>M: {position.maker}</span>
        </div>
      </div>

      {/* Margin bars */}
      <div className="px-5 py-4 space-y-4">
        <MarginBar
          label="Hedger Margin"
          posted={position.hedger_margin}
          initial={position.initial_margin}
          state={position.hedger_state}
        />
        <MarginBar
          label="Maker Margin"
          posted={position.maker_margin}
          initial={position.initial_margin}
          state={position.maker_state}
        />
      </div>

      {/* Actions */}
      {showActions && !position.settled && (
        <div className="px-5 pb-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleMark}
              disabled={loading === "mark"}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
              style={{
                background: "var(--surface-muted)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              {loading === "mark"
                ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                : <RefreshCw style={{ width: 12, height: 12 }} />}
              Mark to Market
            </button>

            {isMatured && (
              <button
                onClick={handleSettle}
                disabled={loading === "settle"}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: "rgba(141,216,159,0.12)",
                  border: "1px solid rgba(141,216,159,0.30)",
                  color: "var(--success)",
                }}
              >
                {loading === "settle"
                  ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                  : <CheckCircle2 style={{ width: 12, height: 12 }} />}
                Settle
              </button>
            )}

            {isAlert && (
              <button
                onClick={handleLiquidate}
                disabled={loading === "liquidate"}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: "rgba(232,109,122,0.12)",
                  border: "1px solid rgba(232,109,122,0.30)",
                  color: "var(--danger)",
                }}
              >
                {loading === "liquidate"
                  ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                  : <XCircle style={{ width: 12, height: 12 }} />}
                Liquidate
              </button>
            )}

            {isWarning && (
              <div
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(244,201,122,0.10)",
                  border: "1px solid rgba(244,201,122,0.25)",
                  color: "var(--warn)",
                }}
              >
                <AlertTriangle style={{ width: 12, height: 12 }} />
                Margin Called
              </div>
            )}
          </div>

          {/* Top-up input */}
          {!isAlert && (
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Top-up amount (USDC)"
                className="flex-1 mono text-xs rounded-xl px-3 py-2 outline-none transition-all"
                style={{
                  background: "var(--surface-muted)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                }}
              />
              <button
                onClick={handleTopUp}
                disabled={!topUpAmount || loading === "topup"}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-40"
                style={{
                  background: "rgba(172,198,233,0.15)",
                  border: "1px solid rgba(172,198,233,0.35)",
                  color: "var(--accent)",
                }}
              >
                {loading === "topup"
                  ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                  : <TrendingUp style={{ width: 12, height: 12 }} />}
                Top Up
              </button>
            </div>
          )}

          {/* Alert for liquidated state */}
          {isAlert && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{
                background: "rgba(232,109,122,0.08)",
                border: "1px solid rgba(232,109,122,0.20)",
                color: "var(--danger)",
              }}
            >
              <TrendingDown style={{ width: 12, height: 12 }} />
              Position breached — partial liquidation available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
