"use client";

import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import type { TxState } from "@/lib/hooks";

export default function TxStatus({ state, explorer }: { state: TxState; explorer: string }) {
  if (state.status === "idle") return null;
  const color = state.status === "error" ? "var(--danger)" : state.status === "success" ? "var(--success)" : "var(--warn)";
  const Icon = state.status === "error" ? AlertCircle : state.status === "success" ? CheckCircle2 : Loader2;
  return (
    <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2" style={{ color, background: "var(--surface-muted)", border: "1px solid var(--border)" }}>
      <Icon style={{ width: 13, height: 13 }} className={state.status === "pending" ? "animate-spin" : ""} />
      <span className="flex-1 break-all">{state.message}</span>
      {state.hash && (
        <a href={`${explorer}/tx/${state.hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">
          tx <ExternalLink style={{ width: 10, height: 10 }} />
        </a>
      )}
    </div>
  );
}
