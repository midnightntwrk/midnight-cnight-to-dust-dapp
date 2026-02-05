import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store - for production, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

const cleanup = (): void => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
};

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
};

/**
 * Get client identifier for rate limiting
 * Uses X-Forwarded-For in production (behind proxy), falls back to a default
 */
const getClientId = (request: NextRequest): string => {
  // In production behind a proxy, use X-Forwarded-For
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // For direct connections (dev mode)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - in production this should not happen behind proper proxy
  return 'unknown';
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit for a request
 */
export const checkRateLimit = (
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult => {
  cleanup();

  const clientId = getClientId(request);
  const key = `${clientId}:${request.nextUrl.pathname}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
};

/**
 * Add rate limit headers to response
 */
export const addRateLimitHeaders = (headers: Headers, result: RateLimitResult): void => {
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
};

/**
 * Create a rate limit exceeded response
 */
export const rateLimitExceededResponse = (result: RateLimitResult): NextResponse => {
  const headers = new Headers();
  addRateLimitHeaders(headers, result);
  headers.set('Retry-After', String(Math.ceil((result.resetTime - Date.now()) / 1000)));

  return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
};
