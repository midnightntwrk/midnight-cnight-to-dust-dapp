import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/** Constant-time string comparison to prevent timing attacks. */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Optional HTTP Basic Auth. Enabled only when BASIC_AUTH_PASSWORD is set.
 * Remove or leave unset to disable. Use any username; only the password is checked.
 */
export function proxy(request: NextRequest) {
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!password) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Dust Dapp", charset="UTF-8"',
      },
    });
  }

  try {
    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const [, givenPassword] = decoded.split(':', 2);

    if (safeCompare(givenPassword ?? '', password)) {
      return NextResponse.next();
    }
  } catch (err) {
    logger.warn('[proxy] Malformed Basic Auth header:', err);
  }

  return new NextResponse('Invalid credentials', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Dust Dapp", charset="UTF-8"',
    },
  });
}

export const config = {
  // Protect all routes except static assets and health (for k8s probes)
  matcher: [
    '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
  ],
};
