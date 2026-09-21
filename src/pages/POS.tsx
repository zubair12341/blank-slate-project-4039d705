import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  Printer,
  ChefHat,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Wifi,
  WifiOff,
  ArrowLeft,
  Receipt,
  Users,
  Percent,
  XCircle,
  ShoppingCart,
  CloudUpload,
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Order, DiscountType } from '@/types/restaurant';
import { playKitchenNotificationSound } from '@/hooks/usePrintWithImages';
import { createPrintJobId, sendLocalPrintJob } from '@/services/localPrintBridge';
import { supabase } from '@/integrations/supabase/client';

type OrderTypeSelection = 'dine-in' | 'takeaway' | 'online' | null;

export default function POS() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    menuItems,
    menuCategories,
    cart,
    tables,
    waiters,
    settings,
    currentEditingOrderId,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    completeOrder,
    updateOrder,
    loadOrderToCart,
    getOrderById,
    cancelOrder,
    settleOrder,
    itemLess,
  } = useRestaurant();

  const isMobile = useIsMobile();
  const { isOnline, pendingSyncCount } = useOnlineStatus();
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);

  const [orderType, setOrderType] = useState<OrderTypeSelection>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showKitchenInvoice, setShowKitchenInvoice] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelPasswordError, setCancelPasswordError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string | null }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [variantPickerItem, setVariantPickerItem] = useState<import('@/types/restaurant').MenuItem | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isPrintingKitchen, setIsPrintingKitchen] = useState(false);
  const [itemLessTarget, setItemLessTarget] = useState<{ id: string; name: string; max: number } | null>(null);
  const [itemLessQty, setItemLessQty] = useState(1);
  const [itemLessReason, setItemLessReason] = useState<'customer_changed_mind' | 'wrong_item_entered' | 'item_unavailable' | 'duplicate_entry' | 'kitchen_issue' | 'customer_complaint' | 'other'>('customer_changed_mind');
  const [itemLessDetails, setItemLessDetails] = useState('');
  const [itemLessDisposition, setItemLessDisposition] = useState<'not_prepared' | 'waste' | 'returned'>('not_prepared');
  const [isItemLessSaving, setIsItemLessSaving] = useState(false);
  const [itemLessPassword, setItemLessPassword] = useState('');
  const [itemLessPasswordError, setItemLessPasswordError] = useState('');

  const isEditingExistingOrder = !!currentEditingOrderId;

  useEffect(() => {
    void supabase.from('customers' as any).select('id,name,phone').order('name').then(({ data }) => {
      setCustomers((data || []) as any);
    });
  }, []);

  const persistCustomerForOrder = async (orderId: string) => {
    const name = customerName.trim();
    if (!name) {
      await supabase.from('orders').update({ customer_name: null, customer_id: null } as any).eq('id', orderId);
      setSelectedCustomerId(null);
      return null;
    }
    let customer = customers.find((entry) => entry.name.trim().toLowerCase() === name.toLowerCase());
    if (!customer) {
      const { data, error } = await supabase.from('customers' as any).insert({ name }).select('id,name,phone').single();
      if (error) throw error;
      customer = data as any;
      setCustomers((prev) => [...prev, customer!].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setSelectedCustomerId(customer.id);
    const { error } = await supabase.from('orders').update({ customer_name: customer.name, customer_id: customer.id } as any).eq('id', orderId);
    if (error) throw error;
    return customer;
  };

  // Queue Edit links carry the order id. Hydrate the order directly instead of
  // making the cashier choose Takeaway/Online again.
  useEffect(() => {
    const state = location.state as { editMode?: boolean; orderId?: string; orderType?: OrderTypeSelection } | null;
    if (!state?.editMode || !state.orderId) return;
    const result = loadOrderToCart(state.orderId);
    if (!result?.order) {
      toast.error('Order could not be loaded for editing. Refresh the queue and try again.');
      return;
    }
    const order = result.order;
    const nextType: OrderTypeSelection = state.orderType
      || (order.fulfillmentType === 'takeaway' ? 'takeaway'
        : order.orderChannel === 'online' || order.orderType === 'online' ? 'online'
        : 'dine-in');
    setOrderType(nextType);
    setSelectedTableId(order.tableId || null);
    setCustomerName(order.customerName || '');
    setSelectedWaiterId(result.waiterId || '');
    setDiscountType(order.discountType || 'fixed');
    setDiscountValue(order.discountValue || 0);
    setDiscountReason(order.discountReason || '');
    // Remove navigation state so refresh/back cannot replay the edit intent.
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, loadOrderToCart, navigate]);

  const normalizeSearchText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Filter menu items
  const filteredItems = menuItems.filter((item) => {
    const categoryName = menuCategories.find((category) => category.id === item.categoryId)?.name || '';
    const variantNames = (item.variants || []).map((variant) => variant.name).join(' ');
    const haystack = normalizeSearchText(`${item.name} ${item.description || ''} ${categoryName} ${variantNames}`);
    const normalizedQuery = normalizeSearchText(searchQuery);

    const matchesSearch = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && item.isAvailable;
  });

  // Calculate totals - use variant price if available
  const gstEnabled = settings.invoice?.gstEnabled ?? true;
  const subtotal = cart.reduce((sum, item) => {
    const price = item.variant ? item.variant.price : item.menuItem.price;
    return sum + price * item.quantity;
  }, 0);
  const tax = gstEnabled ? subtotal * (settings.taxRate / 100) : 0;
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discountValue) / 100 
    : discountValue;
  const total = subtotal + tax - discountAmount;

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  // Existing-order cart contains the already-saved items plus anything the
  // cashier has just added. Keep the delta explicit so Save only sends/prints
  // the new kitchen items and never reprints the original KOT.
  const getPendingAdditions = () => {
    if (!currentEditingOrderId) return [...cart];
    const existing = getOrderById(currentEditingOrderId);
    if (!existing) return [];
    const previous = new Map<string, number>();
    existing.items.forEach((item) => {
      const key = `${item.menuItemId}::${item.variantId || 'base'}`;
      previous.set(key, (previous.get(key) || 0) + Number(item.finalQuantity ?? item.quantity));
    });
    return cart.flatMap((item) => {
      const key = `${item.menuItem.id}::${item.variant?.id || 'base'}`;
      const added = item.quantity - (previous.get(key) || 0);
      return added > 0 ? [{ ...item, quantity: added }] : [];
    });
  };

  const pendingAdditions = isEditingExistingOrder ? getPendingAdditions() : cart;

  const handleTableSelect = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    // A table selection starts a completely isolated POS session. Never allow a
    // previous table/order cart to leak into the newly selected table.
    clearCart();
    setSelectedTableId(tableId);
    setSelectedWaiterId('');
    setCustomerName('');
    setSelectedCustomerId(null);
    setDiscountType('fixed');
    setDiscountValue(0);
    setDiscountReason('');

    if (table.status === 'occupied' && table.currentOrderId) {
      // Load only the order explicitly linked to this occupied table.
      const result = loadOrderToCart(table.currentOrderId);
      if (result?.waiterId) {
        setSelectedWaiterId(result.waiterId);
      }
      if (result?.order) {
        setCustomerName(result.order.customerName || '');
        setSelectedCustomerId(null);
        setDiscountType(result.order.discountType || 'fixed');
        setDiscountValue(result.order.discountValue || 0);
        setDiscountReason(result.order.discountReason || '');
      }
      toast.info('Editing existing order for Table ' + table.number);
    }
  };

  const handleBackToOrderType = () => {
    clearCart();
    setOrderType(null);
    setSelectedTableId(null);
    setCustomerName('');
    setSelectedWaiterId('');
    setDiscountType('fixed');
    setDiscountValue(0);
    setDiscountReason('');
  };

  const handleCheckout = () => {
    // Legacy review/checkout screen intentionally disabled. POS orders are one-click.
    void handleCompleteOrder();
  };

  const handleCancelOrder = async () => {
    const correctPassword = settings.security?.cancelOrderPassword || '12345';
    
    if (cancelPassword !== correctPassword) {
      setCancelPasswordError('Incorrect password');
      return;
    }
    
    if (currentEditingOrderId) {
      // Cancel existing order - cancelOrder will also free the table
      await cancelOrder(currentEditingOrderId);
      toast.success('Order cancelled');
    } else {
      // Just clear the cart for new orders
      toast.success('Order cancelled');
    }
    
    setShowCancelConfirm(false);
    setCancelPassword('');
    setCancelPasswordError('');
    handleBackToOrderType();
  };
  
  const handleOpenCancelDialog = () => {
    setCancelPassword('');
    setCancelPasswordError('');
    setShowCancelConfirm(true);
  };

  const handleCompleteOrder = async () => {
    if (isPlacingOrder) return;
    if (cart.length === 0) {
      toast.error('Cart is empty. Please add items before placing order.');
      return;
    }
    
    if (orderType === 'dine-in') {
      if (!selectedTableId) {
        toast.error('Please select a table before placing the order.');
        return;
      }
      const selectedTable = tables.find((table) => table.id === selectedTableId);
      if (!selectedTable) {
        toast.error('Selected table no longer exists. Please select the table again.');
        return;
      }
      if (isEditingExistingOrder) {
        const editingOrder = currentEditingOrderId ? getOrderById(currentEditingOrderId) : undefined;
        if (!editingOrder || editingOrder.tableId !== selectedTableId || selectedTable.currentOrderId !== currentEditingOrderId) {
          toast.error('Table/order mismatch detected. Reopen the table before making changes.');
          handleBackToOrderType();
          return;
        }
      } else if (selectedTable.status === 'occupied' || selectedTable.currentOrderId) {
        toast.error(`Table ${selectedTable.number} already has an open order. Reopen that table instead.`);
        return;
      }
    }

    const additionsToPrint = isEditingExistingOrder ? getPendingAdditions() : [...cart];
    if (isEditingExistingOrder && additionsToPrint.length === 0) {
      toast.error('Add at least one new item before saving. Use Pay & Close to finish the order.');
      return;
    }

    setIsPlacingOrder(true);
    let order: Order | null = null;

    try {
      if (isEditingExistingOrder && currentEditingOrderId) {
        order = await updateOrder(currentEditingOrderId, {
          paymentMethod,
          customerName: customerName || undefined,
          tableId: selectedTableId || undefined,
          waiterId: selectedWaiterId || undefined,
          orderType: orderType!,
          discount: discountAmount,
          discountType,
          discountValue,
          discountReason: discountValue > 0 ? discountReason : undefined,
        });
        if (order) {
          toast.success('New items added to the existing order!');
        }
      } else {
        order = await completeOrder({
          paymentMethod,
          customerName: customerName || undefined,
          tableId: selectedTableId || undefined,
          waiterId: selectedWaiterId || undefined,
          orderType: orderType!,
          discount: discountAmount,
          discountType,
          discountValue,
          discountReason: discountValue > 0 ? discountReason : undefined,
        });
        if (order) {
          toast.success(`Order ${order.orderNumber} placed!`, {
            description: `Total: ${formatPrice(order.total)}`,
          });
        }
      }
    } catch (error) {
      console.error('handleCompleteOrder error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process order. Please try again.');
      setIsPlacingOrder(false);
      return;
    }

    setIsPlacingOrder(false);
    if (order) {
      const sourceSnapshot = [...cart];
      setShowCheckout(false);

      try {
        await persistCustomerForOrder(order.id);
      } catch (customerError) {
        console.error('Customer save failed:', customerError);
        toast.error('Order saved, but customer could not be stored.');
      }

      // Send the KOT immediately. The order is already safely stored, so a printer
      // problem must never hold up the cashier or create a duplicate order.
      try {
        const printSnapshot = isEditingExistingOrder ? additionsToPrint : sourceSnapshot;
        if (printSnapshot.length > 0) await sendKitchenGroupsSilently(printSnapshot);
      } catch (printError) {
        toast.error('Order saved, but KOT did not print. Check Settings → Printing and use Kitchen to retry.');
      }

      setCustomerName('');
      setDiscountType('fixed');
      setDiscountValue(0);
      setDiscountReason('');
      handleBackToOrderType();
    } else {
      toast.error('Failed to complete order. Please try again.');
    }
  };

  const handleSettleAndClose = async () => {
    if (!completedOrder || isSettling) return;
    setIsSettling(true);
    try {
      await settleOrder(completedOrder.id, paymentMethod, completedOrder.tableId);
      try {
        await printCustomerInvoice('PAID');
      } catch {
        toast.error('Payment completed, but invoice did not print. You can reprint it from Orders.');
      }
      toast.success('Payment completed and table closed.');
      setCompletedOrder(null);
      handleBackToOrderType();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to settle order.');
    } finally {
      setIsSettling(false);
    }
  };

  const handlePrintKitchenInvoice = () => {
    if (!isOnline) {
      toast.error('Printing and order changes require an online connection.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    void printKitchenInvoice();
  };

  type KitchenSlipItem = { name: string; quantity: number; notes?: string };

  const resolveKitchenSection = (categoryId?: string) => {
    const categoryName = menuCategories.find((c) => c.id === categoryId)?.name?.trim() || 'Other';
    const normalizedCategoryName = categoryName.toLowerCase();

    if (/(fast\s*food|burger|broast|shawarma|roll|sandwich|fries|pizza|pasta)/.test(normalizedCategoryName)) {
      return { sectionKey: 'fast-food', sectionName: 'Fast Food Section' };
    }

    if (/(karahi|karhaie|karhai)/.test(normalizedCategoryName)) {
      return { sectionKey: 'karahi', sectionName: 'Karahi Section' };
    }

    return {
      sectionKey: categoryId || `section-${categoryName.toLowerCase().replace(/\s+/g, '-')}`,
      sectionName: categoryName,
    };
  };

  const getKitchenSlipGroups = (sourceCart = cart) => {
    const groupedBySection = new Map<string, { sectionName: string; items: KitchenSlipItem[] }>();

    sourceCart.forEach((item) => {
      const { sectionKey, sectionName } = resolveKitchenSection(item.menuItem.categoryId);
      const displayName = item.variant
        ? `${item.menuItem.name} (${item.variant.name})`
        : item.menuItem.name;

      if (!groupedBySection.has(sectionKey)) {
        groupedBySection.set(sectionKey, { sectionName, items: [] });
      }

      groupedBySection.get(sectionKey)!.items.push({
        name: displayName,
        quantity: item.quantity,
        notes: item.notes,
      });
    });

    return Array.from(groupedBySection.entries()).map(([sectionKey, group]) => ({
      sectionKey,
      sectionName: group.sectionName,
      items: group.items,
    }));
  };

  const buildCategoryKitchenSlipHtml = (
    sectionName: string,
    items: KitchenSlipItem[],
    meta: { waiterName?: string; tableName?: string; customerName?: string; orderTypeName?: string }
  ) => {
    const itemsHtml = items.map(item => `
      <div class="item">
        <span class="item-name">${item.name}</span>
        <span class="item-qty">x${item.quantity}</span>
        ${item.notes ? `<div class="notes">Note: ${item.notes}</div>` : ''}
      </div>
    `).join('');

    return `<html>
      <head>
        <title>Kitchen Order - ${sectionName}</title>
        <style>
          html, body { margin: 0 !important; padding: 0 !important; width: 72mm; }
          body { font-family: 'Courier New', monospace; width: 72mm; max-width: 72mm; font-weight: 700; color: #000; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding: 0 0 4px 0; margin: 0 0 4px 0; }
          .header h1 { font-size: 16px; margin: 0; font-weight: 900; }
          .header p { font-size: 11px; margin: 2px 0 0 0; font-weight: 700; }
          .section-name { text-align: center; font-size: 14px; font-weight: 900; margin: 6px 0; padding: 4px; background: #000; color: #fff; }
          .info { margin: 4px 0; font-size: 12px; }
          .info-row { display: flex; justify-content: space-between; margin: 2px 0; font-weight: 700; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 4px 0; }
          .item { text-align: center; margin: 8px 0; padding-bottom: 6px; border-bottom: 1px dotted #999; }
          .item:last-child { border-bottom: none; padding-bottom: 0; }
          .item-name { font-size: 16px; font-weight: 900; display: block; }
          .item-qty { font-size: 22px; font-weight: 900; display: block; margin-top: 4px; }
          .notes { font-size: 12px; color: #000; margin-top: 4px; font-weight: 700; text-align: center; }
          .footer { text-align: center; font-size: 11px; margin-top: 4px; font-weight: 700; }
          @media print {
            @page { size: 72mm auto !important; margin: 0 !important; padding: 0 !important; }
            html, body { margin: 0 !important; padding: 0 !important; width: 72mm !important; }
            body > *:first-child { margin-top: 0 !important; padding-top: 0 !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍳 KITCHEN ORDER</h1>
          <p>${settings.name}</p>
          <p>${new Date().toLocaleString('en-PK')}</p>
        </div>
        <div class="section-name">📌 ${sectionName.toUpperCase()}</div>
        <div class="info">
          <div class="info-row"><strong>Order Type:</strong> <span>${meta.orderTypeName}</span></div>
          ${meta.tableName ? `<div class="info-row"><strong>Table:</strong> <span>${meta.tableName}</span></div>` : ''}
          ${meta.waiterName ? `<div class="info-row"><strong>Waiter:</strong> <span>${meta.waiterName}</span></div>` : ''}
          ${meta.customerName ? `<div class="info-row"><strong>Customer:</strong> <span>${meta.customerName}</span></div>` : ''}
        </div>
        <div class="items">
          ${itemsHtml}
        </div>
        <div class="footer">
          <p>*** KITCHEN COPY ***</p>
        </div>
      </body>
    </html>`;
  };

  const buildKitchenSlipText = (
    sectionName: string,
    items: KitchenSlipItem[],
    meta: { waiterName?: string; tableName?: string; customerName?: string; orderTypeName?: string }
  ) => [
    'ARABIC SHINWARI RESTAURANT',
    '*** KITCHEN ORDER ***',
    sectionName.toUpperCase(),
    '--------------------------------',
    `Type: ${meta.orderTypeName || '-'}`,
    meta.tableName ? `Table: ${meta.tableName}` : '',
    meta.waiterName ? `Waiter: ${meta.waiterName}` : '',
    meta.customerName ? `Customer: ${meta.customerName}` : '',
    '--------------------------------',
    ...items.flatMap((item) => [
      `${item.quantity} x ${item.name}`,
      item.notes ? `  NOTE: ${item.notes}` : '',
    ]),
    '--------------------------------',
    new Date().toLocaleString('en-PK'),
    '',
    '',
  ].filter(Boolean).join('\n');

  const sendKitchenGroupsSilently = async (sourceCart = cart) => {
    const waiter = waiters.find((w) => w.id === selectedWaiterId);
    const table = tables.find((t) => t.id === selectedTableId);
    const meta = {
      orderTypeName: orderType?.toUpperCase() || '',
      tableName: table ? `#${table.number}` : '',
      waiterName: waiter?.name || '',
      customerName: customerName || '',
    };
    const groupedSections = getKitchenSlipGroups(sourceCart);
    if (groupedSections.length === 0) return;

    playKitchenNotificationSound();
    for (const group of groupedSections) {
      await sendLocalPrintJob({
        jobId: createPrintJobId(),
        type: 'KOT',
        content: buildKitchenSlipText(group.sectionName, group.items, meta),
      });
    }
  };

  const printKitchenInvoice = async () => {
    if (isPrintingKitchen) return;
    setIsPrintingKitchen(true);
    try {
      await sendKitchenGroupsSilently(cart);
      toast.success('Kitchen order sent silently to the thermal printer.');
    } catch (error) {
      toast.error(error instanceof Error
        ? `Silent print failed: ${error.message}. Check Settings → Printing.`
        : 'Silent print failed. Check Settings → Printing.');
    } finally {
      setIsPrintingKitchen(false);
    }
  };

  const printCustomerInvoice = async (billStatus: 'UNPAID' | 'PAID' = 'UNPAID') => {
    if (!completedOrder) return;
    const lines = [
      settings.invoice?.title || settings.name,
      settings.address,
      `Tel: ${settings.phone}`,
      '================================',
      `Order: ${completedOrder.orderNumber}`,
      `Status: ${billStatus}`,
      new Date(completedOrder.createdAt).toLocaleString('en-PK'),
      `Type: ${completedOrder.orderType.toUpperCase()}`,
      completedOrder.tableNumber ? `Table: #${completedOrder.tableNumber}` : '',
      completedOrder.waiterName ? `Waiter: ${completedOrder.waiterName}` : '',
      completedOrder.customerName ? `Customer: ${completedOrder.customerName}` : '',
      '--------------------------------',
      ...completedOrder.items.map((item) =>
        `${item.quantity}x ${item.menuItemName}  ${settings.currencySymbol} ${item.total.toLocaleString()}`
      ),
      '--------------------------------',
      `Subtotal: ${settings.currencySymbol} ${completedOrder.subtotal.toLocaleString()}`,
      gstEnabled ? `GST: ${settings.currencySymbol} ${completedOrder.tax.toLocaleString()}` : '',
      completedOrder.discount > 0 ? `Discount: -${settings.currencySymbol} ${completedOrder.discount.toLocaleString()}` : '',
      `TOTAL: ${settings.currencySymbol} ${completedOrder.total.toLocaleString()}`,
      billStatus === 'PAID' ? `Payment: ${paymentMethod.toUpperCase()}` : 'Payment: UNPAID',
      '================================',
      settings.invoice?.footer || 'Thank you for dining with us!',
      '',
      '',
    ].filter(Boolean);

    try {
      await sendLocalPrintJob({
        jobId: createPrintJobId(),
        type: 'CUSTOMER_RECEIPT',
        content: lines.join('\n'),
      });
      toast.success(`${billStatus === 'PAID' ? 'Paid invoice' : 'Unpaid bill'} printed silently.`);
    } catch (error) {
      toast.error(error instanceof Error
        ? `Silent print failed: ${error.message}. Start/check the Local Print Bridge in Settings → Printing.`
        : 'Silent print failed. Check the Local Print Bridge.');
    }
  };

  const renderProductVisual = (item: import('@/types/restaurant').MenuItem) => (
    <div className="relative h-[92px] w-full overflow-hidden rounded-t-md bg-muted/30">
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className={cn(
          'absolute inset-0 items-center justify-center text-4xl',
          item.image ? 'hidden' : 'flex'
        )}
      >
        {menuCategories.find((category) => category.id === item.categoryId)?.icon || '🍽️'}
      </div>
    </div>
  );

  const cartContent = (
    <>
      {/* Cart Header */}
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditingExistingOrder ? 'Edit Order' : 'Current Order'}
          </h2>
          <div className="flex gap-2">
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenCancelDialog}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{cart.length} items</p>
        {isEditingExistingOrder && (
          <p className="mt-1 text-xs font-medium text-primary">
            Add products from the left, then use “Save & Print New Items”. Existing items are not reprinted.
          </p>
        )}
        <div className="relative mt-2">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Customer name"
            placeholder="Customer name (optional)"
            list="pos-customer-list"
            value={customerName}
            onChange={(e) => {
              const value = e.target.value;
              setCustomerName(value);
              const match = customers.find((entry) => entry.name.toLowerCase() === value.trim().toLowerCase());
              setSelectedCustomerId(match?.id || null);
            }}
            onBlur={() => { if (currentEditingOrderId) void persistCustomerForOrder(currentEditingOrderId).catch(() => toast.error('Customer could not be saved.')); }}
            className="h-9 pl-9"
          />
          <datalist id="pos-customer-list">
            {customers.map((customer) => <option key={customer.id} value={customer.name}>{customer.phone || ''}</option>)}
          </datalist>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No items in cart</p>
            <p className="text-sm text-muted-foreground">Select items from the menu</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {cart.map((item) => {
              const cartKey = item.variant ? `${item.menuItem.id}:${item.variant.id}` : item.menuItem.id;
              const displayName = item.variant 
                ? `${item.menuItem.name} (${item.variant.name})`
                : item.menuItem.name;
              const displayPrice = item.variant ? item.variant.price : item.menuItem.price;
              
              return (
                <div key={cartKey} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[13px] leading-4 truncate">{displayName}</h4>
                    <p className="text-xs text-muted-foreground">{formatPrice(displayPrice)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        if (isEditingExistingOrder) {
                          const order = currentEditingOrderId ? getOrderById(currentEditingOrderId) : undefined;
                          const row = order?.items.find((oi) => oi.menuItemId === item.menuItem.id && (oi.variantId || '') === (item.variant?.id || '') && Number(oi.finalQuantity ?? oi.quantity) > 0);
                          if (row?.id) {
                            setItemLessTarget({ id: row.id, name: displayName, max: Number(row.finalQuantity ?? row.quantity) });
                            setItemLessQty(1);
                          } else {
                            toast.error('Saved item row not found. Refresh the order.');
                          }
                        } else {
                          updateCartItemQuantity(item.menuItem.id, item.quantity - 1, item.variant?.id);
                        }
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateCartItemQuantity(item.menuItem.id, item.quantity + 1, item.variant?.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (isEditingExistingOrder) {
                          const order = currentEditingOrderId ? getOrderById(currentEditingOrderId) : undefined;
                          const row = order?.items.find((oi) => oi.menuItemId === item.menuItem.id && (oi.variantId || '') === (item.variant?.id || '') && Number(oi.finalQuantity ?? oi.quantity) > 0);
                          if (row?.id) {
                            setItemLessTarget({ id: row.id, name: displayName, max: Number(row.finalQuantity ?? row.quantity) });
                            setItemLessQty(Number(row.finalQuantity ?? row.quantity));
                          } else toast.error('Saved item row not found. Refresh the order.');
                        } else removeFromCart(item.menuItem.id, item.variant?.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      <div className="shrink-0 border-t border-border px-3 py-2 space-y-1.5">
        <div className="space-y-1.5">
          <div>
            <Button
              type="button"
              variant={discountAmount > 0 ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 w-full justify-between px-3 text-xs"
              onClick={() => setShowDiscountPanel((open) => !open)}
            >
              <span className="flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Discount{discountAmount > 0 ? ` · -${formatPrice(discountAmount)}` : ''}</span>
              <span>{showDiscountPanel ? 'Hide' : 'Add'}</span>
            </Button>
            {showDiscountPanel && (
              <div className="mt-2 rounded-md border bg-muted/20 p-2 space-y-2">
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Rs. Amount</SelectItem>
                      <SelectItem value="percentage">Percent %</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="h-8 text-xs" type="number" min={0} max={discountType === 'percentage' ? 100 : undefined}
                    value={discountValue || ''} placeholder={discountType === 'percentage' ? '0-100' : 'Amount'}
                    onChange={(e) => setDiscountValue(Math.max(0, discountType === 'percentage' ? Math.min(100, Number(e.target.value) || 0) : Number(e.target.value) || 0))} />
                </div>
                <Input className="h-8 text-xs" value={discountReason} placeholder="Discount reason"
                  onChange={(e) => setDiscountReason(e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {gstEnabled && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST ({settings.taxRate}%)</span>
              <span>{formatPrice(tax)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount {discountType === 'percentage' && `(${discountValue}%)`}</span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-border pt-1.5">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <Button
            variant="outline"
            className="w-full h-8 px-2 text-xs"
            onClick={handlePrintKitchenInvoice}
            disabled={cart.length === 0}
          >
            <ChefHat className="h-4 w-4 mr-2" />
            Kitchen
          </Button>
          {isEditingExistingOrder && currentEditingOrderId && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={async () => {
                  const existing = getOrderById(currentEditingOrderId);
                  if (!existing) {
                    toast.error('Order details are not available yet.');
                    return;
                  }
                  try { await persistCustomerForOrder(currentEditingOrderId); } catch { toast.error('Customer could not be saved.'); return; }
                  const lines = [
                    settings.invoice?.title || settings.name,
                    settings.address,
                    `Tel: ${settings.phone}`,
                    '================================',
                    `Order: ${existing.orderNumber}`,
                    'Status: UNPAID',
                    `Type: ${existing.orderType.toUpperCase()}`,
                    existing.tableNumber ? `Table: #${existing.tableNumber}` : '',
                    existing.waiterName ? `Waiter: ${existing.waiterName}` : '',
                    '--------------------------------',
                    ...existing.items.map((item) => `${item.quantity}x ${item.menuItemName}  ${settings.currencySymbol} ${item.total.toLocaleString()}`),
                    '--------------------------------',
                    `TOTAL: ${settings.currencySymbol} ${existing.total.toLocaleString()}`,
                    'Payment: UNPAID',
                    '================================',
                    settings.invoice?.footer || 'Thank you for dining with us!',
                    '', '',
                  ].filter(Boolean);
                  try {
                    await sendLocalPrintJob({ jobId: createPrintJobId(), type: 'CUSTOMER_RECEIPT', content: lines.join('\n') });
                    toast.success('Unpaid bill printed silently.');
                  } catch (error) {
                    toast.warning('Bill remains UNPAID. Local printer is unavailable; check Settings → Printing.');
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Unpaid Bill
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-8 px-2 text-xs"
                onClick={() => {
                  const existing = getOrderById(currentEditingOrderId);
                  if (existing) setCompletedOrder(existing);
                  else toast.error('Order details are not available yet.');
                }}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Pay & Close
              </Button>
            </>
          )}
          <Button className="w-full col-span-3 h-9 text-sm font-semibold" onClick={handleCompleteOrder} disabled={!isOnline || isPlacingOrder || (!isEditingExistingOrder && cart.length === 0) || (isEditingExistingOrder && pendingAdditions.length === 0)}>
            {isPlacingOrder ? 'Saving...' : isEditingExistingOrder ? 'Save & Print New Items' : 'Place Order'}
          </Button>
        </div>
      </div>
    </>
  );



  // POS entry flow: never expose menu/cart before an order type (and table for dine-in) is selected.
  if (!orderType) {
    return (
      <div className="h-[calc(100vh-5rem)] animate-fade-in p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold mb-2">New Order</h1>
          <p className="text-muted-foreground mb-6">Choose how the customer is ordering.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button className="h-28 text-lg flex-col gap-2" onClick={() => setOrderType('dine-in')}>
              <UtensilsCrossed className="h-7 w-7" /> Dine-In
            </Button>
            <Button variant="outline" className="h-28 text-lg flex-col gap-2" onClick={() => setOrderType('takeaway')}>
              <ShoppingBag className="h-7 w-7" /> Takeaway
            </Button>
            <Button variant="outline" className="h-28 text-lg flex-col gap-2" onClick={() => setOrderType('online')}>
              <Wifi className="h-7 w-7" /> Online
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (orderType === 'dine-in' && !selectedTableId) {
    return (
      <div className="h-[calc(100vh-5rem)] animate-fade-in p-4 sm:p-6 overflow-y-auto">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setOrderType(null)}><ArrowLeft className="h-5 w-5" /></Button>
            <div><h1 className="text-2xl font-bold">Select Table</h1><p className="text-muted-foreground">Available and occupied tables are shown below.</p></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((table) => (
              <button key={table.id} onClick={() => handleTableSelect(table.id)}
                className={cn('rounded-xl border p-5 text-left transition hover:border-primary hover:shadow-sm',
                  table.status === 'occupied' ? 'border-orange-300 bg-orange-50' : 'bg-card')}>
                <div className="text-xl font-bold">Table {table.number}</div>
                <div className={cn('mt-2 text-sm font-medium', table.status === 'occupied' ? 'text-orange-700' : 'text-green-700')}>
                  {table.status === 'occupied' ? 'Occupied — Open Order' : 'Available'}
                </div>
              </button>
            ))}
          </div>
          {tables.length === 0 && <div className="rounded-lg border p-8 text-center text-muted-foreground">No restaurant tables are configured.</div>}
        </div>
      </div>
    );
  }

  // Main POS Screen
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] animate-fade-in relative">
      {/* Offline Banner */}
      {(!isOnline || pendingSyncCount > 0) && (
        <div className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shrink-0 ${
          !isOnline
            ? 'bg-red-500/10 text-red-700 border-b border-red-500/20'
            : 'bg-amber-500/10 text-amber-700 border-b border-amber-500/20'
        }`}>
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Offline Mode — cart is preserved, but sending/changing orders is disabled until reconnected</span>
            </>
          ) : (
            <>
              <CloudUpload className="h-4 w-4" />
              <span>Syncing...</span>
            </>
          )}
          {pendingSyncCount > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
              !isOnline ? 'bg-red-500/20' : 'bg-amber-500/20'
            }`}>
              {pendingSyncCount} pending
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 gap-3 overflow-hidden min-h-0">
      {/* Left Panel - Menu */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with Back Button */}
        <div className="mb-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToOrderType}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  orderType === 'dine-in' && 'bg-orange-100 text-orange-700',
                  orderType === 'delivery' && 'bg-blue-100 text-blue-700',
                  orderType === 'takeaway' && 'bg-green-100 text-green-700'
                )}
              >
                {orderType === 'dine-in' && `Dine-In - Table ${tables.find((t) => t.id === selectedTableId)?.number}`}
                {orderType === 'delivery' && 'Delivery Order'}
                {orderType === 'takeaway' && 'Take-Away'}
              </span>
              {isEditingExistingOrder && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                  Editing Order
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fast order controls */}
        {orderType === 'dine-in' && (
          <div className="mb-2 flex items-center gap-2">
            <Select value={selectedWaiterId} onValueChange={setSelectedWaiterId}>
              <SelectTrigger className="w-full sm:w-64">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select Waiter" />
              </SelectTrigger>
              <SelectContent>
                {waiters
                  .filter((w) => w.isActive)
                  .map((waiter) => (
                    <SelectItem key={waiter.id} value={waiter.id}>
                      {waiter.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Grid + Items */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          {/* When searching, show flat results */}
          {searchQuery ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
              {filteredItems.map((item) => {
                const cartItem = cart.find((c) => c.menuItem.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.variants && item.variants.length > 0) {
                        setVariantPickerItem(item);
                      } else {
                        addToCart(item);
                      }
                    }}
                    className={cn('group relative overflow-hidden rounded-md border bg-card text-left shadow-sm transition hover:border-primary hover:shadow-md', cartItem && 'ring-2 ring-primary')}
                  >
                    {cartItem && (
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {cartItem.quantity}
                      </span>
                    )}
                    {renderProductVisual(item)}
                    <h4 className="px-2 pt-2 font-semibold text-[13px] leading-4 line-clamp-2 min-h-10">{item.name}</h4>
                    {item.variants && item.variants.length > 0 ? (
                      <p className="px-2 pb-2 text-xs font-semibold text-primary">
                        {formatPrice(Math.min(...item.variants.map(v => v.price)))} - {formatPrice(Math.max(...item.variants.map(v => v.price)))}
                      </p>
                    ) : (
                      <p className="px-2 pb-2 text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : !selectedCategory ? (
            <div className="space-y-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                <Button size="sm" className="shrink-0">All Products</Button>
                {menuCategories.map((category) => (
                  <Button key={category.id} size="sm" variant="outline" className="shrink-0"
                    onClick={() => setSelectedCategory(category.id)}>
                    <span className="mr-1">{category.icon}</span>{category.name}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                {filteredItems.map((item) => {
                  const cartItem = cart.find((entry) => entry.menuItem.id === item.id);
                  return (
                    <button key={item.id}
                      onClick={() => item.variants?.length ? setVariantPickerItem(item) : addToCart(item)}
                      className={cn('group relative overflow-hidden rounded-md border bg-card text-left shadow-sm transition hover:border-primary hover:shadow-md', cartItem && 'ring-2 ring-primary')}>
                      {cartItem && <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{cartItem.quantity}</span>}
                      {renderProductVisual(item)}
                      <h4 className="px-2 pt-2 font-semibold text-[13px] leading-4 line-clamp-2 min-h-10">{item.name}</h4>
                      <p className="px-2 pb-2 text-sm font-bold text-primary">
                        {item.variants?.length ? `${formatPrice(Math.min(...item.variants.map((variant) => variant.price)))}+` : formatPrice(item.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Items inside selected category */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Categories
                </Button>
                <span className="text-lg font-semibold flex items-center gap-2">
                  <span>{menuCategories.find((c) => c.id === selectedCategory)?.icon}</span>
                  {menuCategories.find((c) => c.id === selectedCategory)?.name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                {filteredItems.map((item) => {
                  const cartItem = cart.find((c) => c.menuItem.id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.variants && item.variants.length > 0) {
                          setVariantPickerItem(item);
                        } else {
                          addToCart(item);
                        }
                      }}
                      className={cn('group relative overflow-hidden rounded-md border bg-card text-left shadow-sm transition hover:border-primary hover:shadow-md', cartItem && 'ring-2 ring-primary')}
                    >
                      {cartItem && (
                        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {cartItem.quantity}
                        </span>
                      )}
                      {renderProductVisual(item)}
                      <h4 className="px-2 pt-2 font-semibold text-[13px] leading-4 line-clamp-2 min-h-10">{item.name}</h4>
                      {item.variants && item.variants.length > 0 ? (
                        <p className="px-2 pb-2 text-xs font-semibold text-primary">
                          {formatPrice(Math.min(...item.variants.map(v => v.price)))} - {formatPrice(Math.max(...item.variants.map(v => v.price)))}
                        </p>
                      ) : (
                        <p className="px-2 pb-2 text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart (desktop only) */}
      <div className="hidden lg:flex w-[42%] min-w-[430px] max-w-[570px] shrink-0 flex-col rounded-lg border border-border bg-card overflow-hidden min-h-0">
        {cartContent}
      </div>

      {/* Mobile Floating Cart Button */}
      <button
        onClick={() => setShowMobileCart(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg lg:hidden animate-pulse-glow"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="font-semibold">{cart.length}</span>
        {cart.length > 0 && (
          <span className="text-sm font-medium">· {formatPrice(total)}</span>
        )}
      </button>

      {/* Mobile Cart Sheet */}
      <Sheet open={showMobileCart} onOpenChange={setShowMobileCart}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Cart</SheetTitle>
          </SheetHeader>
          {cartContent}
        </SheetContent>
      </Sheet>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditingExistingOrder ? 'Add Items to Order' : 'Review & Send Order'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Customer Info */}
            <div className="space-y-2">
              <Label htmlFor="customer">Customer Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customer"
                  placeholder="Optional"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Discount */}
            <div className="space-y-3">
              <Label>Discount</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={discountType === 'fixed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDiscountType('fixed')}
                  className="flex-1"
                >
                  <Banknote className="h-4 w-4 mr-1" />
                  Fixed
                </Button>
                <Button
                  type="button"
                  variant={discountType === 'percentage' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDiscountType('percentage')}
                  className="flex-1"
                >
                  <Percent className="h-4 w-4 mr-1" />
                  Percentage
                </Button>
              </div>
              <div className="relative">
                {discountType === 'fixed' ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {settings.currencySymbol}
                  </span>
                ) : (
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : undefined}
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="pl-10"
                />
              </div>
              {discountAmount > 0 && (
                <>
                  <p className="text-sm text-green-600">
                    Discount amount: -{formatPrice(discountAmount)}
                  </p>
                  <Textarea
                    placeholder="Reason for discount (e.g., loyal customer, complaint resolution, promotion)"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="mt-2"
                    rows={2}
                  />
                </>
              )}
            </div>

            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Payment is collected later during settlement. Sending the order now creates the kitchen batch and keeps the bill unpaid.
            </div>

            {/* Order Summary */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {gstEnabled && (
                <div className="flex justify-between text-sm">
                  <span>GST ({settings.taxRate}%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount {discountType === 'percentage' && `(${discountValue}%)`}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-border pt-2">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteOrder} disabled={isPlacingOrder}>
              {isPlacingOrder ? (
                <><span className="animate-spin mr-2">⏳</span> Processing...</>
              ) : (
                <>{isEditingExistingOrder ? 'Add New Items' : 'Send Order'} ({formatPrice(total)})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog with Password */}
      <Dialog open={showCancelConfirm} onOpenChange={(open) => {
        setShowCancelConfirm(open);
        if (!open) {
          setCancelPassword('');
          setCancelPasswordError('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              {isEditingExistingOrder 
                ? 'This will cancel the existing order and free the table.' 
                : 'This will cancel the current order and return to order type selection.'
              }
            </p>
            <div className="space-y-2">
              <Label htmlFor="cancel-password">Enter 5-digit password to confirm</Label>
              <Input
                id="cancel-password"
                type="password"
                maxLength={5}
                value={cancelPassword}
                onChange={(e) => {
                  setCancelPassword(e.target.value);
                  setCancelPasswordError('');
                }}
                placeholder="Enter password"
                className={cancelPasswordError ? 'border-destructive' : ''}
              />
              {cancelPasswordError && (
                <p className="text-sm text-destructive">{cancelPasswordError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              Keep Order
            </Button>
            <Button variant="destructive" onClick={handleCancelOrder}>
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Completed Dialog */}
      <Dialog open={!!completedOrder} onOpenChange={() => setCompletedOrder(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isEditingExistingOrder ? 'Payment & Close Table' : 'Order'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedOrder?.orderNumber}</p>
              <p className="text-lg font-semibold text-primary">
                {formatPrice(completedOrder?.total || 0)}
              </p>
            </div>
            {completedOrder?.tableNumber && (
              <p className="text-muted-foreground">Table #{completedOrder.tableNumber}</p>
            )}
            {completedOrder?.waiterName && (
              <p className="text-muted-foreground">Waiter: {completedOrder.waiterName}</p>
            )}
            {completedOrder?.orderType !== 'dine-in' && (
              <p className="text-sm text-muted-foreground bg-yellow-50 p-2 rounded-lg">
                This order is unpaid. Choose the payment method below to settle and print the PAID customer invoice.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash' | 'card' | 'mobile')} className="grid grid-cols-3 gap-2">
              <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="cash" /> Cash
              </Label>
              <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="card" /> Card
              </Label>
              <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="mobile" /> Mobile
              </Label>
            </RadioGroup>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => void printCustomerInvoice('UNPAID')} variant="outline" className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Print Unpaid Bill
            </Button>
            {completedOrder ? (
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCompletedOrder(null);
                    handleBackToOrderType();
                  }}
                  className="flex-1"
                >
                  New Order
                </Button>
                <Button variant="default" onClick={handleSettleAndClose} disabled={isSettling} className="flex-1">
                  {isSettling ? 'Processing...' : 'Process Payment & Close'}
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Less — saved order quantities are never silently edited/deleted. */}
      <Dialog open={!!itemLessTarget} onOpenChange={(open) => !open && setItemLessTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Item Less</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="font-semibold">{itemLessTarget?.name}</p>
              <p className="text-sm text-muted-foreground">Available quantity: {itemLessTarget?.max}</p>
            </div>
            <div className="space-y-2">
              <Label>Quantity Less</Label>
              <Input type="number" min={1} max={itemLessTarget?.max || 1} value={itemLessQty}
                onChange={(e) => setItemLessQty(Math.max(1, Math.min(Number(e.target.value) || 1, itemLessTarget?.max || 1)))} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={itemLessReason} onValueChange={(v) => setItemLessReason(v as typeof itemLessReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_changed_mind">Customer Changed Mind</SelectItem>
                  <SelectItem value="wrong_item_entered">Wrong Item Entered</SelectItem>
                  <SelectItem value="item_unavailable">Item Unavailable</SelectItem>
                  <SelectItem value="duplicate_entry">Duplicate Entry</SelectItem>
                  <SelectItem value="kitchen_issue">Kitchen Issue</SelectItem>
                  <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stock Treatment</Label>
              <Select value={itemLessDisposition} onValueChange={(v) => setItemLessDisposition(v as typeof itemLessDisposition)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_prepared">Not Prepared — Restore Stock</SelectItem>
                  <SelectItem value="waste">Prepared / Waste — Do Not Restore</SelectItem>
                  <SelectItem value="returned">Returned — Restore Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Authorization Password</Label>
              <Input type="password" inputMode="numeric" maxLength={5} value={itemLessPassword} onChange={(e) => { setItemLessPassword(e.target.value); setItemLessPasswordError(''); }} placeholder="Enter 5-digit password" className={itemLessPasswordError ? 'border-destructive' : ''} />
              {itemLessPasswordError && <p className="text-sm text-destructive">{itemLessPasswordError}</p>}
            </div>
            <div className="space-y-2">
              <Label>Details {itemLessReason === 'other' ? '(required)' : '(optional)'}</Label>
              <Textarea value={itemLessDetails} onChange={(e) => setItemLessDetails(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemLessTarget(null)}>Cancel</Button>
            <Button disabled={isItemLessSaving || (itemLessReason === 'other' && !itemLessDetails.trim())} onClick={async () => {
              if (!itemLessTarget) return;
              const correctPassword = settings.security?.cancelOrderPassword || '12345';
              if (itemLessPassword !== correctPassword) {
                setItemLessPasswordError('Incorrect password');
                return;
              }
              setIsItemLessSaving(true);
              try {
                await itemLess(itemLessTarget.id, itemLessQty, itemLessReason, itemLessDetails || undefined, itemLessDisposition);
                toast.success('Item Less recorded in the audit trail.');
                setItemLessTarget(null);
                setItemLessDetails('');
                setItemLessPassword('');
                setItemLessPasswordError('');
                // RestaurantContext already updates the cart/order optimistically.
                // Do not reload from the previous render here: that stale snapshot
                // was what made removed items reappear until a manual refresh.
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to record Item Less');
              } finally { setIsItemLessSaving(false); }
            }}>{isItemLessSaving ? 'Saving...' : 'Confirm Item Less'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Dialog */}
      <Dialog open={!!variantPickerItem} onOpenChange={(open) => !open && setVariantPickerItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{variantPickerItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {variantPickerItem?.variants?.filter(v => v.isAvailable).map((variant) => (
              <button
                key={variant.id}
                onClick={() => {
                  addToCart(variantPickerItem!, variant);
                  setVariantPickerItem(null);
                }}
                className="flex items-center justify-between p-4 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <span className="font-medium">{variant.name}</span>
                <span className="font-bold text-primary">{formatPrice(variant.price)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}