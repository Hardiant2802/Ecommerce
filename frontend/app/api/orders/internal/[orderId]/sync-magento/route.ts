import { NextRequest, NextResponse } from 'next/server';
import { getInternalOrder, updateInternalOrder } from '@/lib/services/internalOrders';
import { syncInternalOrderToMagento } from '@/lib/services/magentoSync';

export const runtime = 'edge';

interface RouteProps {
  params: Promise<{
    orderId: string;
  }>;
}

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

export async function POST(request: NextRequest, { params }: RouteProps) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;
  const order = await getInternalOrder(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'paid') {
    return NextResponse.json({ error: 'Order is not paid yet' }, { status: 400 });
  }

  await updateInternalOrder(orderId, {
    magentoSyncStatus: 'queued',
    magentoSyncError: undefined,
  });

  const result = await syncInternalOrderToMagento(order);

  if (!result.success) {
    const updated = await updateInternalOrder(orderId, {
      magentoSyncStatus: 'failed',
      magentoSyncError: result.error || 'Magento sync failed',
    });

    return NextResponse.json(
      {
        ok: false,
        error: result.error || 'Magento sync failed',
        order: updated,
      },
      { status: 502 }
    );
  }

  const updated = await updateInternalOrder(orderId, {
    magentoSyncStatus: 'success',
    magentoOrderNumber: result.orderNumber,
    magentoQuoteId: result.quoteId,
    magentoSyncError: undefined,
  });

  return NextResponse.json({
    ok: true,
    order: updated,
  });
}
