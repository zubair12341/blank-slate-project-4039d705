import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Ingredient,
  IngredientCategory,
  MenuItem,
  MenuCategory,
  Order,
  OrderItem,
  Table,
  TableFloor,
  Waiter,
  RestaurantSettings,
  StockPurchase,
  StockTransfer,
  StockRemoval,
  StockSale,
  RecipeIngredient,
} from '@/types/restaurant';
import { toast } from 'sonner';
import { cacheTableData, getCachedData, getCachedOrderItems } from '@/lib/offlineDb';

// Transform database ingredient category to app type
const transformIngredientCategory = (row: any): IngredientCategory => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  sortOrder: row.sort_order,
});

// Transform database row to app types
const transformIngredient = (row: any): Ingredient => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  costPerUnit: Number(row.cost_per_unit),
  storeStock: Number(row.store_stock),
  kitchenStock: Number(row.kitchen_stock),
  lowStockThreshold: Number(row.low_stock_threshold),
  category: row.category,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const transformMenuCategory = (row: any): MenuCategory => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  sortOrder: row.sort_order,
});

const transformMenuItem = (row: any, variants?: any[]): MenuItem => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  price: Number(row.price),
  categoryId: row.category_id || '',
  image: row.image,
  recipe: (row.recipe as RecipeIngredient[]) || [],
  recipeCost: Number(row.recipe_cost),
  profitMargin: Number(row.profit_margin),
  isAvailable: row.is_available,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  variants: variants?.map(v => ({
    id: v.id,
    menuItemId: v.menu_item_id,
    name: v.name,
    price: Number(v.price),
    sortOrder: v.sort_order,
    isAvailable: v.is_available,
    recipe: (v.recipe as RecipeIngredient[]) || [],
    recipeCost: Number(v.recipe_cost || 0),
    profitMargin: Number(v.profit_margin || 0),
  })) || [],
});

const transformTable = (row: any): Table => ({
  id: row.id,
  number: row.table_number,
  capacity: row.capacity,
  floor: row.floor as TableFloor,
  status: row.status as 'available' | 'occupied',
  currentOrderId: row.current_order_id,
});

const transformWaiter = (row: any): Waiter => ({
  id: row.id,
  name: row.name,
  phone: row.phone || '',
  isActive: row.is_active,
});

const transformSettings = (row: any): RestaurantSettings => ({
  name: row.name,
  address: row.address || '',
  phone: row.phone || '',
  taxRate: Number(row.tax_rate),
  currency: row.currency,
  currencySymbol: row.currency_symbol,
  invoice: {
    title: row.invoice_title || row.name,
    footer: row.invoice_footer || 'Thank you for dining with us!',
    showLogo: row.invoice_show_logo,
    showTaxBreakdown: true,
    gstEnabled: row.invoice_gst_enabled,
    logoUrl: row.invoice_logo_url || '',
  },
  security: {
    cancelOrderPassword: row.security_cancel_password,
  },
  businessDay: {
    cutoffHour: row.business_day_cutoff_hour,
    cutoffMinute: row.business_day_cutoff_minute,
  },
});

const transformOrder = (row: any, items: OrderItem[]): Order => ({
  id: row.id,
  orderNumber: row.order_number,
  items,
  subtotal: Number(row.subtotal),
  tax: Number(row.tax),
  discount: Number(row.discount),
  discountType: row.discount_type as 'fixed' | 'percentage',
  discountValue: Number(row.discount_value),
  discountReason: row.discount_reason || undefined,
  total: Number(row.total),
  paymentMethod: row.payment_method as 'cash' | 'card' | 'mobile',
  status: row.status as 'pending' | 'completed' | 'cancelled' | 'refunded',
  customerName: row.customer_name,
  tableId: row.table_id,
  tableNumber: row.table_number,
  waiterId: row.waiter_id,
  waiterName: row.waiter_name,
  orderType: row.order_type as 'dine-in' | 'online' | 'takeaway',
  createdAt: new Date(row.created_at),
  completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
});

const transformOrderItem = (row: any): OrderItem => ({
  menuItemId: row.menu_item_id,
  menuItemName: row.menu_item_name,
  variantId: row.variant_id || undefined,
  variantName: row.variant_name || undefined,
  quantity: row.quantity,
  unitPrice: Number(row.unit_price),
  total: Number(row.total),
  notes: row.notes,
});

