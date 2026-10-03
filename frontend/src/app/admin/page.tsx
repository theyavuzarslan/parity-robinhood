"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { keccak256, concat } from "viem";
import { getOwner, getCurrentTime, getAllPositions, previewForward } from "@/lib/contract";
import { useTx, usePoll } from "@/lib/hooks";
import { PAIRS, RATE_SYMBOLS, DEFAULT_PAIR, type PairDef } from "@/lib/constants";
import { toBytes32, toD, formatPrice, formatPct, truncateAddress } from "@/lib/format";
import { Card, Label, Chip, Button, NumberInput } from "@/components/ui";
import TxStatus from "@/components/TxStatus";

export default function AdminPage() {
  const { address } = useAccount();
  const { data: owner } = usePoll(() => getOwner(), 60_000, []);
  const { data: now, refresh: refreshNow } = usePoll(() => getCurrentTime(), 10_000, []);
  const { data: positions, refresh: refreshPos } = usePoll(() => getAllPositions(), 15_000, []);
  const [pair, setPair] = useState<PairDef>(DEFAULT_PAIR);
  const { data: fwd, refresh: refreshFwd } = usePoll(() => previewForward(pair.base, pair.quote, 90), 15_000, [pair.id]);
  const tx = useTx(useCallback(() => { refreshNow(); refreshPos(); refreshFwd(); }, [refreshNow, refreshPos, refreshFwd]));
  const [spot, setSpot] = useState("310");
  const [rateSym, setRateSym] = useState<string>("USD");
  const [rate, setRate] = useState("4");
  const isOwner = !!(address && owner && address.toLowerCase() === owner.toLowerCase());
  const busy = tx.state.status === "pending" || !isOwner;
  const latest = (positions ?? []).find((p) => p.status === "Active");

  const setTime = (ts: number) => tx.parity && tx.send("Set demo time", { ...tx.parity, functionName: "setDemoTime", args: [BigInt(ts)] });

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: "var(--ink)" }}>Demo controls</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          A 90-day forward does not fit a four-minute demo. This testnet deployment runs in demo mode: the owner can set prices
          (Stock Token Chainlink feeds exist on mainnet only) and move the contract clock. A production deployment cannot.
        </p>
        <p className="text-xs mt-2 mono" style={{ color: isOwner ? "var(--success)" : "var(--warn)" }}>
          owner {owner ? truncateAddress(owner) : "…"} · {isOwner ? "you are the owner" : "connect the owner wallet to use these"}
        </p>
      </div>
      <TxStatus state={tx.state} explorer={tx.explorer} />

      <Card className="space-y-3">
        <Label>Spot price</Label>
        <div className="flex flex-wrap gap-1.5">
          {PAIRS.map((p) => <Chip key={p.id} active={pair.id === p.id} onClick={() => setPair(p)}>{p.id}</Chip>)}
        </div>
        <p className="text-xs mono" style={{ color: "var(--subtle)" }}>current {fwd ? formatPrice(fwd.spot, 4) : "…"} · 90D forward {fwd ? formatPrice(fwd.forward, 4) : "…"}</p>
        <div className="flex gap-2">
          <div className="flex-1"><NumberInput value={spot} onChange={setSpot} /></div>
          <Button disabled={busy || !(parseFloat(spot) > 0)} onClick={() => tx.prices && tx.send(`Set ${pair.id} spot`, { ...tx.prices, functionName: "setSpot", args: [keccakPair(pair), toD(parseFloat(spot))] })}>Push print</Button>
        </div>
        <p className="text-xs" style={{ color: "var(--subtle)" }}>Liquidation uses the median of the last three prints, so push a level twice to make it count.</p>
      </Card>

      <Card className="space-y-3">
        <Label>Interest rate</Label>
        <div className="flex flex-wrap gap-1.5">
          {RATE_SYMBOLS.map((s) => <Chip key={s} active={rateSym === s} onClick={() => setRateSym(s)}>{s}</Chip>)}
        </div>
        <p className="text-xs mono" style={{ color: "var(--subtle)" }}>{fwd ? `r(${pair.base}) ${formatPct(fwd.rateBase)} · r(${pair.quote}) ${formatPct(fwd.rateQuote)}` : ""}</p>
        <div className="flex gap-2">
          <div className="flex-1"><NumberInput value={rate} onChange={setRate} suffix="%" /></div>
          <Button disabled={busy} onClick={() => tx.rates && tx.send(`Set ${rateSym} rate`, { ...tx.rates, functionName: "setRate", args: [toBytes32(rateSym), toD(parseFloat(rate) / 100)] })}>Set rate</Button>
        </div>
        <p className="text-xs" style={{ color: "var(--subtle)" }}>Change the USD rate and watch every stock forward move. On mainnet this leg is the Morpho USDG supply rate.</p>
      </Card>

      <Card className="space-y-3">
        <Label>Contract clock</Label>
        <p className="text-xs mono" style={{ color: "var(--subtle)" }}>now {now ? new Date(now * 1000).toUTCString() : "…"}</p>
        {latest ? (
          <div className="flex flex-wrap gap-2">
            <Button tone="ghost" disabled={busy} onClick={() => setTime(latest.openTime + 30 * 86400)}>Position #{latest.id}: day 30</Button>
            <Button tone="ghost" disabled={busy} onClick={() => setTime(latest.maturityTime)}>Position #{latest.id}: maturity</Button>
            <Button tone="ghost" disabled={busy} onClick={() => setTime(0)}>Real time</Button>
          </div>
        ) : (
          <Button tone="ghost" disabled={busy} onClick={() => setTime(0)}>Real time</Button>
        )}
      </Card>
    </div>
  );
}

function keccakPair(p: PairDef): `0x${string}` {
  // pairId = keccak256(abi.encodePacked(bytes32 base, bytes32 quote)), as in Parity.pairId
  return keccak256(concat([toBytes32(p.base), toBytes32(p.quote)]));
}
