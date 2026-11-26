import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import proxy from '../proxy';

function connectSrc(): string {
  const response = proxy(new NextRequest(new URL('http://localhost:3000/dashboard')));
  const csp = response.headers.get('Content-Security-Policy') ?? '';
  return csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src')) ?? '';
}

describe('proxy CSP', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(['Mainnet', 'Preprod', 'Preview'])('should allow only same-origin connections on %s', (network) => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CARDANO_NET', network);
    vi.stubEnv('BASIC_AUTH_PASSWORD', '');
    expect(connectSrc()).toBe("connect-src 'self'");
  });
});
