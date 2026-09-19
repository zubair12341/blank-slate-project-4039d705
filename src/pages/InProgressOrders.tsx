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
import { createPrintJobId, sendLocalPrintJob } from '@/services/localPrintBridge';

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
      // Open/unpaid orders belong here. Use channel for Online and fulfillment for Takeaway.
      const isOpen = order.paymentStatus ? order.paymentStatus !== 'paid' && order.operationalStatus !== 'completed' : order.status === 'pending';
      const matchesType = orderType === 'online'
        ? order.orderChannel === 'online' || order.orderType === 'online'
        : order.fulfillmentType === 'takeaway' || order.orderType === 'takeaway';
      if (!isOpen || !matchesType) return false;
      
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
    navigate('/pos', { state: { orderType: orderType === 'online' ? 'online' : 'takeaway', editMode: true } });
  };

  const handleOpenSettleDialog = (order: Order) => {
    setSelectedOrder(order);
    setPaymentMethod(order.paymentMethod);
    setShowSettleDialog(true);
  };

  const handleSettleOrder = async () => {
    if (!selectedOrder) return;
    const paidOrder = { ...selectedOrder, paymentMethod };
    try {
      await settleOrder(selectedOrder.id, paymentMethod);
      await printInvoice(paidOrder, 'PAID');
      toast.success(`Order ${selectedOrder.orderNumber} settled and PAID invoice printed.`);
      setShowSettleDialog(false);
      setSelectedOrder(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to settle order.');
    }
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

  const printInvoice = async (order: Order, billStatus: 'UNPAID' | 'PAID' = 'UNPAID') => {
    const lines = [
      settings.invoice?.title || settings.name,
      settings.address,
      `Tel: ${settings.phone}`,
      '================================',
      `Order: ${order.orderNumber}`,
      `Status: ${billStatus}`,
      format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm'),
      `Type: ${order.orderType.toUpperCase()}`,
      order.customerName ? `Customer: ${order.customerName}` : '',
      '--------------------------------',
      ...order.items.map((item) => `${item.quantity}x ${item.menuItemName}  ${settings.currencySymbol} ${item.total.toLocaleString()}`),
      '--------------------------------',
      `Subtotal: ${settings.currencySymbol} ${order.subtotal.toLocaleString()}`,
      order.discount > 0 ? `Discount: -${settings.currencySymbol} ${order.discount.toLocaleString()}` : '',
      `TOTAL: ${settings.currencySymbol} ${order.total.toLocaleString()}`,
      billStatus === 'PAID' ? `Payment: ${order.paymentMethod.toUpperCase()}` : 'Payment: UNPAID',
      '================================',
      settings.invoice?.footer || 'Thank you for your order!',
      '', '',
    ].filter(Boolean);
    await sendLocalPrintJob({ jobId: createPrintJobId(), type: 'CUSTOMER_RECEIPT', content: lines.join('\n') });
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
                    onClick={() => void printInvoice(order).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to print bill.'))}
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
