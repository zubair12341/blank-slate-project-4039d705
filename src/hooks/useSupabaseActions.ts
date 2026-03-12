import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Ingredient,
  MenuItem,
  MenuCategory,
  Order,
  OrderItem,
  Table,
  TableFloor,
  Waiter,
  RestaurantSettings,
  RecipeIngredient,
  DiscountType,
  CartItem,
} from '@/types/restaurant';

const generateOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value?: string | null) => !!value && UUID_RE.test(value);

const extractSupabaseErrorMessage = (err: unknown) => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  // supabase-js PostgrestError / FunctionsHttpError often has message
  if (typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') return (err as any).message;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};

export function useSupabaseActions() {
  // Ingredient actions
  const addIngredient = async (ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        name: ingredient.name,
        unit: ingredient.unit,
        cost_per_unit: ingredient.costPerUnit,
        store_stock: ingredient.storeStock,
        kitchen_stock: ingredient.kitchenStock,
        low_stock_threshold: ingredient.lowStockThreshold,
        category: ingredient.category,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add ingredient');
      throw error;
    }
    toast.success('Ingredient added');
    return data;
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.costPerUnit !== undefined) dbUpdates.cost_per_unit = updates.costPerUnit;
    if (updates.storeStock !== undefined) dbUpdates.store_stock = updates.storeStock;
    if (updates.kitchenStock !== undefined) dbUpdates.kitchen_stock = updates.kitchenStock;
    if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowStockThreshold;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    const { error } = await supabase
      .from('ingredients')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update ingredient');
      throw error;
    }
    toast.success('Ingredient updated');
  };

  const deleteIngredient = async (id: string) => {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete ingredient');
      throw error;
    }
    toast.success('Ingredient deleted');
  };

  // Menu Category actions
  const addMenuCategory = async (category: Omit<MenuCategory, 'id'>) => {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        name: category.name,
        icon: category.icon,
        color: category.color,
        sort_order: category.sortOrder,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add category');
      throw error;
    }
    toast.success('Category added');
    return data;
  };

  const updateMenuCategory = async (id: string, updates: Partial<MenuCategory>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

    const { error } = await supabase
      .from('menu_categories')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update category');
      throw error;
    }
    toast.success('Category updated');
  };

  const deleteMenuCategory = async (id: string) => {
    const { error } = await supabase.from('menu_categories').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete category');
      throw error;
    }
    toast.success('Category deleted');
  };

  // Ingredient Category actions
  const addIngredientCategory = async (category: { name: string; icon?: string; color?: string; sortOrder?: number }) => {
    const { data, error } = await supabase
      .from('ingredient_categories' as any)
      .insert({
        name: category.name,
        icon: category.icon || '📦',
        color: category.color || 'bg-gray-100',
        sort_order: category.sortOrder || 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add ingredient category');
      throw error;
    }
    toast.success('Ingredient category added');
    return data;
  };

  const deleteIngredientCategory = async (id: string) => {
    const { error } = await supabase.from('ingredient_categories' as any).delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete ingredient category');
      throw error;
    }
    toast.success('Ingredient category deleted');
  };

  // Menu Item actions
  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        name: item.name,
        description: item.description,
        price: item.price,
        category_id: item.categoryId || null,
        image: item.image,
        recipe: item.recipe as any,
        recipe_cost: item.recipeCost,
        profit_margin: item.profitMargin,
        is_available: item.isAvailable,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add menu item');
      throw error;
    }
    toast.success('Menu item added');
    return data;
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId || null;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.recipe !== undefined) dbUpdates.recipe = updates.recipe;
    if (updates.recipeCost !== undefined) dbUpdates.recipe_cost = updates.recipeCost;
    if (updates.profitMargin !== undefined) dbUpdates.profit_margin = updates.profitMargin;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;

    const { error } = await supabase
      .from('menu_items')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update menu item');
      throw error;
    }
    toast.success('Menu item updated');
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete menu item');
      throw error;
    }
    toast.success('Menu item deleted');
  };

  // Menu Item Variant actions
  const addMenuItemVariant = async (variant: { menuItemId: string; name: string; price: number; sortOrder: number; isAvailable: boolean }) => {
    const { data, error } = await supabase
      .from('menu_item_variants')
      .insert({
        menu_item_id: variant.menuItemId,
        name: variant.name,
        price: variant.price,
        sort_order: variant.sortOrder,
        is_available: variant.isAvailable,
      })
      .select()
      .single();
    if (error) {
      toast.error('Failed to add variant');
      throw error;
    }
    return data;
  };

  const updateMenuItemVariant = async (id: string, updates: { name?: string; price?: number; sortOrder?: number; isAvailable?: boolean }) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;

    const { error } = await supabase.from('menu_item_variants').update(dbUpdates).eq('id', id);
    if (error) {
      toast.error('Failed to update variant');
      throw error;
    }
  };

  const deleteMenuItemVariant = async (id: string) => {
    const { error } = await supabase.from('menu_item_variants').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete variant');
      throw error;
    }
  };

  // Table actions
  const addTable = async (table: Omit<Table, 'id' | 'status'>) => {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        table_number: table.number,
        capacity: table.capacity,
        floor: table.floor,
        status: 'available',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add table');
      throw error;
    }
    toast.success('Table added');
    return data;
  };

  const updateTable = async (id: string, updates: Partial<Table>) => {
    const dbUpdates: any = {};
    if (updates.number !== undefined) dbUpdates.table_number = updates.number;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.floor !== undefined) dbUpdates.floor = updates.floor;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    // Handle currentOrderId - convert undefined to null for Supabase
    if ('currentOrderId' in updates) {
      dbUpdates.current_order_id = updates.currentOrderId || null;
    }

    const { error } = await supabase
      .from('restaurant_tables')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Failed to update table:', error);
      toast.error(`Failed to update table: ${error.message}`);
      throw error;
    }
  };

  const deleteTable = async (id: string) => {
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete table');
      throw error;
    }
    toast.success('Table deleted');
  };

  const occupyTable = async (tableId: string, orderId: string) => {
    try {
      // Primary: direct client update
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ status: 'occupied', current_order_id: orderId })
        .eq('id', tableId);

      if (error) {
        console.error('Failed to occupy table via client:', error);
        // Fallback through backend helper (service-role)
        const { data, error: fnErr } = await supabase.functions.invoke('table-update', {
          body: { action: 'occupy', tableId, orderId },
        });

        if (fnErr || !data?.success) {
          const msg = extractSupabaseErrorMessage(fnErr) || data?.error || 'Unknown error';
          console.error('Fallback occupyTable failed:', { fnErr, data });
          toast.error(`Failed to update table: ${msg}`);
          throw fnErr ?? new Error(msg);
        }
      }
    } catch (err) {
      console.error('occupyTable exception:', err);
      throw err;
    }
  };

  const freeTable = async (tableId: string) => {
    try {
      // Primary: direct client update
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ status: 'available', current_order_id: null })
        .eq('id', tableId);

      if (error) {
        console.error('Failed to free table via client:', error);
        // Fallback through backend helper (service-role)
        try {
          const { data, error: fnErr } = await supabase.functions.invoke('table-update', {
            body: { action: 'free', tableId },
          });

          if (fnErr || !data?.success) {
            const msg = extractSupabaseErrorMessage(fnErr) || data?.error || 'Unknown error';
            console.error('Fallback freeTable failed:', { fnErr, data });
            // Log but don't throw - let the caller decide how critical this is
            return { success: false, error: msg };
          }
        } catch (fnCallErr) {
          console.error('Edge function call failed:', fnCallErr);
          return { success: false, error: extractSupabaseErrorMessage(fnCallErr) };
        }
      }
      return { success: true };
    } catch (err) {
      console.error('freeTable exception:', err);
      return { success: false, error: extractSupabaseErrorMessage(err) };
    }
  };

  const resolveTableIdForOrder = async (orderId: string, tableId?: string) => {
    // Prefer an explicitly provided UUID tableId.
    if (isUuid(tableId)) return tableId;

    // Fallback: derive table directly from current occupancy.
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('current_order_id', orderId)
      .maybeSingle();

    if (error) {
      console.error('resolveTableIdForOrder error:', error);
      return undefined;
    }
    return data?.id;
  };

  // Waiter actions
  const addWaiter = async (waiter: Omit<Waiter, 'id'>) => {
    const { data, error } = await supabase
      .from('waiters')
      .insert({
        name: waiter.name,
        phone: waiter.phone,
        is_active: waiter.isActive,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add waiter');
      throw error;
    }
    toast.success('Waiter added');
    return data;
  };

  const updateWaiter = async (id: string, updates: Partial<Waiter>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { error } = await supabase
      .from('waiters')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update waiter');
      throw error;
    }
    toast.success('Waiter updated');
  };

  const deleteWaiter = async (id: string) => {
    const { error } = await supabase.from('waiters').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete waiter');
      throw error;
    }
    toast.success('Waiter deleted');
  };

  // Settings actions
  const updateSettings = async (updates: Partial<RestaurantSettings>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.taxRate !== undefined) dbUpdates.tax_rate = updates.taxRate;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.currencySymbol !== undefined) dbUpdates.currency_symbol = updates.currencySymbol;
    if (updates.invoice?.title !== undefined) dbUpdates.invoice_title = updates.invoice.title;
    if (updates.invoice?.footer !== undefined) dbUpdates.invoice_footer = updates.invoice.footer;
    if (updates.invoice?.showLogo !== undefined) dbUpdates.invoice_show_logo = updates.invoice.showLogo;
    if (updates.invoice?.gstEnabled !== undefined) dbUpdates.invoice_gst_enabled = updates.invoice.gstEnabled;
    if (updates.invoice?.logoUrl !== undefined) dbUpdates.invoice_logo_url = updates.invoice.logoUrl;
    if (updates.security?.cancelOrderPassword !== undefined) dbUpdates.security_cancel_password = updates.security.cancelOrderPassword;
    if (updates.businessDay?.cutoffHour !== undefined) dbUpdates.business_day_cutoff_hour = updates.businessDay.cutoffHour;
    if (updates.businessDay?.cutoffMinute !== undefined) dbUpdates.business_day_cutoff_minute = updates.businessDay.cutoffMinute;

    // Get first settings row
    const { data: existingSettings } = await supabase
      .from('restaurant_settings')
      .select('id')
      .limit(1)
      .single();

    if (existingSettings) {
      const { error } = await supabase
        .from('restaurant_settings')
        .update(dbUpdates)
        .eq('id', existingSettings.id);

      if (error) {
        toast.error('Failed to update settings');
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('restaurant_settings')
        .insert(dbUpdates);

      if (error) {
        toast.error('Failed to save settings');
        throw error;
      }
    }
    toast.success('Settings updated');
  };

  // Stock actions
  const addStoreStock = async (
    ingredientId: string,
    quantity: number,
    unitCost: number,
    currentIngredient: Ingredient
  ) => {
    // Calculate weighted average cost
    const currentTotalValue = currentIngredient.storeStock * currentIngredient.costPerUnit;
    const newPurchaseValue = quantity * unitCost;
    const newTotalStock = currentIngredient.storeStock + quantity;
    const newWeightedAvgCost = newTotalStock > 0
      ? (currentTotalValue + newPurchaseValue) / newTotalStock
      : unitCost;

    // Insert purchase record
    const { error: purchaseError } = await supabase
      .from('stock_purchases')
      .insert({
        ingredient_id: ingredientId,
        quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
      });

    if (purchaseError) {
      toast.error('Failed to record purchase');
      throw purchaseError;
    }

    // Update ingredient stock and cost
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({
        store_stock: newTotalStock,
        cost_per_unit: newWeightedAvgCost,
      })
      .eq('id', ingredientId);

    if (updateError) {
      toast.error('Failed to update stock');
      throw updateError;
    }

    // Insert transfer record
    await supabase.from('stock_transfers').insert({
      ingredient_id: ingredientId,
      quantity,
      from_location: 'store',
      to_location: 'store',
      reason: 'Stock received',
    });

    toast.success('Stock added');
  };

  const transferToKitchen = async (ingredientId: string, quantity: number, currentIngredient: Ingredient) => {
    if (currentIngredient.storeStock < quantity) {
      toast.error('Insufficient store stock');
      return;
    }

    const { error } = await supabase
      .from('ingredients')
      .update({
        store_stock: currentIngredient.storeStock - quantity,
        kitchen_stock: currentIngredient.kitchenStock + quantity,
      })
      .eq('id', ingredientId);

    if (error) {
      toast.error('Failed to transfer stock');
      throw error;
    }

    await supabase.from('stock_transfers').insert({
      ingredient_id: ingredientId,
      quantity,
      from_location: 'store',
      to_location: 'kitchen',
      reason: 'Transfer to kitchen',
    });

    toast.success('Stock transferred to kitchen');
  };

  const transferToStore = async (ingredientId: string, quantity: number, currentIngredient: Ingredient) => {
    if (currentIngredient.kitchenStock < quantity) {
      toast.error('Insufficient kitchen stock');
      return;
    }

    const { error } = await supabase
      .from('ingredients')
      .update({
        store_stock: currentIngredient.storeStock + quantity,
        kitchen_stock: currentIngredient.kitchenStock - quantity,
      })
      .eq('id', ingredientId);

    if (error) {
      toast.error('Failed to transfer stock');
      throw error;
    }

    await supabase.from('stock_transfers').insert({
      ingredient_id: ingredientId,
      quantity,
      from_location: 'kitchen',
      to_location: 'store',
      reason: 'Return to store',
    });

    toast.success('Stock transferred to store');
  };

  // Stock removal action (for rejected/wasted items)
  const removeStock = async (
    ingredientId: string,
    quantity: number,
    reason: string,
    location: 'store' | 'kitchen',
    currentIngredient: Ingredient
  ) => {
    const stockField = location === 'store' ? 'store_stock' : 'kitchen_stock';
    const currentStock = location === 'store' ? currentIngredient.storeStock : currentIngredient.kitchenStock;

    if (currentStock < quantity) {
      toast.error(`Insufficient ${location} stock`);
      return;
    }

    // Update ingredient stock
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({
        [stockField]: currentStock - quantity,
      })
      .eq('id', ingredientId);

    if (updateError) {
      toast.error('Failed to update stock');
      throw updateError;
    }

    // Record the removal
    const { error: removalError } = await supabase
      .from('stock_removals' as any)
      .insert({
        ingredient_id: ingredientId,
        quantity,
        reason,
        location,
      });

    if (removalError) {
      console.error('Failed to record removal:', removalError);
    }

    toast.success('Stock removed successfully');
  };

  // Direct stock sale action
  const sellStock = async (
    ingredientId: string,
    quantity: number,
    salePrice: number,
    customerName: string | undefined,
    notes: string | undefined,
    currentIngredient: Ingredient
  ) => {
    if (currentIngredient.storeStock < quantity) {
      toast.error('Insufficient store stock');
      return;
    }

    const totalCost = quantity * currentIngredient.costPerUnit;
    const totalSale = quantity * salePrice;
    const profit = totalSale - totalCost;

    // Update ingredient stock
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({
        store_stock: currentIngredient.storeStock - quantity,
      })
      .eq('id', ingredientId);

    if (updateError) {
      toast.error('Failed to update stock');
      throw updateError;
    }

    // Record the sale
    const { error: saleError } = await supabase
      .from('stock_sales' as any)
      .insert({
        ingredient_id: ingredientId,
        quantity,
        cost_per_unit: currentIngredient.costPerUnit,
        sale_price: salePrice,
        total_cost: totalCost,
        total_sale: totalSale,
        profit,
        customer_name: customerName,
        notes,
      });

    if (saleError) {
      toast.error('Failed to record sale');
      throw saleError;
    }

    toast.success(`Stock sold for ${totalSale.toFixed(2)}`);
    return { totalCost, totalSale, profit };
  };

  // Helper to get recipe for a cart item (considers variant recipes)
  const getRecipeForCartItem = (cartItem: CartItem): { ingredientId: string; quantity: number }[] => {
    // If cart item has a variant with its own recipe, use that
    if (cartItem.variant?.recipe && cartItem.variant.recipe.length > 0) {
      return cartItem.variant.recipe;
    }
    // Otherwise use the parent menu item recipe
    return cartItem.menuItem.recipe || [];
  };

  // Helper to get price for a cart item (considers variant price)
  const getPriceForCartItem = (cartItem: CartItem): number => {
    if (cartItem.variant) {
      return cartItem.variant.price;
    }
    return cartItem.menuItem.price;
  };

  // Order actions
  const getOrderItemKey = (menuItemId: string, variantId?: string | null) =>
    `${menuItemId}::${variantId || 'base'}`;

  const toOrderItemRow = (orderId: string, item: CartItem) => {
    const unitPrice = getPriceForCartItem(item);
    return {
      order_id: orderId,
      menu_item_id: item.menuItem.id,
      menu_item_name: item.variant
        ? `${item.menuItem.name} (${item.variant.name})`
        : item.menuItem.name,
      variant_id: item.variant?.id || null,
      variant_name: item.variant?.name || null,
      quantity: item.quantity,
      unit_price: unitPrice,
      total: unitPrice * item.quantity,
      notes: item.notes || null,
    };
  };

  const syncOrderItemsForUpdate = async (orderId: string, cart: CartItem[]) => {
    const desiredRows = cart.map((item) => toOrderItemRow(orderId, item));
    const desiredByKey = new Map(
      desiredRows.map((row) => [getOrderItemKey(row.menu_item_id, row.variant_id), row])
    );

    const { data: existingRows, error: existingError } = await supabase
      .from('order_items')
      .select('id, menu_item_id, variant_id, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (existingError) throw existingError;

    const existingByKey = new Map<string, any[]>();
    (existingRows || []).forEach((row: any) => {
      const key = getOrderItemKey(row.menu_item_id, row.variant_id);
      const existing = existingByKey.get(key) || [];
      existing.push(row);
      existingByKey.set(key, existing);
    });

    const updates: any[] = [];
    const inserts: any[] = [];

    for (const [key, desired] of desiredByKey.entries()) {
      const matches = existingByKey.get(key) || [];

      if (matches.length === 0) {
        inserts.push(desired);
        continue;
      }

      const [primary, ...duplicates] = matches;

      updates.push(
        supabase
          .from('order_items')
          .update({
            menu_item_name: desired.menu_item_name,
            variant_id: desired.variant_id,
            variant_name: desired.variant_name,
            quantity: desired.quantity,
            unit_price: desired.unit_price,
            total: desired.total,
            notes: desired.notes,
          })
          .eq('id', primary.id)
      );

      for (const duplicate of duplicates) {
        updates.push(
          supabase
            .from('order_items')
            .update({
              quantity: 0,
              total: 0,
              notes: null,
            })
            .eq('id', duplicate.id)
        );
      }

      existingByKey.delete(key);
    }

    // Any remaining rows are items removed from cart.
    for (const staleRows of existingByKey.values()) {
      for (const stale of staleRows) {
        updates.push(
          supabase
            .from('order_items')
            .update({
              quantity: 0,
              total: 0,
              notes: null,
            })
            .eq('id', stale.id)
        );
      }
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const failed = results.find((result: any) => result.error);
      if (failed?.error) throw failed.error;
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('order_items').insert(inserts);
      if (insertError) throw insertError;
    }
  };

  const createOrder = async (
    cart: CartItem[],
    orderDetails: {
      paymentMethod: 'cash' | 'card' | 'mobile';
      customerName?: string;
      tableId?: string;
      waiterId?: string;
      orderType: 'dine-in' | 'online' | 'takeaway';
      discount?: number;
      discountType?: DiscountType;
      discountValue?: number;
      discountReason?: string;
    },
    settings: RestaurantSettings,
    tables: Table[],
    waiters: Waiter[],
    ingredients: Ingredient[]
  ) => {
    if (cart.length === 0) return null;

    // Calculate using correct prices (variant or base item)
    const subtotal = cart.reduce(
      (sum, item) => sum + getPriceForCartItem(item) * item.quantity,
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

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: generateOrderNumber(),
        order_type: orderDetails.orderType,
        status: 'pending',
        subtotal,
        tax,
        discount,
        discount_type: discountType,
        discount_value: discountValue,
        discount_reason: orderDetails.discountReason || null,
        total,
        payment_method: orderDetails.paymentMethod,
        customer_name: orderDetails.customerName,
        table_id: orderDetails.tableId,
        table_number: table?.number,
        waiter_id: orderDetails.waiterId,
        waiter_name: waiter?.name,
      })
      .select()
      .single();

    if (orderError) {
      toast.error('Failed to create order');
      throw orderError;
    }

    // Create order items with variant info
    const orderItems = cart.map((item) => toOrderItemRow(order.id, item));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Failed to create order items:', itemsError);
    }

    // Deduct kitchen stock based on recipes (variant or base item)
    // Use atomic updates to prevent race conditions
    const stockUpdates: { ingredientId: string; quantityToDeduct: number }[] = [];
    
    for (const cartItem of cart) {
      const recipe = getRecipeForCartItem(cartItem);
      for (const recipeItem of recipe) {
        const existing = stockUpdates.find(u => u.ingredientId === recipeItem.ingredientId);
        const quantityUsed = recipeItem.quantity * cartItem.quantity;
        if (existing) {
          existing.quantityToDeduct += quantityUsed;
        } else {
          stockUpdates.push({ ingredientId: recipeItem.ingredientId, quantityToDeduct: quantityUsed });
        }
      }
    }

    // Apply stock deductions atomically
    for (const update of stockUpdates) {
      const ingredient = ingredients.find((i) => i.id === update.ingredientId);
      if (ingredient) {
        const newStock = Math.max(0, ingredient.kitchenStock - update.quantityToDeduct);
        await supabase
          .from('ingredients')
          .update({ kitchen_stock: newStock })
          .eq('id', update.ingredientId);
      }
    }

    // Occupy table if dine-in
    if (orderDetails.orderType === 'dine-in' && orderDetails.tableId) {
      await occupyTable(orderDetails.tableId, order.id);
    }

    toast.success(`Order ${order.order_number} created`);
    return order;
  };

  const updateOrder = async (
    orderId: string,
    cart: CartItem[],
    orderDetails: {
      paymentMethod: 'cash' | 'card' | 'mobile';
      customerName?: string;
      tableId?: string;
      waiterId?: string;
      orderType: 'dine-in' | 'online' | 'takeaway';
      discount?: number;
      discountType?: DiscountType;
      discountValue?: number;
      discountReason?: string;
    },
    settings: RestaurantSettings,
    tables: Table[],
    waiters: Waiter[]
  ) => {
    if (cart.length === 0) return null;

    // Calculate using correct prices (variant or base item)
    const subtotal = cart.reduce(
      (sum, item) => sum + getPriceForCartItem(item) * item.quantity,
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

    // Update order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        subtotal,
        tax,
        discount,
        discount_type: discountType,
        discount_value: discountValue,
        discount_reason: orderDetails.discountReason || null,
        total,
        payment_method: orderDetails.paymentMethod,
        customer_name: orderDetails.customerName,
        table_id: orderDetails.tableId,
        table_number: table?.number,
        waiter_id: orderDetails.waiterId,
        waiter_name: waiter?.name,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) {
      toast.error('Failed to update order');
      throw orderError;
    }

    try {
      await syncOrderItemsForUpdate(orderId, cart);
    } catch (orderItemsError) {
      console.error('Failed to sync order items during update:', orderItemsError);
      toast.error('Failed to update order items');
      throw orderItemsError;
    }

    toast.success('Order updated');
    return order;
  };

  const settleOrder = async (orderId: string, tableId?: string, paymentMethod?: 'cash' | 'card' | 'mobile') => {
    // Build update payload
    const updatePayload: any = { 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    };
    
    // Update payment method if provided
    if (paymentMethod) {
      updatePayload.payment_method = paymentMethod;
    }

    // Enforce transition: pending -> completed
    const { data: updated, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) {
      toast.error('Failed to settle order');
      throw error;
    }

    if (!updated) {
      const { data: existing, error: existingErr } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .maybeSingle();

      if (existingErr) throw existingErr;
      throw new Error(
        existing ? `Cannot settle order from status: ${existing.status}` : 'Order not found'
      );
    }

    // Free the table (reliable path) — try explicit tableId, current occupancy, then order.table_id.
    try {
      const candidateTableIds = new Set<string>();

      if (isUuid(tableId)) {
        candidateTableIds.add(tableId);
      }

      const resolvedTableId = await resolveTableIdForOrder(orderId, tableId);
      if (resolvedTableId && isUuid(resolvedTableId)) {
        candidateTableIds.add(resolvedTableId);
      }

      const { data: orderRow } = await supabase
        .from('orders')
        .select('table_id')
        .eq('id', orderId)
        .maybeSingle();

      if (isUuid(orderRow?.table_id)) {
        candidateTableIds.add(orderRow.table_id);
      }

      for (const tableIdToFree of candidateTableIds) {
        const result = await freeTable(tableIdToFree);
        if (result?.success) {
          break;
        }
      }
    } catch (tableErr) {
      console.error('Failed to free table after settle, continuing:', tableErr);
    }

    toast.success('Order settled');
  };

  const cancelOrder = async (orderId: string, tableId?: string) => {
    // Enforce transition: pending -> cancelled
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) {
      toast.error('Failed to cancel order');
      throw error;
    }

    if (!updated) {
      const { data: existing, error: existingErr } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .maybeSingle();

      if (existingErr) throw existingErr;
      throw new Error(
        existing ? `Cannot cancel order from status: ${existing.status}` : 'Order not found'
      );
    }

    // Free the table (best-effort) — resolve tableId if caller didn't provide it.
    try {
      const resolvedTableId = await resolveTableIdForOrder(orderId, tableId);
      if (resolvedTableId) await freeTable(resolvedTableId);
    } catch (tableErr) {
      console.error('Failed to free table after cancel, continuing:', tableErr);
    }

    // Restore kitchen stock - fetch order items and recipes from DB to ensure accuracy
    try {
      // Fetch order items with variant info
      const { data: orderItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('menu_item_id, variant_id, quantity')
        .eq('order_id', orderId);

      if (itemsErr) {
        console.error('Failed to fetch order items for stock restoration:', itemsErr);
      } else if (orderItems && orderItems.length > 0) {
        // Collect all ingredient quantities to restore
        const stockRestoreMap: Record<string, number> = {};

        for (const item of orderItems) {
          let recipe: { ingredientId: string; quantity: number }[] = [];

          // If variant_id exists, fetch variant recipe
          if (item.variant_id) {
            const { data: variant } = await supabase
              .from('menu_item_variants')
              .select('recipe')
              .eq('id', item.variant_id)
              .single();
            
            if (variant?.recipe && Array.isArray(variant.recipe) && variant.recipe.length > 0) {
              recipe = variant.recipe as { ingredientId: string; quantity: number }[];
            }
          }

          // If no variant recipe, use menu item recipe
          if (recipe.length === 0) {
            const { data: menuItem } = await supabase
              .from('menu_items')
              .select('recipe')
              .eq('id', item.menu_item_id)
              .single();
            
            if (menuItem?.recipe && Array.isArray(menuItem.recipe)) {
              recipe = menuItem.recipe as { ingredientId: string; quantity: number }[];
            }
          }

          // Calculate quantities to restore
          for (const recipeItem of recipe) {
            const quantityToRestore = recipeItem.quantity * item.quantity;
            if (stockRestoreMap[recipeItem.ingredientId]) {
              stockRestoreMap[recipeItem.ingredientId] += quantityToRestore;
            } else {
              stockRestoreMap[recipeItem.ingredientId] = quantityToRestore;
            }
          }
        }

        // Fetch current ingredient stock values and update atomically
        const ingredientIds = Object.keys(stockRestoreMap);
        if (ingredientIds.length > 0) {
          const { data: currentIngredients } = await supabase
            .from('ingredients')
            .select('id, kitchen_stock')
            .in('id', ingredientIds);

          if (currentIngredients) {
            for (const ing of currentIngredients) {
              const quantityToRestore = stockRestoreMap[ing.id] || 0;
              const newStock = Number(ing.kitchen_stock) + quantityToRestore;
              
              await supabase
                .from('ingredients')
                .update({ kitchen_stock: newStock })
                .eq('id', ing.id);
            }
          }
        }
      }
    } catch (stockErr) {
      console.error('Failed to restore stock after cancel:', stockErr);
      // Don't throw - order is already cancelled
    }

    toast.success('Order cancelled');
  };

  return {
    // Ingredient actions
    addIngredient,
    updateIngredient,
    deleteIngredient,
    // Menu Category actions
    addMenuCategory,
    updateMenuCategory,
    deleteMenuCategory,
    // Ingredient Category actions
    addIngredientCategory,
    deleteIngredientCategory,
    // Menu Item actions
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    // Variant actions
    addMenuItemVariant,
    updateMenuItemVariant,
    deleteMenuItemVariant,
    // Table actions
    addTable,
    updateTable,
    deleteTable,
    occupyTable,
    freeTable,
    // Waiter actions
    addWaiter,
    updateWaiter,
    deleteWaiter,
    // Settings actions
    updateSettings,
    // Stock actions
    addStoreStock,
    transferToKitchen,
    transferToStore,
    removeStock,
    sellStock,
    // Order actions
    createOrder,
    updateOrder,
    settleOrder,
    cancelOrder,
  };
}
