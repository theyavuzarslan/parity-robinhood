"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { PAIRS, TENORS, type Pair } from "@/lib/constants";
import { formatUSDC } from "@/lib/format";
import { postRequest } from "@/lib/contract";

interface RequestFormProps {
  onPairChange?: (pair: Pair) => void;
  onTenorChange?: (tenor: number) => void;
  walletConnected: boolean;
}

export default function RequestForm({
  onPairChange,
  onTenorChange,
  walletConnected,
}: RequestFormProps) {
  const [pair, setPair] = useState<Pair>("MXN/USD");
  const [direction, setDirection] = useState<"Buy" | "Sell">("Sell");
  const [notional, setNotional] = useState<string>("1000000");
  const [tenor, setTenor] = useState<number>(90);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const margin = parseFloat(notional || "0") * 0.05;

  const handlePairChange = (p: Pair) => { setPair(p); onPairChange?.(p); };
  const handleTenorChange = (t: number) => { setTenor(t); onTenorChange?.(t); };

  const handleSubmit = async () => {
    if (!walletConnected) return;
    setLoading(true);
    setSuccess(false);
    try {
      const [pairBase, pairQuote] = pair.split("/").reverse();
      const ok = await postRequest("", pairBase, pairQuote, direction === "Sell" ? "SellBase" : "BuyBase", parseFloat(notional), tenor, "");
      if (ok) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    } catch (err) {
      console.error("Post request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const chipBase = "py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all";
  const chipActive = (active: boolean, variant: "default" | "buy" | "sell" = "default") => {
    if (!active) return `${chipBase} border-transparent` + " " + "text-subtle";
    if (variant === "buy") return `${chipBase} border-transparent`;
    if (variant === "sell") return `${chipBase} border-transparent`;
    return `${chipBase}`;
  };

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--subtle)" }}
      >
        Post RFQ
      </h3>

      {/* Pair */}
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: "var(--subtle)" }}>
          Pair
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PAIRS.map((p) => (
            <button
              key={p}
              onClick={() => handlePairChange(p)}
              className="py-2 px-3 rounded-xl text-xs mono font-semibold transition-all"
              style={{
                background: pair === p ? "rgba(172,198,233,0.15)" : "var(--surface-muted)",
                border: pair === p ? "1px solid rgba(172,198,233,0.40)" : "1px solid var(--border)",
                color: pair === p ? "var(--accent)" : "var(--muted)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Direction */}
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: "var(--subtle)" }}>
          Direction
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["Buy", "Sell"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: direction === d
                  ? d === "Buy" ? "rgba(141,216,159,0.15)" : "rgba(232,109,122,0.15)"
                  : "var(--surface-muted)",
                border: direction === d
                  ? d === "Buy" ? "1px solid rgba(141,216,159,0.40)" : "1px solid rgba(232,109,122,0.40)"
                  : "1px solid var(--border)",
                color: direction === d
                  ? d === "Buy" ? "var(--success)" : "var(--danger)"
                  : "var(--muted)",
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Notional */}
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: "var(--subtle)" }}>
          Notional (base currency)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={notional}
          onChange={(e) => setNotional(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="1,000,000"
          className="w-full mono text-sm rounded-xl px-3 py-2.5 outline-none transition-all"
          style={{
            background: "var(--surface-muted)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
        />
      </div>

      {/* Tenor chips */}
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: "var(--subtle)" }}>
          Tenor
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {TENORS.map((t) => (
            <button
              key={t}
              onClick={() => handleTenorChange(t)}
              className="py-1.5 px-3 rounded-xl text-xs mono font-semibold transition-all"
              style={{
                background: tenor === t ? "rgba(172,198,233,0.15)" : "var(--surface-muted)",
                border: tenor === t ? "1px solid rgba(172,198,233,0.40)" : "1px solid var(--border)",
                color: tenor === t ? "var(--accent)" : "var(--subtle)",
              }}
            >
              {t}D
            </button>
          ))}
        </div>
      </div>

      {/* Required margin */}
      <div
        className="flex justify-between items-center px-3 py-2.5 rounded-xl"
        style={{ background: "rgba(244,201,122,0.08)", border: "1px solid rgba(244,201,122,0.18)" }}
      >
        <span className="text-xs font-medium" style={{ color: "var(--subtle)" }}>
          Required Margin (5%)
        </span>
        <span className="mono text-sm font-bold" style={{ color: "var(--warn)" }}>
          {formatUSDC(margin)} USDC
        </span>
      </div>

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={loading || !walletConnected || !notional}
        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
        style={{
          background: success ? "rgba(141,216,159,0.25)" : "var(--accent)",
          color: success ? "var(--success)" : "#0d1b2f",
          border: success ? "1px solid rgba(141,216,159,0.40)" : "none",
        }}
      >
        {loading ? (
          <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
        ) : success ? (
          <>
            <CheckCircle2 style={{ width: 15, height: 15 }} />
            Request Posted
          </>
        ) : (
          <>
            <Send style={{ width: 13, height: 13 }} />
            {walletConnected ? "Post Request" : "Connect Wallet First"}
          </>
        )}
      </button>

    </div>
  );
}
