"use client";

import { useState, useEffect } from "react";
import { Loader2, Shield, DollarSign, Clock, UserPlus, Zap, RefreshCw } from "lucide-react";
import { setSpotPrice, setRate, setTime, addEligible, getInsuranceBalance } from "@/lib/contract";
import { MOCK_SPOT, MOCK_RATES } from "@/lib/mock";
import { formatUSDC } from "@/lib/format";

interface AdminPanelProps {
  walletConnected: boolean;
  walletAddress?: string | null;
}

export default function AdminPanel({ walletConnected, walletAddress }: AdminPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [insuranceBalance, setInsuranceBalance] = useState<number>(50000);

  const [mxnSpot, setMxnSpot] = useState(MOCK_SPOT["MXN/USD"].toString());
  const [trySpot, setTrySpot] = useState(MOCK_SPOT["TRY/USD"].toString());
  const [mxnRate, setMxnRate] = useState((MOCK_RATES.MXN * 100).toString());
  const [tryRate, setTryRate] = useState((MOCK_RATES.TRY * 100).toString());
  const [usdRate, setUsdRate] = useState((MOCK_RATES.USD * 100).toString());
  const [demoTime, setDemoTime] = useState("");
  const [eligibleAddress, setEligibleAddress] = useState("");

  useEffect(() => {
    getInsuranceBalance().then(b => { if (b !== null) setInsuranceBalance(b); });
  }, []);

  const showSuccess = (key: string) => {
    setSuccess(key);
    setTimeout(() => setSuccess(null), 2000);
  };

  const run = async (key: string, fn: () => Promise<boolean | void>) => {
    setLoading(key);
    try { const ok = await fn(); if (ok !== false) showSuccess(key); }
    finally { setLoading(null); }
  };

  const inputCls = "w-full mono text-sm rounded-xl px-3 py-2.5 outline-none transition-all";
  const inputStyle = {
    background: "var(--surface-muted)",
    border: "1px solid var(--border)",
    color: "var(--ink)",
  };
  const actionBtn = (key: string, disabled?: boolean) => ({
    background: success === key ? "rgba(141,216,159,0.15)" : "var(--surface-muted)",
    border: `1px solid ${success === key ? "rgba(141,216,159,0.35)" : "var(--border)"}`,
    color: success === key ? "var(--success)" : "var(--muted)",
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const SectionHeader = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon style={{ width: 14, height: 14, color: "var(--subtle)" }} />
      <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--subtle)" }}>
        {label}
      </h3>
    </div>
  );

  const SetBtn = ({ k, disabled, onClick, children }: { k: string; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading === k || !walletConnected}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
      style={actionBtn(k, disabled || !walletConnected)}
    >
      {loading === k
        ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
        : children}
    </button>
  );

  return (
    <div className="space-y-4">

      {/* Insurance Fund */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <Shield style={{ width: 16, height: 16, color: "var(--success)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
            Insurance Fund
          </span>
        </div>
        <span className="mono text-2xl font-bold" style={{ color: "var(--success)", letterSpacing: "-0.02em" }}>
          {formatUSDC(insuranceBalance)}
          <span className="text-sm ml-1.5" style={{ color: "var(--subtle)", letterSpacing: 0 }}>USDC</span>
        </span>
      </div>

      {/* Spot Prices */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <SectionHeader icon={DollarSign} label="Spot Prices" />
        <div className="space-y-3">
          {[
            { label: "MXN/USD", value: mxnSpot, setter: setMxnSpot, key: "spot-MXN/USD" },
            { label: "TRY/USD", value: trySpot, setter: setTrySpot, key: "spot-TRY/USD" },
          ].map(({ label, value, setter, key }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs font-semibold mono w-20" style={{ color: "var(--subtle)" }}>{label}</span>
              <input
                type="text"
                value={value}
                onChange={(e) => setter(e.target.value)}
                className={inputCls + " flex-1"}
                style={inputStyle}
              />
              <SetBtn k={key} onClick={() => run(key, () => setSpotPrice(walletAddress || "", parseFloat(value)))}>
                Set
              </SetBtn>
            </div>
          ))}
        </div>
      </div>

      {/* Interest Rates */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <SectionHeader icon={RefreshCw} label="Interest Rates" />
        <div className="space-y-3">
          {[
            { label: "MXN", value: mxnRate, setter: setMxnRate, key: "rate-MXN", currency: "MXN" },
            { label: "TRY", value: tryRate, setter: setTryRate, key: "rate-TRY", currency: "TRY" },
            { label: "USD", value: usdRate, setter: setUsdRate, key: "rate-USD", currency: "USD" },
          ].map(({ label, value, setter, key, currency }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs font-semibold mono w-20" style={{ color: "var(--subtle)" }}>{label}</span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className={inputCls + " pr-7"}
                  style={inputStyle}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--subtle)" }}>%</span>
              </div>
              <SetBtn k={key} onClick={() => run(key, () => setRate(walletAddress || "", currency, parseFloat(value) / 100))}>
                Set
              </SetBtn>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Time */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <SectionHeader icon={Clock} label="Demo Time" />
        <div className="flex items-center gap-3 mb-3">
          <input
            type="datetime-local"
            value={demoTime}
            onChange={(e) => setDemoTime(e.target.value)}
            className={inputCls + " flex-1 [color-scheme:dark]"}
            style={inputStyle}
          />
          <SetBtn k="time" onClick={() => run("time", () => setTime(walletAddress || "", demoTime ? Math.floor(new Date(demoTime).getTime() / 1000) : Math.floor(Date.now() / 1000)))}>
            Set Time
          </SetBtn>
        </div>
        <button
          onClick={() => run("advance", () => setTime(walletAddress || "", Math.floor(Date.now() / 1000) + 86400 * 30))}
          disabled={loading === "advance" || !walletConnected}
          className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all"
          style={actionBtn("advance", !walletConnected)}
        >
          {loading === "advance"
            ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
            : <Clock style={{ width: 12, height: 12 }} />}
          Advance 30 Days
        </button>
      </div>

      {/* Eligibility */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <SectionHeader icon={UserPlus} label="Eligibility" />
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={eligibleAddress}
            onChange={(e) => setEligibleAddress(e.target.value)}
            placeholder="0x…"
            className={inputCls + " flex-1 mono text-xs"}
            style={inputStyle}
          />
          <SetBtn k="eligible" onClick={() => run("eligible", async () => {
            if (!eligibleAddress) return false;
            const ok = await addEligible(walletAddress || "", eligibleAddress);
            if (ok) setEligibleAddress("");
            return ok;
          })}>
            Add
          </SetBtn>
        </div>
      </div>

      {/* Demo Scenarios */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <SectionHeader icon={Zap} label="Demo Scenarios" />
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "MXN Crisis",
              key: "scenario-mxn",
              color: "var(--danger)",
              bg: "rgba(232,109,122,0.10)",
              border: "rgba(232,109,122,0.25)",
              fn: async () => {
                await setSpotPrice(walletAddress || "", 19.15); setMxnSpot("19.15");
                await setRate(walletAddress || "", "MXN", 0.25); setMxnRate("25");
                return true;
              },
            },
            {
              label: "TRY Crash",
              key: "scenario-try",
              color: "var(--danger)",
              bg: "rgba(232,109,122,0.10)",
              border: "rgba(232,109,122,0.25)",
              fn: async () => {
                await setSpotPrice(walletAddress || "", 38.00); setTrySpot("38.00");
                await setRate(walletAddress || "", "TRY", 0.65); setTryRate("65");
                return true;
              },
            },
            {
              label: "Fed Hike",
              key: "scenario-fed",
              color: "var(--warn)",
              bg: "rgba(244,201,122,0.10)",
              border: "rgba(244,201,122,0.25)",
              fn: async () => {
                await setRate(walletAddress || "", "USD", 0.075); setUsdRate("7.5");
                return true;
              },
            },
          ].map(({ label, key, color, bg, border, fn }) => (
            <button
              key={key}
              onClick={() => run(key, fn)}
              disabled={loading === key || !walletConnected}
              className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: success === key ? "rgba(141,216,159,0.12)" : bg,
                border: `1px solid ${success === key ? "rgba(141,216,159,0.30)" : border}`,
                color: success === key ? "var(--success)" : color,
              }}
            >
              {loading === key
                ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                : <Zap style={{ width: 14, height: 14 }} />}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
