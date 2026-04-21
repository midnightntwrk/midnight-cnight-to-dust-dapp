import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@lucid-evolution/lucid'],
  outputFileTracingIncludes: {
    '*': [
      './node_modules/async-function/**/*',
      './node_modules/async-generator-function/**/*',
      './node_modules/generator-function/**/*',
    ],
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
  turbopack: {},
};

export default nextConfig;
