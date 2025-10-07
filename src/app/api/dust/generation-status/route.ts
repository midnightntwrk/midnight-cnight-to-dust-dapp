import { Subgraph } from "@/lib/subgraph/query";
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const graph = new Subgraph(process.env.INDEXER_ENDPOINT!);
    const generationStatus = await graph.getDustGenerationStatus(["1234567890ABCDEF1234567890ABCDEF"]);
    
    return NextResponse.json({
      data: {
        generationStatus
      }
    });
  } catch (error) {
    logger.error("Failed to fetch last block:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch last block" },
      { status: 500 }
    );
  }
}

// Optional: Handle other HTTP methods if needed
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}