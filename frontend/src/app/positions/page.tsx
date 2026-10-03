"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { getAllPositions, getCurrentTime, type Position } from "@/lib/contract";
import { useTx, usePoll } from "@/lib/hooks";
import { formatPrice, formatUSD, formatCountdown, truncateAddress, toUsdg } from "@/lib/format";
import { Card, Label, Button, NumberInput } from "@/components/ui";
import TxStatus from "@/components/TxStatus";
import MarginBar from "@/components/MarginBar";

export default function PositionsPage() {
  const { address } = useAccount();
  const { data: positions, refresh } = usePoll(() => getAllPositions(), 10_000, []);
  const { data: chainNow, refresh: refreshNow } = usePoll(() => getCurrentTime(), 10_000, []);
  const tx = useTx(useCallback(() => { refresh(); refreshNow(); }, [refresh, refreshNow]));
  const [mineOnly, setMineOnly] = useState(false);

  const list = (positions ?? []).filter(
    (p) => !mineOnly || (address && [p.hedger, p.maker].some((a) => a.toLowerCase() === address.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: "var(--ink)" }}>Positions</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Anyone can mark or liquidate. The first breach closes 30% and keeps the rest collateralized; settlement pays the difference in USDG at maturity.
          </p>
        </div>
        <Button tone="ghost" onClick={() => setMineOnly(!mineOnly)}>{mineOnly ? "Show all" : "Show mine"}</Button>
      </div>
      <TxStatus state={tx.state} explorer={tx.explorer} />
      {list.length === 0 && <Card><p className="text-xs" style={{ color: "var(--subtle)" }}>No positions yet.</p></Card>}
      <div className="grid gap-4">
        {list.map((p) => (
          <PositionCard key={p.id} p={p} now={chainNow ?? 0} me={address} tx={tx} />
        ))}
      </div>
    </div>
  );
}

function PositionCard({ p, now, me, tx }: { p: Position; now: number; me?: string; tx: ReturnType<typeof useTx> }) {
  const [topUp, setTopUp] = useState("");
  const value = p.markValue ?? p.lastMarkValue;
  const hedgerLoss = Math.max(-value, 0);
  const makerLoss = Math.max(value, 0);
  const mature = now >= p.maturityTime;
  const active = p.status === "Active";
  const isParty = me && [p.hedger, p.maker].some((a) => a.toLowerCase() === me.toLowerCase());
  const breached = hedgerLoss >= p.liqThreshold || makerLoss >= p.liqThreshold;
  const busy = tx.state.status === "pending";
  const call = (label: string, fn: string, args: unknown[], approve?: bigint) =>
    tx.parity && tx.send(label, { ...tx.parity, functionName: fn, args }, approve);

  return (
    <Card style={{ borderColor: !active ? "var(--border)" : breached ? "rgba(232,109,122,0.45)" : hedgerLoss >= p.callThreshold || makerLoss >= p.callThreshold ? "rgba(244,201,122,0.40)" : "var(--border)", opacity: active ? 1 : 0.6 }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="mono text-sm font-bold" style={{ color: "var(--ink)" }}>
          #{p.id} · hedger {p.direction === "SellBase" ? "sold" : "bought"} {p.notional.toLocaleString()} {p.base}/{p.quote} forward
        </span>
        <span className="text-xs mono" style={{ color: active ? (mature ? "var(--warn)" : "var(--subtle)") : "var(--subtle)" }}>
          {active ? (mature ? "Matured, ready to settle" : `matures in ${formatCountdown(p.maturityTime - now)}`) : p.status}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
        <Metric k="Locked forward" v={formatPrice(p.lockedForward, 4)} />
        <Metric k="Current forward" v={p.currentForward !== null ? formatPrice(p.currentForward, 4) : "—"} />
        <Metric k="Spot" v={p.spot !== null ? formatPrice(p.spot, 2) : "—"} />
        <Metric k="Hedger P&L" v={`${value >= 0 ? "+" : ""}${formatUSD(value)}`} color={value >= 0 ? "var(--success)" : "var(--danger)"} />
      </div>
      <div className="text-xs mono mt-2" style={{ color: "var(--subtle)" }}>
        H {truncateAddress(p.hedger)} · M {truncateAddress(p.maker)}
        {(p.hedgerPartialDone || p.makerPartialDone) && " · partially liquidated"}
      </div>
      {active && (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <MarginBar label="Hedger" margin={p.hedgerMargin} loss={hedgerLoss} callAt={p.callThreshold} liqAt={p.liqThreshold} state={p.hedgerState} />
            <MarginBar label="Maker" margin={p.makerMargin} loss={makerLoss} callAt={p.callThreshold} liqAt={p.liqThreshold} state={p.makerState} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4 items-center">
            <Button tone="ghost" disabled={busy} onClick={() => call("Mark to market", "markPosition", [BigInt(p.id)])}>Mark to market</Button>
            {breached && <Button tone="danger" disabled={busy} onClick={() => call("Liquidate", "liquidate", [BigInt(p.id)])}>Liquidate</Button>}
            {mature && <Button tone="success" disabled={busy} onClick={() => call("Settle", "settle", [BigInt(p.id)])}>Settle</Button>}
            {isParty && (
              <div className="flex gap-2 items-center">
                <div className="w-36"><NumberInput value={topUp} onChange={setTopUp} placeholder="Top up" suffix="USDG" /></div>
                <Button tone="ghost" disabled={busy || !(parseFloat(topUp) > 0)} onClick={() => call("Top up margin", "topUpMargin", [BigInt(p.id), toUsdg(parseFloat(topUp))], toUsdg(parseFloat(topUp)))}>Top up</Button>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function Metric({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <Label>{k}</Label>
      <div className="mono text-sm font-semibold mt-0.5" style={{ color: color ?? "var(--ink)" }}>{v}</div>
    </div>
  );
}
