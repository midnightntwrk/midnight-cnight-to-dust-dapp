import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerRuntimeConfig } from '@/config/runtime-config';
import { NETWORKS } from '@/lib/contractUtils';

interface DependencyStatus {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

interface ReadinessResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  dependencies: {
    blockfrost: DependencyStatus;
  };
}

export async function GET() {
  // Get runtime config (server-side reads from process.env)
  const config = getServerRuntimeConfig();
  const network = config.CARDANO_NET;

  // Get network-specific Blockfrost URL
  const BLOCKFROST_URL =
    network === NETWORKS.MAINNET
      ? config.BLOCKFROST_URL_MAINNET
      : network === NETWORKS.PREPROD
        ? config.BLOCKFROST_URL_PREPROD
        : config.BLOCKFROST_URL_PREVIEW;

  // Get Blockfrost API key from environment (server-side only)
  const BLOCKFROST_KEY =
    network === NETWORKS.MAINNET
      ? process.env.BLOCKFROST_KEY_MAINNET
      : network === NETWORKS.PREPROD
        ? process.env.BLOCKFROST_KEY_PREPROD
        : process.env.BLOCKFROST_KEY_PREVIEW;

  const blockfrostStatus = await checkBlockfrost(BLOCKFROST_URL, BLOCKFROST_KEY);

  const response: ReadinessResponse = {
    status: blockfrostStatus.status === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: {
      blockfrost: blockfrostStatus,
    },
  };

  const httpStatus = response.status === 'ok' ? 200 : 503;

  return NextResponse.json(response, { status: httpStatus });
}

async function checkBlockfrost(url: string | undefined, key: string | undefined): Promise<DependencyStatus> {
  if (!url || !key) {
    return {
      status: 'error',
      error: 'Blockfrost not configured',
    };
  }

  const startTime = Date.now();

  try {
    // Use Blockfrost root endpoint which returns API info
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        project_id: key,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        latencyMs,
      };
    }

    return {
      status: 'error',
      latencyMs,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.warn('[HealthCheck]', 'Blockfrost check failed', { error: errorMessage, latencyMs });

    return {
      status: 'error',
      latencyMs,
      error: errorMessage,
    };
  }
}
