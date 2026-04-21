import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/cors';
import { logger } from '@/lib/logger';
import { getBlockfrostConfig } from '@/lib/blockfrost-config';

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
  const { baseUrl, projectId } = getBlockfrostConfig();
  const blockfrostStatus = await checkBlockfrost(baseUrl, projectId);

  const response: ReadinessResponse = {
    status: blockfrostStatus.status === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: {
      blockfrost: blockfrostStatus,
    },
  };

  const httpStatus = response.status === 'ok' ? 200 : 503;

  const responseHeaders = new Headers();
  addSecurityHeaders(responseHeaders);

  return NextResponse.json(response, { status: httpStatus, headers: responseHeaders });
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
