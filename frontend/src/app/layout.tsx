"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Handshake,
  Settings2,
  ExternalLink,
} from "lucide-react";
import WalletConnect from "@/components/WalletConnect";
import { Web3Provider } from "@/providers/Web3Provider";
import "./globals.css";

const NAV_ITEMS = [
  { href: "/",          label: "Market",    icon: LayoutDashboard },
  { href: "/positions", label: "Positions", icon: BarChart3 },
  { href: "/maker",     label: "Maker",     icon: Handshake },
  { href: "/admin",     label: "Admin",     icon: Settings2 },
];

function ParityLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      {/* SVG wordmark — two overlapping bars suggesting parity / equilibrium */}
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="30" height="30" rx="8" fill="rgba(172,198,233,0.12)" />
        <rect x="6"  y="11" width="18" height="3" rx="1.5" fill="var(--accent)" />
        <rect x="6"  y="16" width="18" height="3" rx="1.5" fill="var(--accent)" opacity="0.5" />
        <circle cx="15" cy="12.5" r="2.5" fill="var(--accent)" />
      </svg>
      <div>
        <span
          className="display text-base font-bold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Parity
        </span>
        <span
          className="text-xs font-medium ml-1.5 hidden sm:inline"
          style={{ color: "var(--subtle)" }}
        >
          Forwards
        </span>
      </div>
    </Link>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <head>
        <title>Parity · Forwards on Robinhood Stock Tokens</title>
        <meta name="description" content="Parity-priced, RFQ, margined forwards on Robinhood Chain" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Web3Provider>
          {/* ── Header ─────────────────────────────────────────────────── */}
          <header
            className="sticky top-0 z-50"
            style={{
              background: "rgba(13,27,47,0.80)",
              backdropFilter: "blur(24px) saturate(160%)",
              WebkitBackdropFilter: "blur(24px) saturate(160%)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between h-14">

                {/* Logo + Nav */}
                <div className="flex items-center gap-6">
                  <ParityLogo />

                  <nav className="hidden md:flex items-center gap-1">
                    {NAV_ITEMS.map((item) => {
                      const isActive =
                        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            color: isActive ? "var(--ink)" : "var(--subtle)",
                            background: isActive ? "var(--surface-strong)" : "transparent",
                          }}
                        >
                          <item.icon style={{ width: 14, height: 14 }} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                {/* Right: chain badge + wallet */}
                <div className="flex items-center gap-3">
                  <a
                    href="https://explorer.testnet.chain.robinhood.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      color: "var(--success)",
                      background: "rgba(141,216,159,0.10)",
                      border: "1px solid rgba(141,216,159,0.20)",
                    }}
                  >
                    <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                    Robinhood Chain Testnet
                    <ExternalLink style={{ width: 10, height: 10, opacity: 0.6 }} />
                  </a>
                  <WalletConnect />
                </div>
              </div>
            </div>

            {/* Mobile nav strip */}
            <div className="md:hidden" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex max-w-7xl mx-auto">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors"
                      style={{ color: isActive ? "var(--accent)" : "var(--subtle)" }}
                    >
                      <item.icon style={{ width: 15, height: 15 }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          {/* ── Page content ───────────────────────────────────────────── */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 min-h-dvh">
            {children}
          </main>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <footer style={{ borderTop: "1px solid var(--border)", marginTop: 48 }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--subtle)" }}>
                Parity · Forwards on Robinhood Chain
              </span>
              <span className="mono text-xs" style={{ color: "var(--subtle)", opacity: 0.6 }}>
                Covered Interest Rate Parity
              </span>
            </div>
          </footer>
        </Web3Provider>
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppLayout>{children}</AppLayout>;
}
