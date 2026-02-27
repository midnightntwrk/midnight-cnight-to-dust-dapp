import { describe, it, expect } from 'vitest';
import { GET } from '../route';

describe('Blockfrost Cache Stats API (/api/blockfrost-cache-stats)', () => {
  it('should return 200 status', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('should return message about checking server logs', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.message).toContain('Cache statistics');
  });

  it('should include config information', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.config).toBeDefined();
    expect(body.config.cacheTTL).toBe('15 seconds');
    expect(body.config.maxCacheSize).toBe(500);
    expect(body.config.cleanupInterval).toBe('60 seconds');
  });

  it('should include cache header info', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.headers).toBeDefined();
    expect(body.headers['X-Cache']).toBeDefined();
  });
});
