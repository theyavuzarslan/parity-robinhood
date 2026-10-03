"use client";

import { Check, X } from "lucide-react";
import type { Request } from "@/lib/contract";
import { formatPrice, formatUSD, truncateAddress, formatCountdown } from "@/lib/format";
import { Button } from "@/components/ui";

export default function RequestRow({ r, now, onAccept, canAccept, me, onCancelQuote }: { r: Request; now: number; onAccept?: (quoteId: number) => void; canAccept?: boolean; me?: string; onCancelQuote?: (quoteId: number) => void }) {
  const live = r.quotes.filter((q) => q.status === "Live");
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between text-xs">
        <span className="mono font-bold" style={{ color: "var(--ink)" }}>
          #{r.id} · {r.direction === "SellBase" ? "Sell" : "Buy"} {r.notional.toLocaleString()} {r.base}/{r.quote} · {r.tenorDays}D
        </span>
        <span className="mono" style={{ color: "var(--muted)" }}>parity {formatPrice(r.parityForward, 4)}</span>
      </div>
      <div className="text-xs mt-1 mono" style={{ color: "var(--subtle)" }}>hedger {truncateAddress(r.hedger)} · margin {formatUSD(r.initialMargin)} each side</div>
      <div className="mt-2 space-y-1.5">
        {live.length === 0 && <div className="text-xs" style={{ color: "var(--subtle)" }}>No live quotes yet.</div>}
        {live.map((q) => {
          const expired = q.expiry !== 0 && now > q.expiry;
          return (
            <div key={q.id} className="flex items-center justify-between text-xs">
              <span className="mono" style={{ color: "var(--muted)" }}>
                quote {q.id} · {truncateAddress(q.maker)} · {q.spreadBps >= 0 ? "+" : ""}{q.spreadBps} bps → {formatPrice(q.lockedForward, 4)}
                {q.expiry !== 0 && <span style={{ color: expired ? "var(--danger)" : "var(--subtle)" }}> · {expired ? "expired" : formatCountdown(q.expiry - now)}</span>}
              </span>
              {onCancelQuote && me && q.maker.toLowerCase() === me.toLowerCase() && (
                <Button tone="danger" onClick={() => onCancelQuote(q.id)} disabled={!canAccept}>
                  <X style={{ width: 11, height: 11 }} /> Cancel
                </Button>
              )}
              {onAccept && (
                <Button tone="success" onClick={() => onAccept(q.id)} disabled={!canAccept || expired}>
                  <Check style={{ width: 11, height: 11 }} /> Accept
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
