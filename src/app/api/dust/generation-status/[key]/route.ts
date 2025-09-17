import { NextRequest, NextResponse } from "next/server";
import { Subgraph } from "@/lib/subgraph/query";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const resolvedParams = await params;

    console.log("resolvedParams", resolvedParams);
    
    const stakeKey = resolvedParams.key;

    if (!stakeKey) {
      return NextResponse.json(
        { error: "Stake key is required" },
        { status: 400 }
      );
    }

    // Check for required environment variable
    const indexerEndpoint = process.env.INDEXER_ENDPOINT;

    if (!indexerEndpoint) {
      console.error("INDEXER_ENDPOINT environment variable not set");
      return NextResponse.json(
        { error: "Indexer endpoint not configured" },
        { status: 500 }
      );
    }

    // Initialize Subgraph client
    const subgraph = new Subgraph(indexerEndpoint);

    // Fetch stake key data
    const generationStatus = await subgraph.getDustGenerationStatus([stakeKey]);

    if (!generationStatus) {
      return NextResponse.json(
        { 
          error: "Stake key not found",
          message: `No block exists at stake key ${stakeKey}` 
        },
        { status: 404 }
      );
    }

    // Return complete block data
    return NextResponse.json({
      success: true,
      data: {
        ...generationStatus,
      }
    });

  } catch (error) {
    const resolvedParams = await params;
    console.error(`❌ Error fetching stake key ${resolvedParams.key}:`, error);

    // Handle GraphQL errors
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to fetch stake key",
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }

    // Handle unknown errors
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}