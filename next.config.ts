import type { NextConfig } from 'next';

// Content Security Policy configuration
// In development, we need 'unsafe-eval' for Next.js hot reload
const isDev = process.env.NODE_ENV === 'development';

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' ${isDev ? "'unsafe-eval'" : ''} 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self'  ${isDev ? 'ws://localhost:* http://localhost:* https://indexer.preview.midnight.network https://indexer.qanet.midnight.network' : 'https://indexer.preview.midnight.network https://indexer.qanet.midnight.network'};
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
];

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true, // Re-enabled with proper cleanup functions to prevent issues
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
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
};

export default nextConfig;
