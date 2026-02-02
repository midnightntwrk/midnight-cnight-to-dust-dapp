/**
 * Runtime Configuration API
 *
 * Returns environment configuration at runtime, allowing the same Docker image
 * to be deployed with different configurations by setting environment variables.
 *
 * This is fetched once on app load and cached.
 */

import { NextResponse } from 'next/server';
import { getServerRuntimeConfig } from '@/config/runtime-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Read environment variables at runtime (not build time)
  const config = getServerRuntimeConfig();

  return NextResponse.json(config, {
    headers: {
      // Cache for 5 minutes - config doesn't change often
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
