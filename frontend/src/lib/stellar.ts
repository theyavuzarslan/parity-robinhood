/**
 * @deprecated This file is intentionally empty.
 * The project has been ported to Arc (EVM). Wallet and RPC functionality
 * is now handled by wagmi + ConnectKit in src/providers/Web3Provider.tsx
 * and src/lib/contract.ts.
 */

// No-op exports to satisfy any remaining import references during migration.
export async function connectWallet(): Promise<string | null> { return null; }
export async function getPublicKey(): Promise<string | null> { return null; }
export async function signAndSubmitTx(_xdr: string): Promise<{ status: string } | null> { return null; }
export function getServer() { return null; }
