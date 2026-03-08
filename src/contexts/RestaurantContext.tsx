import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useSupabaseActions } from '@/hooks/useSupabaseActions';
import {
  Ingredient,
  MenuItem,
  MenuItemVariant,
  MenuCategory,
  Order,
  Table,
  TableFloor,
  Waiter,
  RestaurantSettings,
  StockPurchase,
  StockTransfer,
  StockRemoval,
  StockSale,
  CartItem,
  LowStockAlert,
  DiscountType,
  IngredientCategory,
} from '@/types/restaurant';

// Default settings for when not logged in or settings not loaded
const defaultSettings: RestaurantSettings = {
  name: 'Restaurant',
  address: '',
  phone: '',
  taxRate: 16,
  currency: 'PKR',
  currencySymbol: 'Rs.',
  invoice: {
    title: 'Restaurant',
    footer: 'Thank you for dining with us!',
    showLogo: true,
    showTaxBreakdown: true,
    gstEnabled: true,
    logoUrl: '',
  },
  security: {
    cancelOrderPassword: '12345',
  },
  businessDay: {
    cutoffHour: 5,
    cutoffMinute: 0,
  },
};

// Fallback ingredient categories (used if DB is empty)
const defaultIngredientCategories: IngredientCategory[] = [
  { id: 'Meat', name: 'Gosht (Meat)' },
  { id: 'Poultry', name: 'Murgh (Poultry)' },
  { id: 'Vegetables', name: 'Sabziyan (Vegetables)' },
  { id: 'Dairy', name: 'Dairy' },
  { id: 'Grains', name: 'Anaj (Grains)' },
  { id: 'Spices', name: 'Masalay (Spices)' },
  { id: 'Oils', name: 'Tel (Oils)' },
  { id: 'Beverages', name: 'Mashroobat (Beverages)' },
];

interface RestaurantContextType {
  // Loading state
  isLoading: boolean;
  
  // Data
  settings: RestaurantSettings;
  tables: Table[];
  waiters: Waiter[];
  ingredients: Ingredient[];
  ingredientCategories: IngredientCategory[];
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  orders: Order[];
  stockPurchases: StockPurchase[];
  stockTransfers: StockTransfer[];
  stockRemovals: StockRemoval[];
  stockSales: StockSale[];
  
  // Cart (local state)
  cart: CartItem[];
  currentEditingOrderId: string | null;
  
  // Refetch
  refetch: () => Promise<void>;
  
  // Settings actions
  updateSettings: (updates: Partial<RestaurantSettings>) => Promise<void>;
  updateInvoiceSettings: (invoice: Partial<RestaurantSettings['invoice']>) => Promise<void>;
  
  // Table actions
  addTable: (table: Omit<Table, 'id' | 'status'>) => Promise<any>;
  updateTable: (id: string, updates: Partial<Table>) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  occupyTable: (tableId: string, orderId: string) => Promise<void>;
  freeTable: (tableId: string) => Promise<void>;
  getTablesByFloor: (floor: TableFloor) => Table[];
  
  // Waiter actions
  addWaiter: (waiter: Omit<Waiter, 'id'>) => Promise<any>;
  updateWaiter: (id: string, updates: Partial<Waiter>) => Promise<void>;
  deleteWaiter: (id: string) => Promise<void>;
  
  // Ingredient actions
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  
  // Stock actions
  addStoreStock: (ingredientId: string, quantity: number, unitCost: number) => Promise<void>;
  transferToKitchen: (ingredientId: string, quantity: number) => Promise<void>;
  transferToStore: (ingredientId: string, quantity: number) => Promise<void>;
  removeStock: (ingredientId: string, quantity: number, reason: string, location: 'store' | 'kitchen') => Promise<void>;
  sellStock: (ingredientId: string, quantity: number, salePrice: number, customerName?: string, notes?: string) => Promise<any>;
  getStockPurchaseHistory: (ingredientId: string) => StockPurchase[];
  
  // Menu actions
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addMenuCategory: (category: Omit<MenuCategory, 'id'>) => Promise<any>;
  updateMenuCategory: (id: string, updates: Partial<MenuCategory>) => Promise<void>;
  deleteMenuCategory: (id: string) => Promise<void>;
  addIngredientCategory: (category: Omit<IngredientCategory, 'id'>) => Promise<any>;
  deleteIngredientCategory: (id: string) => Promise<void>;
  
