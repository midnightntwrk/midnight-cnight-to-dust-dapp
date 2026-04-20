import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/cors';

/**
 * Health check endpoint for Kubernetes liveness and readiness probes
 *
 * Kubernetes configuration example:
 * ```yaml
 * livenessProbe:
 *   httpGet:
 *     path: /api/health
 *     port: 3000
 *   initialDelaySeconds: 10
 *   periodSeconds: 15
 * readinessProbe:
 *   httpGet:
 *     path: /api/health
 *     port: 3000
 *   initialDelaySeconds: 5
 *   periodSeconds: 10
 * ```
 */
export async function GET() {
  const headers = new Headers();
  addSecurityHeaders(headers);

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers }
  );
}
