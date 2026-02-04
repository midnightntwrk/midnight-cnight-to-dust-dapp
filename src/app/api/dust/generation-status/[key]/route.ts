import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { Subgraph } from '@/lib/subgraph/query';
import { getServerRuntimeConfig } from '@/config/runtime-config';
import { validateOrigin, addCorsHeaders } from '@/lib/cors';
import { checkRateLimit, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';

/**
 * Validate Cardano reward address format (basic validation)
 */
const isValidRewardAddress = (address: string): boolean => {
  const rewardAddressRegex = /^stake(_test)?1[a-z0-9]{50,100}$/;
  return rewardAddressRegex.test(address);
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const startTime = Date.now();
  const config = getServerRuntimeConfig();
  const INDEXER_ENDPOINT = config.INDEXER_ENDPOINT;

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

  if (!INDEXER_ENDPOINT) {
    return NextResponse.json({ error: 'Indexer endpoint not configured' }, { status: 500, headers: responseHeaders });
  }

  try {
    const resolvedParams = await params;
    const rewardAddress = resolvedParams.key;

    if (!rewardAddress) {
      logger.warn('[API:GenerationStatus]', 'Missing reward address in request');
      return NextResponse.json({ error: 'Reward address is required' }, { status: 400, headers: responseHeaders });
    }

    // Validate reward address format to prevent injection
    if (!isValidRewardAddress(rewardAddress)) {
      logger.warn('[API:GenerationStatus]', 'Invalid reward address format', {
        address: rewardAddress.substring(0, 20) + '...',
      });
      return NextResponse.json({ error: 'Invalid reward address format' }, { status: 400, headers: responseHeaders });
    }

    // Initialize Subgraph client
    const subgraph = new Subgraph(INDEXER_ENDPOINT);

    // Fetch generation status by reward address
    const generationStatus = await subgraph.getDustGenerationStatus([rewardAddress]);

    const duration = Date.now() - startTime;

    if (!generationStatus || generationStatus.length === 0) {
      logger.debug('[API:GenerationStatus]', 'Reward address not found in indexer', {
        duration: `${duration}ms`,
      });
      return NextResponse.json({ error: 'Reward address not found' }, { status: 404, headers: responseHeaders });
    }

    logger.debug('[API:GenerationStatus]', 'Generation status retrieved', {
      resultsCount: generationStatus.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({ success: true, data: generationStatus }, { headers: responseHeaders });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('[API:GenerationStatus]', 'Error fetching generation status', {
      error: error instanceof Error ? error.message : error,
      duration: `${duration}ms`,
    });

    // Never expose error details to clients
    return NextResponse.json({ error: 'Failed to fetch generation status' }, { status: 500, headers: responseHeaders });
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
