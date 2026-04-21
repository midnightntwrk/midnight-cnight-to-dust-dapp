import { getServerRuntimeConfig } from '@/config/runtime-config';
import { NETWORKS } from '@/lib/contractUtils';

export interface BlockfrostConfig {
  baseUrl: string;
  projectId: string;
}

export function getBlockfrostConfig(): BlockfrostConfig {
  const config = getServerRuntimeConfig();
  const network = config.CARDANO_NET;

  const baseUrl =
    network === NETWORKS.MAINNET
      ? config.BLOCKFROST_URL_MAINNET
      : network === NETWORKS.PREPROD
        ? config.BLOCKFROST_URL_PREPROD
        : config.BLOCKFROST_URL_PREVIEW;

  const projectId =
    network === NETWORKS.MAINNET
      ? (process.env.BLOCKFROST_KEY_MAINNET ?? '')
      : network === NETWORKS.PREPROD
        ? (process.env.BLOCKFROST_KEY_PREPROD ?? '')
        : (process.env.BLOCKFROST_KEY_PREVIEW ?? '');

  return { baseUrl, projectId };
}

export function getBlockfrostEnvKeyName(): string {
  const config = getServerRuntimeConfig();
  const network = config.CARDANO_NET;
  return network === 'Mainnet'
    ? 'BLOCKFROST_KEY_MAINNET'
    : network === 'Preprod'
      ? 'BLOCKFROST_KEY_PREPROD'
      : 'BLOCKFROST_KEY_PREVIEW';
}
