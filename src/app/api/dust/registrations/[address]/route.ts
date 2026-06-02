import { NextRequest, NextResponse } from 'next/server';
import { getAddressDetails } from '@lucid-evolution/lucid';
import { logger } from '@/lib/logger';
import { validateOrigin, addCorsHeaders, addSecurityHeaders } from '@/lib/cors';
import { checkRateLimit, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';
import {
  _ensureFresh,
  getRegistrationsForStakeKey,
  isReady,
  getCacheStats,
  _debugStakeKeySample,
} from '@/lib/registration-cache';

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  let validOrigin: string | null = null;
  const responseHeaders = new Headers();

  try {
    validOrigin = validateOrigin(request);
    if (!validOrigin) {
      logger.warn('[API:Registrations]', 'Blocked request from invalid origin', {
        origin: request.headers.get('origin'),
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rateLimitResult = checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      logger.warn('[API:Registrations]', 'Rate limit exceeded');
      return rateLimitExceededResponse(rateLimitResult, validOrigin);
    }

    addCorsHeaders(responseHeaders, validOrigin);
    addRateLimitHeaders(responseHeaders, rateLimitResult);
    addSecurityHeaders(responseHeaders);

    await _ensureFresh();

    if (!isReady()) {
      responseHeaders.set('Retry-After', '10');
      return NextResponse.json(
        { error: 'Service initializing, please retry' },
        { status: 503, headers: responseHeaders }
      );
    }

    const { address } = await params;

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400, headers: responseHeaders });
    }

    let stakeKeyHash: string | undefined;
    try {
      stakeKeyHash = getAddressDetails(address)?.stakeCredential?.hash;
    } catch {
      return NextResponse.json({ error: 'Failed to parse address' }, { status: 400, headers: responseHeaders });
    }

    if (!stakeKeyHash) {
      logger.warn('[API:Registrations]', 'Could not extract stake key from address');
      return NextResponse.json(
        { error: 'Could not extract stake key from address' },
        { status: 400, headers: responseHeaders }
      );
    }

    const registrations = getRegistrationsForStakeKey(stakeKeyHash);

    if (registrations.length === 0) {
      logger.warn('[API:Registrations]', 'Lookup miss', {
        queriedStakeKeyHash: stakeKeyHash,
        cacheStats: getCacheStats(),
        sampleCachedStakeKeys: _debugStakeKeySample(5),
      });
    }

    return NextResponse.json({ success: true, data: registrations }, { headers: responseHeaders });
  } catch (error) {
    logger.error('[API:Registrations]', 'Error fetching registrations', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (validOrigin && !responseHeaders.has('Access-Control-Allow-Origin')) {
      addCorsHeaders(responseHeaders, validOrigin);
      addSecurityHeaders(responseHeaders);
    }
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500, headers: responseHeaders });
  }
}

export async function OPTIONS(request: NextRequest) {
  const validOrigin = validateOrigin(request);
  if (!validOrigin) {
    return new Response(null, { status: 403 });
  }

  const headers = new Headers();
  addCorsHeaders(headers, validOrigin);
  addSecurityHeaders(headers);
  return new Response(null, { status: 204, headers });
}
