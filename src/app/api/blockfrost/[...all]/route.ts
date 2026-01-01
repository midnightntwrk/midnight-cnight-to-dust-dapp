import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

// OPTIMIZATION: In-memory cache for Blockfrost API responses
// This reduces duplicate API calls by caching responses for a short period
interface CacheEntry {
    response: Response;
    responseBody: ArrayBuffer;
    expiresAt: number;
    headers: Headers;
    status: number;
    statusText: string;
}

// Cache storage with TTL
const cache = new Map<string, CacheEntry>();

// Cache configuration
const CACHE_TTL_MS = 15000; // 15 seconds - balance between freshness and savings
const MAX_CACHE_SIZE = 500; // Prevent memory issues
const CLEANUP_INTERVAL_MS = 60000; // Clean up expired entries every minute

// Cache statistics for monitoring
const cacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    lastCleanup: Date.now(),
};

// Periodic cleanup of expired cache entries
setInterval(() => {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of cache.entries()) {
        if (entry.expiresAt <= now) {
            cache.delete(key);
            removedCount++;
        }
    }

    cacheStats.lastCleanup = now;
    cacheStats.size = cache.size;

    if (removedCount > 0) {
        logger.debug('[BlockfrostCache]', `Cleaned up ${removedCount} expired entries. Current size: ${cache.size}`);
    }
}, CLEANUP_INTERVAL_MS);

// SECURITY: Origin validation and CORS configuration
const ALLOWED_ORIGINS = [
    process.env.NEXT_PUBLIC_REACT_SERVER_URL || 'http://localhost:3000',
    'http://localhost:3000', // Development fallback
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_PRODUCTION_URL, // Add your production URL in env
].filter((origin): origin is string => Boolean(origin)); // Remove undefined values with type guard

/**
 * Validates that the request comes from an allowed origin
 * Checks both Origin and Referer headers
 */
function validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // Allow requests without origin/referer during development
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Check origin header first (most reliable)
    if (origin) {
        const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
        if (isAllowed) {
            logger.debug('[BlockfrostSecurity]', `Valid origin: ${origin}`);
            return true;
        }
    }

    // Fallback to referer header
    if (referer) {
        const isAllowed = ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
        if (isAllowed) {
            logger.debug('[BlockfrostSecurity]', `Valid referer: ${referer}`);
            return true;
        }
    }

    // In development, allow requests without origin/referer (for testing tools)
    if (isDevelopment && !origin && !referer) {
        logger.debug('[BlockfrostSecurity]', 'Development mode: allowing request without origin/referer');
        return true;
    }

    logger.warn('[BlockfrostSecurity]', `Blocked request - Invalid origin: ${origin}, referer: ${referer}`);
    return false;
}

/**
 * Adds CORS headers to a response
 */
function addCorsHeaders(headers: Headers, origin: string | null): void {
    // Allow specific origin or fallback to first allowed origin
    const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))
        ? origin
        : ALLOWED_ORIGINS[0];

    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400'); // 24 hours
}

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    const headers = new Headers();
    addCorsHeaders(headers, origin);

    return new Response(null, {
        status: 204,
        headers,
    });
}

export async function GET(request: NextRequest) {
    return handleRequest(request);
}

export async function POST(request: NextRequest) {
    return handleRequest(request);
}

