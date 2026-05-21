import { syncInternalOrderToMagento } from '@/lib/services/magentoSync';
import { getInternalOrder, updateInternalOrder } from '@/lib/services/internalOrders';
import type { InternalOrder } from '@/types/order';

const SYNC_PROMISE_STORE_KEY = '__AHPHONE_MAGENTO_SYNC_PROMISE_STORE__';

function getSyncPromiseStore(): Map<string, Promise<InternalOrder | null>> {
  const globalScope = globalThis as typeof globalThis & {
    [SYNC_PROMISE_STORE_KEY]?: Map<string, Promise<InternalOrder | null>>;
  };

  if (!globalScope[SYNC_PROMISE_STORE_KEY]) {
    globalScope[SYNC_PROMISE_STORE_KEY] = new Map<string, Promise<InternalOrder | null>>();
  }

  return globalScope[SYNC_PROMISE_STORE_KEY];
}

async function runRealtimeSync(order: InternalOrder): Promise<InternalOrder | null> {
  const latestOrder = (await getInternalOrder(order.id)) || order;
  if (latestOrder.status !== 'paid') {
    return latestOrder;
  }

  if (latestOrder.magentoSyncStatus === 'success' && latestOrder.magentoOrderNumber) {
    return latestOrder;
  }

  const queuedOrder = (await updateInternalOrder(latestOrder.id, {
    magentoSyncStatus: 'queued',
    magentoSyncError: undefined,
  })) || latestOrder;

  const syncResult = await syncInternalOrderToMagento(queuedOrder);
  if (!syncResult.success) {
    return updateInternalOrder(queuedOrder.id, {
      magentoSyncStatus: 'failed',
      magentoSyncError: syncResult.error || 'Magento sync failed',
      paymentStatusMessage:
        queuedOrder.paymentStatusMessage ||
        'Da nhan du tien nhung dong bo Magento that bai. Vui long thu lai.',
    });
  }

  return updateInternalOrder(queuedOrder.id, {
    magentoSyncStatus: 'success',
    magentoOrderNumber: syncResult.orderNumber || queuedOrder.magentoOrderNumber,
    magentoQuoteId: syncResult.quoteId || queuedOrder.magentoQuoteId,
    magentoSyncError: undefined,
    paymentStatusMessage:
      queuedOrder.paymentStatusMessage ||
      'Da nhan du tien va da dong bo don hang vao Magento.',
  });
}

export async function syncPaidOrderToMagentoRealtime(
  orderOrId: InternalOrder | string
): Promise<InternalOrder | null> {
  const baseOrder =
    typeof orderOrId === 'string'
      ? await getInternalOrder(orderOrId)
      : orderOrId;

  if (!baseOrder) {
    return null;
  }

  if (baseOrder.status !== 'paid') {
    return baseOrder;
  }

  const store = getSyncPromiseStore();
  const inFlight = store.get(baseOrder.id);
  if (inFlight) {
    return inFlight;
  }

  const syncPromise = runRealtimeSync(baseOrder)
    .catch((error) => {
      console.error('Realtime Magento sync failed:', error);
      return updateInternalOrder(baseOrder.id, {
        magentoSyncStatus: 'failed',
        magentoSyncError: error instanceof Error ? error.message : 'Unknown Magento sync error',
      });
    })
    .finally(() => {
      if (store.get(baseOrder.id) === syncPromise) {
        store.delete(baseOrder.id);
      }
    });

  store.set(baseOrder.id, syncPromise);
  return syncPromise;
}