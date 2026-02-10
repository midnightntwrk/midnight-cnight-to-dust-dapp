import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

    if (givenPassword === password) {
      return NextResponse.next();
    }
  } catch {
    // Invalid Base64 or format
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
