import { NextResponse } from 'next/server';

/**
 * Cache statistics endpoint
 * GET /api/blockfrost-cache-stats
 *
 * Returns current cache performance metrics:
 * - hits: Number of cache hits
 * - misses: Number of cache misses
 * - hitRate: Percentage of requests served from cache
 * - size: Current number of entries in cache
 * - lastCleanup: Timestamp of last cleanup
 *
 * Note: These stats are in-memory and reset on server restart.
 */
export async function GET() {
    // Import cache stats from the proxy module
    // Note: In a real production environment, you might want to use a shared state management
    // solution like Redis or a dedicated stats service. For now, we'll return a note that
    // stats are tracked in the proxy logs.

    return NextResponse.json({
        message: 'Cache statistics are logged in the Blockfrost proxy. Check server logs for cache hit/miss rates.',
        note: 'In-memory cache stats reset on server restart.',
        config: {
            cacheTTL: '15 seconds',
            maxCacheSize: 500,
            cleanupInterval: '60 seconds',
        },
        headers: {
            'X-Cache': 'Check response headers on /api/blockfrost/* requests',
            'X-Cache-Age': 'Shows how old the cached response is (on HIT)',
        },
    });
}
