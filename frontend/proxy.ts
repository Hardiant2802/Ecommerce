import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'ahphonestore.id.vn';
const PRODUCT_BRANDS = new Set([
  'apple',
  'iphone',
  'samsung',
  'xiaomi',
  'oppo',
  'oneplus',
  'vivo',
  'asus',
  'red-magic',
]);
const LEGACY_BRAND_SUFFIX_REGEX = /-brand-(apple|iphone|samsung|xiaomi|oppo|oneplus|vivo|asus|red-magic)(?:-\d{1,4})?$/;

function normalizeAscii(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function slugifySegment(input: string): string {
  return normalizeAscii(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getCanonicalProductPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 2) {
    return null;
  }

  const brand = slugifySegment(segments[0]);
  if (!PRODUCT_BRANDS.has(brand)) {
    return null;
  }

  const originalSlug = slugifySegment(segments[1]);
  if (!originalSlug) {
    return null;
  }

  const normalizedSlug = originalSlug.replace(LEGACY_BRAND_SUFFIX_REGEX, '').replace(/-+$/g, '');
  if (!normalizedSlug || normalizedSlug === originalSlug) {
    return null;
  }

  return `/${brand}/${normalizedSlug}`;
}

export function proxy(request: NextRequest) {
  const rawHost = request.headers.get('x-forwarded-host') || request.nextUrl.host || '';
  const host = rawHost.toLowerCase().split(',')[0].trim().split(':')[0];
  const redirectUrl = request.nextUrl.clone();
  let shouldRedirect = false;

  if (host === `www.${CANONICAL_HOST}`) {
    redirectUrl.host = CANONICAL_HOST;
    redirectUrl.protocol = 'https';
    shouldRedirect = true;
  }

  const canonicalProductPath = getCanonicalProductPath(redirectUrl.pathname);
  if (canonicalProductPath && canonicalProductPath !== redirectUrl.pathname) {
    redirectUrl.pathname = canonicalProductPath;
    shouldRedirect = true;
  }

  if (shouldRedirect) {
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
