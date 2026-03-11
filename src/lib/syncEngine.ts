import { supabase } from '@/integrations/supabase/client';
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  getSyncQueueCount,
} from './offlineDb';
import { toast } from 'sonner';

const MAX_RETRIES = 5;
let isSyncing = false;
let syncListeners: Array<(count: number) => void> = [];

export function onSyncQueueChange(listener: (count: number) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

async function notifyListeners() {
  const count = await getSyncQueueCount();
  syncListeners.forEach((l) => l(count));
}

// Map app table names to Supabase table names (they match in this project)
const TABLE_MAP: Record<string, string> = {
  orders: 'orders',
  order_items: 'order_items',
  ingredients: 'ingredients',
  menu_items: 'menu_items',
  menu_categories: 'menu_categories',
  menu_item_variants: 'menu_item_variants',
  restaurant_tables: 'restaurant_tables',
  waiters: 'waiters',
  restaurant_settings: 'restaurant_settings',
  stock_purchases: 'stock_purchases',
  stock_transfers: 'stock_transfers',
  stock_removals: 'stock_removals',
  stock_sales: 'stock_sales',
  expenses: 'expenses',
};

async function processQueueItem(item: any): Promise<boolean> {
  const tableName = TABLE_MAP[item.table];
  if (!tableName) {
    console.error(`Unknown table in sync queue: ${item.table}`);
    return true; // Remove unknown items
  }

  try {
    switch (item.action) {
      case 'insert': {
        const { error } = await supabase.from(tableName as any).insert(item.data);
        if (error) {
          // If duplicate key, it's already synced
          if (error.code === '23505') return true;
          throw error;
        }
        return true;
      }
      case 'update': {
        const { id, ...updates } = item.data;
        const { error } = await supabase.from(tableName as any).update(updates).eq('id', id);
        if (error) throw error;
        return true;
      }
      case 'delete': {
        const { error } = await supabase.from(tableName as any).delete().eq('id', item.data.id);
        if (error) throw error;
        return true;
      }
      default:
        return true;
    }
  } catch (err) {
    console.error(`Sync failed for ${item.table}/${item.action}:`, err);
    return false;
  }
}

export async function processSyncQueue(): Promise<number> {
  if (isSyncing) return 0;
  if (!navigator.onLine) return 0;

  isSyncing = true;
  let processed = 0;

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      isSyncing = false;
      return 0;
    }

    console.log(`[Sync] Processing ${queue.length} queued items...`);

    for (const item of queue) {
      const success = await processQueueItem(item);

      if (success) {
        await removeSyncQueueItem(item.id);
        processed++;
      } else {
        // Increment retry count
        if (item.retries >= MAX_RETRIES) {
          console.error(`[Sync] Max retries reached for item ${item.id}, removing`);
          await removeSyncQueueItem(item.id);
          processed++;
        } else {
          await updateSyncQueueItem({ ...item, retries: item.retries + 1 });
        }
      }
    }

    if (processed > 0) {
      console.log(`[Sync] Successfully synced ${processed} items`);
      toast.success(`${processed} offline changes synced to server`);
    }
  } catch (err) {
    console.error('[Sync] Queue processing error:', err);
  } finally {
    isSyncing = false;
    await notifyListeners();
  }

  return processed;
}

// Auto-sync when coming back online
export function startSyncListener() {
  const handleOnline = () => {
    console.log('[Sync] Back online, processing queue...');
    // Small delay to let network stabilize
    setTimeout(() => processSyncQueue(), 2000);
  };

  window.addEventListener('online', handleOnline);

  // Also try syncing periodically (every 30s) when online
  const interval = setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, 30000);

  // Initial sync attempt
  if (navigator.onLine) {
    setTimeout(() => processSyncQueue(), 1000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}
