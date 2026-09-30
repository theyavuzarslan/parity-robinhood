"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Send, Loader2, Clock, X, Eye, Handshake, ArrowUpRight, ArrowDownRight, CheckCircle2 } from "lucide-react";
import { MOCK_REQUESTS, type MockRequest } from "@/lib/mock";
import { formatPrice, formatBps, formatCountdown } from "@/lib/format";

async function submitQuote(_maker: string, _requestId: number, _spreadBps: number, _expiry: number): Promise<boolean> {
  alert("submitQuote: connect wallet and ensure contract is deployed to Arc Testnet.");
  return false;
}
async function cancelQuote(_maker: string, _requestId: number, _quoteId: number): Promise<void> {
  alert("cancelQuote: connect wallet and ensure contract is deployed to Arc Testnet.");
}

export default function MakerPage() {
  const { isConnected } = useAccount();
  const [selectedRequest, setSelectedRequest] = useState<MockRequest | null>(null);
  const [spreadBps, setSpreadBps] = useState("20");
  const [expiryHours, setExpiryHours] = useState("2");
  const [loading, setLoading] = useState<string | null>(null);
  const [myQuotes, setMyQuotes] = useState<
    { requestId: number; spread_bps: number; expiry: number; active: boolean }[]
  >([
    { requestId: 1, spread_bps: 18, expiry: Math.floor(Date.now() / 1000) + 5400, active: true },
    { requestId: 2, spread_bps: 28, expiry: Math.floor(Date.now() / 1000) + 3600, active: true },
    { requestId: 3, spread_bps: 12, expiry: Math.floor(Date.now() / 1000) - 600, active: false },
  ]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitQuote = async (requestId: number) => {
    const key = `submit-${requestId}`;
    setLoading(key);
    try {
      const expiryTs = now + parseInt(expiryHours) * 3600;
      const ok = await submitQuote("", requestId, parseInt(spreadBps), expiryTs);
      if (ok) {
        setMyQuotes(prev => [...prev, { requestId, spread_bps: parseInt(spreadBps), expiry: expiryTs, active: true }]);
      }
    } finally { setLoading(null); }
  };

  const handleCancelQuote = async (requestId: number, idx: number) => {
    const key = `cancel-${requestId}-${idx}`;
    setLoading(key);
    try {
      await cancelQuote("", requestId, idx);
      setMyQuotes(prev => prev.map(q => q.requestId === requestId ? { ...q, active: false } : q));
    } finally { setLoading(null); }
  };

  const inputStyle = {
    background: "var(--surface-muted)",
    border: "1px solid var(--border)",
    color: "var(--ink)",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Handshake style={{ width: 20, height: 20, color: "var(--accent)" }} />
          <h1 className="display text-2xl font-bold" style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Maker
          </h1>
        </div>
        <div className="text-sm" style={{ color: "var(--subtle)" }}>
          Active Quotes:{" "}
          <span className="mono font-bold" style={{ color: "var(--ink)" }}>
            {myQuotes.filter(q => q.active).length}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        {/* ── Left: Open requests ─────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--subtle)" }}>
            Open Requests
          </h2>
          {MOCK_REQUESTS.map((req) => (
            <button
              key={req.id}
              onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
              className="w-full text-left rounded-2xl overflow-hidden transition-all"
              style={{
                background: "var(--surface)",
                border: `1px solid ${selectedRequest?.id === req.id ? "rgba(172,198,233,0.45)" : "var(--border)"}`,
              }}
            >
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="mono text-sm font-bold" style={{ color: "var(--ink)" }}>#{req.id}</span>
                    <span
                      className="mono text-xs px-2 py-0.5 rounded-md font-semibold"
                      style={{ background: "rgba(172,198,233,0.10)", color: "var(--accent)" }}
                    >
                      {req.pair}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs font-semibold"
                      style={{ color: req.direction === "buy" ? "var(--success)" : "var(--danger)" }}
                    >
                      {req.direction === "buy"
                        ? <ArrowUpRight style={{ width: 12, height: 12 }} />
                        : <ArrowDownRight style={{ width: 12, height: 12 }} />}
                      {req.direction.toUpperCase()}
                    </span>
                    <span className="mono text-xs" style={{ color: "var(--subtle)" }}>{req.tenor}D</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs block" style={{ color: "var(--subtle)" }}>Parity Fwd</span>
                      <span className="mono text-sm font-bold" style={{ color: "var(--ink)" }}>
                        {formatPrice(req.forward)}
                      </span>
                    </div>
                    <Eye style={{ width: 14, height: 14, color: "var(--subtle)", opacity: 0.5 }} />
                  </div>
                </div>

                <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--subtle)" }}>
                  <span className="mono">{req.hedger}</span>
                  <span>
                    Notional:{" "}
                    <span className="mono font-medium" style={{ color: "var(--muted)" }}>
                      {req.notional.toLocaleString()}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs" style={{ color: "var(--subtle)", opacity: 0.6 }}>
                    {req.quotes.filter(q => q.active).length} active quote{req.quotes.filter(q => q.active).length !== 1 ? "s" : ""}
                  </span>
                  {req.quotes.filter(q => q.active).map((q, i) => (
                    <span
                      key={i}
                      className="mono text-xs px-1.5 py-0.5 rounded-md"
                      style={{ background: "var(--surface-muted)", color: "var(--subtle)", border: "1px solid var(--border)" }}
                    >
                      {formatBps(q.spread_bps)}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Right: Submit quote + My quotes ─────────────────────────── */}
        <div className="lg:col-span-5 space-y-5">
          {/* Submit form */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--subtle)" }}>
              Submit Quote
            </h3>

            {selectedRequest ? (
              <>
                {/* Request summary */}
                <div
                  className="rounded-xl px-4 py-3 space-y-2"
                  style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}
                >
                  {[
                    ["Request", `#${selectedRequest.id}`],
                    ["Pair", selectedRequest.pair],
                    ["Direction", selectedRequest.direction.toUpperCase()],
                    ["Parity Forward", formatPrice(selectedRequest.forward)],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span style={{ color: "var(--subtle)" }}>{label}</span>
                      <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Spread input */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: "var(--subtle)" }}>
                    Spread (bps)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={spreadBps}
                      onChange={(e) => setSpreadBps(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="20"
                      className="w-full mono text-sm rounded-xl px-3 py-2.5 outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--subtle)" }}>
                    All-in:{" "}
                    <span className="mono font-semibold" style={{ color: "var(--muted)" }}>
                      {formatPrice(
                        selectedRequest.direction === "buy"
                          ? selectedRequest.forward * (1 + parseInt(spreadBps || "0") / 10000)
                          : selectedRequest.forward * (1 - parseInt(spreadBps || "0") / 10000)
                      )}
                    </span>
                  </p>
                </div>

                {/* Expiry chips */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: "var(--subtle)" }}>
                    Valid for
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {["1", "2", "4", "8", "24"].map((h) => (
                      <button
                        key={h}
                        onClick={() => setExpiryHours(h)}
                        className="flex-1 py-1.5 rounded-xl text-xs mono font-semibold transition-all"
                        style={{
                          background: expiryHours === h ? "rgba(172,198,233,0.15)" : "var(--surface-muted)",
                          border: expiryHours === h ? "1px solid rgba(172,198,233,0.40)" : "1px solid var(--border)",
                          color: expiryHours === h ? "var(--accent)" : "var(--subtle)",
                        }}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margin row */}
                <div
                  className="flex justify-between items-center px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(244,201,122,0.08)", border: "1px solid rgba(244,201,122,0.18)" }}
                >
                  <span className="text-xs font-medium" style={{ color: "var(--subtle)" }}>Required Margin (5%)</span>
                  <span className="mono text-sm font-bold" style={{ color: "var(--warn)" }}>
                    ${(selectedRequest.notional * selectedRequest.forward * 0.05).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} USDC
                  </span>
                </div>

                <button
                  onClick={() => handleSubmitQuote(selectedRequest.id)}
                  disabled={loading === `submit-${selectedRequest.id}` || !isConnected || !spreadBps}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)", color: "#0d1b2f" }}
                >
                  {loading === `submit-${selectedRequest.id}` ? (
                    <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
                  ) : (
                    <>
                      <Send style={{ width: 13, height: 13 }} />
                      {isConnected ? "Submit Quote" : "Connect Wallet First"}
                    </>
                  )}
                </button>
              </>
            ) : (
              <div
                className="py-10 text-center rounded-xl"
                style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}
              >
                <Eye style={{ width: 20, height: 20, margin: "0 auto 8px", color: "var(--subtle)", opacity: 0.5 }} />
                <p className="text-xs" style={{ color: "var(--subtle)" }}>
                  Select a request to submit a quote
                </p>
              </div>
            )}
          </div>

          {/* My quotes */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--subtle)" }}>
              My Quotes
            </h3>
            <div className="space-y-2">
              {myQuotes.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{
                    background: "var(--surface-muted)",
                    border: "1px solid var(--border)",
                    opacity: q.active ? 1 : 0.45,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="mono text-xs font-bold" style={{ color: "var(--ink)" }}>
                      #{q.requestId}
                    </span>
                    <span className="mono text-xs font-semibold" style={{ color: "var(--warn)" }}>
                      {formatBps(q.spread_bps)}
                    </span>
                    {q.active && now > 0 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--subtle)" }}>
                        <Clock style={{ width: 10, height: 10 }} />
                        <span className="mono">{formatCountdown(q.expiry - now)}</span>
                      </span>
                    )}
                    {!q.active && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: "var(--surface-muted)",
                          color: "var(--subtle)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Expired
                      </span>
                    )}
                  </div>
                  {q.active && (
                    <button
                      onClick={() => handleCancelQuote(q.requestId, idx)}
                      disabled={loading === `cancel-${q.requestId}-${idx}`}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg transition-all disabled:opacity-40 hover:opacity-70"
                      style={{ color: "var(--danger)" }}
                    >
                      {loading === `cancel-${q.requestId}-${idx}`
                        ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                        : <X style={{ width: 11, height: 11 }} />}
                      Cancel
                    </button>
                  )}
                  {!q.active && (
                    <CheckCircle2 style={{ width: 13, height: 13, color: "var(--subtle)", opacity: 0.4 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
