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

  const fetchAll = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch all data in parallel
      const [
        ingredientsRes,
        categoriesRes,
        menuItemsRes,
        variantsRes,
        tablesRes,
        waitersRes,
        ordersRes,
        settingsRes,
        purchasesRes,
        transfersRes,
        removalsRes,
        salesRes,
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

      // Handle ingredients
      if (ingredientsRes.data) {
        setIngredients(ingredientsRes.data.map(transformIngredient));
        
        // Extract unique categories from ingredients as fallback
        const uniqueCategories = [...new Set(ingredientsRes.data.map(i => i.category))];
        const categoryObjects: IngredientCategory[] = uniqueCategories.map(cat => ({
          id: cat,
          name: cat,
        }));
        setIngredientCategories(categoryObjects);
      }

      // Handle menu categories
      if (categoriesRes.data) {
        setMenuCategories(categoriesRes.data.map(transformMenuCategory));
      }

      // Handle menu items with variants
      if (menuItemsRes.data) {
        const variantsData = variantsRes.data || [];
        setMenuItems(menuItemsRes.data.map(item => {
          const itemVariants = variantsData.filter(v => v.menu_item_id === item.id);
          return transformMenuItem(item, itemVariants);
        }));
      }

      // Handle tables
      if (tablesRes.data) {
        setTables(tablesRes.data.map(transformTable));
      }

      // Handle waiters
      if (waitersRes.data) {
        setWaiters(waitersRes.data.map(transformWaiter));
      }

      // Handle settings
      if (settingsRes.data) {
        setSettings(transformSettings(settingsRes.data));
      }

      // Handle stock purchases
      if (purchasesRes.data) {
        setStockPurchases(purchasesRes.data.map(transformStockPurchase));
      }

      // Handle stock transfers
      if (transfersRes.data) {
        setStockTransfers(transfersRes.data.map(transformStockTransfer));
      }

      // Handle stock removals
      if (removalsRes.data) {
        setStockRemovals(removalsRes.data.map(transformStockRemoval));
      }

      // Handle stock sales
      if (salesRes.data) {
        setStockSales(salesRes.data.map(transformStockSale));
      }

      // Handle orders with items
      if (ordersRes.data) {
        const orderIds = ordersRes.data.map(o => o.id);
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        const ordersWithItems = ordersRes.data.map(order => {
          const items = (orderItems || [])
            .filter(item => item.order_id === order.id)
            .map(transformOrderItem);
          return transformOrder(order, items);
        });
        setOrders(ordersWithItems);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    const ingredientsChannel = supabase
      .channel('ingredients-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients' },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(ingredientsChannel);
    };
  }, [user, fetchAll]);

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
  };
}
