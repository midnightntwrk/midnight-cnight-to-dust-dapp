import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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

/**
 * Readiness probe endpoint for Kubernetes
 * Checks connectivity to external dependencies (Blockfrost)
 *
 * Returns 200 if all dependencies are reachable
 * Returns 503 if any critical dependency is unavailable
 *
 * Kubernetes configuration example:
 * ```yaml
 * readinessProbe:
 *   httpGet:
 *     path: /api/health/ready
 *     port: 3000
 *   initialDelaySeconds: 5
 *   periodSeconds: 10
 *   timeoutSeconds: 5
 * ```
 */
export async function GET() {
  const { BLOCKFROST_URL, BLOCKFROST_KEY } = await import('@/config/network');

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
