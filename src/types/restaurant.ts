export interface StockPurchase {
  id: string;
  ingredientId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  purchaseDate: Date;
  createdAt: Date;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number; // Weighted average cost
  storeStock: number;
  kitchenStock: number;
  lowStockThreshold: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image?: string;
  recipe: RecipeIngredient[];
  recipeCost: number;
  profitMargin: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  variants?: MenuItemVariant[];
}

export interface MenuItemVariant {
  id: string;
  menuItemId: string;
  name: string; // e.g., 'Small', 'Medium', 'Large', 'Half', 'Full'
  price: number;
  sortOrder: number;
  isAvailable: boolean;
  recipe?: RecipeIngredient[];
  recipeCost?: number;
  profitMargin?: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface CartItem {
  menuItem: MenuItem;
  variant?: MenuItemVariant;
  quantity: number;
  notes?: string;
}

export type TableFloor = 'ground' | 'first' | 'family';

export interface Table {
  id: string;
  number: number;
  capacity: number;
  floor: TableFloor;
  status: 'available' | 'occupied';
  currentOrderId?: string;
}

export interface Waiter {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
}

export type UserRole = 'admin' | 'manager' | 'pos_user';

export interface Staff {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export type DiscountType = 'fixed' | 'percentage';

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountType: DiscountType;
  discountValue: number; // Original value entered
  discountReason?: string; // Reason for providing discount
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  customerName?: string;
  tableId?: string;
  tableNumber?: number;
  waiterId?: string;
  waiterName?: string;
  orderType: 'dine-in' | 'online' | 'takeaway';
  createdAt: Date;
  completedAt?: Date;
}

export interface StockRemoval {
  id: string;
  ingredientId: string;
  quantity: number;
  reason: string;
  location: 'store' | 'kitchen';
  removedBy?: string;
  createdAt: Date;
}

export interface StockSale {
  id: string;
  ingredientId: string;
  quantity: number;
  costPerUnit: number;
  salePrice: number;
  totalCost: number;
  totalSale: number;
  profit: number;
  customerName?: string;
  notes?: string;
  soldBy?: string;
  saleDate: Date;
  createdAt: Date;
}

export interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  ingredientId: string;
  quantity: number;
  fromLocation: 'store' | 'kitchen';
  toLocation: 'store' | 'kitchen';
  reason: string;
  createdAt: Date;
}

export interface StockDeduction {
  id: string;
  orderId: string;
  orderNumber: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  createdAt: Date;
  cancelled?: boolean;
  cancelledAt?: Date;
}

export interface StockAdjustment {
  id: string;
  ingredientId: string;
  quantity: number;
  type: 'add' | 'remove' | 'transfer';
  location: 'store' | 'kitchen';
  reason: string;
  createdAt: Date;
}

export interface LowStockAlert {
  ingredient: Ingredient;
  currentTotal: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

export interface DailySales {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
}

export interface IngredientCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface InvoiceSettings {
  title: string;
  footer: string;
  showLogo: boolean;
  showTaxBreakdown: boolean;
  gstEnabled: boolean;
  logoUrl?: string;
}

export interface SecuritySettings {
  cancelOrderPassword: string;
}

export interface BusinessDaySettings {
  cutoffHour: number; // 0-23, e.g., 5 means 5:00 AM
  cutoffMinute: number; // 0-59
}

export interface RestaurantSettings {
  name: string;
  address: string;
  phone: string;
  taxRate: number;
  currency: string;
  currencySymbol: string;
  invoice: InvoiceSettings;
  security: SecuritySettings;
  businessDay: BusinessDaySettings;
}

// Role permissions
export const rolePermissions: Record<UserRole, string[]> = {
  admin: ['dashboard', 'pos', 'menu', 'ingredients', 'recipes', 'store_stock', 'kitchen_stock', 'orders', 'reports', 'settings', 'staff'],
  manager: ['dashboard', 'pos', 'menu', 'ingredients', 'recipes', 'store_stock', 'kitchen_stock', 'orders', 'reports'],
  pos_user: ['pos', 'orders'],
};
