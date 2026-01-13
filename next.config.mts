import type { NextConfig } from 'next';
// import path from 'path';
// import { fileURLToPath } from 'url';

// Content Security Policy configuration
// In development, we need 'unsafe-eval' for Next.js hot reload
const isDev = process.env.NODE_ENV === 'development';
// const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' ${isDev ? "'unsafe-eval'" : ''} 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' ${isDev ? 'ws://localhost:* http://localhost:*' : ''};
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
  experimental: {
    turbo: {
      resolve: {
        fallback: {
          'libsodium-wrappers-sumo': false,
        },
        conditionNames: ['require', 'node', 'import', 'default'],
      },
    },
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };
    // fix warnings for async functions in the browser (https://github.com/vercel/next.js/issues/64792)
    if (!isServer) {
      config.output.environment = {
        ...config.output.environment,
        asyncFunction: true,
      };
    }
    // Force webpack to NOT pick the broken ESM condition for libsodium-wrappers-sumo
    // Prefer CJS/require/node entry points.
    config.resolve.conditionNames = ['require', 'node', ...(config.resolve.conditionNames || [])];
    // Also prefer main/module fields that typically resolve to working builds
    config.resolve.mainFields = isServer ? ['main', 'module'] : ['browser', 'main', 'module'];


    return config;
  },
  env: {
    // Add any environment variables here if needed
  },
};

export default nextConfig;
