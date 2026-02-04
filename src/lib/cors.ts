import { NextRequest } from 'next/server';

// Allowed origins for CORS - only trusted domains
export const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_REACT_SERVER_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

/**
 * Validate origin against whitelist
 *
 * Security note: In development, requests without origin header are allowed
 * to support testing tools (curl, Postman). In production, origin header
 * is strictly required and validated against whitelist.
 */
export const validateOrigin = (request: NextRequest): string | null => {
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed))) {
    return origin;
  }

  // Dev mode: allow requests without origin for testing tools only
  // This does NOT allow arbitrary origins - only missing origin header
  if (process.env.NODE_ENV === 'development' && !origin) {
    return ALLOWED_ORIGINS[0] || 'http://localhost:3000';
  }

  return null;
};

/**
 * Add CORS headers to response
 */
export const addCorsHeaders = (headers: Headers, origin: string): void => {
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
};

/**
 * Validate Content-Type header for POST/PUT requests
 */
export const validateContentType = (request: NextRequest): boolean => {
  const contentType = request.headers.get('content-type');
  if (!contentType) return false;
  return contentType.includes('application/json');
};
