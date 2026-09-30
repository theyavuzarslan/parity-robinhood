"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Clock, AlertCircle } from "lucide-react";
import { formatBps, formatCountdown, formatPrice } from "@/lib/format";
import { acceptQuote } from "@/lib/contract";
import type { MockRequest } from "@/lib/mock";

interface QuoteListProps {
  requests: MockRequest[];
  walletConnected: boolean;
}

export default function QuoteList({ requests, walletConnected }: QuoteListProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (requestId: number, quoteIndex: number) => {
    const key = `${requestId}-${quoteIndex}`;
    setAcceptingId(key);
    try {
      await acceptQuote("", requestId, quoteIndex);
    } finally {
      setAcceptingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 flex flex-col items-center gap-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <AlertCircle style={{ width: 20, height: 20, color: "var(--subtle)" }} />
        <p className="text-sm" style={{ color: "var(--subtle)" }}>No open requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {/* Request header */}
          <div
            className="px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="mono text-sm font-bold" style={{ color: "var(--ink)" }}>
                  #{req.id}
                </span>
                <span
                  className="mono text-xs px-2 py-0.5 rounded-md font-semibold"
                  style={{ background: "rgba(172,198,233,0.12)", color: "var(--accent)" }}
                >
                  {req.pair}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-semibold"
                  style={{
                    background: req.direction === "buy"
                      ? "rgba(141,216,159,0.12)"
                      : "rgba(232,109,122,0.12)",
                    color: req.direction === "buy" ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {req.direction.toUpperCase()}
                </span>
                <span className="text-xs mono font-medium" style={{ color: "var(--subtle)" }}>
                  {req.tenor}D
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs mb-0.5" style={{ color: "var(--subtle)" }}>Parity Fwd</div>
                <div className="mono text-sm font-bold" style={{ color: "var(--ink)" }}>
                  {formatPrice(req.forward)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs" style={{ color: "var(--subtle)" }}>
              <span className="mono">{req.hedger}</span>
              <span>
                Notional:{" "}
                <span className="mono font-medium" style={{ color: "var(--muted)" }}>
                  {req.notional.toLocaleString()}
                </span>
              </span>
            </div>
          </div>

          {/* Quotes */}
          <div className="px-5 py-3">
            {req.quotes.length === 0 ? (
              <p className="text-xs py-1.5" style={{ color: "var(--subtle)", opacity: 0.6 }}>
                No quotes yet
              </p>
            ) : (
              <div className="space-y-2">
                <div
                  className="grid grid-cols-4 gap-4 text-xs font-semibold uppercase tracking-widest px-1"
                  style={{ color: "var(--subtle)" }}
                >
                  <span>Maker</span>
                  <span>Spread</span>
                  <span>Expires</span>
                  <span className="text-right">Action</span>
                </div>
                {req.quotes
                  .filter((q) => q.active)
                  .map((quote, idx) => {
                    const key = `${req.id}-${idx}`;
                    const isAccepting = acceptingId === key;
                    const timeLeft = quote.expiry - now;
                    const allInFwd =
                      req.direction === "buy"
                        ? req.forward * (1 + quote.spread_bps / 10000)
                        : req.forward * (1 - quote.spread_bps / 10000);

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-4 gap-4 items-center px-3 py-2.5 rounded-xl"
                        style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}
                      >
                        <span className="mono text-xs truncate" style={{ color: "var(--muted)" }}>
                          {quote.maker}
                        </span>
                        <div>
                          <span className="mono text-xs font-bold" style={{ color: "var(--warn)" }}>
                            {formatBps(quote.spread_bps)}
                          </span>
                          <span className="mono text-xs ml-1" style={{ color: "var(--subtle)", opacity: 0.7 }}>
                            ({formatPrice(allInFwd)})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
                          <Clock style={{ width: 10, height: 10 }} />
                          <span className="mono">{formatCountdown(timeLeft)}</span>
                        </div>
                        <div className="text-right">
                          <button
                            onClick={() => handleAccept(req.id, idx)}
                            disabled={isAccepting || !walletConnected}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              background: "rgba(141,216,159,0.18)",
                              border: "1px solid rgba(141,216,159,0.35)",
                              color: "var(--success)",
                            }}
                          >
                            {isAccepting
                              ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                              : <Check style={{ width: 11, height: 11 }} />}
                            Accept
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
