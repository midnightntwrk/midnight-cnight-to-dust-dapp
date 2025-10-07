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
    
    // Declarar variables que necesitamos en el catch block
    const url = request.nextUrl.clone();
    const pathname = url.pathname;
    const search = url.search;
    
    try {
        // Validación inicial
        if (!target || !PROJECT_ID) {
            logger.error('🚨 Blockfrost Proxy - Missing configuration:', { target: !!target, PROJECT_ID: !!PROJECT_ID });
            throw new Error(`Invalid target: ${target} or project id ${PROJECT_ID}`);
        }
        
        // Extraer la ruta que viene después de /api/blockfrost/
        const blockfrostPath = pathname.replace(/^\/api\/blockfrost/, '');
        
        // logger.log('🔄 Blockfrost Proxy Request:', {
        //     method: request.method,
        //     originalPath: pathname,
        //     blockfrostPath,
        //     search,
        //     target,
        //     network: process.env.NEXT_PUBLIC_CARDANO_NET
        // });

        // Proxy normal a Blockfrost usando fetch nativo
        const targetUrl = `${target}${blockfrostPath}${search}`;
        
        // logger.log('🌐 Proxying to Blockfrost:', {
        //     targetUrl,
        //     method: request.method,
        //     hasBody: request.method !== 'GET' && !!request.body
        // });

        // Preparar headers
        const headers = new Headers();
        headers.set('project_id', PROJECT_ID);
        
        // Copiar headers relevantes del request original
        const contentType = request.headers.get('content-type');
        if (contentType) {
            headers.set('Content-Type', contentType);
        }
        
        // Copiar otros headers importantes
        const userAgent = request.headers.get('user-agent');
        if (userAgent) {
            headers.set('User-Agent', userAgent);
        }

        // logger.log('📤 Request headers:', {
        //     'Content-Type': headers.get('Content-Type'),
        //     'project_id': PROJECT_ID.substring(0, 8) + '...', // Solo mostrar primeros 8 chars por seguridad
        //     'User-Agent': headers.get('User-Agent')?.substring(0, 50) + '...'
        // });

        // Hacer la petición a Blockfrost
        const fetchResponse = await fetch(targetUrl, {
            method: request.method,
            headers,
            body: request.method !== 'GET' ? request.body : undefined,
        });

        // logger.log('📥 Blockfrost response:', {
        //     status: fetchResponse.status,
        //     statusText: fetchResponse.statusText,
        //     contentType: fetchResponse.headers.get('content-type'),
        //     contentLength: fetchResponse.headers.get('content-length')
        // });

        // Crear la respuesta manteniendo headers importantes
        const responseHeaders = new Headers();
        
        // Copiar headers importantes de la respuesta
        const importantHeaders = ['content-type', 'content-length', 'cache-control', 'etag'];
        importantHeaders.forEach(headerName => {
            const value = fetchResponse.headers.get(headerName);
            if (value) {
                responseHeaders.set(headerName, value);
            }
        });

        // const duration = Date.now() - startTime;
        // logger.log('✅ Request completed', { 
        //     status: fetchResponse.status, 
        //     duration: `${duration}ms`,
        //     success: fetchResponse.ok 
        // });

        return new Response(fetchResponse.body, {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            headers: responseHeaders,
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('❌ Blockfrost Proxy Error:', {
            error: error instanceof Error ? error.message : String(error),
            duration: `${duration}ms`,
            pathname: pathname,
            method: request.method
        });
        
        return Response.json({ 
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString() 
        }, { status: 500 });
    }
}
