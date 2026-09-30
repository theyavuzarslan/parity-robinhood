"use client";

import { ConnectKitButton } from "connectkit";
import { Wallet } from "lucide-react";

export default function WalletConnect() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, address, ensName }) => (
        <button
          onClick={show}
          className="flex items-center gap-2 text-sm font-semibold rounded-xl transition-all"
          style={{
            padding: "6px 14px",
            background: isConnected ? "var(--surface-strong)" : "var(--accent)",
            color: isConnected ? "var(--ink-2)" : "#0d1b2f",
            border: isConnected ? "1px solid var(--border-strong)" : "none",
          }}
        >
          {isConnected ? (
            <>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "var(--success)" }}
              />
              <span className="mono text-xs font-medium">
                {ensName ?? `${address?.slice(0, 6)}…${address?.slice(-4)}`}
              </span>
            </>
          ) : (
            <>
              <Wallet style={{ width: 14, height: 14 }} />
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </>
          )}
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}
