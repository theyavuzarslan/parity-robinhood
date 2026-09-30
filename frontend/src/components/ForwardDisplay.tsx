"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { MOCK_SPOT, MOCK_RATES, computeMockForward } from "@/lib/mock";
import { formatPrice } from "@/lib/format";
import type { Pair } from "@/lib/constants";

interface ForwardDisplayProps {
  pair: Pair;
  tenor: number;
  chainForward?: number | null;
  chainConnected?: boolean;
}

/* ── Lerp hook ──────────────────────────────────────────────────────────── */
function useLerped(target: number, speed = 0.12) {
  const [display, setDisplay] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      ref.current += (target - ref.current) * speed;
      if (Math.abs(target - ref.current) < 0.0001) ref.current = target;
      setDisplay(ref.current);
      if (ref.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return display;
}

export default function ForwardDisplay({
  pair,
  tenor,
  chainForward,
  chainConnected,
}: ForwardDisplayProps) {
  const rawForward = chainForward ?? computeMockForward(pair, tenor);
  const spot = MOCK_SPOT[pair] ?? 20.0;
  const display = useLerped(rawForward);

  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(rawForward);

  const base = pair.split("/")[0];
  const quote = pair.split("/")[1];
  const rBase = MOCK_RATES[base] || 0.04;
  const rQuote = MOCK_RATES[quote] || 0.10;

  useEffect(() => {
    if (rawForward > prevRef.current) setFlash("up");
    else if (rawForward < prevRef.current) setFlash("down");
    prevRef.current = rawForward;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [rawForward]);

  const premium = ((rawForward - spot) / spot) * 100;
  const isPositive = premium >= 0;

  return (
    <div
      className={`rounded-2xl p-5 transition-all ${flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""}`}
      style={{ background: "var(--surface-strong)", border: "1px solid var(--border-strong)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--subtle)" }}
        >
          Forward Price
        </span>
        <div className="flex items-center gap-2">
          {chainConnected && (
            <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
              on-chain
            </span>
          )}
          <span className="mono text-xs font-medium px-2 py-0.5 rounded-md" style={{
            background: "rgba(172,198,233,0.12)",
            color: "var(--accent)",
          }}>
            {pair} {tenor}D
          </span>
        </div>
      </div>

      {/* Hero price */}
      <div className="flex items-end gap-3 mb-4">
        <span
          className="display font-bold tabular-nums transition-colors duration-500"
          style={{
            fontSize: "clamp(2rem, 4vw, 2.5rem)",
            letterSpacing: "-0.03em",
            color: flash === "up"
              ? "var(--success)"
              : flash === "down"
              ? "var(--danger)"
              : "var(--ink)",
          }}
        >
          {formatPrice(display)}
        </span>
        {flash === "up" && <TrendingUp style={{ width: 18, height: 18, color: "var(--success)", marginBottom: 4 }} />}
        {flash === "down" && <TrendingDown style={{ width: 18, height: 18, color: "var(--danger)", marginBottom: 4 }} />}
      </div>

      {/* Spot / Tenor / Premium row */}
      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
        <div>
          <span className="text-xs block mb-0.5" style={{ color: "var(--subtle)" }}>Spot</span>
          <span className="mono font-medium" style={{ color: "var(--muted)" }}>{formatPrice(spot)}</span>
        </div>
        <div className="flex flex-col items-center">
          <ArrowRight style={{ width: 14, height: 14, color: "var(--subtle)", marginBottom: 4 }} />
          <span className="text-xs" style={{ color: "var(--subtle)" }}>{tenor}D</span>
        </div>
        <div className="text-right">
          <span className="text-xs block mb-0.5" style={{ color: "var(--subtle)" }}>Premium</span>
          <span
            className="mono font-semibold"
            style={{ color: isPositive ? "var(--success)" : "var(--danger)" }}
          >
            {isPositive ? "+" : ""}{premium.toFixed(3)}%
          </span>
        </div>
      </div>

      {/* Rate row */}
      <div
        className="flex justify-between text-xs px-3 py-2.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--subtle)" }}>
          r({base}){" "}
          <span className="mono font-medium" style={{ color: "var(--muted)" }}>
            {(rBase * 100).toFixed(2)}%
          </span>
        </span>
        <span style={{ color: "var(--subtle)" }}>
          r({quote}){" "}
          <span className="mono font-medium" style={{ color: "var(--muted)" }}>
            {(rQuote * 100).toFixed(2)}%
          </span>
        </span>
      </div>

      {/* Formula */}
      <div
        className="mt-3 px-3 py-2 rounded-xl text-center"
        style={{ background: "rgba(172,198,233,0.06)" }}
      >
        <p className="mono text-xs" style={{ color: "var(--subtle)", opacity: 0.8 }}>
          F = S × (1 + r<sub>q</sub> × t/360) / (1 + r<sub>b</sub> × t/360)
        </p>
      </div>
    </div>
  );
}
