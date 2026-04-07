import { NextRequest, NextResponse } from 'next/server';
import { bech32 } from 'bech32';
import { logger } from '@/lib/logger';
import { validateOrigin, addCorsHeaders, addSecurityHeaders } from '@/lib/cors';
import { checkRateLimit, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';
import { getRegistrationsForStakeKey, isReady } from '@/lib/registration-cache';

export const runtime = 'nodejs';

/**
 * Extract stake key hash from a Cardano base address (types 0-3).
 * Pure bech32 decode — no WASM dependencies.
 */
function extractStakeKeyHash(address: string): string | null {
  try {
    const decoded = bech32.decode(address, 256);
    const bytes = Buffer.from(bech32.fromWords(decoded.words));
    const addressType = (bytes[0] >> 4) & 0x0f;
    // Base addresses (types 0-3) have 1-byte header + 28-byte payment hash + 28-byte stake hash
    if (addressType <= 3 && bytes.length === 57) {
      return bytes.slice(29, 57).toString('hex');
    }
    // Reward/stake addresses (types 14-15) have 1-byte header + 28-byte stake hash
    if ((addressType === 14 || addressType === 15) && bytes.length === 29) {
      return bytes.slice(1, 29).toString('hex');
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  // Validate origin
  const validOrigin = validateOrigin(request);
  if (!validOrigin) {
    logger.warn('[API:Registrations]', 'Blocked request from invalid origin', {
      origin: request.headers.get('origin'),
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check rate limit
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    logger.warn('[API:Registrations]', 'Rate limit exceeded');
    return rateLimitExceededResponse(rateLimitResult);
  }

  // Response headers
  const responseHeaders = new Headers();
  addCorsHeaders(responseHeaders, validOrigin);
  addRateLimitHeaders(responseHeaders, rateLimitResult);
  addSecurityHeaders(responseHeaders);

  // Cache not yet initialized → 503
  if (!isReady()) {
    responseHeaders.set('Retry-After', '10');
    return NextResponse.json(
      { error: 'Service initializing, please retry' },
      { status: 503, headers: responseHeaders }
    );
  }

  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400, headers: responseHeaders });
    }

    const stakeKeyHash = extractStakeKeyHash(address);

    if (!stakeKeyHash) {
      logger.warn('[API:Registrations]', 'Could not extract stake key from address');
      return NextResponse.json(
        { error: 'Could not extract stake key from address' },
        { status: 400, headers: responseHeaders }
      );
    }

    const registrations = getRegistrationsForStakeKey(stakeKeyHash);

    return NextResponse.json({ success: true, data: registrations }, { headers: responseHeaders });
  } catch (error) {
    logger.error('[API:Registrations]', 'Error fetching registrations', {
      error: error instanceof Error ? error.message : error,
    });
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
