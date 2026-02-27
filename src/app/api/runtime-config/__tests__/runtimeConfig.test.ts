import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';

vi.mock('@/config/runtime-config', () => ({
  getServerRuntimeConfig: vi.fn(() => ({
    CARDANO_NET: 'Preview',
    BLOCKFROST_URL_PREVIEW: 'https://cardano-preview.blockfrost.io/api/v0',
    BLOCKFROST_URL_PREPROD: 'https://cardano-preprod.blockfrost.io/api/v0',
    BLOCKFROST_URL_MAINNET: 'https://cardano-mainnet.blockfrost.io/api/v0',
    INDEXER_ENDPOINT_PREVIEW: 'https://indexer.preview.midnight.network/api/v3/graphql',
  })),
}));

describe('Runtime Config API (/api/runtime-config)', () => {
  it('should return 200 status', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('should return runtime config as JSON', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.CARDANO_NET).toBe('Preview');
    expect(body.BLOCKFROST_URL_PREVIEW).toBe('https://cardano-preview.blockfrost.io/api/v0');
  });

  it('should include Cache-Control header', async () => {
    const response = await GET();
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300');
  });

  it('should include all expected config keys', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty('CARDANO_NET');
    expect(body).toHaveProperty('BLOCKFROST_URL_PREVIEW');
    expect(body).toHaveProperty('INDEXER_ENDPOINT_PREVIEW');
  });

  it('should return valid JSON response', async () => {
    const response = await GET();
    const body = await response.json();
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
  });
});
