import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Wifi,
  Edit,
  XCircle,
  CheckCircle,
  Printer,
  Plus,
  Clock,
  User,
  Search,
  Filter,
} from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Order } from '@/types/restaurant';
import { PasswordOTPInput } from '@/components/PasswordOTPInput';
import { format, subHours, startOfDay, isAfter } from 'date-fns';
import { printWithImages } from '@/hooks/usePrintWithImages';

interface InProgressOrdersProps {
  orderType: 'online' | 'takeaway';
}

export default function InProgressOrders({ orderType }: InProgressOrdersProps) {
  const navigate = useNavigate();
  const {
    orders,
    settings,
    settleOrder,
    cancelOrder,
    loadOrderToCart,
  } = useRestaurant();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelPasswordError, setCancelPasswordError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'hour' | 'today'>('all');

  // Filter pending orders by type, search, and time
  const pendingOrders = useMemo(() => {
    return orders.filter((order) => {
      // Must be pending and correct type
      if (order.status !== 'pending' || order.orderType !== orderType) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesOrderNumber = order.orderNumber.toLowerCase().includes(query);
        const matchesCustomer = order.customerName?.toLowerCase().includes(query) || false;
        if (!matchesOrderNumber && !matchesCustomer) return false;
      }
      
      // Time filter
      const orderDate = new Date(order.createdAt);
      if (timeFilter === 'hour') {
        const oneHourAgo = subHours(new Date(), 1);
        if (!isAfter(orderDate, oneHourAgo)) return false;
      } else if (timeFilter === 'today') {
        const todayStart = startOfDay(new Date());
        if (!isAfter(orderDate, todayStart)) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, orderType, searchQuery, timeFilter]);

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  const handleEditOrder = (order: Order) => {
    loadOrderToCart(order.id);
    navigate('/pos', { state: { orderType: order.orderType, editMode: true } });
  };

  const handleOpenSettleDialog = (order: Order) => {
    setSelectedOrder(order);
    setPaymentMethod(order.paymentMethod);
    setShowSettleDialog(true);
  };

  const handleSettleOrder = async () => {
    if (!selectedOrder) return;

    // Settle order with selected payment method
    await settleOrder(selectedOrder.id, paymentMethod);

    toast.success(`Order ${selectedOrder.orderNumber} settled successfully!`);
    setShowSettleDialog(false);
    setSelectedOrder(null);
    printInvoice({ ...selectedOrder, paymentMethod });
  };

  const handleOpenCancelDialog = (order: Order) => {
    setSelectedOrder(order);
    setCancelPassword('');
    setCancelPasswordError('');
    setShowCancelDialog(true);
  };

  const handleCancelOrder = async () => {
    const correctPassword = settings.security?.cancelOrderPassword || '12345';
    
    if (cancelPassword !== correctPassword) {
      setCancelPasswordError('Incorrect password');
      return;
    }

    if (selectedOrder) {
      await cancelOrder(selectedOrder.id);
      toast.success(`Order ${selectedOrder.orderNumber} cancelled`);
    }

    setShowCancelDialog(false);
    setCancelPassword('');
    setCancelPasswordError('');
    setSelectedOrder(null);
  };

  const printInvoice = (order: Order) => {
    const gstEnabled = settings.invoice?.gstEnabled ?? true;
    
    const logoHtml = settings.invoice?.showLogo && settings.invoice?.logoUrl 
      ? `<div style="text-align: center; margin: 0; padding: 0; line-height: 0;"><img src="${settings.invoice.logoUrl}" alt="Logo" style="display: block; margin: 0 auto; max-height: 60px; object-fit: contain;" /></div>` 
      : '';
    
    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
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
            <p>Order: ${order.orderNumber}</p>
            <p>${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div class="info">
            <div class="info-row"><span>Type:</span> <span>${order.orderType.toUpperCase()}</span></div>
            ${order.customerName ? `<div class="info-row"><span>Customer:</span> <span>${order.customerName}</span></div>` : ''}
          </div>
          <div class="items">
            ${order.items
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
            <div class="total-row"><span>Subtotal:</span> <span>${settings.currencySymbol} ${order.subtotal.toLocaleString()}</span></div>
            ${gstEnabled ? `<div class="total-row"><span>GST (${settings.taxRate}%):</span> <span>${settings.currencySymbol} ${order.tax.toLocaleString()}</span></div>` : ''}
            ${order.discount > 0 ? `<div class="total-row"><span>Discount${order.discountType === 'percentage' ? ` (${order.discountValue}%)` : ''}:</span> <span>-${settings.currencySymbol} ${order.discount.toLocaleString()}</span></div>` : ''}
            <div class="total-row grand-total"><span>TOTAL:</span> <span>${settings.currencySymbol} ${order.total.toLocaleString()}</span></div>
          </div>
          <div class="footer">
            <p>Payment: ${order.paymentMethod.toUpperCase()}</p>
            <p>================================</p>
            <p>${settings.invoice?.footer || 'Thank you for your order!'}</p>
          </div>
        </body>
      </html>
    `;

    // Use printWithImages to wait for logo to load before printing
    printWithImages(invoiceHtml);
  };

  const handleNewOrder = () => {
    navigate('/pos', { state: { orderType } });
  };

  const typeConfig = {
    online: {
      icon: Wifi,
      title: 'Online Orders',
      subtitle: 'Manage online delivery orders',
      color: 'bg-blue-100 text-blue-600',
      emptyMessage: 'No pending online orders',
    },
    takeaway: {
      icon: ShoppingBag,
      title: 'Take-Away Orders',
      subtitle: 'Manage take-away orders',
      color: 'bg-green-100 text-green-600',
      emptyMessage: 'No pending take-away orders',
    },
  };

  const config = typeConfig[orderType];
  const TypeIcon = config.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl', config.color)}>
            <TypeIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="page-title">{config.title}</h1>
            <p className="page-subtitle">{config.subtitle}</p>
          </div>
        </div>
        <Button onClick={handleNewOrder} className="gap-2">
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="section-card">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as 'all' | 'hour' | 'today')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="hour">Last Hour</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders Count */}
      <Card className="stat-card">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">In-Progress Orders</p>
            <p className="text-2xl font-bold text-foreground">{pendingOrders.length}</p>
          </div>
        </div>
      </Card>

      {/* Orders Grid */}
      {pendingOrders.length === 0 ? (
        <Card className="section-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className={cn('p-4 rounded-full mb-4', config.color)}>
              <TypeIcon className="h-12 w-12" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">{config.emptyMessage}</p>
            <Button onClick={handleNewOrder} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create New Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingOrders.map((order) => (
            <Card key={order.id} className="section-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-mono">{order.orderNumber}</CardTitle>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    Pending
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.customerName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customerName}</span>
                  </div>
                )}

                {/* Order Items Summary */}
                <div className="space-y-1 text-sm border-t pt-3">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.menuItemName}
                      </span>
                      <span>{formatPrice(item.total)}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-muted-foreground text-xs">
                      +{order.items.length - 3} more items
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditOrder(order)}
                    className="gap-1"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => printInvoice(order)}
                    className="gap-1"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleOpenCancelDialog(order)}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenSettleDialog(order)}
                    className="gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Settle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Settle Order Dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Order</DialogTitle>
            <DialogDescription>
              Complete the order and collect payment
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="text-center space-y-2">
                <p className="font-mono text-lg">{selectedOrder.orderNumber}</p>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(selectedOrder.total)}
                </p>
              </div>

              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'cash' | 'card' | 'mobile')}
                  className="grid grid-cols-3 gap-2"
                >
                  <div>
                    <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                    <Label
                      htmlFor="cash"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span>💵</span>
                      <span className="text-xs">Cash</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="card" id="card" className="peer sr-only" />
                    <Label
                      htmlFor="card"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span>💳</span>
                      <span className="text-xs">Card</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="mobile" id="mobile" className="peer sr-only" />
                    <Label
                      htmlFor="mobile"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span>📱</span>
                      <span className="text-xs">Mobile</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSettleOrder} className="gap-1">
              <CheckCircle className="h-4 w-4" />
              Settle & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Enter the security password to cancel this order
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="text-center space-y-2">
                <p className="font-mono">{selectedOrder.orderNumber}</p>
                <p className="text-lg font-bold text-destructive">
                  {formatPrice(selectedOrder.total)}
                </p>
              </div>

              <div className="space-y-3">
                <Label>Security Password (5 digits)</Label>
                <PasswordOTPInput
                  value={cancelPassword}
                  onChange={setCancelPassword}
                  length={5}
                />
                {cancelPasswordError && (
                  <p className="text-sm text-destructive">{cancelPasswordError}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={cancelPassword.length !== 5}
            >
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