  // Cart actions
  addToCart: (menuItem: MenuItem, variant?: MenuItemVariant) => void;
  updateCartItemQuantity: (menuItemId: string, quantity: number, variantId?: string) => void;
  removeFromCart: (menuItemId: string, variantId?: string) => void;
  clearCart: () => void;
  addCartItemNote: (menuItemId: string, note: string, variantId?: string) => void;
  loadOrderToCart: (orderId: string) => { order: Order; waiterId?: string } | null;
  getOrderById: (orderId: string) => Order | undefined;
  setCurrentEditingOrderId: (orderId: string | null) => void;
  
  // Order actions
  completeOrder: (orderDetails: {
    paymentMethod: 'cash' | 'card' | 'mobile';
    customerName?: string;
    tableId?: string;
    waiterId?: string;
    orderType: 'dine-in' | 'online' | 'takeaway';
    discount?: number;
    discountType?: DiscountType;
    discountValue?: number;
    discountReason?: string;
  }) => Promise<Order | null>;
  updateOrder: (orderId: string, orderDetails: {
    paymentMethod: 'cash' | 'card' | 'mobile';
    customerName?: string;
    tableId?: string;
    waiterId?: string;
    orderType: 'dine-in' | 'online' | 'takeaway';
    discount?: number;
    discountType?: DiscountType;
    discountValue?: number;
    discountReason?: string;
  }) => Promise<Order | null>;
  settleOrder: (orderId: string, paymentMethod?: 'cash' | 'card' | 'mobile', tableId?: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  getTableOrder: (tableId: string) => Order | undefined;
  
  // Calculations
  calculateRecipeCost: (recipe: { ingredientId: string; quantity: number }[]) => number;
  getLowStockAlerts: () => LowStockAlert[];
  getTodaysSales: () => { orders: number; revenue: number; cost: number; profit: number };
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value?: string | null) => !!value && UUID_RE.test(value);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const data = useSupabaseData();
  const actions = useSupabaseActions();
  
  // Local cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentEditingOrderId, setCurrentEditingOrderId] = useState<string | null>(null);
  
  const settings = data.settings || defaultSettings;

