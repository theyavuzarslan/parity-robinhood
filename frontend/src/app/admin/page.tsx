"use client";

import { useAccount } from "wagmi";
import { Settings2, AlertTriangle } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  const { isConnected, address } = useAccount();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Settings2 style={{ width: 20, height: 20, color: "var(--subtle)" }} />
        <h1 className="display text-2xl font-bold" style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Admin Panel
        </h1>
      </div>

      {!isConnected && (
        <div
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{
            background: "rgba(244,201,122,0.08)",
            border: "1px solid rgba(244,201,122,0.22)",
          }}
        >
          <AlertTriangle
            style={{ width: 16, height: 16, color: "var(--warn)", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--warn)" }}>
              Wallet not connected
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--subtle)" }}>
              Connect your wallet to interact with the contract. Admin functions require the contract admin key.
            </p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640 }}>
        <AdminPanel walletConnected={isConnected} walletAddress={address ?? null} />
      </div>
    </div>
  );
}
