"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { TrendingUp, Shield, Clock, Coins, ExternalLink } from "lucide-react";
import { PAIRS, TENORS, DEFAULT_PAIR, PARAMS, type PairDef } from "@/lib/constants";
import { previewForward, getOpenRequests, getInsuranceBalance, getUsdgBalance, getCurrentTime, DIRECTION_INDEX, type Direction, type Request } from "@/lib/contract";
import { useTx, usePoll, useDeployment } from "@/lib/hooks";
import { formatPrice, formatUSD, formatPct, toBytes32, toD, toUsdg, truncateAddress } from "@/lib/format";
import { Card, Label, Chip, Button, NumberInput } from "@/components/ui";
import TxStatus from "@/components/TxStatus";
import RequestRow from "@/components/RequestRow";

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon style={{ width: 13, height: 13, color: "var(--accent)" }} />
        <Label>{label}</Label>
      </div>
      <div className="display text-2xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "var(--subtle)" }}>{sub}</div>}
    </Card>
  );
}

export default function MarketPage() {
  const { address } = useAccount();
  const d = useDeployment();
  const [pair, setPair] = useState<PairDef>(DEFAULT_PAIR);
  const [tenor, setTenor] = useState<number>(90);
  const [direction, setDirection] = useState<Direction>("SellBase");
  const [notional, setNotional] = useState("1000");

  const { data: fwd, refresh: refreshFwd } = usePoll(() => previewForward(pair.base, pair.quote, tenor), 15_000, [pair.id, tenor]);
  const { data: matrix } = usePoll(
    async () => {
      const rows = await Promise.all(PAIRS.map(async (p) => [p.id, await previewForward(p.base, p.quote, 90)] as const));
      return Object.fromEntries(rows);
    },
    30_000,
    []
  );
  const { data: requests, refresh: refreshReqs } = usePoll(() => getOpenRequests(), 10_000, []);
  const { data: insurance, refresh: refreshIns } = usePoll(() => getInsuranceBalance(), 15_000, []);
  const { data: balance, refresh: refreshBal } = usePoll(async () => (address ? getUsdgBalance(address) : null), 15_000, [address]);
  const { data: chainNow } = usePoll(() => getCurrentTime(), 15_000, []);

  const refreshAll = useCallback(() => {
    refreshReqs();
    refreshIns();
    refreshBal();
    refreshFwd();
  }, [refreshReqs, refreshIns, refreshBal, refreshFwd]);
  const tx = useTx(refreshAll);

  const n = parseFloat(notional || "0");
  const notionalValue = fwd ? (pair.marginInQuote ? n * fwd.spot : n) : 0;
  const margin = (notionalValue * PARAMS.marginBps) / 10_000;
  const fee = (notionalValue * PARAMS.openFeeBps) / 10_000;
  const points = fwd ? fwd.forward - fwd.spot : 0;

  const myRequests = useMemo(() => (requests ?? []).filter((r) => address && r.hedger.toLowerCase() === address.toLowerCase()), [requests, address]);
  const otherRequests = useMemo(() => (requests ?? []).filter((r) => !address || r.hedger.toLowerCase() !== address.toLowerCase()), [requests, address]);

  const post = () =>
    tx.parity &&
    tx.send("Post request", {
      ...tx.parity,
      functionName: "postRequest",
      args: [toBytes32(pair.base), toBytes32(pair.quote), DIRECTION_INDEX[direction], toD(n), tenor],
    });

  const accept = (r: Request, quoteId: number) =>
    tx.parity &&
    tx.send("Accept quote", { ...tx.parity, functionName: "acceptQuote", args: [BigInt(r.id), BigInt(quoteId)] }, toUsdg(r.initialMargin * 1.01));

  const mint = () => tx.usdg && address && tx.send("Mint 100,000 test USDG", { ...tx.usdg, functionName: "mint", args: [address, toUsdg(100_000)] });

  if (!d) {
    return <Card>No Parity deployment found for this chain. Run scripts/deploy-testnet.sh and scripts/sync-frontend.sh.</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl font-bold" style={{ color: "var(--ink)" }}>Forwards on Robinhood Stock Tokens</h1>
        <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--muted)" }}>
          The forward price is computed on-chain from interest-rate parity, not quoted by a dealer. Stock Tokens reinvest dividends
          into the token, so the forward is spot plus the cost of carry: <span className="mono">F = S × (1 + r_USD × t/360)</span>. Makers compete only on the spread over it.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={`${pair.id} spot`} value={fwd ? formatPrice(fwd.spot, 2) : "…"} sub="price source" icon={TrendingUp} />
        <Stat label={`${tenor}D forward`} value={fwd ? formatPrice(fwd.forward, 4) : "…"} sub={fwd ? `points ${points >= 0 ? "+" : ""}${formatPrice(points, 4)}` : ""} icon={TrendingUp} />
        <Stat label="Insurance fund" value={insurance !== null && insurance !== undefined ? formatUSD(insurance) : "…"} sub="USDG, on-chain" icon={Shield} />
        <Stat label="Chain clock" value={chainNow ? new Date(chainNow * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "…"} sub="demo clock if set" icon={Clock} />
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-5">
          <Card className="space-y-4">
            <Label>Post a request for quote</Label>
            <div className="flex flex-wrap gap-1.5">
              {PAIRS.map((p) => (
                <Chip key={p.id} active={pair.id === p.id} onClick={() => setPair(p)}>{p.id}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Chip mono={false} active={direction === "SellBase"} onClick={() => setDirection("SellBase")}>Sell {pair.base} forward</Chip>
              <Chip mono={false} active={direction === "BuyBase"} onClick={() => setDirection("BuyBase")}>Buy {pair.base} forward</Chip>
            </div>
            <div>
              <span className="text-xs block mb-1.5" style={{ color: "var(--subtle)" }}>Notional</span>
              <NumberInput value={notional} onChange={setNotional} suffix={pair.unit} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TENORS.map((t) => (
                <Chip key={t} active={tenor === t} onClick={() => setTenor(t)}>{t}D</Chip>
              ))}
            </div>
            {fwd && (
              <div className="rounded-xl px-3 py-2.5 space-y-1 text-xs" style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}>
                <Row k="Parity forward" v={formatPrice(fwd.forward, 4)} />
                <Row k={`r(${pair.base}) / r(${pair.quote})`} v={`${formatPct(fwd.rateBase)} / ${formatPct(fwd.rateQuote)}`} />
                <Row k="Notional value" v={formatUSD(notionalValue)} />
                <Row k="Initial margin, each side (5%)" v={formatUSD(margin)} />
                <Row k="Open fee to insurance (2 bps)" v={formatUSD(fee)} />
              </div>
            )}
            <Button onClick={post} disabled={!address || !(n > 0) || tx.state.status === "pending"} className="w-full py-3 text-sm">
              {address ? "Post request" : "Connect wallet"}
            </Button>
            <TxStatus state={tx.state} explorer={tx.explorer} />
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center gap-2"><Coins style={{ width: 13, height: 13, color: "var(--accent)" }} /><Label>Testnet margin</Label></div>
            <p className="text-xs" style={{ color: "var(--subtle)" }}>
              Margin is posted in USDG. On testnet it is a mintable stand-in, so anyone can fund a demo wallet. Gas is testnet ETH from faucet.testnet.chain.robinhood.com.
            </p>
            <div className="flex items-center justify-between">
              <span className="mono text-sm" style={{ color: "var(--ink)" }}>{balance !== null && balance !== undefined ? formatUSD(balance) : "—"} USDG</span>
              <Button tone="ghost" onClick={mint} disabled={!address}>Mint 100,000</Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-5">
          <Card>
            <Label>Your open requests</Label>
            <div className="mt-3 space-y-3">
              {myRequests.length === 0 && <p className="text-xs" style={{ color: "var(--subtle)" }}>None. Post one, then quote it from the Maker page (a second wallet, or the same one for the demo).</p>}
              {myRequests.map((r) => (
                <RequestRow key={r.id} r={r} now={chainNow ?? 0} onAccept={(q) => accept(r, q)} canAccept={tx.state.status !== "pending"} />
              ))}
            </div>
          </Card>

          <Card>
            <Label>Other open requests</Label>
            <div className="mt-3 space-y-3">
              {otherRequests.length === 0 && <p className="text-xs" style={{ color: "var(--subtle)" }}>None.</p>}
              {otherRequests.map((r) => <RequestRow key={r.id} r={r} now={chainNow ?? 0} />)}
            </div>
          </Card>

          <Card>
            <Label>90-day parity forwards</Label>
            <table className="w-full text-sm mt-3">
              <thead>
                <tr style={{ color: "var(--subtle)" }} className="text-xs">
                  <th className="text-left py-1.5">Pair</th><th className="text-right">Spot</th><th className="text-right">r base</th><th className="text-right">r quote</th><th className="text-right">90D forward</th>
                </tr>
              </thead>
              <tbody>
                {PAIRS.map((p) => {
                  const m = matrix?.[p.id];
                  return (
                    <tr key={p.id} className="cursor-pointer" style={{ borderTop: "1px solid var(--border)" }} onClick={() => { setPair(p); setTenor(90); }}>
                      <td className="py-2 mono font-bold" style={{ color: "var(--ink)" }}>{p.id}</td>
                      <td className="text-right mono" style={{ color: "var(--muted)" }}>{m ? formatPrice(m.spot, 2) : "—"}</td>
                      <td className="text-right mono" style={{ color: "var(--muted)" }}>{m ? formatPct(m.rateBase) : "—"}</td>
                      <td className="text-right mono" style={{ color: "var(--muted)" }}>{m ? formatPct(m.rateQuote) : "—"}</td>
                      <td className="text-right mono font-semibold" style={{ color: "var(--ink)" }}>{m ? formatPrice(m.forward, 4) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <a href={`${tx.explorer}/address/${d.parity}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs" style={{ color: "var(--subtle)" }}>
              Parity contract {truncateAddress(d.parity)} <ExternalLink style={{ width: 10, height: 10 }} />
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--subtle)" }}>{k}</span>
      <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{v}</span>
    </div>
  );
}
