import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/cors';

export async function GET() {
  const headers = new Headers();
  addSecurityHeaders(headers);

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers }
  );
}
