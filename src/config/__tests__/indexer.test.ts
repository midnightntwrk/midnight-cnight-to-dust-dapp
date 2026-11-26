import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getIndexerEndpoint, getIndexerProjectId, redactUrl } from '../indexer';
import { getServerRuntimeConfig } from '../runtime-config';

const ENV_KEYS = [
  'CARDANO_NET',
  'INDEXER_ENDPOINT_MAINNET',
  'INDEXER_ENDPOINT_PREPROD',
  'INDEXER_ENDPOINT_PREVIEW',
  'MIDNIGHT_INDEXER_KEY_MAINNET',
  'MIDNIGHT_INDEXER_KEY_PREPROD',
  'MIDNIGHT_INDEXER_KEY_PREVIEW',
] as const;

describe('indexer config', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    ENV_KEYS.forEach((k) => delete process.env[k]);
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  describe('getIndexerEndpoint', () => {
    it('should default mainnet to Blockfrost', () => {
      process.env.CARDANO_NET = 'Mainnet';
      expect(getIndexerEndpoint()).toBe('https://midnight-mainnet.blockfrost.io/api/v0');
    });

    it('should use the per-network env override', () => {
      process.env.CARDANO_NET = 'Preprod';
      process.env.INDEXER_ENDPOINT_PREPROD = 'https://midnight-preprod.blockfrost.io/api/v0';
      expect(getIndexerEndpoint()).toBe('https://midnight-preprod.blockfrost.io/api/v0');
    });

    it('should fall back to Preview when CARDANO_NET is unset', () => {
      expect(getIndexerEndpoint()).toBe('https://indexer.preview.midnight.network/api/v3/graphql');
    });
  });

  describe('getIndexerProjectId', () => {
    it('should read the token for the current network only', () => {
      process.env.CARDANO_NET = 'Mainnet';
      process.env.MIDNIGHT_INDEXER_KEY_MAINNET = 'mainnetSecret';
      process.env.MIDNIGHT_INDEXER_KEY_PREPROD = 'preprodSecret';
      expect(getIndexerProjectId()).toBe('mainnetSecret');
    });

    it('should return an empty string when unset', () => {
      process.env.CARDANO_NET = 'Mainnet';
      expect(getIndexerProjectId()).toBe('');
    });
  });

  describe('redactUrl', () => {
    it('should strip a project_id query parameter', () => {
      expect(redactUrl('https://midnight-mainnet.blockfrost.io/api/v0?project_id=secret')).toBe(
        'https://midnight-mainnet.blockfrost.io/api/v0'
      );
    });

    it('should not echo an unparseable value', () => {
      expect(redactUrl('not a url?project_id=secret')).toBe('(invalid URL)');
    });
  });

  it('should keep indexer settings out of the runtime config served to the browser', () => {
    process.env.CARDANO_NET = 'Mainnet';
    process.env.INDEXER_ENDPOINT_MAINNET = 'https://midnight-mainnet.blockfrost.io/api/v0?project_id=secret';
    process.env.MIDNIGHT_INDEXER_KEY_MAINNET = 'secret';

    const publicConfig = getServerRuntimeConfig();
    expect(Object.keys(publicConfig).some((k) => k.includes('INDEXER'))).toBe(false);
    expect(JSON.stringify(publicConfig)).not.toContain('secret');
  });
});
