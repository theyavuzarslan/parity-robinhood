"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { robinhoodTestnet, anvil } from "viem/chains";
import { rpcUrl } from "@/lib/constants";

const config = createConfig(
  getDefaultConfig({
    chains: [robinhoodTestnet, anvil],
    transports: {
      [robinhoodTestnet.id]: http(rpcUrl(robinhoodTestnet.id)),
      [anvil.id]: http("http://127.0.0.1:8545"),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
    appName: "Parity",
    appDescription: "Forwards on Robinhood Stock Tokens",
    appUrl: "https://github.com/theyavuzarslan/parity-robinhood",
  })
);

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="midnight">{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
