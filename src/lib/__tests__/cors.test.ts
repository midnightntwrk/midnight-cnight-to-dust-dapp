import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateOrigin, addCorsHeaders, validateContentType, ALLOWED_ORIGINS } from '../cors';

const originalEnv = { ...process.env };

function makeRequest(origin?: string, contentType?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (origin) headers['origin'] = origin;
  if (contentType) headers['content-type'] = contentType;

  return new NextRequest(new URL('http://localhost:3000/api/test'), { headers });
}

describe('CORS utilities', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('validateOrigin', () => {
    it('should return origin when it matches an allowed origin', () => {
      const result = validateOrigin(makeRequest('http://localhost:3000'));
      expect(result).toBe('http://localhost:3000');
    });

    it('should return null for disallowed origin in production', () => {
      process.env.NODE_ENV = 'production';
      const result = validateOrigin(makeRequest('https://evil.com'));
      expect(result).toBeNull();
    });

    it('should allow requests without origin in development', () => {
      process.env.NODE_ENV = 'development';
      const result = validateOrigin(makeRequest());
      expect(result).not.toBeNull();
    });

    it('should return null for requests without origin in production', () => {
      process.env.NODE_ENV = 'production';
      const result = validateOrigin(makeRequest());
      expect(result).toBeNull();
    });
  });

  describe('addCorsHeaders', () => {
    it('should set Access-Control-Allow-Origin', () => {
      const headers = new Headers();
      addCorsHeaders(headers, 'http://localhost:3000');
      expect(headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });

    it('should set Access-Control-Allow-Methods', () => {
      const headers = new Headers();
      addCorsHeaders(headers, 'http://localhost:3000');
      expect(headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    });

    it('should set Access-Control-Allow-Headers', () => {
      const headers = new Headers();
      addCorsHeaders(headers, 'http://localhost:3000');
      expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });
  });

  describe('validateContentType', () => {
    it('should return true for application/json', () => {
      expect(validateContentType(makeRequest(undefined, 'application/json'))).toBe(true);
    });

    it('should return true for application/json with charset', () => {
      expect(validateContentType(makeRequest(undefined, 'application/json; charset=utf-8'))).toBe(true);
    });

    it('should return false for missing content-type', () => {
      expect(validateContentType(makeRequest())).toBe(false);
    });

    it('should return false for non-JSON content-type', () => {
      expect(validateContentType(makeRequest(undefined, 'text/html'))).toBe(false);
    });
  });

  describe('ALLOWED_ORIGINS', () => {
    it('should include localhost:3000', () => {
      expect(ALLOWED_ORIGINS).toContain('http://localhost:3000');
    });

    it('should include localhost:3001', () => {
      expect(ALLOWED_ORIGINS).toContain('http://localhost:3001');
    });
  });
});
