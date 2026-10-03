"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { getOpenRequests, getCurrentTime, type Request } from "@/lib/contract";
import { useTx, usePoll } from "@/lib/hooks";
import { formatPrice, formatUSD, toUsdg } from "@/lib/format";
import { Card, Label, Chip, Button, NumberInput } from "@/components/ui";
import TxStatus from "@/components/TxStatus";
import RequestRow from "@/components/RequestRow";

const EXPIRIES = [0, 1, 4, 24] as const; // hours; 0 = no expiry

export default function MakerPage() {
  const { address } = useAccount();
  const { data: requests, refresh } = usePoll(() => getOpenRequests(), 10_000, []);
  const { data: chainNow } = usePoll(() => getCurrentTime(), 15_000, []);
  const tx = useTx(useCallback(() => refresh(), [refresh]));
  const [selected, setSelected] = useState<number | null>(null);
  const [spread, setSpread] = useState("10");
  const [expiryH, setExpiryH] = useState<number>(4);

  const req: Request | undefined = useMemo(() => (requests ?? []).find((r) => r.id === selected), [requests, selected]);
  const bps = parseInt(spread || "0", 10) || 0;
  const locked = req ? req.parityForward + (req.parityForward * bps) / 10_000 : 0;

  const submit = () => {
    if (!req || !tx.parity) return;
    const expiry = expiryH === 0 ? 0n : BigInt((chainNow ?? Math.floor(Date.now() / 1000)) + expiryH * 3600);
    tx.send("Submit quote", { ...tx.parity, functionName: "submitQuote", args: [BigInt(req.id), BigInt(bps), expiry] }, toUsdg(req.initialMargin));
  };
  const cancel = (r: Request, q: number) => tx.parity && tx.send("Cancel quote", { ...tx.parity, functionName: "cancelQuote", args: [BigInt(r.id), BigInt(q)] });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: "var(--ink)" }}>Maker</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Quote a spread over the parity forward. Your initial margin is reserved when you quote, so the hedger can open the position
          in one transaction. Cancelling returns it.
        </p>
      </div>
      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-3">
          <Label>Open requests</Label>
          {(requests ?? []).length === 0 && <Card><p className="text-xs" style={{ color: "var(--subtle)" }}>No open requests. Post one from the Market page.</p></Card>}
          {(requests ?? []).map((r) => (
            <div key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer rounded-xl" style={{ outline: selected === r.id ? "1px solid var(--accent)" : "none" }}>
              <RequestRow r={r} now={chainNow ?? 0} me={address} onCancelQuote={(q) => cancel(r, q)} canAccept={tx.state.status !== "pending"} />
            </div>
          ))}
        </div>
        <div className="lg:col-span-5">
          <Card className="space-y-4">
            <Label>Submit quote</Label>
            {!req ? (
              <p className="text-xs" style={{ color: "var(--subtle)" }}>Select a request.</p>
            ) : (
              <>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span style={{ color: "var(--subtle)" }}>Request</span><span className="mono" style={{ color: "var(--ink)" }}>#{req.id} {req.base}/{req.quote} {req.tenorDays}D</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--subtle)" }}>Hedger</span><span className="mono" style={{ color: "var(--ink)" }}>{req.direction === "SellBase" ? "sells" : "buys"} {req.notional.toLocaleString()} {req.base}</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--subtle)" }}>Parity forward</span><span className="mono" style={{ color: "var(--ink)" }}>{formatPrice(req.parityForward, 4)}</span></div>
                </div>
                <div>
                  <span className="text-xs block mb-1.5" style={{ color: "var(--subtle)" }}>Spread over parity</span>
                  <NumberInput value={spread} onChange={setSpread} suffix="bps" />
                  <p className="text-xs mt-1 mono" style={{ color: "var(--muted)" }}>locked forward {formatPrice(locked, 4)}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {EXPIRIES.map((h) => (
                    <Chip key={h} active={expiryH === h} onClick={() => setExpiryH(h)}>{h === 0 ? "no expiry" : `${h}h`}</Chip>
                  ))}
                </div>
                <div className="flex justify-between text-xs rounded-xl px-3 py-2" style={{ background: "rgba(244,201,122,0.08)", border: "1px solid rgba(244,201,122,0.18)" }}>
                  <span style={{ color: "var(--subtle)" }}>Margin reserved now</span>
                  <span className="mono font-bold" style={{ color: "var(--warn)" }}>{formatUSD(req.initialMargin)} USDG</span>
                </div>
                <Button onClick={submit} disabled={!address || tx.state.status === "pending"} className="w-full py-3 text-sm">
                  {address ? "Submit quote" : "Connect wallet"}
                </Button>
              </>
            )}
            <TxStatus state={tx.state} explorer={tx.explorer} />
          </Card>
        </div>
      </div>
    </div>
  );
}
