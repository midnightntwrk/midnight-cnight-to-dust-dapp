import { randomBytes, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/** Constant-time string comparison to prevent timing attacks. */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Optional HTTP Basic Auth. Enabled only when BASIC_AUTH_PASSWORD is set.
 * Remove or leave unset to disable. Use any username; only the password is checked.
 */
export function proxy(request: NextRequest) {
  const password = process.env.BASIC_AUTH_PASSWORD;
  const GTM_INLINE_SCRIPT_HASH = 'zjP2BXYgSCCnXNMXI2IL1yRydoQdsGR/uCCr6kyKsD0=';
  const nonce = randomBytes(16).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const scriptSrc = isDev
    ? "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'wasm-unsafe-eval' 'nonce-${nonce}' 'sha256-${GTM_INLINE_SCRIPT_HASH}'`;

  const network = process.env.CARDANO_NET?.toLowerCase() || 'preview';
  const indexerEndpointMap: Record<string, string> = {
    mainnet: 'https://indexer.mainnet.midnight.network',
    preview: 'https://indexer.preview.midnight.network',
    preprod: 'https://indexer.preprod.midnight.network',
  };
  const indexerEndpoint = indexerEndpointMap[network] || indexerEndpointMap.preview;

  const connectSrc = isDev
    ? `connect-src 'self' ws://localhost:* http://localhost:* ${indexerEndpoint}`
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
    'upgrade-insecure-requests',
  ].join('; ');

  /** Helper: build a NextResponse with security headers applied. */
  const withSecurityHeaders = (res: NextResponse): NextResponse => {
    res.headers.set('Content-Security-Policy', cspHeader);
    res.headers.set('x-nonce', nonce);
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    return res;
  };

  // No password set — skip auth, but still apply CSP
  if (!password) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // Basic Auth check
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Dust Dapp", charset="UTF-8"',
      },
    });
  }

  try {
    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const [, givenPassword] = decoded.split(':', 2);

    if (safeCompare(givenPassword ?? '', password)) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-nonce', nonce);
      return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
    }
  } catch (err) {
    logger.warn('[proxy] Malformed Basic Auth header:', err);
  }

  return new NextResponse('Invalid credentials', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Dust Dapp", charset="UTF-8"',
    },
  });
}

export const config = {
  // Protect all routes except static assets and health (for k8s probes)
  matcher: ['/((?!api/health|_next/static|_next/image|favicon.ico).*)'],
};