  const fetchOrderWithItems = useCallback(async (orderId: string): Promise<Order | null> => {
    // Fetch the order + items directly so callers (POS/Orders) can open modals immediately
    // without waiting for React state to propagate after refetch().
    const [{ data: orderRow, error: orderErr }, { data: itemRows, error: itemsErr }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase.from('order_items').select('*').eq('order_id', orderId),
    ]);

    if (orderErr) {
      console.error('fetchOrderWithItems order error:', orderErr);
      return null;
    }
    if (itemsErr) {
      console.error('fetchOrderWithItems items error:', itemsErr);
    }

    const items = (itemRows || []).map((row: any) => ({
      menuItemId: row.menu_item_id,
      menuItemName: row.menu_item_name,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      total: Number(row.total),
      notes: row.notes ?? undefined,
    }));

    const order: Order = {
      id: orderRow.id,
      orderNumber: orderRow.order_number,
      items,
      subtotal: Number(orderRow.subtotal),
      tax: Number(orderRow.tax),
      discount: Number(orderRow.discount),
      discountType: orderRow.discount_type as any,
      discountValue: Number(orderRow.discount_value),
      discountReason: orderRow.discount_reason || undefined,
      total: Number(orderRow.total),
      paymentMethod: orderRow.payment_method as any,
      status: orderRow.status as any,
      customerName: orderRow.customer_name,
      tableId: orderRow.table_id,
      tableNumber: orderRow.table_number,
      waiterId: orderRow.waiter_id,
      waiterName: orderRow.waiter_name,
      orderType: orderRow.order_type as any,
      createdAt: new Date(orderRow.created_at),
      completedAt: orderRow.completed_at ? new Date(orderRow.completed_at) : undefined,
    };

    return order;
  }, []);
  
  // Cart actions - support variants with unique cart keys (menuItemId:variantId)
  const getCartKey = useCallback((menuItemId: string, variantId?: string) => {
    return variantId ? `${menuItemId}:${variantId}` : menuItemId;
  }, []);

  const addToCart = useCallback((menuItem: MenuItem, variant?: MenuItemVariant) => {
    setCart((prev) => {
      const cartKey = getCartKey(menuItem.id, variant?.id);
      const existing = prev.find((item) => {
        const itemKey = getCartKey(item.menuItem.id, item.variant?.id);
        return itemKey === cartKey;
      });
      
      if (existing) {
        return prev.map((item) => {
          const itemKey = getCartKey(item.menuItem.id, item.variant?.id);
          return itemKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        });
      }
      return [...prev, { menuItem, variant, quantity: 1 }];
    });
  }, [getCartKey]);
  
  const updateCartItemQuantity = useCallback((menuItemId: string, quantity: number, variantId?: string) => {
    const cartKey = getCartKey(menuItemId, variantId);
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => {
        const itemKey = getCartKey(item.menuItem.id, item.variant?.id);
        return itemKey !== cartKey;
      }));
    } else {
      setCart((prev) =>
        prev.map((item) => {
          const itemKey = getCartKey(item.menuItem.id, item.variant?.id);
          return itemKey === cartKey ? { ...item, quantity } : item;
        })
      );
    }
  }, [getCartKey]);
  
  const removeFromCart = useCallback((menuItemId: string, variantId?: string) => {
    const cartKey = getCartKey(menuItemId, variantId);
    setCart((prev) => prev.filter((item) => {
      const itemKey = getCartKey(item.menuItem.id, item.variant?.id);
      return itemKey !== cartKey;
    }));
  }, [getCartKey]);
  
  const clearCart = useCallback(() => {
    setCart([]);
    setCurrentEditingOrderId(null);
  }, []);
  
  const addCartItemNote = useCallback((menuItemId: string, note: string, variantId?: string) => {
    const cartKey = getCartKey(menuItemId, variantId);
    setCart((prev) =>
      prev.map((item) => {
        const itemKey = getCartKey(item.menuItem.id, item.variant?.id);
        return itemKey === cartKey ? { ...item, notes: note } : item;
      })
    );
  }, [getCartKey]);
  
  const loadOrderToCart = useCallback((orderId: string) => {
    const order = data.orders.find((o) => o.id === orderId);
    if (!order) return null;
    
    const cartItems: CartItem[] = [];
    order.items.forEach((item) => {
      const menuItem = data.menuItems.find((m) => m.id === item.menuItemId);
      if (menuItem) {
        // Find variant if variantId exists
        let variant: MenuItemVariant | undefined;
        if (item.variantId && menuItem.variants) {
          variant = menuItem.variants.find((v) => v.id === item.variantId);
        }
        
        cartItems.push({
          menuItem,
          variant,
          quantity: item.quantity,
          notes: item.notes,
        });
      }
    });
    
    setCart(cartItems);
    setCurrentEditingOrderId(orderId);
    
    return { order, waiterId: order.waiterId };
  }, [data.orders, data.menuItems]);
  
  const getOrderById = useCallback((orderId: string) => {
    return data.orders.find((o) => o.id === orderId);
  }, [data.orders]);
  
  // Table helpers
  const getTablesByFloor = useCallback((floor: TableFloor) => {
    return data.tables.filter((t) => t.floor === floor);
  }, [data.tables]);
  
  const getTableOrder = useCallback((tableId: string) => {
    const table = data.tables.find((t) => t.id === tableId);
    if (!table || !table.currentOrderId) return undefined;
    return data.orders.find((o) => o.id === table.currentOrderId && o.status === 'pending');
  }, [data.tables, data.orders]);
  
  // Stock helpers
  const getStockPurchaseHistory = useCallback((ingredientId: string) => {
    return data.stockPurchases
      .filter((p) => p.ingredientId === ingredientId)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [data.stockPurchases]);
  
  // Calculations
  const calculateRecipeCost = useCallback((recipe: { ingredientId: string; quantity: number }[]) => {
    return recipe.reduce((total, item) => {
      const ingredient = data.ingredients.find((i) => i.id === item.ingredientId);
      if (!ingredient) return total;
      return total + ingredient.costPerUnit * item.quantity;
    }, 0);
  }, [data.ingredients]);
  
  const getLowStockAlerts = useCallback((): LowStockAlert[] => {
    return data.ingredients
      .filter((ing) => {
        const totalStock = ing.storeStock + ing.kitchenStock;
        return totalStock <= ing.lowStockThreshold;
      })
      .map((ing) => ({
        ingredient: ing,
        currentTotal: ing.storeStock + ing.kitchenStock,
        threshold: ing.lowStockThreshold,
        severity: ing.storeStock + ing.kitchenStock <= ing.lowStockThreshold / 2
          ? 'critical' as const
          : 'warning' as const,
      }));
  }, [data.ingredients]);
  
  const getTodaysSales = useCallback(() => {
    const today = new Date().toDateString();
    const todaysOrders = data.orders.filter(
      (order) =>
        new Date(order.createdAt).toDateString() === today &&
        order.status === 'completed'
    );
    
    const revenue = todaysOrders.reduce((sum, order) => sum + order.total, 0);
    const cost = todaysOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum, item) => {
          const menuItem = data.menuItems.find((m) => m.id === item.menuItemId);
          return itemSum + (menuItem?.recipeCost || 0) * item.quantity;
        }, 0)
      );
    }, 0);
    
    return {
      orders: todaysOrders.length,
      revenue,
      cost,
      profit: revenue - cost,
    };
  }, [data.orders, data.menuItems]);
  
  // Wrapped actions
  const completeOrder = useCallback(async (orderDetails: any): Promise<Order | null> => {
    // Capture cart snapshot before any async operations
    const cartSnapshot = [...cart];
    if (cartSnapshot.length === 0) {
      console.error('completeOrder: Cart is empty');
      return null;
    }
    
    try {
      const result = await actions.createOrder(
        cartSnapshot,
        orderDetails,
        settings,
        data.tables,
        data.waiters,
        data.ingredients
      );
      if (result) {
        // Only clear cart after successful order creation
        clearCart();
        // Fetch the order with items immediately for the completion modal
        const order = await fetchOrderWithItems(result.id);
        // Background refetch to update local state
        data.refetch();
        return order;
      }
      return null;
    } catch (error) {
      console.error('completeOrder error:', error);
      return null;
    }
  }, [cart, settings, data.tables, data.waiters, data.ingredients, actions, clearCart, data.refetch, fetchOrderWithItems]);
  
  const updateOrderAction = useCallback(async (orderId: string, orderDetails: any): Promise<Order | null> => {
    // Capture cart snapshot before any async operations
    const cartSnapshot = [...cart];
    if (cartSnapshot.length === 0) {
      console.error('updateOrder: Cart is empty');
      return null;
    }
    
    try {
      const result = await actions.updateOrder(
        orderId,
        cartSnapshot,
        orderDetails,
        settings,
        data.tables,
        data.waiters
      );
      if (result) {
        // Only clear cart after successful update
        clearCart();
        // Fetch the order with items immediately for the completion modal
        const order = await fetchOrderWithItems(result.id);
        // Background refetch to update local state
        data.refetch();
        return order;
      }
      return null;
    } catch (error) {
      console.error('updateOrder error:', error);
      return null;
    }
  }, [cart, settings, data.tables, data.waiters, actions, clearCart, data.refetch, fetchOrderWithItems]);
  
  const settleOrderAction = useCallback(async (orderId: string, paymentMethod?: 'cash' | 'card' | 'mobile', explicitTableId?: string) => {
    try {
      const order = data.orders.find((o) => o.id === orderId);
      const safeTableId = explicitTableId || order?.tableId || undefined;
      await actions.settleOrder(orderId, safeTableId, paymentMethod);
      await data.refetch();
    } catch (error) {
      console.error('settleOrder error:', error);
      throw error;
    }
  }, [data.orders, actions, data.refetch]);
  
  const cancelOrderAction = useCallback(async (orderId: string) => {
    try {
      const order = data.orders.find((o) => o.id === orderId);
      const safeTableId = isUuid(order?.tableId) ? order?.tableId : undefined;
      await actions.cancelOrder(orderId, safeTableId);
      await data.refetch();
    } catch (error) {
      console.error('cancelOrder error:', error);
      throw error;
    }
  }, [data.orders, actions, data.refetch]);
  
  const addStoreStockAction = useCallback(async (ingredientId: string, quantity: number, unitCost: number) => {
    const ingredient = data.ingredients.find((i) => i.id === ingredientId);
    if (ingredient) {
      await actions.addStoreStock(ingredientId, quantity, unitCost, ingredient);
      data.refetch();
    }
  }, [data.ingredients, actions, data.refetch]);
  
  const transferToKitchenAction = useCallback(async (ingredientId: string, quantity: number) => {
    const ingredient = data.ingredients.find((i) => i.id === ingredientId);
    if (ingredient) {
      await actions.transferToKitchen(ingredientId, quantity, ingredient);
      data.refetch();
    }
  }, [data.ingredients, actions, data.refetch]);
  
  const transferToStoreAction = useCallback(async (ingredientId: string, quantity: number) => {
    const ingredient = data.ingredients.find((i) => i.id === ingredientId);
    if (ingredient) {
      await actions.transferToStore(ingredientId, quantity, ingredient);
      data.refetch();
    }
  }, [data.ingredients, actions, data.refetch]);
  
  const removeStockAction = useCallback(async (ingredientId: string, quantity: number, reason: string, location: 'store' | 'kitchen') => {
    const ingredient = data.ingredients.find((i) => i.id === ingredientId);
    if (ingredient) {
      await actions.removeStock(ingredientId, quantity, reason, location, ingredient);
      data.refetch();
    }
  }, [data.ingredients, actions, data.refetch]);
  
  const sellStockAction = useCallback(async (ingredientId: string, quantity: number, salePrice: number, customerName?: string, notes?: string) => {
    const ingredient = data.ingredients.find((i) => i.id === ingredientId);
    if (ingredient) {
      const result = await actions.sellStock(ingredientId, quantity, salePrice, customerName, notes, ingredient);
      data.refetch();
      return result;
    }
  }, [data.ingredients, actions, data.refetch]);
  
  const updateSettingsAction = useCallback(async (updates: Partial<RestaurantSettings>) => {
    await actions.updateSettings(updates);
    data.refetch();
  }, [actions, data.refetch]);
  
  const updateInvoiceSettingsAction = useCallback(async (invoice: Partial<RestaurantSettings['invoice']>) => {
    await actions.updateSettings({ invoice: { ...settings.invoice, ...invoice } });
    data.refetch();
  }, [actions, settings, data.refetch]);
  
  // Generic action wrappers
  const wrapAction = useCallback(<T extends (...args: any[]) => Promise<any>>(action: T) => {
    return async (...args: Parameters<T>) => {
      const result = await action(...args);
      data.refetch();
      return result;
    };
  }, [data.refetch]);
  
  const value = useMemo<RestaurantContextType>(() => ({
    isLoading: data.isLoading,
    settings,
    tables: data.tables,
    waiters: data.waiters,
    ingredients: data.ingredients,
    ingredientCategories: data.ingredientCategories.length > 0 ? data.ingredientCategories : defaultIngredientCategories,
    menuItems: data.menuItems,
    menuCategories: data.menuCategories,
    orders: data.orders,
    stockPurchases: data.stockPurchases,
    stockTransfers: data.stockTransfers,
    stockRemovals: data.stockRemovals,
    stockSales: data.stockSales,
    cart,
    currentEditingOrderId,
    refetch: data.refetch,
    updateSettings: updateSettingsAction,
    updateInvoiceSettings: updateInvoiceSettingsAction,
    addTable: wrapAction(actions.addTable),
    updateTable: wrapAction(actions.updateTable),
    deleteTable: wrapAction(actions.deleteTable),
    occupyTable: wrapAction(actions.occupyTable),
    freeTable: wrapAction(actions.freeTable),
    getTablesByFloor,
    addWaiter: wrapAction(actions.addWaiter),
    updateWaiter: wrapAction(actions.updateWaiter),
    deleteWaiter: wrapAction(actions.deleteWaiter),
    addIngredient: wrapAction(actions.addIngredient),
    updateIngredient: wrapAction(actions.updateIngredient),
    deleteIngredient: wrapAction(actions.deleteIngredient),
    addStoreStock: addStoreStockAction,
    transferToKitchen: transferToKitchenAction,
    transferToStore: transferToStoreAction,
    removeStock: removeStockAction,
    sellStock: sellStockAction,
    getStockPurchaseHistory,
    addMenuItem: wrapAction(actions.addMenuItem),
    updateMenuItem: wrapAction(actions.updateMenuItem),
    deleteMenuItem: wrapAction(actions.deleteMenuItem),
    addMenuCategory: wrapAction(actions.addMenuCategory),
    updateMenuCategory: wrapAction(actions.updateMenuCategory),
    deleteMenuCategory: wrapAction(actions.deleteMenuCategory),
    addIngredientCategory: wrapAction(actions.addIngredientCategory),
    deleteIngredientCategory: wrapAction(actions.deleteIngredientCategory),
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    addCartItemNote,
    loadOrderToCart,
    getOrderById,
    setCurrentEditingOrderId,
    completeOrder,
    updateOrder: updateOrderAction,
    settleOrder: settleOrderAction,
    cancelOrder: cancelOrderAction,
    getTableOrder,
    calculateRecipeCost,
    getLowStockAlerts,
    getTodaysSales,
  }), [
    data, settings, cart, currentEditingOrderId, actions,
    addToCart, updateCartItemQuantity, removeFromCart, clearCart,
    addCartItemNote, loadOrderToCart, getOrderById, getTablesByFloor,
    getTableOrder, getStockPurchaseHistory, calculateRecipeCost,
    getLowStockAlerts, getTodaysSales, completeOrder, updateOrderAction,
    settleOrderAction, cancelOrderAction, addStoreStockAction,
    transferToKitchenAction, transferToStoreAction, removeStockAction,
    sellStockAction, updateSettingsAction, updateInvoiceSettingsAction, wrapAction,
  ]);
  
  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}
