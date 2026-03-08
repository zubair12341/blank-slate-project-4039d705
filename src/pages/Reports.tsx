import { useMemo } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Package, Calendar, Download } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { getLastNBusinessDays, isWithinBusinessDay } from '@/lib/businessDay';
import { exportToCSV } from '@/lib/csvExport';

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6'];

export default function Reports() {
  const { orders, menuItems, ingredients, menuCategories, settings } = useRestaurant();

  // Get business day settings
  const cutoffHour = settings.businessDay?.cutoffHour ?? 5;
  const cutoffMinute = settings.businessDay?.cutoffMinute ?? 0;

  // Calculate last 7 business days sales
  const dailySales = useMemo(() => {
    const businessDays = getLastNBusinessDays(7, cutoffHour, cutoffMinute);
    
    return businessDays.map(({ businessDate, start, end }) => {
      const dayOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return isWithinBusinessDay(orderDate, start, end) && order.status === 'completed';
      });

      const revenue = dayOrders.reduce((sum, order) => sum + order.total, 0);
      const cost = dayOrders.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => {
          const menuItem = menuItems.find((m) => m.id === item.menuItemId);
          return itemSum + (menuItem?.recipeCost || 0) * item.quantity;
        }, 0);
      }, 0);

      return {
        date: format(businessDate, 'MMM dd'),
        revenue,
        profit: revenue - cost,
        orders: dayOrders.length,
      };
    });
  }, [orders, menuItems, cutoffHour, cutoffMinute]);

  // Category sales distribution
  const categorySales = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    orders.filter((o) => o.status === 'completed').forEach((order) => {
      order.items.forEach((item) => {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId);
        if (menuItem) {
          const category = menuCategories.find((c) => c.id === menuItem.categoryId);
          const categoryName = category?.name || 'Other';
          categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + item.total;
        }
      });
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  }, [orders, menuItems, menuCategories]);

  // Top selling items
  const topItems = useMemo(() => {
    const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    orders.filter((o) => o.status === 'completed').forEach((order) => {
      order.items.forEach((item) => {
        if (!itemCounts[item.menuItemId]) {
          itemCounts[item.menuItemId] = { name: item.menuItemName, quantity: 0, revenue: 0 };
        }
        itemCounts[item.menuItemId].quantity += item.quantity;
        itemCounts[item.menuItemId].revenue += item.total;
      });
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orders]);

  // Summary stats
  const totalRevenue = orders.filter((o) => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.filter((o) => o.status === 'completed').length;
  const totalCost = orders.filter((o) => o.status === 'completed').reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      return itemSum + (menuItem?.recipeCost || 0) * item.quantity;
    }, 0);
  }, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const handleExportDailySales = () => {
    exportToCSV(dailySales, [
      { key: 'date', header: 'Date' },
      { key: 'revenue', header: 'Revenue', formatter: (v) => v.toFixed(2) },
      { key: 'profit', header: 'Profit', formatter: (v) => v.toFixed(2) },
      { key: 'orders', header: 'Orders' },
    ], `daily-sales-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportCategorySales = () => {
    exportToCSV(categorySales, [
      { key: 'name', header: 'Category' },
      { key: 'value', header: 'Sales', formatter: (v) => v.toFixed(2) },
    ], `category-sales-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportTopItems = () => {
    exportToCSV(topItems, [
      { key: 'name', header: 'Item' },
      { key: 'quantity', header: 'Quantity Sold' },
      { key: 'revenue', header: 'Revenue', formatter: (v) => v.toFixed(2) },
    ], `top-items-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">
            Track your restaurant performance (Business day cutoff: {cutoffHour.toString().padStart(2, '0')}:{cutoffMinute.toString().padStart(2, '0')})
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card stat-card-primary">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Total Revenue</p>
              <p className="text-2xl font-bold">{settings.currencySymbol} {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card stat-card-success">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Total Profit</p>
              <p className="text-2xl font-bold">{settings.currencySymbol} {(totalRevenue - totalCost).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold text-foreground">{settings.currencySymbol} {avgOrderValue.toFixed(0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="section-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="section-card-title">Revenue (Last 7 Business Days)</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportDailySales} className="gap-1">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="section-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="section-card-title">Sales by Category</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCategorySales} className="gap-1">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {categorySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySales}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categorySales.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${settings.currencySymbol} ${value.toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No sales data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Trend */}
        <Card className="section-card">
          <CardHeader>
            <CardTitle className="section-card-title">Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card className="section-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="section-card-title">Top Selling Items</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportTopItems} className="gap-1">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            {topItems.length > 0 ? (
              <div className="space-y-4">
                {topItems.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.quantity} sold</p>
                    </div>
                    <p className="font-semibold">{settings.currencySymbol} {item.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Value */}
      <Card className="section-card">
        <CardHeader>
          <CardTitle className="section-card-title flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Ingredients</p>
              <p className="text-3xl font-bold">{ingredients.length}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Inventory Value</p>
              <p className="text-3xl font-bold">
                {settings.currencySymbol} {ingredients.reduce((sum, ing) => sum + (ing.storeStock + ing.kitchenStock) * ing.costPerUnit, 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Menu Items</p>
              <p className="text-3xl font-bold">{menuItems.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
