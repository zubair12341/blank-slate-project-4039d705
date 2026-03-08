import { useState } from 'react';
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
  Wifi,
  ArrowLeft,
  Receipt,
  Users,
  Percent,
  XCircle,
  ShoppingCart,
} from 'lucide-react';
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
import { printWithImages, playKitchenNotificationSound } from '@/hooks/usePrintWithImages';

type OrderTypeSelection = 'dine-in' | 'online' | 'takeaway' | null;

export default function POS() {
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
    cancelOrder,
    settleOrder,
  } = useRestaurant();

  const isMobile = useIsMobile();
  const [showMobileCart, setShowMobileCart] = useState(false);

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
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [variantPickerItem, setVariantPickerItem] = useState<import('@/types/restaurant').MenuItem | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isPrintingKitchen, setIsPrintingKitchen] = useState(false);

  const isEditingExistingOrder = !!currentEditingOrderId;

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

  const handleTableSelect = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    setSelectedTableId(tableId);

    if (table.status === 'occupied' && table.currentOrderId) {
      // Load existing order for editing and pre-select waiter
      const result = loadOrderToCart(table.currentOrderId);
      if (result?.waiterId) {
        setSelectedWaiterId(result.waiterId);
      }
      if (result?.order) {
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
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (orderType === 'dine-in' && !selectedWaiterId) {
      toast.error('Please select a waiter');
      return;
    }
    setShowCheckout(true);
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
          toast.success('Order updated successfully!');
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
      toast.error('Failed to process order. Please try again.');
      setIsPlacingOrder(false);
      return;
    }

    setIsPlacingOrder(false);
    if (order) {
      setCompletedOrder(order);
      setShowCheckout(false);
      setCustomerName('');
      setDiscountType('fixed');
      setDiscountValue(0);
      setDiscountReason('');
    } else {
      toast.error('Failed to complete order. Please try again.');
    }
  };

  const handleSettleAndClose = async () => {
    if (!completedOrder || isSettling) return;
    setIsSettling(true);
    try {
      await settleOrder(completedOrder.id, undefined, completedOrder.tableId);
      toast.success('Order settled and table freed!');
      setCompletedOrder(null);
      handleBackToOrderType();
    } catch (error) {
      toast.error('Failed to settle order.');
    } finally {
      setIsSettling(false);
    }
  };

  const handlePrintKitchenInvoice = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowKitchenInvoice(true);
  };

  const printKitchenInvoice = () => {
    if (isPrintingKitchen) return;
    setIsPrintingKitchen(true);
    const waiter = waiters.find((w) => w.id === selectedWaiterId);
    const table = tables.find((t) => t.id === selectedTableId);

    const kitchenHtml = `
      <html>
        <head>
          <title>Kitchen Order</title>
          <style>
            html, body { margin: 0 !important; padding: 0 !important; width: 72mm; }
            body { font-family: 'Courier New', monospace; width: 72mm; max-width: 72mm; font-weight: 700; color: #000; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            .receipt { width: 72mm; margin: 0; padding: 0; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding: 0 0 4px 0; margin: 0 0 4px 0; }
            .header h1 { font-size: 16px; margin: 0; font-weight: 900; }
            .header p { font-size: 11px; margin: 2px 0 0 0; font-weight: 700; }
            .info { margin: 4px 0; font-size: 12px; }
            .info-row { display: flex; justify-content: space-between; margin: 2px 0; font-weight: 700; }
            .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0; }
            .item { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
            .item-name { font-weight: 900; }
            .item-qty { font-size: 16px; font-weight: 900; }
            .notes { font-size: 11px; color: #000; margin-left: 8px; font-weight: 700; }
            .footer { text-align: center; font-size: 11px; margin-top: 4px; font-weight: 700; }
            @media print {
              @page { margin: 0 !important; }
              html, body, .receipt { margin: 0 !important; padding: 0 !important; width: 72mm !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🍳 KITCHEN ORDER</h1>
            <p>${settings.name}</p>
            <p>${new Date().toLocaleString('en-PK')}</p>
          </div>
          <div class="info">
            <div class="info-row"><strong>Order Type:</strong> <span>${orderType?.toUpperCase()}</span></div>
            ${table ? `<div class="info-row"><strong>Table:</strong> <span>#${table.number}</span></div>` : ''}
            ${waiter ? `<div class="info-row"><strong>Waiter:</strong> <span>${waiter.name}</span></div>` : ''}
            ${customerName ? `<div class="info-row"><strong>Customer:</strong> <span>${customerName}</span></div>` : ''}
          </div>
          <div class="items">
            ${cart
              .map(
                (item) => {
                  const displayName = item.variant 
                    ? `${item.menuItem.name} (${item.variant.name})`
                    : item.menuItem.name;
                  return `
              <div class="item">
                <span class="item-name">${displayName}</span>
                <span class="item-qty">x${item.quantity}</span>
              </div>
              ${item.notes ? `<div class="notes">Note: ${item.notes}</div>` : ''}
            `;
                }
              )
              .join('')}
          </div>
          <div class="footer">
            <p>*** KITCHEN COPY ***</p>
          </div>
        </body>
      </html>
    `;

    // Play loud kitchen notification sound
    playKitchenNotificationSound();

    // Print using the utility function
    printWithImages(kitchenHtml, () => {
      setIsPrintingKitchen(false);
      setShowKitchenInvoice(false);
      toast.success('Kitchen invoice printed!');
    });
  };

  const printCustomerInvoice = () => {
    if (!completedOrder) return;

    const logoHtml = settings.invoice?.showLogo && settings.invoice?.logoUrl 
      ? `<div style="text-align: center; margin: 0; padding: 0; line-height: 0;"><img src="${settings.invoice.logoUrl}" alt="Logo" style="display: block; margin: 0 auto; max-height: 60px; object-fit: contain;" /></div>` 
      : '';

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - ${completedOrder.orderNumber}</title>
          <style>
            html, body { margin: 0 !important; padding: 0 !important; width: 72mm; }
            body { font-family: 'Courier New', monospace; width: 72mm; max-width: 72mm; margin: 0; padding: 0; font-weight: 700; color: #000; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding: 0 0 4px 0; margin: 0 0 4px 0; }
            .header h1 { font-size: 15px; margin: 0; font-weight: 900; }
            .header p { font-size: 11px; margin: 2px 0 0 0; font-weight: 700; }
            .info { margin: 4px 0; font-size: 11px; }
            .info-row { display: flex; justify-content: space-between; margin: 2px 0; }
            .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0; }
            .item { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; font-weight: 700; }
            .totals { margin: 4px 0; font-size: 11px; }
            .total-row { display: flex; justify-content: space-between; margin: 2px 0; font-weight: 700; }
            .grand-total { font-size: 14px; font-weight: 900; border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; }
            .footer { text-align: center; font-size: 10px; margin-top: 4px; font-weight: 700; }
            @media print {
              @page { margin: 0 !important; }
              html, body { margin: 0 !important; padding: 0 !important; width: 72mm !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <h1>${settings.invoice?.title || settings.name}</h1>
            <p>${settings.address}</p>
            <p>Tel: ${settings.phone}</p>
            <p>================================</p>
            <p>Order: ${completedOrder.orderNumber}</p>
            <p>${new Date(completedOrder.createdAt).toLocaleString('en-PK')}</p>
          </div>
          <div class="info">
            <div class="info-row"><span>Type:</span> <span>${completedOrder.orderType.toUpperCase()}</span></div>
            ${completedOrder.tableNumber ? `<div class="info-row"><span>Table:</span> <span>#${completedOrder.tableNumber}</span></div>` : ''}
            ${completedOrder.waiterName ? `<div class="info-row"><span>Waiter:</span> <span>${completedOrder.waiterName}</span></div>` : ''}
            ${completedOrder.customerName ? `<div class="info-row"><span>Customer:</span> <span>${completedOrder.customerName}</span></div>` : ''}
          </div>
          <div class="items">
            ${completedOrder.items
              .map(
                (item) => `
              <div class="item">
                <span>${item.quantity}x ${item.menuItemName}</span>
                <span>${settings.currencySymbol} ${item.total.toLocaleString()}</span>
              </div>
            `
              )
              .join('')}
          </div>
          <div class="totals">
            <div class="total-row"><span>Subtotal:</span> <span>${settings.currencySymbol} ${completedOrder.subtotal.toLocaleString()}</span></div>
            ${gstEnabled ? `<div class="total-row"><span>GST (${settings.taxRate}%):</span> <span>${settings.currencySymbol} ${completedOrder.tax.toLocaleString()}</span></div>` : ''}
            ${completedOrder.discount > 0 ? `<div class="total-row"><span>Discount${completedOrder.discountType === 'percentage' ? ` (${completedOrder.discountValue}%)` : ''}:</span> <span>-${settings.currencySymbol} ${completedOrder.discount.toLocaleString()}</span></div>` : ''}
            <div class="total-row grand-total"><span>TOTAL:</span> <span>${settings.currencySymbol} ${completedOrder.total.toLocaleString()}</span></div>
          </div>
          <div class="footer">
            <p>Payment: ${completedOrder.paymentMethod.toUpperCase()}</p>
            <p>================================</p>
            <p>${settings.invoice?.footer || 'Thank you for dining with us!'}</p>
            <p>شکریہ - Shukriya!</p>
          </div>
        </body>
      </html>
    `;

    // Use printWithImages to wait for logo to load before printing
    printWithImages(invoiceHtml);
  };

  // Order Type Selection Screen
  if (!orderType) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center animate-fade-in">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Select Order Type</h1>
            <p className="text-muted-foreground mt-2">Choose how you want to process this order</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <button
              onClick={() => setOrderType('dine-in')}
              className="flex flex-col items-center justify-center gap-3 p-6 sm:gap-4 sm:p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="p-4 rounded-full bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <UtensilsCrossed className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Dine-In</h3>
                <p className="text-sm text-muted-foreground">Customers eating at restaurant</p>
              </div>
            </button>
            <button
              onClick={() => setOrderType('online')}
              className="flex flex-col items-center justify-center gap-3 p-6 sm:gap-4 sm:p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="p-4 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Wifi className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Online</h3>
                <p className="text-sm text-muted-foreground">Online delivery orders</p>
              </div>
            </button>
            <button
              onClick={() => setOrderType('takeaway')}
              className="flex flex-col items-center justify-center gap-3 p-6 sm:gap-4 sm:p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="p-4 rounded-full bg-green-100 text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Take-Away</h3>
                <p className="text-sm text-muted-foreground">Customer picks up order</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Table Selection for Dine-In - grouped by floor
  if (orderType === 'dine-in' && !selectedTableId) {
    const floors = [
      { id: 'ground', name: 'Ground Floor', icon: '🏠' },
      { id: 'first', name: 'First Floor', icon: '🏢' },
      { id: 'family', name: 'Family Hall', icon: '👨‍👩‍👧‍👦' },
    ] as const;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToOrderType}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Select Table</h1>
            <p className="text-muted-foreground">Green = Available, Red = Occupied</p>
          </div>
        </div>

        {floors.map((floor) => {
          const floorTables = tables.filter((t) => t.floor === floor.id);
          if (floorTables.length === 0) return null;

          return (
            <div key={floor.id} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>{floor.icon}</span>
                {floor.name}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {floorTables.sort((a, b) => a.number - b.number).map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleTableSelect(table.id)}
                    className={cn(
                      'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all',
                      table.status === 'available'
                        ? 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100'
                        : 'bg-red-50 border-red-500 text-red-700 hover:bg-red-100'
                    )}
                  >
                    <span className="text-xl font-bold">{table.number}</span>
                    <span className="text-xs mt-1">{table.capacity} seats</span>
                    <span className="text-xs font-medium mt-1">
                      {table.status === 'available' ? 'Available' : 'Occupied'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Cart content - reused in desktop sidebar and mobile sheet
  const cartContent = (
    <>
      {/* Cart Header */}
      <div className="border-b border-border p-4">
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
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No items in cart</p>
            <p className="text-sm text-muted-foreground">Select items from the menu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => {
              const cartKey = item.variant ? `${item.menuItem.id}:${item.variant.id}` : item.menuItem.id;
              const displayName = item.variant 
                ? `${item.menuItem.name} (${item.variant.name})`
                : item.menuItem.name;
              const displayPrice = item.variant ? item.variant.price : item.menuItem.price;
              
              return (
                <div key={cartKey} className="cart-item">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{displayName}</h4>
                    <p className="text-sm text-muted-foreground">{formatPrice(displayPrice)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCartItemQuantity(item.menuItem.id, item.quantity - 1, item.variant?.id)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCartItemQuantity(item.menuItem.id, item.quantity + 1, item.variant?.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFromCart(item.menuItem.id, item.variant?.id)}
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
      <div className="border-t border-border p-4 space-y-4">
        <div className="space-y-2">
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
          <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handlePrintKitchenInvoice}
            disabled={cart.length === 0}
          >
            <ChefHat className="h-4 w-4 mr-2" />
            Kitchen
          </Button>
          <Button className="flex-1" onClick={handleCheckout} disabled={cart.length === 0}>
            {isEditingExistingOrder ? 'Update Order' : 'Checkout'}
          </Button>
        </div>
      </div>
    </>
  );

  // Main POS Screen
  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 lg:gap-6 animate-fade-in relative">
      {/* Left Panel - Menu */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with Back Button */}
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToOrderType}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  orderType === 'dine-in' && 'bg-orange-100 text-orange-700',
                  orderType === 'online' && 'bg-blue-100 text-blue-700',
                  orderType === 'takeaway' && 'bg-green-100 text-green-700'
                )}
              >
                {orderType === 'dine-in' && `Dine-In - Table ${tables.find((t) => t.id === selectedTableId)?.number}`}
                {orderType === 'online' && 'Online Order'}
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

        {/* Waiter Selection for Dine-In */}
        {orderType === 'dine-in' && (
          <div className="mb-4">
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
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {/* When searching, show flat results */}
          {searchQuery ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                    className={cn('pos-grid-item', cartItem && 'selected')}
                  >
                    {cartItem && (
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {cartItem.quantity}
                      </span>
                    )}
                    <div className="text-2xl mb-2">
                      {menuCategories.find((c) => c.id === item.categoryId)?.icon || '🍽️'}
                    </div>
                    <h4 className="font-medium text-sm text-center line-clamp-2">{item.name}</h4>
                    {item.variants && item.variants.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatPrice(Math.min(...item.variants.map(v => v.price)))} - {formatPrice(Math.max(...item.variants.map(v => v.price)))}
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.price)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : !selectedCategory ? (
            /* Category Grid */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {menuCategories.map((category) => {
                const categoryItemCount = menuItems.filter(
                  (item) => item.categoryId === category.id && item.isAvailable
                ).length;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="pos-grid-item group h-28"
                  >
                    <div className="text-3xl mb-1">{category.icon}</div>
                    <h4 className="font-semibold text-sm text-center line-clamp-1">{category.name}</h4>
                    <p className="text-xs text-muted-foreground">{categoryItemCount} items</p>
                  </button>
                );
              })}
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                      className={cn('pos-grid-item', cartItem && 'selected')}
                    >
                      {cartItem && (
                        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {cartItem.quantity}
                        </span>
                      )}
                      <div className="text-2xl mb-2">
                        {menuCategories.find((c) => c.id === item.categoryId)?.icon || '🍽️'}
                      </div>
                      <h4 className="font-medium text-sm text-center line-clamp-2">{item.name}</h4>
                      {item.variants && item.variants.length > 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatPrice(Math.min(...item.variants.map(v => v.price)))} - {formatPrice(Math.max(...item.variants.map(v => v.price)))}
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.price)}</p>
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
      <div className="hidden lg:flex w-96 flex-col rounded-xl border border-border bg-card overflow-hidden">
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
            <DialogTitle>{isEditingExistingOrder ? 'Update Order' : 'Complete Order'}</DialogTitle>
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

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value: 'cash' | 'card' | 'mobile') => setPaymentMethod(value)}
                className="grid grid-cols-3 gap-2"
              >
                <Label
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all',
                    paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="cash" className="sr-only" />
                  <Banknote className="h-6 w-6" />
                  <span className="text-sm font-medium">Cash</span>
                </Label>
                <Label
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all',
                    paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="card" className="sr-only" />
                  <CreditCard className="h-6 w-6" />
                  <span className="text-sm font-medium">Card</span>
                </Label>
                <Label
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all',
                    paymentMethod === 'mobile' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="mobile" className="sr-only" />
                  <Smartphone className="h-6 w-6" />
                  <span className="text-sm font-medium">JazzCash</span>
                </Label>
              </RadioGroup>
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
            <Button onClick={handleCompleteOrder}>
              {isEditingExistingOrder ? 'Update' : 'Place Order'} ({formatPrice(total)})
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

      {/* Kitchen Invoice Dialog */}
      <Dialog open={showKitchenInvoice} onOpenChange={setShowKitchenInvoice}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kitchen Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 font-mono text-sm">
            <div className="text-center border-b-2 border-dashed pb-3">
              <p className="text-lg font-bold">🍳 KITCHEN ORDER</p>
              <p className="text-xs">{settings.name}</p>
              <p className="text-xs">{new Date().toLocaleString('en-PK')}</p>
            </div>
            <div className="space-y-1">
              <p>
                <strong>Type:</strong> {orderType?.toUpperCase()}
              </p>
              {selectedTableId && (
                <p>
                  <strong>Table:</strong> #{tables.find((t) => t.id === selectedTableId)?.number}
                </p>
              )}
              {selectedWaiterId && (
                <p>
                  <strong>Waiter:</strong> {waiters.find((w) => w.id === selectedWaiterId)?.name}
                </p>
              )}
            </div>
            <div className="border-t border-dashed pt-3 space-y-2">
              {cart.map((item) => {
                const displayName = item.variant
                  ? `${item.menuItem.name} (${item.variant.name})`
                  : item.menuItem.name;
                const cartKey = item.variant ? `${item.menuItem.id}:${item.variant.id}` : item.menuItem.id;
                return (
                  <div key={cartKey} className="flex justify-between">
                    <span>{displayName}</span>
                    <span className="font-bold">x{item.quantity}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKitchenInvoice(false)}>
              Cancel
            </Button>
            <Button onClick={printKitchenInvoice}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Completed Dialog */}
      <Dialog open={!!completedOrder} onOpenChange={() => setCompletedOrder(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {completedOrder?.orderType === 'dine-in' ? 'Order Placed!' : 'Order Placed!'}
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
                Order is pending. Go to {completedOrder?.orderType === 'online' ? 'Online Orders' : 'Takeaway Orders'} to settle.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={printCustomerInvoice} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Print Customer Invoice
            </Button>
            {completedOrder?.orderType === 'dine-in' ? (
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
                <Button variant="default" onClick={handleSettleAndClose} className="flex-1">
                  Settle & Close Table
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setCompletedOrder(null);
                  handleBackToOrderType();
                }}
                className="w-full"
              >
                New Order
              </Button>
            )}
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
  );
}