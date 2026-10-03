"use client";
/**
 * Write-side hooks. Every action: switch to the deployment chain if needed, approve USDG if the call
 * pulls margin, send, wait for the receipt, then call onDone so the page can refresh.
 */
import { useState, useCallback, useEffect } from "react";
import { useAccount, useWriteContract, useSwitchChain } from "wagmi";
import { maxUint256, type Abi } from "viem";
import { parityAbi } from "@/abi/parity";
import { erc20Abi } from "@/abi/erc20";
import { adminPriceSourceAbi } from "@/abi/adminPriceSource";
import { governanceRateSourceAbi } from "@/abi/governanceRateSource";
import { DEFAULT_CHAIN_ID, getDeployment, explorerUrl } from "./constants";
import { getClient } from "./contract";
import { shortError } from "./format";

export type TxState = { status: "idle" | "pending" | "success" | "error"; message?: string; hash?: string };

export function useDeployment() {
  return getDeployment(DEFAULT_CHAIN_ID);
}

export function useTx(onDone?: () => void) {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<TxState>({ status: "idle" });
  const d = getDeployment(DEFAULT_CHAIN_ID);

  const send = useCallback(
    async (label: string, req: { address: `0x${string}`; abi: Abi; functionName: string; args?: readonly unknown[] }, approveUsdg?: bigint) => {
      if (!address || !d) {
        setState({ status: "error", message: "Connect a wallet first" });
        return false;
      }
      try {
        setState({ status: "pending", message: `${label}…` });
        if (chainId !== DEFAULT_CHAIN_ID) await switchChainAsync({ chainId: DEFAULT_CHAIN_ID });
        const client = getClient(DEFAULT_CHAIN_ID);
        if (approveUsdg !== undefined && approveUsdg > 0n) {
          const allowance = await client.readContract({ address: d.usdg, abi: erc20Abi, functionName: "allowance", args: [address, d.parity] });
          if (allowance < approveUsdg) {
            setState({ status: "pending", message: "Approve USDG…" });
            const h = await writeContractAsync({ address: d.usdg, abi: erc20Abi, functionName: "approve", args: [d.parity, maxUint256], chainId: DEFAULT_CHAIN_ID });
            await client.waitForTransactionReceipt({ hash: h });
          }
        }
        setState({ status: "pending", message: `${label}: confirm in wallet…` });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hash = await writeContractAsync({ ...(req as any), chainId: DEFAULT_CHAIN_ID });
        setState({ status: "pending", message: `${label}: waiting for block…`, hash });
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("transaction reverted");
        setState({ status: "success", message: `${label} confirmed`, hash });
        onDone?.();
        return true;
      } catch (err) {
        setState({ status: "error", message: shortError(err) });
        return false;
      }
    },
    [address, chainId, d, onDone, switchChainAsync, writeContractAsync]
  );

  const parity = d ? { address: d.parity, abi: parityAbi as Abi } : null;
  const prices = d ? { address: d.priceSource, abi: adminPriceSourceAbi as Abi } : null;
  const rates = d ? { address: d.rateSource, abi: governanceRateSourceAbi as Abi } : null;
  const usdg = d ? { address: d.usdg, abi: erc20Abi as Abi } : null;
  return { send, state, setState, parity, prices, rates, usdg, explorer: explorerUrl(DEFAULT_CHAIN_ID) };
}

/** Poll a loader every `ms` and on demand. */
export function usePoll<T>(load: () => Promise<T>, ms = 15_000, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, ms);
    return () => clearInterval(t);
  }, [refresh, ms]);
  return { data, loading, refresh };
}
