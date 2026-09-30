/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };

    // ConnectKit → @wagmi/connectors → @coinbase/cdp-sdk dynamically imports
    // @x402/* packages which are optional peer deps not installed here.
    // Webpack still tries to resolve the dynamic import() calls — stub them out.
    const x402Modules = [
      "@x402/core/client",
      "@x402/evm/exact/client",
      "@x402/evm/upto/client",
      "@x402/svm/client",
    ];
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...Object.fromEntries(x402Modules.map((m) => [m, false])),
      // pino-pretty is an optional dev dep of pino (used by WalletConnect logger)
      "pino-pretty": false,
    };

    // On the server bundle, also mark @coinbase/cdp-sdk as external so its
    // dynamic imports never get walked by webpack at all.
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        "@coinbase/cdp-sdk",
        "@base-org/account",
      ];
    }

    return config;
  },
};

export default nextConfig;
