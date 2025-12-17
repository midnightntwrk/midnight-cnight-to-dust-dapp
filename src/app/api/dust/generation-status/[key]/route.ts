import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { Subgraph } from "@/lib/subgraph/query";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const startTime = Date.now();

  try {
    const resolvedParams = await params;
    const rewardAddress = resolvedParams.key;

    if (!rewardAddress) {
      logger.warn("[API:GenerationStatus]", "Missing reward address in request");
      return NextResponse.json(
        { error: "Reward address is required" },
        { status: 400 }
      );
    }

    // Check for required environment variable
    const indexerEndpoint = process.env.INDEXER_ENDPOINT;

    if (!indexerEndpoint || indexerEndpoint.trim() === '') {
      logger.error("[API:GenerationStatus]", "INDEXER_ENDPOINT environment variable not set or empty");
      return NextResponse.json(
        { error: "Indexer endpoint not configured" },
        { status: 500 }
      );
    }

    // Validate URL format
    try {
      new URL(indexerEndpoint);
    } catch {
      logger.error("[API:GenerationStatus]", "INDEXER_ENDPOINT is not a valid URL", { indexerEndpoint });
      return NextResponse.json(
        { error: "Indexer endpoint configuration is invalid" },
        { status: 500 }
      );
    }

    // Initialize Subgraph client
    const subgraph = new Subgraph(indexerEndpoint);

    // Fetch generation status by reward address
    const generationStatus = await subgraph.getDustGenerationStatus([rewardAddress]);

    const duration = Date.now() - startTime;

    if (!generationStatus || generationStatus.length === 0) {
      logger.debug("[API:GenerationStatus]", "Reward address not found in indexer", {
        rewardAddress: rewardAddress,
        duration: `${duration}ms`,
      });
      return NextResponse.json(
        {
          error: "Reward address not found",
          message: `No registration exists for reward address ${rewardAddress}`
        },
        { status: 404 }
      );
    }

    logger.debug("[API:GenerationStatus]", "Generation status retrieved", {
      rewardAddress: rewardAddress,
      resultsCount: generationStatus.length,
      duration: `${duration}ms`,
    });

    // Return complete block data
    return NextResponse.json({
      success: true,
      data: generationStatus
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const resolvedParams = await params;

    logger.error("[API:GenerationStatus]", `Error fetching reward address ${resolvedParams.key}`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    // Handle GraphQL errors
    if (error instanceof Error) {
      // In production, don't expose error details to clients
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return NextResponse.json(
        {
          error: "Failed to fetch generation status",
          ...(isDevelopment && {
            message: error.message,
            details: error.stack
          })
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