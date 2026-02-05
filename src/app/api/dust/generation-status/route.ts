import { Subgraph } from '@/lib/subgraph/query';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerRuntimeConfig } from '@/config/runtime-config';
import { validateOrigin, addCorsHeaders } from '@/lib/cors';
import { checkRateLimit, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const config = getServerRuntimeConfig();
  const indexerEndpoint = config.INDEXER_ENDPOINT;

  // Validate origin
  const validOrigin = validateOrigin(request);
  if (!validOrigin) {
    logger.warn('[API:GenerationStatus]', 'Blocked request from invalid origin', {
      origin: request.headers.get('origin'),
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check rate limit
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    logger.warn('[API:GenerationStatus]', 'Rate limit exceeded');
    return rateLimitExceededResponse(rateLimitResult);
  }

  // Create response headers with CORS and rate limit info
  const responseHeaders = new Headers();
  addCorsHeaders(responseHeaders, validOrigin);
  addRateLimitHeaders(responseHeaders, rateLimitResult);

  if (!indexerEndpoint) {
    logger.error('[API:GenerationStatus]', 'Indexer endpoint not configured');
    return NextResponse.json(
      { error: 'Indexer endpoint not configured' },
      { status: 500, headers: responseHeaders }
    );
  }

  try {
    const graph = new Subgraph(indexerEndpoint);
    const generationStatus = await graph.getDustGenerationStatus(['0x00']);

    return NextResponse.json(
      {
        data: {
          generationStatus,
        },
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    logger.error('[API:GenerationStatus]', 'Failed to fetch generation status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to fetch generation status' },
      { status: 500, headers: responseHeaders }
    );
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const validOrigin = validateOrigin(request);

  if (!validOrigin) {
    return new Response(null, { status: 403 });
  }

  const headers = new Headers();
  addCorsHeaders(headers, validOrigin);

  return new Response(null, { status: 204, headers });
}

export async function POST(request: NextRequest) {
  const validOrigin = validateOrigin(request);
  const responseHeaders = new Headers();
  if (validOrigin) {
    addCorsHeaders(responseHeaders, validOrigin);
  }

  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: responseHeaders }
  );
}
