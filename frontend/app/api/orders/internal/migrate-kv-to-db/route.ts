import { NextRequest, NextResponse } from 'next/server';
import { migrateInternalOrdersFromKvToDb } from '@/lib/services/internalOrders';

export const runtime = 'nodejs';

function isAdminAuthorized(request: NextRequest): boolean {
  const expectedKeys = [
    process.env.INTERNAL_ORDERS_ADMIN_KEY || '',
    process.env.INTERNAL_ADMIN_KEY || '',
  ]
    .join(',')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (expectedKeys.length === 0) return true;

  const fromHeader = (request.headers.get('x-admin-key') || '').trim();
  const fromQuery = (request.nextUrl.searchParams.get('adminKey') || '').trim();
  const provided = fromHeader || fromQuery;

  return expectedKeys.includes(provided);
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  const value = Number(raw || fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

async function resolveLimit(request: NextRequest): Promise<number> {
  const fromQuery = request.nextUrl.searchParams.get('limit');
  if (fromQuery) {
    return parsePositiveInt(fromQuery, 500);
  }

  try {
    const body = (await request.json()) as { limit?: unknown };
    return parsePositiveInt(body?.limit, 500);
  } catch {
    return 500;
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 401 });
  }

  const limit = await resolveLimit(request);
  const result = await migrateInternalOrdersFromKvToDb(limit);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
