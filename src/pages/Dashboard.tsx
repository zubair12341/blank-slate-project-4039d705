import {
  TrendingUp,
  AlertTriangle,
  Package,
  UtensilsCrossed,
  Clock,
  ArrowUpRight,
  ShoppingCart,
  Banknote,
} from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const { orders, menuItems, ingredients, settings, getLowStockAlerts, getTodaysSales } = useRestaurant();
  const lowStockAlerts = getLowStockAlerts();
  const todaysSales = getTodaysSales();

  const recentOrders = orders.slice(0, 5);
  const totalIngredients = ingredients.length;
  const totalMenuItems = menuItems.length;

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">خوش آمدید! Welcome back! Here's your restaurant overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Revenue */}
        <div className="stat-card stat-card-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Today's Revenue</p>
              <h3 className="mt-2 text-3xl font-bold">{formatPrice(todaysSales.revenue)}</h3>
              <p className="mt-1 text-sm opacity-75">{todaysSales.orders} orders</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3">
              <Banknote className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Today's Profit */}
        <div className="stat-card stat-card-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Today's Profit</p>
              <h3 className="mt-2 text-3xl font-bold">{formatPrice(todaysSales.profit)}</h3>
              <p className="mt-1 text-sm opacity-75">After ingredient costs</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Menu Items</p>
              <h3 className="mt-2 text-3xl font-bold text-foreground">{totalMenuItems}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Active dishes</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ingredients</p>
              <h3 className="mt-2 text-3xl font-bold text-foreground">{totalIngredients}</h3>
              <p className="mt-1 text-sm text-muted-foreground">In inventory</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card className="section-card">
          <CardHeader className="section-card-header">
            <CardTitle className="section-card-title flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
            <Link to="/stock">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="section-card-content">
            {lowStockAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-success/10 p-3 text-success">
                  <Package className="h-6 w-6" />
                </div>
                <p className="mt-3 font-medium">All stock levels are good!</p>
                <p className="text-sm text-muted-foreground">No ingredients below threshold</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.ingredient.id}
                    className={`alert-card ${
                      alert.severity === 'critical' ? 'alert-card-destructive' : 'alert-card-warning'
                    }`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 ${
                        alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{alert.ingredient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.currentTotal.toFixed(2)} {alert.ingredient.unit} remaining
                        (threshold: {alert.threshold} {alert.ingredient.unit})
                      </p>
                    </div>
                    <span
                      className={
                        alert.severity === 'critical' ? 'badge-destructive' : 'badge-warning'
                      }
                    >
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="section-card">
          <CardHeader className="section-card-header">
            <CardTitle className="section-card-title flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Recent Orders
            </CardTitle>
            <Link to="/orders">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="section-card-content">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <p className="mt-3 font-medium">No orders yet</p>
                <p className="text-sm text-muted-foreground">Start taking orders from the POS</p>
                <Link to="/pos" className="mt-4">
                  <Button size="sm">Go to POS</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items • {order.orderType}
                          {order.waiterName && ` • ${order.waiterName}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(order.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="section-card">
        <CardHeader className="section-card-header">
          <CardTitle className="section-card-title">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="section-card-content">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Link to="/pos">
              <Button className="w-full h-auto py-6 flex-col gap-2" variant="default">
                <ShoppingCart className="h-6 w-6" />
                <span>New Order</span>
              </Button>
            </Link>
            <Link to="/food-items">
              <Button className="w-full h-auto py-6 flex-col gap-2" variant="outline">
                <UtensilsCrossed className="h-6 w-6" />
                <span>Food Items</span>
              </Button>
            </Link>
            <Link to="/store-stock">
              <Button className="w-full h-auto py-6 flex-col gap-2" variant="outline">
                <Package className="h-6 w-6" />
                <span>Store Stock</span>
              </Button>
            </Link>
            <Link to="/reports">
              <Button className="w-full h-auto py-6 flex-col gap-2" variant="outline">
                <TrendingUp className="h-6 w-6" />
                <span>View Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
