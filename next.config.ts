import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: [
    'libsodium-wrappers-sumo',
    'libsodium-sumo',
    '@emurgo/cardano-message-signing-nodejs',
    '@emurgo/cardano-message-signing-browser',
    '@midnight-ntwrk/ledger-v7',
    '@midnight-ntwrk/zswap',
    '@lucid-evolution/uplc',
    '@anastasia-labs/cardano-multiplatform-lib-nodejs',
    '@anastasia-labs/cardano-multiplatform-lib-browser',
    '@blaze-cardano/uplc',
    '@cardano-sdk/crypto',
  ],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
