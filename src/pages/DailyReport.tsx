import { useMemo, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Download,
  Clock,
  UtensilsCrossed,
  Wifi,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, subDays, addDays } from 'date-fns';
import { getBusinessDate, getBusinessDayRange, isWithinBusinessDay } from '@/lib/businessDay';
import { exportToCSV } from '@/lib/csvExport';
import { cn } from '@/lib/utils';

export default function DailyReport() {
  const { orders, menuItems, menuCategories, settings } = useRestaurant();

  // Get business day settings
  const cutoffHour = settings.businessDay?.cutoffHour ?? 5;
  const cutoffMinute = settings.businessDay?.cutoffMinute ?? 0;

  // State for selected business date
  const [selectedBusinessDate, setSelectedBusinessDate] = useState<Date>(() => {
    return getBusinessDate(new Date(), cutoffHour, cutoffMinute);
  });

  // Get business day range
  const { start: businessDayStart, end: businessDayEnd } = useMemo(() => {
    return getBusinessDayRange(selectedBusinessDate, cutoffHour, cutoffMinute);
  }, [selectedBusinessDate, cutoffHour, cutoffMinute]);

  // Filter orders for the selected business day
  const dayOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return isWithinBusinessDay(orderDate, businessDayStart, businessDayEnd);
    });
  }, [orders, businessDayStart, businessDayEnd]);

  // Separate by status
  const completedOrders = dayOrders.filter((o) => o.status === 'completed');
  const pendingOrders = dayOrders.filter((o) => o.status === 'pending');
  const cancelledOrders = dayOrders.filter((o) => o.status === 'cancelled');

  // Calculate totals
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCost = completedOrders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      return itemSum + (menuItem?.recipeCost || 0) * item.quantity;
    }, 0);
  }, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

  // Order type breakdown
  const orderTypeBreakdown = useMemo(() => {
    const types = { 'dine-in': 0, online: 0, takeaway: 0 };
    completedOrders.forEach((order) => {
      types[order.orderType] += order.total;
    });
    return types;
  }, [completedOrders]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const methods = { cash: 0, card: 0, mobile: 0 };
    completedOrders.forEach((order) => {
      methods[order.paymentMethod] += order.total;
    });
    return methods;
  }, [completedOrders]);

  // Top selling items for the day
  const topItems = useMemo(() => {
    const itemCounts: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {};

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId);
        if (!itemCounts[item.menuItemId]) {
          itemCounts[item.menuItemId] = {
            name: item.menuItemName,
            quantity: 0,
            revenue: 0,
            cost: 0,
          };
        }
        itemCounts[item.menuItemId].quantity += item.quantity;
        itemCounts[item.menuItemId].revenue += item.total;
        itemCounts[item.menuItemId].cost += (menuItem?.recipeCost || 0) * item.quantity;
      });
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [completedOrders, menuItems]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, { name: string; revenue: number; quantity: number }> = {};

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId);
        if (menuItem) {
          const category = menuCategories.find((c) => c.id === menuItem.categoryId);
          const categoryName = category?.name || 'Other';
          if (!categories[categoryName]) {
            categories[categoryName] = { name: categoryName, revenue: 0, quantity: 0 };
          }
          categories[categoryName].revenue += item.total;
          categories[categoryName].quantity += item.quantity;
        }
      });
    });

    return Object.values(categories).sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders, menuItems, menuCategories]);

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  const handlePrevDay = () => {
    setSelectedBusinessDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    const today = getBusinessDate(new Date(), cutoffHour, cutoffMinute);
    const nextDay = addDays(selectedBusinessDate, 1);
    if (nextDay <= today) {
      setSelectedBusinessDate(nextDay);
    }
  };

  const handleToday = () => {
    setSelectedBusinessDate(getBusinessDate(new Date(), cutoffHour, cutoffMinute));
  };

  const isToday = useMemo(() => {
    const today = getBusinessDate(new Date(), cutoffHour, cutoffMinute);
    return format(selectedBusinessDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  }, [selectedBusinessDate, cutoffHour, cutoffMinute]);

  const handleExportDayReport = () => {
    const reportData = [
      { metric: 'Date', value: format(selectedBusinessDate, 'dd/MM/yyyy') },
      { metric: 'Business Hours', value: `${format(businessDayStart, 'HH:mm')} - ${format(businessDayEnd, 'HH:mm')}` },
      { metric: 'Total Orders', value: completedOrders.length.toString() },
      { metric: 'Total Revenue', value: totalRevenue.toFixed(2) },
      { metric: 'Total Cost', value: totalCost.toFixed(2) },
      { metric: 'Net Profit', value: totalProfit.toFixed(2) },
      { metric: 'Profit Margin', value: `${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%` },
      { metric: 'Avg Order Value', value: avgOrderValue.toFixed(2) },
      { metric: 'Dine-In Revenue', value: orderTypeBreakdown['dine-in'].toFixed(2) },
      { metric: 'Online Revenue', value: orderTypeBreakdown.online.toFixed(2) },
      { metric: 'Takeaway Revenue', value: orderTypeBreakdown.takeaway.toFixed(2) },
      { metric: 'Cash Payments', value: paymentBreakdown.cash.toFixed(2) },
      { metric: 'Card Payments', value: paymentBreakdown.card.toFixed(2) },
      { metric: 'Mobile Payments', value: paymentBreakdown.mobile.toFixed(2) },
    ];

    exportToCSV(
      reportData,
      [
        { key: 'metric', header: 'Metric' },
        { key: 'value', header: 'Value' },
      ],
      `daily-report-${format(selectedBusinessDate, 'yyyy-MM-dd')}`
    );
  };

  const handleExportOrderDetails = () => {
    const orderData = completedOrders.map((order) => ({
      orderNumber: order.orderNumber,
      time: format(new Date(order.createdAt), 'HH:mm'),
      type: order.orderType,
      customer: order.customerName || '-',
      items: order.items.length,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
      payment: order.paymentMethod,
    }));

    exportToCSV(
      orderData,
      [
        { key: 'orderNumber', header: 'Order #' },
        { key: 'time', header: 'Time' },
        { key: 'type', header: 'Type' },
        { key: 'customer', header: 'Customer' },
        { key: 'items', header: 'Items' },
        { key: 'subtotal', header: 'Subtotal' },
        { key: 'tax', header: 'Tax' },
        { key: 'discount', header: 'Discount' },
        { key: 'total', header: 'Total' },
        { key: 'payment', header: 'Payment' },
      ],
      `orders-${format(selectedBusinessDate, 'yyyy-MM-dd')}`
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-8 w-8" />
          </div>
          <div>
            <h1 className="page-title">Daily Report</h1>
            <p className="page-subtitle">
              Business day: {format(businessDayStart, 'HH:mm')} - {format(businessDayEnd, 'HH:mm dd/MM')}
            </p>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevDay}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 rounded-lg bg-muted font-medium min-w-[140px] text-center">
            {format(selectedBusinessDate, 'dd MMM yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextDay} disabled={isToday}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="outline" onClick={handleToday}>
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="stat-card stat-card-primary">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Revenue</p>
              <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card stat-card-success">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Profit</p>
              <p className="text-2xl font-bold">{formatPrice(totalProfit)}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">{completedOrders.length}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-yellow-100 p-3 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{pendingOrders.length}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-red-100 p-3 text-red-600">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-foreground">{cancelledOrders.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Order Type & Payment Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="section-card">
          <CardHeader>
            <CardTitle className="section-card-title">Revenue by Order Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <span className="font-medium">Dine-In</span>
              </div>
              <span className="font-bold">{formatPrice(orderTypeBreakdown['dine-in'])}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Wifi className="h-5 w-5" />
                </div>
                <span className="font-medium">Online</span>
              </div>
              <span className="font-bold">{formatPrice(orderTypeBreakdown.online)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="font-medium">Take-Away</span>
              </div>
              <span className="font-bold">{formatPrice(orderTypeBreakdown.takeaway)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="section-card">
          <CardHeader>
            <CardTitle className="section-card-title">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💵</span>
                <span className="font-medium">Cash</span>
              </div>
              <span className="font-bold">{formatPrice(paymentBreakdown.cash)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <span className="font-medium">Card</span>
              </div>
              <span className="font-bold">{formatPrice(paymentBreakdown.card)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <span className="font-medium">Mobile</span>
              </div>
              <span className="font-bold">{formatPrice(paymentBreakdown.mobile)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Items */}
      <Card className="section-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="section-card-title">Top Selling Items</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportDayReport} className="gap-1">
              <Download className="h-4 w-4" />
              Export Summary
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportOrderDetails} className="gap-1">
              <Download className="h-4 w-4" />
              Export Orders
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.map((item, index) => (
                  <TableRow key={item.name}>
                    <TableCell>
                      <span className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                        index === 0 && 'bg-yellow-100 text-yellow-700',
                        index === 1 && 'bg-gray-100 text-gray-700',
                        index === 2 && 'bg-orange-100 text-orange-700',
                        index > 2 && 'bg-muted text-muted-foreground'
                      )}>
                        {index + 1}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPrice(item.cost)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatPrice(item.revenue - item.cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No sales data for this day
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="section-card">
        <CardHeader>
          <CardTitle className="section-card-title">Sales by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {categoryBreakdown.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">{category.quantity} items</p>
                  </div>
                  <p className="font-bold text-primary">{formatPrice(category.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No sales data for this day
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit Summary */}
      <Card className="section-card">
        <CardHeader>
          <CardTitle className="section-card-title">Profit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-blue-50 text-center">
              <p className="text-sm text-blue-600 mb-1">Gross Revenue</p>
              <p className="text-2xl font-bold text-blue-700">{formatPrice(totalRevenue)}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 text-center">
              <p className="text-sm text-orange-600 mb-1">Total Cost</p>
              <p className="text-2xl font-bold text-orange-700">{formatPrice(totalCost)}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 text-center">
              <p className="text-sm text-green-600 mb-1">Net Profit</p>
              <p className="text-2xl font-bold text-green-700">{formatPrice(totalProfit)}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 text-center">
              <p className="text-sm text-purple-600 mb-1">Profit Margin</p>
              <p className="text-2xl font-bold text-purple-700">
                {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
