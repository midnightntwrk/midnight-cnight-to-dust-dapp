import { NextRequest } from 'next/server';
import { logger } from './logger';

// Allowed origins for CORS - only trusted domains
// SECURITY: Origin validation and CORS configuration
export const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_REACT_SERVER_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://dust.preview.midnight.network',
  'https://dust.preprod.midnight.network',
  'https://dust.midnight.network',
  'https://dust.mainnet.midnight.network',
  process.env.NEXT_PUBLIC_PRODUCTION_URL,
]
  .filter((origin): origin is string => Boolean(origin))
  .map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      return origin;
    }
  });

const ALLOWED_ORIGIN_SET = new Set<string>(ALLOWED_ORIGINS);

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Validates that the request comes from an allowed origin.
 * Returns the validated origin string (to be echoed in `Access-Control-Allow-Origin`)
 * or `null` when the caller should be rejected with 403.
 *
 * Checks the Origin header first, then falls back to Referer. In development,
 * requests with neither header are allowed (for curl/Postman) and resolve to
 * `ALLOWED_ORIGINS[0]`.
 */
export function validateOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (origin) {
    const parsed = parseOrigin(origin);
    if (parsed && ALLOWED_ORIGIN_SET.has(parsed)) {
      logger.debug('[CORS]', `Valid origin: ${origin}`);
      return parsed;
    }
  }

  if (referer) {
    const parsed = parseOrigin(referer);
    if (parsed && ALLOWED_ORIGIN_SET.has(parsed)) {
      logger.debug('[CORS]', `Valid referer: ${referer}`);
      return parsed;
    }
  }

  if (isDevelopment && !origin && !referer) {
    logger.debug('[CORS]', 'Development mode: allowing request without origin/referer');
    return ALLOWED_ORIGINS[0];
  }

  logger.warn('[CORS]', `Blocked request - Invalid origin: ${origin}, referer: ${referer}`);
  return null;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export interface CorsOptions {
  methods?: HttpMethod[];
  allowHeaders?: string[];
  maxAge?: number;
}

/**
 * Add CORS headers to response. Echoes `origin` into `Access-Control-Allow-Origin`
 * when it matches an allowed origin; otherwise falls back to `ALLOWED_ORIGINS[0]`.
 * The browser enforces ACAO match, so the fallback just guarantees a valid header.
 *
 * Defaults allow `GET, OPTIONS` with `Content-Type`; pass `methods`, `allowHeaders`,
 * or `maxAge` to widen (e.g. for proxy routes).
 */
export const addCorsHeaders = (
  headers: Headers,
  origin: string | null,
  opts: CorsOptions = {},
): void => {
  const methods = opts.methods ?? ['GET', 'OPTIONS'];
  const allowHeaders = opts.allowHeaders ?? ['Content-Type'];

  const parsed = origin ? parseOrigin(origin) : null;
  const resolved = parsed && ALLOWED_ORIGIN_SET.has(parsed) ? parsed : ALLOWED_ORIGINS[0];

  headers.set('Access-Control-Allow-Origin', resolved);
  headers.set('Access-Control-Allow-Methods', methods.join(', '));
  headers.set('Access-Control-Allow-Headers', allowHeaders.join(', '));
  if (opts.maxAge !== undefined) {
    headers.set('Access-Control-Max-Age', String(opts.maxAge));
  }
};

/**
 * Add standard security headers to API responses.
 * Mirrors the headers applied by the proxy for page routes.
 */
export const addSecurityHeaders = (headers: Headers): void => {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
};

/**
 * Validate Content-Type header for POST/PUT requests
 */
export const validateContentType = (request: NextRequest): boolean => {
  const contentType = request.headers.get('content-type');
  if (!contentType) return false;
  return contentType.includes('application/json');
};