export async function PUT(request: NextRequest) {
    return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
    return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
    return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
    const startTime = Date.now();
    const origin = request.headers.get('origin');



    // SECURITY: Validate origin/referer before processing
    if (!validateOrigin(request)) {
        const headers = new Headers();
        addCorsHeaders(headers, origin);

        return Response.json(
            { error: 'Forbidden - Invalid origin' },
            { status: 403, headers }
        );
    }

    const { BLOCKFROST_URL, BLOCKFROST_KEY } = await import('@/config/network');

    const target = BLOCKFROST_URL;
    const PROJECT_ID = BLOCKFROST_KEY;

    // Declare variables needed in the catch block
    const url = request.nextUrl.clone();
    const pathname = url.pathname;
    const search = url.search;

    try {
        // Initial validation
        if (!target || !PROJECT_ID) {
            logger.error('Blockfrost Proxy - Missing configuration:', { target: !!target, PROJECT_ID: !!PROJECT_ID });
            throw new Error('Invalid Blockfrost configuration - missing target URL or API key');
        }

        // Extract the path that comes after /api/blockfrost/
        const blockfrostPath = pathname.replace(/^\/api\/blockfrost/, '');

        // Standard proxy to Blockfrost using native fetch
        const targetUrl = `${target}${blockfrostPath}${search}`;

        // CACHE OPTIMIZATION: Only cache GET requests
        const isGetRequest = request.method === 'GET';
        const cacheKey = `${request.method}:${targetUrl}`;

        // Check cache for GET requests
        if (isGetRequest) {
            const now = Date.now();
            const cachedEntry = cache.get(cacheKey);

            if (cachedEntry && cachedEntry.expiresAt > now) {
                // Cache HIT! Return cached response
                cacheStats.hits++;
                const duration = Date.now() - startTime;

                logger.debug('[BlockfrostCache]', `Cache HIT (${duration}ms)`, {
                    path: blockfrostPath,
                    hitRate: `${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)}%`,
                });

                // Clone the cached response headers and add cache indicator
                const responseHeaders = new Headers(cachedEntry.headers);
                responseHeaders.set('X-Cache', 'HIT');
                responseHeaders.set('X-Cache-Age', `${Math.floor((now - (cachedEntry.expiresAt - CACHE_TTL_MS)) / 1000)}s`);

                // Add CORS headers
                addCorsHeaders(responseHeaders, origin);

                return new Response(cachedEntry.responseBody, {
                    status: cachedEntry.status,
                    statusText: cachedEntry.statusText,
                    headers: responseHeaders,
                });
            }

            // Cache MISS - will fetch from Blockfrost
            cacheStats.misses++;
        }

        // Prepare headers
        const headers = new Headers();
        headers.set('project_id', PROJECT_ID);

        // Copy relevant headers from original request
        const contentType = request.headers.get('content-type');
        if (contentType) {
            headers.set('Content-Type', contentType);
        }

        // Copy other important headers
        const userAgent = request.headers.get('user-agent');
        if (userAgent) {
            headers.set('User-Agent', userAgent);
        }

        // Make the request to Blockfrost
        const fetchResponse = await fetch(targetUrl, {
            method: request.method,
            headers,
            body: request.method !== 'GET' ? request.body : undefined,
        });

        // Create the response while preserving important headers
        const responseHeaders = new Headers();

        // Copy important headers from the response
        const importantHeaders = ['content-type', 'content-length', 'cache-control', 'etag'];

        importantHeaders.forEach(headerName => {
            const value = fetchResponse.headers.get(headerName);
            if (value) {
                responseHeaders.set(headerName, value);
            }
        });

        // Add cache status header
        responseHeaders.set('X-Cache', isGetRequest ? 'MISS' : 'BYPASS');

        // Add CORS headers
        addCorsHeaders(responseHeaders, origin);

        // CACHE OPTIMIZATION: Store successful GET responses in cache
        if (isGetRequest && fetchResponse.ok) {
            // Clone response to read body without consuming the original stream
            const responseClone = fetchResponse.clone();
            const responseBody = await responseClone.arrayBuffer();

            // Check cache size limit before adding
            if (cache.size >= MAX_CACHE_SIZE) {
                // Remove oldest entry (first entry in Map)
                const firstKey = cache.keys().next().value;
                if (firstKey) {
                    cache.delete(firstKey);
                    logger.debug('[BlockfrostCache]', 'Cache size limit reached, removed oldest entry');
                }
            }

            // Store in cache
            const expiresAt = Date.now() + CACHE_TTL_MS;
            cache.set(cacheKey, {
                response: fetchResponse.clone(),
                responseBody,
                expiresAt,
                headers: new Headers(responseHeaders),
                status: fetchResponse.status,
                statusText: fetchResponse.statusText,
            });

            cacheStats.size = cache.size;

            const duration = Date.now() - startTime;
            logger.debug('[BlockfrostCache]', `Cached response (${duration}ms)`, {
                path: blockfrostPath,
                cacheSize: cache.size,
                ttl: `${CACHE_TTL_MS / 1000}s`,
            });
        }

        return new Response(fetchResponse.body, {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            headers: responseHeaders,
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        const isDevelopment = process.env.NODE_ENV === 'development';

        logger.error('[BlockfrostProxy]', 'Request failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration: `${duration}ms`,
            pathname: pathname,
            method: request.method
        });

        // In production, return generic error message to prevent information leakage
        const errorMessage = isDevelopment && error instanceof Error
            ? error.message
            : 'An error occurred while processing your request. Please try again later.';

        // Add CORS headers to error response
        const errorHeaders = new Headers();
        addCorsHeaders(errorHeaders, origin);

        return Response.json({
            error: errorMessage,
            timestamp: new Date().toISOString()
        }, { status: 500, headers: errorHeaders });
    }
}
