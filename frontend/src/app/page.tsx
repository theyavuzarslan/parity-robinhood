"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { Activity, TrendingUp, Shield, Clock, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import ForwardDisplay from "@/components/ForwardDisplay";
import RequestForm from "@/components/RequestForm";
import QuoteList from "@/components/QuoteList";
import { MOCK_REQUESTS } from "@/lib/mock";
import { formatPrice } from "@/lib/format";
import { getSpot, getRate, computeForward, getInsuranceBalance } from "@/lib/contract";
import { CONTRACT_ADDRESS, ARC_TESTNET_EXPLORER, PAIRS, TENORS } from "@/lib/constants";
import type { Pair } from "@/lib/constants";

/* ── Lerped number hook ─────────────────────────────────────────────────── */
function useLerped(target: number | null, speed = 0.14) {
  const [display, setDisplay] = useState(target ?? 0);
  const ref = useRef(target ?? 0);
  useEffect(() => {
    if (target == null) return;
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

/* ── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "var(--accent)",
  live,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
  live?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon style={{ width: 13, height: 13, color }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--subtle)" }}>
          {label}
        </span>
        {live && (
          <span className="live-dot ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
        )}
      </div>
      <div
        className="display text-2xl font-bold tabular-nums"
        style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "var(--subtle)" }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const [pair, setPair] = useState<Pair>("MXN/USD");
  const [tenor, setTenor] = useState(90);

  const [spot, setSpot] = useState<number | null>(null);
  const [rateMXN, setRateMXN] = useState<number | null>(null);
  const [rateTRY, setRateTRY] = useState<number | null>(null);
  const [rateUSD, setRateUSD] = useState<number | null>(null);
  const [forward, setForward] = useState<number | null>(null);
  const [insurance, setInsurance] = useState<number | null>(null);
  const [chainLoading, setChainLoading] = useState(true);
  const [chainConnected, setChainConnected] = useState(false);
  const [forwardMatrix, setForwardMatrix] = useState<Record<string, Record<number, number>>>({});

  const fetchChainData = useCallback(async () => {
    if (!CONTRACT_ADDRESS) { setChainLoading(false); return; }
    setChainLoading(true);
    try {
      const [spotVal, mxnVal, tryVal, usdVal, insVal] = await Promise.all([
        getSpot(), getRate("MXN"), getRate("TRY"), getRate("USD"), getInsuranceBalance(),
      ]);
      if (spotVal !== null) { setSpot(spotVal); setChainConnected(true); }
      if (mxnVal !== null) setRateMXN(mxnVal);
      if (tryVal !== null) setRateTRY(tryVal);
      if (usdVal !== null) setRateUSD(usdVal);
      if (insVal !== null) setInsurance(insVal);

      if (spotVal && usdVal && mxnVal && tryVal) {
        const matrix: Record<string, Record<number, number>> = {};
        for (const p of PAIRS) {
          matrix[p] = {};
          const rQ = p === "MXN/USD" ? mxnVal : tryVal;
          for (const t of TENORS) {
            const fwd = computeForward(spotVal, usdVal, rQ, t);
            if (fwd !== null) matrix[p][t] = fwd;
          }
        }
        setForwardMatrix(matrix);
      }
    } catch (err) {
      console.error("Chain fetch failed:", err);
    }
    setChainLoading(false);
  }, []);

  useEffect(() => {
    fetchChainData();
    const interval = setInterval(fetchChainData, 30_000);
    return () => clearInterval(interval);
  }, [fetchChainData]);

  useEffect(() => {
    const sp = spot ?? 20.0;
    const rB = rateUSD ?? 0.04;
    const rQ = pair === "MXN/USD" ? (rateMXN ?? 0.10) : (rateTRY ?? 0.45);
    setForward(computeForward(sp, rB, rQ, tenor));
  }, [pair, tenor, spot, rateUSD, rateMXN, rateTRY]);

  const spotDisplay = spot ?? 20.0;
  const rateDisplay = { MXN: rateMXN ?? 0.10, TRY: rateTRY ?? 0.45, USD: rateUSD ?? 0.04 };
  const lerpedSpot = useLerped(spotDisplay);
  const lerpedInsurance = useLerped(insurance);

  return (
    <div className="space-y-6">

      {/* ── Connection badge ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              background: chainConnected
                ? "rgba(141,216,159,0.10)"
                : chainLoading
                ? "rgba(244,201,122,0.10)"
                : "rgba(232,109,122,0.10)",
              border: `1px solid ${chainConnected ? "rgba(141,216,159,0.25)" : chainLoading ? "rgba(244,201,122,0.25)" : "rgba(232,109,122,0.25)"}`,
              color: chainConnected ? "var(--success)" : chainLoading ? "var(--warn)" : "var(--danger)",
            }}
          >
            {chainLoading
              ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
              : <Activity style={{ width: 11, height: 11 }} />}
            {CONTRACT_ADDRESS
              ? chainConnected
                ? `Contract: ${CONTRACT_ADDRESS.slice(0, 8)}…${CONTRACT_ADDRESS.slice(-4)}`
                : chainLoading
                ? "Connecting to Arc RPC…"
                : "Using fallback data"
              : "Contract pending"}
          </div>

          {chainConnected && (
            <a
              href={`${ARC_TESTNET_EXPLORER}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--subtle)" }}
            >
              Explorer <ExternalLink style={{ width: 10, height: 10 }} />
            </a>
          )}
        </div>

        <button
          onClick={fetchChainData}
          disabled={chainLoading}
          className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-all disabled:opacity-40"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          <RefreshCw style={{ width: 11, height: 11 }} className={chainLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="MXN/USD Spot"
          value={lerpedSpot.toFixed(4)}
          sub={chainConnected ? "on-chain oracle" : "demo data"}
          icon={Activity}
          color="var(--accent)"
          live={chainConnected}
        />
        <StatCard
          label="Selected Fwd"
          value={forward !== null ? forward.toFixed(4) : "—"}
          sub={`${pair} · ${tenor}D`}
          icon={TrendingUp}
          color="var(--success)"
          live={chainConnected}
        />
        <StatCard
          label="Insurance Fund"
          value={insurance !== null ? `$${(lerpedInsurance ?? 0).toFixed(2)}` : "$0.00"}
          sub="USDC · on-chain"
          icon={Shield}
          color="var(--warn)"
          live={chainConnected}
        />
        <StatCard
          label="Open Requests"
          value={String(MOCK_REQUESTS.length)}
          sub="awaiting quotes"
          icon={Clock}
          color="var(--subtle)"
        />
      </div>

      {/* ── Rate strip ────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-3 flex items-center gap-6 flex-wrap"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--subtle)" }}>
          Risk-free rates
        </span>
        {(["MXN", "TRY", "USD"] as const).map((ccy) => (
          <div key={ccy} className="flex items-baseline gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--subtle)" }}>r({ccy})</span>
            <span className="mono text-base font-bold" style={{ color: "var(--ink)" }}>
              {(rateDisplay[ccy] * 100).toFixed(2)}
              <span className="text-xs ml-0.5" style={{ color: "var(--subtle)" }}>%</span>
            </span>
            {chainConnected && (
              <span className="text-xs" style={{ color: "var(--success)", opacity: 0.8 }}>on-chain</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Main two-column layout ────────────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Left column */}
        <div className="lg:col-span-4 space-y-5">
          <ForwardDisplay
            pair={pair}
            tenor={tenor}
            chainForward={forward}
            chainConnected={chainConnected}
          />
          <RequestForm
            onPairChange={setPair}
            onTenorChange={setTenor}
            walletConnected={isConnected}
          />
        </div>

        {/* Right column */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="display font-semibold text-base" style={{ color: "var(--ink)" }}>
              Open Requests
            </h2>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--subtle)" }}>
              <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
              Live
            </div>
          </div>
          <QuoteList requests={MOCK_REQUESTS} walletConnected={isConnected} />
        </div>
      </div>

      {/* ── Forward Matrix ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="display text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Forward Matrix
          </h3>
          {chainConnected && (
            <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--success)" }}>
              <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
              Computed on Arc
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--subtle)" }}
                >
                  Pair
                </th>
                <th
                  className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--subtle)" }}
                >
                  Spot
                </th>
                {TENORS.map((t) => (
                  <th
                    key={t}
                    className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "var(--subtle)" }}
                  >
                    {t}D
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["MXN/USD", "TRY/USD"] as const).map((p, ri) => (
                <tr
                  key={p}
                  style={{ borderTop: ri > 0 ? "1px solid var(--border)" : undefined }}
                >
                  <td className="py-3.5 px-3">
                    <span className="mono text-sm font-bold" style={{ color: "var(--ink)" }}>{p}</span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span className="mono text-sm" style={{ color: "var(--muted)" }}>
                      {spotDisplay.toFixed(4)}
                    </span>
                  </td>
                  {TENORS.map((t) => {
                    const rQ = p === "MXN/USD" ? (rateMXN ?? 0.10) : (rateTRY ?? 0.45);
                    const fwd = forwardMatrix[p]?.[t] ?? computeForward(spotDisplay, rateDisplay.USD, rQ, t);
                    if (!fwd) return (
                      <td key={t} className="py-3.5 px-3 text-right">
                        <span className="mono text-sm" style={{ color: "var(--subtle)" }}>—</span>
                      </td>
                    );
                    const premium = ((fwd - spotDisplay) / spotDisplay) * 100;
                    const isSelected = pair === p && tenor === t;
                    return (
                      <td
                        key={t}
                        className="py-3.5 px-3 text-right cursor-pointer transition-all rounded-lg"
                        style={isSelected ? { background: "rgba(172,198,233,0.10)" } : undefined}
                        onClick={() => { setPair(p); setTenor(t); }}
                      >
                        <div className="mono text-sm font-medium" style={{ color: "var(--ink)" }}>
                          {formatPrice(fwd, 4)}
                        </div>
                        <div
                          className="mono text-xs"
                          style={{ color: premium >= 0 ? "var(--success)" : "var(--danger)" }}
                        >
                          {premium >= 0 ? "+" : ""}{premium.toFixed(2)}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-center" style={{ color: "var(--subtle)", opacity: 0.7 }}>
          Click a cell to select that pair · tenor
        </p>
      </div>
    </div>
  );
}
