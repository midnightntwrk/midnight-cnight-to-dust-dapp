/**
 * Midnight indexer configuration (server-side only).
 *
 * The indexer endpoint and its Blockfrost project token are read from process.env on
 * the server. Neither is part of the runtime config served to the browser: the browser
 * reaches the indexer only through the /api/dust/generation-status routes, which add
 * the token as a `project_id` header.
 *
 * Never put the token in the endpoint URL (`?project_id=...`). Keep it in
 * MIDNIGHT_INDEXER_KEY_<NETWORK> without a NEXT_PUBLIC_ prefix, so it is never
 * bundled into client code.
 */

import { getServerRuntimeConfig } from '@/config/runtime-config';

const DEFAULT_INDEXER_ENDPOINTS = {
  Mainnet: 'https://midnight-mainnet.blockfrost.io/api/v0',
  Preprod: 'https://indexer.preprod.midnight.network/api/v3/graphql',
  Preview: 'https://indexer.preview.midnight.network/api/v3/graphql',
} as const;

/**
 * Get the indexer GraphQL endpoint for the current network.
 */
export function getIndexerEndpoint(): string {
  switch (getServerRuntimeConfig().CARDANO_NET) {
    case 'Mainnet':
      return process.env.INDEXER_ENDPOINT_MAINNET || DEFAULT_INDEXER_ENDPOINTS.Mainnet;
    case 'Preprod':
      return process.env.INDEXER_ENDPOINT_PREPROD || DEFAULT_INDEXER_ENDPOINTS.Preprod;
    case 'Preview':
    default:
      return process.env.INDEXER_ENDPOINT_PREVIEW || DEFAULT_INDEXER_ENDPOINTS.Preview;
  }
}

/**
 * Get the Blockfrost project token for the current network's indexer, or '' when unset
 * (e.g. a self-hosted indexer that needs no token).
 */
export function getIndexerProjectId(): string {
  switch (getServerRuntimeConfig().CARDANO_NET) {
    case 'Mainnet':
      return process.env.MIDNIGHT_INDEXER_KEY_MAINNET ?? '';
    case 'Preprod':
      return process.env.MIDNIGHT_INDEXER_KEY_PREPROD ?? '';
    case 'Preview':
    default:
      return process.env.MIDNIGHT_INDEXER_KEY_PREVIEW ?? '';
  }
}

/**
 * Drop the query string from a URL so it is safe to log, in case a token was put there.
 */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return '(invalid URL)';
  }
}
