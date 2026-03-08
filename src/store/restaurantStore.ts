import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Ingredient,
  MenuItem,
  MenuCategory,
  CartItem,
  Order,
  StockTransfer,
  StockDeduction,
  LowStockAlert,
  IngredientCategory,
  Table,
  TableFloor,
  Waiter,
  Staff,
  RestaurantSettings,
  InvoiceSettings,
  StockPurchase,
  DiscountType,
} from '@/types/restaurant';

interface RestaurantState {
  // Settings
  settings: RestaurantSettings;
  updateSettings: (settings: Partial<RestaurantSettings>) => void;
  updateInvoiceSettings: (invoice: Partial<InvoiceSettings>) => void;

  // Tables
  tables: Table[];
  addTable: (table: Omit<Table, 'id' | 'status'>) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  occupyTable: (tableId: string, orderId: string) => void;
  freeTable: (tableId: string) => void;
  getTablesByFloor: (floor: TableFloor) => Table[];

  // Waiters
  waiters: Waiter[];
  addWaiter: (waiter: Omit<Waiter, 'id'>) => void;
  updateWaiter: (id: string, updates: Partial<Waiter>) => void;
  deleteWaiter: (id: string) => void;

  // Staff
  staff: Staff[];
  addStaff: (staff: Omit<Staff, 'id' | 'createdAt'>) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;

  // Ingredients
  ingredients: Ingredient[];
  ingredientCategories: IngredientCategory[];
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;
  addIngredientCategory: (category: Omit<IngredientCategory, 'id'>) => void;
  deleteIngredientCategory: (id: string) => void;

  // Stock Management
  stockPurchases: StockPurchase[];
  addStoreStock: (ingredientId: string, quantity: number, unitCost: number, reason?: string) => void;
  getStockPurchaseHistory: (ingredientId: string) => StockPurchase[];
  transferToKitchen: (ingredientId: string, quantity: number) => void;
  transferToStore: (ingredientId: string, quantity: number) => void;
  deductKitchenStock: (ingredientId: string, quantity: number, orderId?: string, orderNumber?: string) => void;
  restoreKitchenStock: (orderId: string) => void;
  stockTransfers: StockTransfer[];
  stockDeductions: StockDeduction[];
  getStockDeductionsByOrder: (orderId: string) => StockDeduction[];

