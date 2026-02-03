import { Subgraph } from '@/lib/subgraph/query';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getServerRuntimeConfig } from '@/config/runtime-config';

export async function GET() {
  const config = getServerRuntimeConfig();
  const indexerEndpoint = config.INDEXER_ENDPOINT;

  if (!indexerEndpoint) {
    throw "Indexer URL not defined."
  }
  try {
    const graph = new Subgraph(indexerEndpoint);
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