const transformStockPurchase = (row: any): StockPurchase => ({
  id: row.id,
  ingredientId: row.ingredient_id,
  quantity: Number(row.quantity),
  unitCost: Number(row.unit_cost),
  totalCost: Number(row.total_cost),
  purchaseDate: new Date(row.purchase_date),
  createdAt: new Date(row.created_at),
});

const transformStockTransfer = (row: any): StockTransfer => ({
  id: row.id,
  ingredientId: row.ingredient_id,
  quantity: Number(row.quantity),
  fromLocation: row.from_location as 'store' | 'kitchen',
  toLocation: row.to_location as 'store' | 'kitchen',
  reason: row.reason || '',
  createdAt: new Date(row.created_at),
});

const transformStockRemoval = (row: any): StockRemoval => ({
  id: row.id,
  ingredientId: row.ingredient_id,
  quantity: Number(row.quantity),
  reason: row.reason,
  location: row.location as 'store' | 'kitchen',
  removedBy: row.removed_by,
  createdAt: new Date(row.created_at),
});

const transformStockSale = (row: any): StockSale => ({
  id: row.id,
  ingredientId: row.ingredient_id,
  quantity: Number(row.quantity),
  costPerUnit: Number(row.cost_per_unit),
  salePrice: Number(row.sale_price),
  totalCost: Number(row.total_cost),
  totalSale: Number(row.total_sale),
  profit: Number(row.profit),
  customerName: row.customer_name,
  notes: row.notes,
  soldBy: row.sold_by,
  saleDate: new Date(row.sale_date),
  createdAt: new Date(row.created_at),
});

// ── Load cached data from IndexedDB ────────────────────────────

async function loadFromCache() {
  try {
    const [
      ingredients, menuCategories, menuItems, variants,
      tables, waiters, orders, orderItems,
      settings, purchases, transfers, removals, sales,
    ] = await Promise.all([
      getCachedData('ingredients'),
      getCachedData('menu_categories'),
      getCachedData('menu_items'),
      getCachedData('menu_item_variants'),
      getCachedData('restaurant_tables'),
      getCachedData('waiters'),
      getCachedData('orders'),
      getCachedData('order_items'),
      getCachedData('restaurant_settings'),
      getCachedData('stock_purchases'),
      getCachedData('stock_transfers'),
      getCachedData('stock_removals'),
      getCachedData('stock_sales'),
    ]);

    return {
      ingredients, menuCategories, menuItems, variants,
      tables, waiters, orders, orderItems,
      settings: settings[0] || null,
      purchases, transfers, removals, sales,
    };
  } catch {
    return null;
  }
}

