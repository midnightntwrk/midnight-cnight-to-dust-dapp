import type { NextConfig } from 'next';

// Content Security Policy configuration
// In development, we need 'unsafe-eval' for Next.js hot reload
const isDev = process.env.NODE_ENV === 'development';

// Indexer endpoints that need to be allowed in CSP
const indexerEndpoints = [
  'https://indexer.preview.midnight.network',
  'https://indexer.preprod.midnight.network',
  'https://indexer.qanet.midnight.network',
].join(' ');

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' ${isDev ? "'unsafe-eval'" : ''} 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' ${isDev ? 'ws://localhost:* http://localhost:*' : ''} ${indexerEndpoints};
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  upgrade-insecure-requests;
`
  .replace(/\n/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const securityHeaders = [
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  // HTTP Strict Transport Security - enforce HTTPS for 1 year, include subdomains
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // Prevent clickjacking - page cannot be embedded in frames
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Disable browser features we don't need
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // ZAP 90004: Site isolation against Spectre (Cross-Origin-Opener-Policy)
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  // ZAP 90004: Site isolation (Cross-Origin-Embedder-Policy). credentialless avoids breaking third-party resources.
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'credentialless',
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true, // Re-enabled with proper cleanup functions to prevent issues
  // ZAP 10037: Remove X-Powered-By header to avoid leaking server info
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      // ZAP 10049: Allow caching of static assets (Non-Storable Content)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Enable Turbopack instead of Webpack
  turbopack: {
    // Turbopack supports asyncWebAssembly and topLevelAwait by default
    // The asyncFunction fix is not needed with Turbopack
  },
  env: {
    // Add any environment variables here if needed
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
      };
    }
    return config;
  },
};

export default nextConfig;
