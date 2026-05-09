import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'ahphonestore.id.vn';

export function proxy(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') || request.nextUrl.host || '').toLowerCase();

  if (host === `www.${CANONICAL_HOST}`) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.host = CANONICAL_HOST;
    redirectUrl.protocol = 'https';
    return NextResponse.redirect(redirectUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