export function useSupabaseData() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [stockRemovals, setStockRemovals] = useState<StockRemoval[]>([]);
  const [stockSales, setStockSales] = useState<StockSale[]>([]);

  // Apply raw DB rows to state and cache
  const applyData = useCallback((raw: {
    ingredients: any[]; menuCategories: any[]; menuItems: any[]; variants: any[];
    tables: any[]; waiters: any[]; orders: any[]; orderItems: any[];
    settings: any; purchases: any[]; transfers: any[]; removals: any[]; sales: any[];
  }) => {
    if (raw.ingredients?.length) {
      setIngredients(raw.ingredients.map(transformIngredient));
      const uniqueCategories = [...new Set(raw.ingredients.map((i: any) => i.category))];
      setIngredientCategories(uniqueCategories.map(cat => ({ id: cat, name: cat })));
    }
    if (raw.menuCategories?.length) setMenuCategories(raw.menuCategories.map(transformMenuCategory));
    if (raw.menuItems?.length) {
      const variantsData = raw.variants || [];
      setMenuItems(raw.menuItems.map((item: any) => {
        const itemVariants = variantsData.filter((v: any) => v.menu_item_id === item.id);
        return transformMenuItem(item, itemVariants);
      }));
    }
    if (raw.tables?.length) setTables(raw.tables.map(transformTable));
    if (raw.waiters?.length) setWaiters(raw.waiters.map(transformWaiter));
    if (raw.settings) setSettings(transformSettings(raw.settings));
    if (raw.purchases?.length) setStockPurchases(raw.purchases.map(transformStockPurchase));
    if (raw.transfers?.length) setStockTransfers(raw.transfers.map(transformStockTransfer));
    if (raw.removals?.length) setStockRemovals(raw.removals.map(transformStockRemoval));
    if (raw.sales?.length) setStockSales(raw.sales.map(transformStockSale));

    // Build orders with items
    if (raw.orders?.length) {
      const ordersWithItems = raw.orders.map((order: any) => {
        const items = (raw.orderItems || [])
          .filter((item: any) => item.order_id === order.id)
          .map(transformOrderItem);
        return transformOrder(order, items);
      });
      setOrders(ordersWithItems);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // ── Step 1: Load from IndexedDB cache first (instant) ──
    try {
      const cached = await loadFromCache();
      if (cached && (cached.ingredients.length > 0 || cached.menuItems.length > 0)) {
        applyData({
          ingredients: cached.ingredients,
          menuCategories: cached.menuCategories,
          menuItems: cached.menuItems,
          variants: cached.variants,
          tables: cached.tables,
          waiters: cached.waiters,
          orders: cached.orders,
          orderItems: cached.orderItems,
          settings: cached.settings,
          purchases: cached.purchases,
          transfers: cached.transfers,
          removals: cached.removals,
          sales: cached.sales,
        });
        setIsLoading(false);
        console.log('[Offline] Loaded data from IndexedDB cache');
      }
    } catch (e) {
      console.warn('[Offline] Failed to load cache:', e);
    }

    // ── Step 2: Fetch from Supabase if online ──
    if (!navigator.onLine) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [
        ingredientsRes, categoriesRes, menuItemsRes, variantsRes,
        tablesRes, waitersRes, ordersRes, settingsRes,
        purchasesRes, transfersRes, removalsRes, salesRes,
      ] = await Promise.all([
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('menu_categories').select('*').order('sort_order'),
        supabase.from('menu_items').select('*').order('name'),
        supabase.from('menu_item_variants').select('*').order('sort_order'),
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('waiters').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('restaurant_settings').select('*').limit(1).maybeSingle(),
        supabase.from('stock_purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('stock_transfers').select('*').order('created_at', { ascending: false }),
        supabase.from('stock_removals').select('*').order('created_at', { ascending: false }),
        supabase.from('stock_sales').select('*').order('created_at', { ascending: false }),
      ]);

      // Fetch order items
      let orderItemsData: any[] = [];
      if (ordersRes.data?.length) {
        const orderIds = ordersRes.data.map(o => o.id);
        const { data: oi } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
        orderItemsData = oi || [];
      }

      const raw = {
        ingredients: ingredientsRes.data || [],
        menuCategories: categoriesRes.data || [],
        menuItems: menuItemsRes.data || [],
        variants: variantsRes.data || [],
        tables: tablesRes.data || [],
        waiters: waitersRes.data || [],
        orders: ordersRes.data || [],
        orderItems: orderItemsData,
        settings: settingsRes.data || null,
        purchases: purchasesRes.data || [],
        transfers: transfersRes.data || [],
        removals: removalsRes.data || [],
        sales: salesRes.data || [],
      };

      applyData(raw);

      // ── Step 3: Cache everything in IndexedDB ──
      try {
        await Promise.all([
          cacheTableData('ingredients', raw.ingredients),
          cacheTableData('menu_categories', raw.menuCategories),
          cacheTableData('menu_items', raw.menuItems),
          cacheTableData('menu_item_variants', raw.variants),
          cacheTableData('restaurant_tables', raw.tables),
          cacheTableData('waiters', raw.waiters),
          cacheTableData('orders', raw.orders),
          cacheTableData('order_items', raw.orderItems),
          cacheTableData('restaurant_settings', raw.settings ? [raw.settings] : []),
          cacheTableData('stock_purchases', raw.purchases),
          cacheTableData('stock_transfers', raw.transfers),
          cacheTableData('stock_removals', raw.removals),
          cacheTableData('stock_sales', raw.sales),
        ]);
        console.log('[Offline] Cached all data to IndexedDB');
      } catch (cacheErr) {
        console.warn('[Offline] Failed to cache data:', cacheErr);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (!navigator.onLine) {
        toast.info('Working offline with cached data');
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, applyData]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Set up realtime subscriptions (only when online)
  useEffect(() => {
    if (!user) return;

    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { fetchAll(); }
      )
      .subscribe();

    const ingredientsChannel = supabase
      .channel('ingredients-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients' },
        () => { fetchAll(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(ingredientsChannel);
    };
  }, [user, fetchAll]);

  // Re-fetch when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Offline] Back online, refreshing data...');
      toast.success('Back online! Syncing data...');
      fetchAll();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchAll]);

  return {
    isLoading,
    ingredients,
    ingredientCategories,
    menuCategories,
    menuItems,
    tables,
    waiters,
    orders,
    settings,
    stockPurchases,
    stockTransfers,
    stockRemovals,
    stockSales,
    refetch: fetchAll,
    // Direct state setters for offline mutations
    setTables,
    setOrders,
  };
}
