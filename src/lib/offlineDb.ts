import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncQueueItem {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
}

interface OfflineDBSchema extends DBSchema {
  ingredients: { key: string; value: any };
  menu_categories: { key: string; value: any };
  menu_items: { key: string; value: any };
  menu_item_variants: { key: string; value: any };
  restaurant_tables: { key: string; value: any };
  waiters: { key: string; value: any };
  orders: { key: string; value: any };
  order_items: { key: string; value: any; indexes: { 'by-order': string } };
  restaurant_settings: { key: string; value: any };
  stock_purchases: { key: string; value: any };
  stock_transfers: { key: string; value: any };
  stock_removals: { key: string; value: any };
  stock_sales: { key: string; value: any };
  expenses: { key: string; value: any };
  sync_queue: { key: string; value: SyncQueueItem; indexes: { 'by-timestamp': number } };
  meta: { key: string; value: { key: string; value: any } };
}

const DB_NAME = 'arabic-shinwari-pos';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

export async function getDb(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Data stores
      const stores = [
        'ingredients', 'menu_categories', 'menu_items', 'menu_item_variants',
        'restaurant_tables', 'waiters', 'orders', 'restaurant_settings',
        'stock_purchases', 'stock_transfers', 'stock_removals', 'stock_sales',
      ] as const;

      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }

      // Order items with index
      if (!db.objectStoreNames.contains('order_items')) {
        const orderItemsStore = db.createObjectStore('order_items', { keyPath: 'id' });
        orderItemsStore.createIndex('by-order', 'order_id');
      }

      // Sync queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('by-timestamp', 'timestamp');
      }

      // Meta store for last sync timestamps etc.
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ── Cache helpers ──────────────────────────────────────────────

type DataStoreNames = 'ingredients' | 'menu_categories' | 'menu_items' | 'menu_item_variants' |
  'restaurant_tables' | 'waiters' | 'orders' | 'order_items' | 'restaurant_settings' |
  'stock_purchases' | 'stock_transfers' | 'stock_removals' | 'stock_sales';

export async function cacheTableData(storeName: DataStoreNames, rows: any[]) {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.clear();
  for (const row of rows) {
    await store.put(row);
  }
  await tx.done;
}

export async function getCachedData(storeName: DataStoreNames): Promise<any[]> {
  const db = await getDb();
  return db.getAll(storeName);
}

export async function getCachedOrderItems(orderId: string): Promise<any[]> {
  const db = await getDb();
  return db.getAllFromIndex('order_items', 'by-order', orderId);
}

// ── Sync queue ─────────────────────────────────────────────────

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'retries'>) {
  const db = await getDb();
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.put('sync_queue', { ...item, id, retries: 0 });
  return id;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return db.getAllFromIndex('sync_queue', 'by-timestamp');
}

export async function removeSyncQueueItem(id: string) {
  const db = await getDb();
  await db.delete('sync_queue', id);
}

export async function updateSyncQueueItem(item: SyncQueueItem) {
  const db = await getDb();
  await db.put('sync_queue', item);
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDb();
  return db.count('sync_queue');
}

// ── Meta helpers ───────────────────────────────────────────────

export async function setMeta(key: string, value: any) {
  const db = await getDb();
  await db.put('meta', { key, value });
}

export async function getMeta(key: string): Promise<any> {
  const db = await getDb();
  const row = await db.get('meta', key);
  return row?.value;
}
