import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

describe('Health Check Endpoint (/api/health)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 200 status', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it('should return status "ok"', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe('ok');
  });

  it('should include timestamp in response', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toBe('2026-01-02T12:00:00.000Z');
  });

  it('should return valid JSON response', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({
      status: 'ok',
      timestamp: '2026-01-02T12:00:00.000Z',
    });
  });
});