  // Menu Items
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'recipeCost' | 'profitMargin'>) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  addMenuCategory: (category: Omit<MenuCategory, 'id'>) => void;
  deleteMenuCategory: (id: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (menuItem: MenuItem) => void;
  updateCartItemQuantity: (menuItemId: string, quantity: number) => void;
  removeFromCart: (menuItemId: string) => void;
  clearCart: () => void;
  addCartItemNote: (menuItemId: string, note: string) => void;
  loadOrderToCart: (orderId: string) => { order: Order; waiterId?: string } | null;
  getOrderById: (orderId: string) => Order | undefined;
  
  // Orders
  orders: Order[];
  currentEditingOrderId: string | null;
  setCurrentEditingOrderId: (orderId: string | null) => void;
  completeOrder: (orderDetails: {
    paymentMethod: 'cash' | 'card' | 'mobile';
    customerName?: string;
    tableId?: string;
    waiterId?: string;
    orderType: 'dine-in' | 'online' | 'takeaway';
    discount?: number;
    discountType?: DiscountType;
    discountValue?: number;
  }) => Order | null;
  updateOrder: (orderId: string, orderDetails: {
    paymentMethod: 'cash' | 'card' | 'mobile';
    customerName?: string;
    tableId?: string;
    waiterId?: string;
    orderType: 'dine-in' | 'online' | 'takeaway';
    discount?: number;
    discountType?: DiscountType;
    discountValue?: number;
  }) => Order | null;
  settleOrder: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  getTableOrder: (tableId: string) => Order | undefined;

  // Calculations
  calculateRecipeCost: (recipe: { ingredientId: string; quantity: number }[]) => number;
  getLowStockAlerts: () => LowStockAlert[];
  getTodaysSales: () => { orders: number; revenue: number; cost: number; profit: number };
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const generateOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

// Default Settings - Production Ready
const defaultSettings: RestaurantSettings = {
  name: 'Shinwari Restaurant',
  address: 'Main Boulevard, Gulberg III, Lahore',
  phone: '+92 300 1234567',
  taxRate: 16,
  currency: 'PKR',
  currencySymbol: 'Rs.',
  invoice: {
    title: 'Shinwari Restaurant',
    footer: 'Thank you for dining with us! Visit again.',
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

// Empty initial data - data comes from Supabase
const initialTables: Table[] = [];
const initialWaiters: Waiter[] = [];
const initialStaff: Staff[] = [];
const initialIngredientCategories: IngredientCategory[] = [
  { id: 'Meat', name: 'Gosht (Meat)' },
  { id: 'Poultry', name: 'Murgh (Poultry)' },
  { id: 'Vegetables', name: 'Sabziyan (Vegetables)' },
  { id: 'Dairy', name: 'Dairy' },
  { id: 'Grains', name: 'Anaj (Grains)' },
  { id: 'Spices', name: 'Masalay (Spices)' },
  { id: 'Oils', name: 'Tel (Oils)' },
  { id: 'Beverages', name: 'Mashroobat (Beverages)' },
];
const initialIngredients: Ingredient[] = [];
const initialMenuCategories: MenuCategory[] = [];
const initialMenuItems: MenuItem[] = [];

export const useRestaurantStore = create<RestaurantState>()(
  persist(
    (set, get) => ({
      // Initial Data - empty, will be synced from Supabase
      settings: defaultSettings,
      tables: initialTables,
      waiters: initialWaiters,
      staff: initialStaff,
      ingredients: initialIngredients,
      ingredientCategories: initialIngredientCategories,
      menuItems: initialMenuItems,
      menuCategories: initialMenuCategories,
      cart: [],
      orders: [],
      stockTransfers: [],
      stockDeductions: [],
      stockPurchases: [],
      currentEditingOrderId: null,

      // Settings
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      updateInvoiceSettings: (invoice) => {
        set((state) => ({
          settings: {
            ...state.settings,
            invoice: { ...state.settings.invoice, ...invoice },
          },
        }));
      },

      // Table Management
      addTable: (table) => {
        const newTable: Table = {
          ...table,
          id: generateId(),
          status: 'available',
        };
        set((state) => ({
          tables: [...state.tables, newTable],
        }));
      },

      updateTable: (id, updates) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === id ? { ...table, ...updates } : table
          ),
        }));
      },

      deleteTable: (id) => {
        set((state) => ({
          tables: state.tables.filter((table) => table.id !== id),
        }));
      },

      occupyTable: (tableId, orderId) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === tableId
              ? { ...table, status: 'occupied' as const, currentOrderId: orderId }
              : table
          ),
        }));
      },

      freeTable: (tableId) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === tableId
              ? { ...table, status: 'available' as const, currentOrderId: undefined }
              : table
          ),
        }));
      },

      getTablesByFloor: (floor) => {
        return get().tables.filter((t) => t.floor === floor);
      },

      // Waiter Management
      addWaiter: (waiter) => {
        const newWaiter: Waiter = {
          ...waiter,
          id: generateId(),
        };
        set((state) => ({
          waiters: [...state.waiters, newWaiter],
        }));
      },

      updateWaiter: (id, updates) => {
        set((state) => ({
          waiters: state.waiters.map((waiter) =>
            waiter.id === id ? { ...waiter, ...updates } : waiter
          ),
        }));
      },

      deleteWaiter: (id) => {
        set((state) => ({
          waiters: state.waiters.filter((waiter) => waiter.id !== id),
        }));
      },

      // Staff Management
      addStaff: (staffMember) => {
        const newStaff: Staff = {
          ...staffMember,
          id: generateId(),
          createdAt: new Date(),
        };
        set((state) => ({
          staff: [...state.staff, newStaff],
        }));
      },

      updateStaff: (id, updates) => {
        set((state) => ({
          staff: state.staff.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      deleteStaff: (id) => {
        set((state) => ({
          staff: state.staff.filter((s) => s.id !== id),
        }));
      },

      // Ingredient Management
      addIngredient: (ingredient) => {
        const newIngredient: Ingredient = {
          ...ingredient,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          ingredients: [...state.ingredients, newIngredient],
        }));
      },

      updateIngredient: (id, updates) => {
        set((state) => ({
          ingredients: state.ingredients.map((ing) =>
            ing.id === id ? { ...ing, ...updates, updatedAt: new Date() } : ing
          ),
        }));
      },

      deleteIngredient: (id) => {
        set((state) => ({
          ingredients: state.ingredients.filter((ing) => ing.id !== id),
        }));
      },

      addIngredientCategory: (category) => {
        const newCategory: IngredientCategory = {
          ...category,
          id: generateId(),
        };
        set((state) => ({
          ingredientCategories: [...state.ingredientCategories, newCategory],
        }));
      },

      deleteIngredientCategory: (id) => {
        set((state) => ({
          ingredientCategories: state.ingredientCategories.filter((cat) => cat.id !== id),
        }));
      },

      // Stock Management
      addStoreStock: (ingredientId, quantity, unitCost, reason = 'Stock received') => {
        const ingredient = get().ingredients.find((i) => i.id === ingredientId);
        if (!ingredient) return;

        const currentTotalValue = ingredient.storeStock * ingredient.costPerUnit;
        const newPurchaseValue = quantity * unitCost;
        const newTotalStock = ingredient.storeStock + quantity;
        const newWeightedAvgCost = newTotalStock > 0 
          ? (currentTotalValue + newPurchaseValue) / newTotalStock 
          : unitCost;

        const purchaseId = generateId();

        set((state) => ({
          ingredients: state.ingredients.map((ing) =>
            ing.id === ingredientId
              ? { 
                  ...ing, 
                  storeStock: ing.storeStock + quantity, 
                  costPerUnit: newWeightedAvgCost,
                  updatedAt: new Date() 
                }
              : ing
          ),
          stockTransfers: [
            ...state.stockTransfers,
            {
              id: generateId(),
              ingredientId,
              quantity,
              fromLocation: 'store' as const,
              toLocation: 'store' as const,
              reason,
              createdAt: new Date(),
            },
          ],
          stockPurchases: [
            ...state.stockPurchases,
            {
              id: purchaseId,
              ingredientId,
              quantity,
              unitCost,
              totalCost: quantity * unitCost,
              purchaseDate: new Date(),
              createdAt: new Date(),
            },
          ],
        }));
      },

      getStockPurchaseHistory: (ingredientId) => {
        return get().stockPurchases
          .filter((p) => p.ingredientId === ingredientId)
          .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      },

      transferToKitchen: (ingredientId, quantity) => {
        set((state) => {
          const ingredient = state.ingredients.find((i) => i.id === ingredientId);
          if (!ingredient || ingredient.storeStock < quantity) return state;

          return {
            ingredients: state.ingredients.map((ing) =>
              ing.id === ingredientId
                ? {
                    ...ing,
                    storeStock: ing.storeStock - quantity,
                    kitchenStock: ing.kitchenStock + quantity,
                    updatedAt: new Date(),
                  }
                : ing
            ),
            stockTransfers: [
              ...state.stockTransfers,
              {
                id: generateId(),
                ingredientId,
                quantity,
                fromLocation: 'store' as const,
                toLocation: 'kitchen' as const,
                reason: 'Transfer to kitchen',
                createdAt: new Date(),
              },
            ],
          };
        });
      },

      transferToStore: (ingredientId, quantity) => {
        set((state) => {
          const ingredient = state.ingredients.find((i) => i.id === ingredientId);
          if (!ingredient || ingredient.kitchenStock < quantity) return state;

          return {
            ingredients: state.ingredients.map((ing) =>
              ing.id === ingredientId
                ? {
                    ...ing,
                    storeStock: ing.storeStock + quantity,
                    kitchenStock: ing.kitchenStock - quantity,
                    updatedAt: new Date(),
                  }
                : ing
            ),
            stockTransfers: [
              ...state.stockTransfers,
              {
                id: generateId(),
                ingredientId,
                quantity,
                fromLocation: 'kitchen' as const,
                toLocation: 'store' as const,
                reason: 'Return to store',
                createdAt: new Date(),
              },
            ],
          };
        });
      },

      deductKitchenStock: (ingredientId, quantity, orderId, orderNumber) => {
        const ingredient = get().ingredients.find((i) => i.id === ingredientId);
        set((state) => ({
          ingredients: state.ingredients.map((ing) =>
            ing.id === ingredientId
              ? { ...ing, kitchenStock: Math.max(0, ing.kitchenStock - quantity), updatedAt: new Date() }
              : ing
          ),
          stockDeductions: orderId && orderNumber ? [
            ...state.stockDeductions,
            {
              id: generateId(),
              orderId,
              orderNumber,
              ingredientId,
              ingredientName: ingredient?.name || 'Unknown',
              quantity,
              createdAt: new Date(),
            },
          ] : state.stockDeductions,
        }));
      },

      getStockDeductionsByOrder: (orderId) => {
        return get().stockDeductions.filter((d) => d.orderId === orderId);
      },

      restoreKitchenStock: (orderId) => {
        const deductions = get().stockDeductions.filter((d) => d.orderId === orderId && !d.cancelled);
        
        if (deductions.length === 0) return;

        const ingredientUpdates: Record<string, number> = {};
        deductions.forEach((deduction) => {
          ingredientUpdates[deduction.ingredientId] = 
            (ingredientUpdates[deduction.ingredientId] || 0) + deduction.quantity;
        });

        set((state) => ({
          ingredients: state.ingredients.map((ing) => {
            const restoreAmount = ingredientUpdates[ing.id];
            if (restoreAmount) {
              return {
                ...ing,
                kitchenStock: ing.kitchenStock + restoreAmount,
                updatedAt: new Date(),
              };
            }
            return ing;
          }),
          stockDeductions: state.stockDeductions.map((d) =>
            d.orderId === orderId
              ? { ...d, cancelled: true, cancelledAt: new Date() }
              : d
          ),
        }));
      },

      // Menu Management
      addMenuItem: (item) => {
        const recipeCost = get().calculateRecipeCost(item.recipe);
        const profitMargin = ((item.price - recipeCost) / item.price) * 100;
        const newItem: MenuItem = {
          ...item,
          id: generateId(),
          recipeCost,
          profitMargin,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          menuItems: [...state.menuItems, newItem],
        }));
      },

      updateMenuItem: (id, updates) => {
        set((state) => {
          const existingItem = state.menuItems.find((item) => item.id === id);
          if (!existingItem) return state;

          const recipe = updates.recipe || existingItem.recipe;
          const price = updates.price || existingItem.price;
          const recipeCost = get().calculateRecipeCost(recipe);
          const profitMargin = ((price - recipeCost) / price) * 100;

          return {
            menuItems: state.menuItems.map((item) =>
              item.id === id
                ? { ...item, ...updates, recipeCost, profitMargin, updatedAt: new Date() }
                : item
            ),
          };
        });
      },

      deleteMenuItem: (id) => {
        set((state) => ({
          menuItems: state.menuItems.filter((item) => item.id !== id),
        }));
      },

      addMenuCategory: (category) => {
        const newCategory: MenuCategory = {
          ...category,
          id: generateId(),
        };
        set((state) => ({
          menuCategories: [...state.menuCategories, newCategory],
        }));
      },

      deleteMenuCategory: (id) => {
        set((state) => ({
          menuCategories: state.menuCategories.filter((cat) => cat.id !== id),
        }));
      },

      // Cart Management
      addToCart: (menuItem) => {
        set((state) => {
          const existingItem = state.cart.find((item) => item.menuItem.id === menuItem.id);
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item.menuItem.id === menuItem.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return {
            cart: [...state.cart, { menuItem, quantity: 1 }],
          };
        });
      },

      updateCartItemQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(menuItemId);
          return;
        }
        set((state) => ({
          cart: state.cart.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, quantity } : item
          ),
        }));
      },

      removeFromCart: (menuItemId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.menuItem.id !== menuItemId),
        }));
      },

      clearCart: () => set({ cart: [], currentEditingOrderId: null }),

      addCartItemNote: (menuItemId, note) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, notes: note } : item
          ),
        }));
      },

      loadOrderToCart: (orderId) => {
        const { orders, menuItems } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) return null;

        const cartItems: CartItem[] = [];
        order.items.forEach((item) => {
          const menuItem = menuItems.find((m) => m.id === item.menuItemId);
          if (menuItem) {
            cartItems.push({
              menuItem,
              quantity: item.quantity,
              notes: item.notes,
            });
          }
        });

        set({
          cart: cartItems,
          currentEditingOrderId: orderId,
        });

        return { order, waiterId: order.waiterId };
      },

      getOrderById: (orderId) => {
        return get().orders.find((o) => o.id === orderId);
      },

      setCurrentEditingOrderId: (orderId) => {
        set({ currentEditingOrderId: orderId });
      },

      getTableOrder: (tableId) => {
        const { orders, tables } = get();
        const table = tables.find((t) => t.id === tableId);
        if (!table || !table.currentOrderId) return undefined;
        return orders.find((o) => o.id === table.currentOrderId && o.status === 'pending');
      },

      // Order Management
      completeOrder: (orderDetails) => {
        const { cart, settings, tables, waiters } = get();
        if (cart.length === 0) return null;

        const subtotal = cart.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0
        );
        const gstEnabled = settings.invoice?.gstEnabled ?? true;
        const tax = gstEnabled ? subtotal * (settings.taxRate / 100) : 0;
        const discountType = orderDetails.discountType || 'fixed';
        const discountValue = orderDetails.discountValue || 0;
        const discount = discountType === 'percentage' 
          ? (subtotal * discountValue) / 100 
          : discountValue;
        const total = subtotal + tax - discount;

        const table = tables.find((t) => t.id === orderDetails.tableId);
        const waiter = waiters.find((w) => w.id === orderDetails.waiterId);

        const order: Order = {
          id: generateId(),
          orderNumber: generateOrderNumber(),
          items: cart.map((item) => ({
            menuItemId: item.menuItem.id,
            menuItemName: item.menuItem.name,
            quantity: item.quantity,
            unitPrice: item.menuItem.price,
            total: item.menuItem.price * item.quantity,
            notes: item.notes,
          })),
          subtotal,
          tax,
          discount,
          discountType,
          discountValue,
          total,
          paymentMethod: orderDetails.paymentMethod,
          status: 'pending',
          customerName: orderDetails.customerName,
          tableId: orderDetails.tableId,
          tableNumber: table?.number,
          waiterId: orderDetails.waiterId,
          waiterName: waiter?.name,
          orderType: orderDetails.orderType,
          createdAt: new Date(),
          completedAt: undefined,
        };

        // Deduct ingredients from kitchen stock
        const orderNumber = order.orderNumber;
        const orderId = order.id;
        cart.forEach((cartItem) => {
          cartItem.menuItem.recipe.forEach((recipeItem) => {
            const quantityUsed = recipeItem.quantity * cartItem.quantity;
            get().deductKitchenStock(recipeItem.ingredientId, quantityUsed, orderId, orderNumber);
          });
        });

        // Occupy table if dine-in
        if (orderDetails.orderType === 'dine-in' && orderDetails.tableId) {
          get().occupyTable(orderDetails.tableId, order.id);
        }

        set((state) => ({
          orders: [order, ...state.orders],
          cart: [],
          currentEditingOrderId: null,
        }));

        return order;
      },

      updateOrder: (orderId, orderDetails) => {
        const { cart, settings, tables, waiters } = get();
        if (cart.length === 0) return null;

        const subtotal = cart.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0
        );
        const gstEnabled = settings.invoice?.gstEnabled ?? true;
        const tax = gstEnabled ? subtotal * (settings.taxRate / 100) : 0;
        const discountType = orderDetails.discountType || 'fixed';
        const discountValue = orderDetails.discountValue || 0;
        const discount = discountType === 'percentage' 
          ? (subtotal * discountValue) / 100 
          : discountValue;
        const total = subtotal + tax - discount;

        const table = tables.find((t) => t.id === orderDetails.tableId);
        const waiter = waiters.find((w) => w.id === orderDetails.waiterId);

        let updatedOrder: Order | null = null;

        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id === orderId) {
              updatedOrder = {
                ...order,
                items: cart.map((item) => ({
                  menuItemId: item.menuItem.id,
                  menuItemName: item.menuItem.name,
                  quantity: item.quantity,
                  unitPrice: item.menuItem.price,
                  total: item.menuItem.price * item.quantity,
                  notes: item.notes,
                })),
                subtotal,
                tax,
                discount,
                discountType,
                discountValue,
                total,
                paymentMethod: orderDetails.paymentMethod,
                customerName: orderDetails.customerName,
                tableId: orderDetails.tableId,
                tableNumber: table?.number,
                waiterId: orderDetails.waiterId,
                waiterName: waiter?.name,
              };
              return updatedOrder;
            }
            return order;
          }),
          cart: [],
          currentEditingOrderId: null,
        }));

        return get().orders.find((o) => o.id === orderId) || null;
      },

      settleOrder: (orderId) => {
        const { orders } = get();
        const order = orders.find((o) => o.id === orderId);
        
        if (order?.tableId) {
          get().freeTable(order.tableId);
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'completed' as const, completedAt: new Date() } : o
          ),
        }));
      },

      cancelOrder: (orderId) => {
        const { orders } = get();
        const order = orders.find((o) => o.id === orderId);
        
        if (order?.tableId) {
          get().freeTable(order.tableId);
        }

        get().restoreKitchenStock(orderId);

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'cancelled' as const } : o
          ),
        }));
      },

      // Calculations
      calculateRecipeCost: (recipe) => {
        const { ingredients } = get();
        return recipe.reduce((total, item) => {
          const ingredient = ingredients.find((i) => i.id === item.ingredientId);
          if (!ingredient) return total;
          return total + ingredient.costPerUnit * item.quantity;
        }, 0);
      },

      getLowStockAlerts: () => {
        const { ingredients } = get();
        return ingredients
          .filter((ing) => {
            const totalStock = ing.storeStock + ing.kitchenStock;
            return totalStock <= ing.lowStockThreshold;
          })
          .map((ing) => ({
            ingredient: ing,
            currentTotal: ing.storeStock + ing.kitchenStock,
            threshold: ing.lowStockThreshold,
            severity: ing.storeStock + ing.kitchenStock <= ing.lowStockThreshold / 2
              ? ('critical' as const)
              : ('warning' as const),
          }));
      },

      getTodaysSales: () => {
        const { orders, menuItems } = get();
        const today = new Date().toDateString();
        const todaysOrders = orders.filter(
          (order) =>
            new Date(order.createdAt).toDateString() === today &&
            order.status === 'completed'
        );

        const revenue = todaysOrders.reduce((sum, order) => sum + order.total, 0);
        const cost = todaysOrders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce((itemSum, item) => {
              const menuItem = menuItems.find((m) => m.id === item.menuItemId);
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
      },
    }),
    {
      name: 'restaurant-storage',
    }
  )
);
