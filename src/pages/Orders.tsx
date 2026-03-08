import { useState, useMemo } from 'react';
import { Search, Eye, FileText, Calendar, Printer, Users, X, Lock, Download, CheckCircle } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Order } from '@/types/restaurant';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/DataTablePagination';
import { PasswordOTPInput } from '@/components/PasswordOTPInput';
import { exportToCSV } from '@/lib/csvExport';
import { printWithImages } from '@/hooks/usePrintWithImages';

export default function Orders() {
  const { orders, settings, cancelOrder, settleOrder } = useRestaurant();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderTypeTab, setOrderTypeTab] = useState<'all' | 'dine-in' | 'takeaway' | 'online'>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Cancel password dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.waiterName?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesType = orderTypeTab === 'all' || order.orderType === orderTypeTab;
      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchQuery, statusFilter, orderTypeTab]);

  // Paginated orders
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-destructive';
      case 'refunded': return 'badge-destructive';
      default: return 'badge-warning';
    }
  };

  const getOrderTypeCount = (type: 'dine-in' | 'takeaway' | 'online' | 'all') => {
    if (type === 'all') return orders.length;
    return orders.filter(o => o.orderType === type).length;
  };

  const handleCancelRequest = (order: Order) => {
    if (order.status !== 'pending') {
      toast.error(`Only pending orders can be cancelled (current: ${order.status})`);
      return;
    }
    setOrderToCancel(order);
    setCancelPassword('');
    setPasswordError(false);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    
    if (cancelPassword !== settings.security?.cancelOrderPassword) {
      setPasswordError(true);
      toast.error('Invalid password');
      return;
    }

    // Cancel order - this will also free the table if needed
    await cancelOrder(orderToCancel.id);
    toast.success(`Order ${orderToCancel.orderNumber} cancelled`);
    setShowCancelDialog(false);
    setOrderToCancel(null);
    setCancelPassword('');
    setSelectedOrder(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredOrders, [
      { key: 'orderNumber', header: 'Order #' },
      { key: 'createdAt', header: 'Date', formatter: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm') },
      { key: 'customerName', header: 'Customer', formatter: (v) => v || 'Walk-in' },
      { key: 'waiterName', header: 'Waiter', formatter: (v) => v || '-' },
      { key: 'orderType', header: 'Type' },
      { key: 'items', header: 'Items', formatter: (v) => v.length.toString() },
      { key: 'subtotal', header: 'Subtotal' },
      { key: 'tax', header: 'Tax' },
      { key: 'discount', header: 'Discount' },
      { key: 'total', header: 'Total' },
      { key: 'paymentMethod', header: 'Payment' },
      { key: 'status', header: 'Status' },
    ], `orders-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Orders exported to CSV');
  };

  const handlePrintInvoice = (order: Order) => {
    const logoHtml = settings.invoice?.showLogo && settings.invoice?.logoUrl 
      ? `<div style="text-align: center; margin-bottom: 10px;"><img src="${settings.invoice.logoUrl}" alt="Logo" style="max-height: 60px; object-fit: contain;" /></div>` 
      : '';

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .header h1 { font-size: 16px; margin: 0; }
            .header p { font-size: 11px; margin: 3px 0; }
            .info { margin: 10px 0; font-size: 12px; }
            .info-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
            .totals { margin: 10px 0; font-size: 12px; }
            .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand-total { font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px; }
            .footer { text-align: center; font-size: 10px; margin-top: 15px; }
            @media print { body { margin: 0; padding: 10px; } }
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
            <p>${new Date(order.createdAt).toLocaleString('en-PK')}</p>
          </div>
          <div class="info">
            <div class="info-row"><span>Type:</span> <span>${order.orderType.toUpperCase()}</span></div>
            ${order.tableNumber ? `<div class="info-row"><span>Table:</span> <span>#${order.tableNumber}</span></div>` : ''}
            ${order.waiterName ? `<div class="info-row"><span>Waiter:</span> <span>${order.waiterName}</span></div>` : ''}
            ${order.customerName ? `<div class="info-row"><span>Customer:</span> <span>${order.customerName}</span></div>` : ''}
          </div>
          <div class="items">
            ${order.items.map((item) => `
              <div class="item">
                <span>${item.quantity}x ${item.menuItemName}</span>
                <span>${settings.currencySymbol} ${item.total.toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
          <div class="totals">
            <div class="total-row"><span>Subtotal:</span> <span>${settings.currencySymbol} ${order.subtotal.toLocaleString()}</span></div>
            ${settings.invoice?.gstEnabled ? `<div class="total-row"><span>GST (${settings.taxRate}%):</span> <span>${settings.currencySymbol} ${order.tax.toLocaleString()}</span></div>` : ''}
            ${order.discount > 0 ? `<div class="total-row"><span>Discount:</span> <span>-${settings.currencySymbol} ${order.discount.toLocaleString()}</span></div>` : ''}
            <div class="total-row grand-total"><span>TOTAL:</span> <span>${settings.currencySymbol} ${order.total.toLocaleString()}</span></div>
          </div>
          <div class="footer">
            <p>Payment: ${order.paymentMethod.toUpperCase()}</p>
            <p>================================</p>
            <p>${settings.invoice?.footer || 'Thank you for dining with us!'}</p>
          </div>
        </body>
      </html>
    `;

    // Use printWithImages to wait for logo to load before printing
    printWithImages(invoiceHtml);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Order History</h1>
          <p className="page-subtitle">View and manage all orders</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Order Type Tabs */}
      <Tabs value={orderTypeTab} onValueChange={(v) => { setOrderTypeTab(v as any); handleFilterChange(); }} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="all" className="gap-2">
            All <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{getOrderTypeCount('all')}</span>
          </TabsTrigger>
          <TabsTrigger value="dine-in" className="gap-2">
            Dine-In <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{getOrderTypeCount('dine-in')}</span>
          </TabsTrigger>
          <TabsTrigger value="takeaway" className="gap-2">
            Takeaway <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{getOrderTypeCount('takeaway')}</span>
          </TabsTrigger>
          <TabsTrigger value="online" className="gap-2">
            Online <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{getOrderTypeCount('online')}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer, or waiter..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange(); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); handleFilterChange(); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="section-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Waiter</th>
              <th>Type</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr key={order.id}>
                <td className="font-medium font-mono">{order.orderNumber}</td>
                <td>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                  </div>
                </td>
                <td>
                  {order.customerName || <span className="text-muted-foreground">Walk-in</span>}
                  {order.tableNumber && (
                    <span className="ml-2 text-xs text-muted-foreground">(Table {order.tableNumber})</span>
                  )}
                </td>
                <td>
                  {order.waiterName ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {order.waiterName}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td>
                  <span className={`capitalize px-2 py-1 rounded-full text-xs font-medium ${
                    order.orderType === 'dine-in' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    order.orderType === 'takeaway' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}>
                    {order.orderType}
                  </span>
                </td>
                <td>{order.items.length} items</td>
                <td className="font-semibold">{formatPrice(order.total)}</td>
                <td className="capitalize">{order.paymentMethod}</td>
                <td>
                  <span className={getStatusColor(order.status)}>{order.status}</span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePrintInvoice(order)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    {order.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            await settleOrder(order.id);
                            toast.success(`Order ${order.orderNumber} settled`);
                          } catch (e: any) {
                            toast.error(e?.message || 'Failed to settle order');
                          }
                        }}
                        title="Settle / Close"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {order.status === 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancelRequest(order)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground">Orders will appear here once created from POS</p>
          </div>
        )}
        
        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredOrders.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Number</p>
                  <p className="font-mono font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <span className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</span>
                </div>
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{format(new Date(selectedOrder.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order Type</p>
                  <p className="font-medium capitalize">{selectedOrder.orderType}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.menuItemName}</span>
                      <span className="font-medium">{formatPrice(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                {settings.invoice?.gstEnabled && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST ({settings.taxRate}%)</span>
                    <span>{formatPrice(selectedOrder.tax)}</span>
                  </div>
                )}
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Discount</span>
                    <span>-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handlePrintInvoice(selectedOrder)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Invoice
                </Button>
                {selectedOrder.status !== 'cancelled' && (
                  <Button variant="destructive" onClick={() => handleCancelRequest(selectedOrder)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Password Dialog with OTP Input */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cancel Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter the 5-digit password to cancel order <strong>{orderToCancel?.orderNumber}</strong>
            </p>
            <PasswordOTPInput
              value={cancelPassword}
              onChange={(value) => { setCancelPassword(value); setPasswordError(false); }}
              length={5}
              error={passwordError}
            />
            {passwordError && (
              <p className="text-sm text-destructive text-center">Invalid password</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
