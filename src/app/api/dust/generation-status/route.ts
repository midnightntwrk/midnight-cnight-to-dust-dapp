import { Subgraph } from '@/lib/subgraph/query';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { INDEXER_ENDPOINT } from '@/config/network';

export async function GET() {
    try {
        const graph = new Subgraph(INDEXER_ENDPOINT);
        const generationStatus = await graph.getDustGenerationStatus(['0x00']);

        return NextResponse.json({
            data: {
                generationStatus,
            },
        });
    } catch (error) {
        logger.error('Failed to fetch last block:', error);

        return NextResponse.json({ error: 'Failed to fetch last block' }, { status: 500 });
    }
}

// Optional: Handle other HTTP methods if needed
export async function POST() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
