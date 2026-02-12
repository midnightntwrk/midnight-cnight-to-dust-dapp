import type { NextConfig } from "next";

// 'unsafe-eval' only in development (React/Turbopack dev tooling). Omit in production to reduce XSS risk.
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = isDev
  ? "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'wasm-unsafe-eval'";

 const network = process.env.NEXT_PUBLIC_CARDANO_NET?.toLowerCase() || 'preview';
  const indexerEndpoints: Record<string, string> = {
    mainnet: 'https://indexer.mainnet.midnight.network',
    preview: 'https://indexer.preview.midnight.network',
    preprod: 'https://indexer.preprod.midnight.network',
  };
  const indexerEndpoint = indexerEndpoints[network] || indexerEndpoints.preview;

const connectSrc = isDev
  ? `connect-src 'self' ws://localhost:* http://localhost:* ${indexerEndpoints}`
  : `connect-src 'self' ${indexerEndpoint}`;

const cspHeader = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  connectSrc,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const permissionsPolicy =
  "camera=(), microphone=(), geolocation=(), interest-cohort=()";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "0" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Permissions-Policy", value: permissionsPolicy },
          { key: "Permissions-Policy", value: permissionsPolicy },
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
