import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

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
            logger.error('🚨 Blockfrost Proxy - Missing configuration:', { target: !!target, PROJECT_ID: !!PROJECT_ID });
            throw new Error(`Invalid target: ${target} or project id ${PROJECT_ID}`);
        }

        // Extract the path that comes after /api/blockfrost/
        const blockfrostPath = pathname.replace(/^\/api\/blockfrost/, '');

        // Standard proxy to Blockfrost using native fetch
        const targetUrl = `${target}${blockfrostPath}${search}`;

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

        return new Response(fetchResponse.body, {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            headers: responseHeaders,
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        logger.error('❌ Blockfrost Proxy Error:', {
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

        return Response.json({
            error: errorMessage,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
