import { useState, useMemo } from 'react';
import { BarChart3, Download, Search, Filter, Package, ChefHat, Warehouse, AlertTriangle } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { exportToCSV } from '@/lib/csvExport';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

type DateRange = 'today' | 'week' | 'month' | 'custom';

export default function StockReport() {
  const { ingredients, ingredientCategories, settings, stockTransfers, stockPurchases, stockRemovals } = useRestaurant();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  // Date range calculation
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { rangeStart: startOfDay(now), rangeEnd: endOfDay(now), rangeLabel: format(now, 'dd MMM yyyy') };
      case 'week':
        return { rangeStart: startOfWeek(now, { weekStartsOn: 1 }), rangeEnd: endOfWeek(now, { weekStartsOn: 1 }), rangeLabel: `${format(startOfWeek(now, { weekStartsOn: 1 }), 'dd MMM')} - ${format(endOfWeek(now, { weekStartsOn: 1 }), 'dd MMM yyyy')}` };
      case 'month':
        return { rangeStart: startOfMonth(now), rangeEnd: endOfMonth(now), rangeLabel: format(now, 'MMMM yyyy') };
      case 'custom':
        return {
          rangeStart: customFrom ? startOfDay(customFrom) : startOfDay(now),
          rangeEnd: customTo ? endOfDay(customTo) : endOfDay(now),
          rangeLabel: customFrom && customTo ? `${format(customFrom, 'dd MMM')} - ${format(customTo, 'dd MMM yyyy')}` : 'Custom'
        };
      default:
        return { rangeStart: startOfDay(now), rangeEnd: endOfDay(now), rangeLabel: 'Today' };
    }
  }, [dateRange, customFrom, customTo]);

  // Filter transfers in range
  const transfersInRange = useMemo(() =>
    stockTransfers.filter(t => {
      const d = new Date(t.createdAt);
      return d >= rangeStart && d <= rangeEnd;
    }), [stockTransfers, rangeStart, rangeEnd]);

  const purchasesInRange = useMemo(() =>
    (stockPurchases || []).filter(p => {
      const d = new Date(p.purchaseDate);
      return d >= rangeStart && d <= rangeEnd;
    }), [stockPurchases, rangeStart, rangeEnd]);

  const removalsInRange = useMemo(() =>
    (stockRemovals || []).filter(r => {
      const d = new Date(r.createdAt);
      return d >= rangeStart && d <= rangeEnd;
    }), [stockRemovals, rangeStart, rangeEnd]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing => {
      const matchSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || ing.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [ingredients, searchTerm, categoryFilter]);

  // Summary stats
  const totalStoreValue = filteredIngredients.reduce((sum, ing) => sum + ing.storeStock * ing.costPerUnit, 0);
  const totalKitchenValue = filteredIngredients.reduce((sum, ing) => sum + ing.kitchenStock * ing.costPerUnit, 0);
  const totalValue = totalStoreValue + totalKitchenValue;
  const lowStockCount = filteredIngredients.filter(ing => (ing.storeStock + ing.kitchenStock) <= ing.lowStockThreshold).length;

  // Per-ingredient activity in range
  const getIngredientActivity = (ingredientId: string) => {
    const purchased = purchasesInRange.filter(p => p.ingredientId === ingredientId).reduce((s, p) => s + p.quantity, 0);
    const toKitchen = transfersInRange.filter(t => t.ingredientId === ingredientId && t.toLocation === 'kitchen').reduce((s, t) => s + t.quantity, 0);
    const toStore = transfersInRange.filter(t => t.ingredientId === ingredientId && t.toLocation === 'store').reduce((s, t) => s + t.quantity, 0);
    const removed = removalsInRange.filter(r => r.ingredientId === ingredientId).reduce((s, r) => s + r.quantity, 0);
    return { purchased, toKitchen, toStore, removed };
  };

  // Selected ingredient detail
  const selectedIngredient = selectedIngredientId ? ingredients.find(i => i.id === selectedIngredientId) : null;
  const selectedActivity = selectedIngredientId ? getIngredientActivity(selectedIngredientId) : null;

  // CSV Export - Full stock report
  const handleExportFullReport = () => {
    const data = filteredIngredients.map(ing => {
      const cat = ingredientCategories.find(c => c.id === ing.category);
      const activity = getIngredientActivity(ing.id);
      const totalStock = ing.storeStock + ing.kitchenStock;
      return {
        name: ing.name,
        category: cat?.name || '-',
        unit: ing.unit,
        storeStock: ing.storeStock,
        kitchenStock: ing.kitchenStock,
        totalStock,
        costPerUnit: ing.costPerUnit,
        storeValue: ing.storeStock * ing.costPerUnit,
        kitchenValue: ing.kitchenStock * ing.costPerUnit,
        totalValue: totalStock * ing.costPerUnit,
        lowStockThreshold: ing.lowStockThreshold,
        status: totalStock <= ing.lowStockThreshold ? 'Low' : 'OK',
        purchased: activity.purchased,
        transferredToKitchen: activity.toKitchen,
        returnedToStore: activity.toStore,
        removed: activity.removed,
      };
    });

    exportToCSV(data, [
      { key: 'name', header: 'Ingredient' },
      { key: 'category', header: 'Category' },
      { key: 'unit', header: 'Unit' },
      { key: 'storeStock', header: 'Store Stock' },
      { key: 'kitchenStock', header: 'Kitchen Stock' },
      { key: 'totalStock', header: 'Total Stock' },
      { key: 'costPerUnit', header: 'Cost/Unit' },
      { key: 'storeValue', header: 'Store Value' },
      { key: 'kitchenValue', header: 'Kitchen Value' },
      { key: 'totalValue', header: 'Total Value' },
      { key: 'lowStockThreshold', header: 'Low Threshold' },
      { key: 'status', header: 'Status' },
      { key: 'purchased', header: `Purchased (${rangeLabel})` },
      { key: 'transferredToKitchen', header: `To Kitchen (${rangeLabel})` },
      { key: 'returnedToStore', header: `To Store (${rangeLabel})` },
      { key: 'removed', header: `Removed (${rangeLabel})` },
    ], `stock_report_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  // CSV Export - Transfer history
  const handleExportTransfers = () => {
    const data = transfersInRange.map(t => {
      const ing = ingredients.find(i => i.id === t.ingredientId);
      return {
        date: format(new Date(t.createdAt), 'dd MMM yyyy, hh:mm a'),
        ingredient: ing?.name || 'Unknown',
        unit: ing?.unit || '-',
        quantity: t.quantity,
        from: t.fromLocation,
        to: t.toLocation,
        reason: t.reason || '-',
      };
    });

    exportToCSV(data, [
      { key: 'date', header: 'Date & Time' },
      { key: 'ingredient', header: 'Ingredient' },
      { key: 'unit', header: 'Unit' },
      { key: 'quantity', header: 'Quantity' },
      { key: 'from', header: 'From' },
      { key: 'to', header: 'To' },
      { key: 'reason', header: 'Reason' },
    ], `transfer_history_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  // CSV Export - Low stock
  const handleExportLowStock = () => {
    const data = filteredIngredients
      .filter(ing => (ing.storeStock + ing.kitchenStock) <= ing.lowStockThreshold)
      .map(ing => {
        const cat = ingredientCategories.find(c => c.id === ing.category);
        const totalStock = ing.storeStock + ing.kitchenStock;
        return {
          name: ing.name,
          category: cat?.name || '-',
          unit: ing.unit,
          storeStock: ing.storeStock,
          kitchenStock: ing.kitchenStock,
          totalStock,
          threshold: ing.lowStockThreshold,
          deficit: ing.lowStockThreshold - totalStock,
          severity: totalStock === 0 ? 'Critical' : 'Warning',
        };
      });

    exportToCSV(data, [
      { key: 'name', header: 'Ingredient' },
      { key: 'category', header: 'Category' },
      { key: 'unit', header: 'Unit' },
      { key: 'storeStock', header: 'Store Stock' },
      { key: 'kitchenStock', header: 'Kitchen Stock' },
      { key: 'totalStock', header: 'Total' },
      { key: 'threshold', header: 'Threshold' },
      { key: 'deficit', header: 'Deficit' },
      { key: 'severity', header: 'Severity' },
    ], `low_stock_report_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Stock Report</h1>
          <p className="page-subtitle">Detailed inventory analysis with export options</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="section-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ingredient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="min-w-[160px]">
              <Label className="text-sm mb-1 block">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ingredientCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-sm mb-1 block">Period</Label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div>
                  <Label className="text-sm mb-1 block">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customFrom ? format(customFrom, 'dd MMM yyyy') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm mb-1 block">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customTo ? format(customTo, 'dd MMM yyyy') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Store Value</p>
              <p className="text-2xl font-bold">{formatPrice(totalStoreValue)}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-success/10 p-3 text-success">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kitchen Value</p>
              <p className="text-2xl font-bold">{formatPrice(totalKitchenValue)}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-accent/10 p-3 text-accent">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Inventory</p>
              <p className="text-2xl font-bold">{formatPrice(totalValue)}</p>
            </div>
          </div>
        </Card>
        <Card className={`stat-card ${lowStockCount > 0 ? 'border-destructive/50' : ''}`}>
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${lowStockCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold">{lowStockCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="overview">Full Overview</TabsTrigger>
            <TabsTrigger value="detail">Product Detail</TabsTrigger>
            <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
            <TabsTrigger value="transfers">Transfers ({rangeLabel})</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportFullReport} className="gap-2">
              <Download className="h-4 w-4" /> Full Report CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportLowStock} className="gap-2">
              <Download className="h-4 w-4" /> Low Stock CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportTransfers} className="gap-2">
              <Download className="h-4 w-4" /> Transfers CSV
            </Button>
          </div>
        </div>

        {/* Full Overview Tab */}
        <TabsContent value="overview">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="text-lg">Complete Stock Overview — {rangeLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Category</th>
                      <th>Unit</th>
                      <th className="text-right">Store</th>
                      <th className="text-right">Kitchen</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Cost/Unit</th>
                      <th className="text-right">Total Value</th>
                      <th className="text-right">Purchased</th>
                      <th className="text-right">To Kitchen</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.map(ing => {
                      const cat = ingredientCategories.find(c => c.id === ing.category);
                      const total = ing.storeStock + ing.kitchenStock;
                      const isLow = total <= ing.lowStockThreshold;
                      const activity = getIngredientActivity(ing.id);
                      return (
                        <tr key={ing.id} className={cn(isLow && 'bg-destructive/5', 'cursor-pointer hover:bg-muted/50')} onClick={() => setSelectedIngredientId(ing.id)}>
                          <td className="font-medium">{ing.name}</td>
                          <td className="text-muted-foreground">{cat?.name || '-'}</td>
                          <td>{ing.unit}</td>
                          <td className="text-right font-medium">{ing.storeStock.toFixed(2)}</td>
                          <td className="text-right font-medium">{ing.kitchenStock.toFixed(2)}</td>
                          <td className="text-right font-bold">{total.toFixed(2)}</td>
                          <td className="text-right text-muted-foreground">{formatPrice(ing.costPerUnit)}</td>
                          <td className="text-right font-medium">{formatPrice(total * ing.costPerUnit)}</td>
                          <td className="text-right text-muted-foreground">{activity.purchased > 0 ? activity.purchased.toFixed(2) : '-'}</td>
                          <td className="text-right text-muted-foreground">{activity.toKitchen > 0 ? activity.toKitchen.toFixed(2) : '-'}</td>
                          <td>
                            <span className={isLow ? 'badge-destructive' : 'badge-success'}>{isLow ? 'Low' : 'OK'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={7} className="text-right">Totals:</td>
                      <td className="text-right">{formatPrice(totalValue)}</td>
                      <td className="text-right">{purchasesInRange.reduce((s, p) => s + p.quantity, 0).toFixed(2)}</td>
                      <td className="text-right">{transfersInRange.filter(t => t.toLocation === 'kitchen').reduce((s, t) => s + t.quantity, 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Detail Tab */}
        <TabsContent value="detail">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Ingredient selector */}
            <Card className="section-card md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Select Ingredient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredIngredients.map(ing => {
                  const total = ing.storeStock + ing.kitchenStock;
                  const isLow = total <= ing.lowStockThreshold;
                  return (
                    <div
                      key={ing.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedIngredientId === ing.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50',
                        isLow && 'border-destructive/30'
                      )}
                      onClick={() => setSelectedIngredientId(ing.id)}
                    >
                      <div>
                        <p className="font-medium text-sm">{ing.name}</p>
                        <p className="text-xs text-muted-foreground">{ing.unit}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded', isLow ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
                        {total.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Detail view */}
            <Card className="section-card md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedIngredient ? selectedIngredient.name : 'Select an ingredient'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedIngredient && selectedActivity ? (
                  <div className="space-y-6">
                    {/* Stock bars */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Store Stock</span>
                          <span className="font-bold">{selectedIngredient.storeStock.toFixed(2)} {selectedIngredient.unit}</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, (selectedIngredient.storeStock / Math.max(selectedIngredient.lowStockThreshold * 3, 1)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Value: {formatPrice(selectedIngredient.storeStock * selectedIngredient.costPerUnit)}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Kitchen Stock</span>
                          <span className="font-bold">{selectedIngredient.kitchenStock.toFixed(2)} {selectedIngredient.unit}</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-success transition-all"
                            style={{ width: `${Math.min(100, (selectedIngredient.kitchenStock / Math.max(selectedIngredient.lowStockThreshold * 3, 1)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Value: {formatPrice(selectedIngredient.kitchenStock * selectedIngredient.costPerUnit)}</p>
                      </div>
                    </div>

                    {/* Summary info */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Total Stock</p>
                        <p className="text-lg font-bold">{(selectedIngredient.storeStock + selectedIngredient.kitchenStock).toFixed(2)} {selectedIngredient.unit}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Total Value</p>
                        <p className="text-lg font-bold">{formatPrice((selectedIngredient.storeStock + selectedIngredient.kitchenStock) * selectedIngredient.costPerUnit)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Cost per Unit</p>
                        <p className="text-lg font-bold">{formatPrice(selectedIngredient.costPerUnit)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Low Threshold</p>
                        <p className="text-lg font-bold">{selectedIngredient.lowStockThreshold} {selectedIngredient.unit}</p>
                      </div>
                    </div>

                    {/* Activity in period */}
                    <div>
                      <h4 className="font-medium mb-3">Activity — {rangeLabel}</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Purchased</p>
                          <p className="text-lg font-bold text-primary">{selectedActivity.purchased > 0 ? `+${selectedActivity.purchased.toFixed(2)}` : '-'}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">To Kitchen</p>
                          <p className="text-lg font-bold text-orange-600">{selectedActivity.toKitchen > 0 ? selectedActivity.toKitchen.toFixed(2) : '-'}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Returned to Store</p>
                          <p className="text-lg font-bold text-success">{selectedActivity.toStore > 0 ? `+${selectedActivity.toStore.toFixed(2)}` : '-'}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Removed/Wasted</p>
                          <p className="text-lg font-bold text-destructive">{selectedActivity.removed > 0 ? `-${selectedActivity.removed.toFixed(2)}` : '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 font-medium">Click an ingredient to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="lowstock">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockCount > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Category</th>
                        <th>Unit</th>
                        <th className="text-right">Store</th>
                        <th className="text-right">Kitchen</th>
                        <th className="text-right">Total</th>
                        <th className="text-right">Threshold</th>
                        <th className="text-right">Deficit</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIngredients
                        .filter(ing => (ing.storeStock + ing.kitchenStock) <= ing.lowStockThreshold)
                        .sort((a, b) => (a.storeStock + a.kitchenStock) - (b.storeStock + b.kitchenStock))
                        .map(ing => {
                          const cat = ingredientCategories.find(c => c.id === ing.category);
                          const total = ing.storeStock + ing.kitchenStock;
                          const deficit = ing.lowStockThreshold - total;
                          const isCritical = total === 0;
                          return (
                            <tr key={ing.id} className={isCritical ? 'bg-destructive/10' : 'bg-destructive/5'}>
                              <td className="font-medium">{ing.name}</td>
                              <td className="text-muted-foreground">{cat?.name || '-'}</td>
                              <td>{ing.unit}</td>
                              <td className="text-right">{ing.storeStock.toFixed(2)}</td>
                              <td className="text-right">{ing.kitchenStock.toFixed(2)}</td>
                              <td className="text-right font-bold">{total.toFixed(2)}</td>
                              <td className="text-right text-muted-foreground">{ing.lowStockThreshold}</td>
                              <td className="text-right font-medium text-destructive">{deficit.toFixed(2)}</td>
                              <td>
                                <span className={isCritical ? 'badge-destructive' : 'badge-warning'}>
                                  {isCritical ? 'Critical' : 'Warning'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-success/50" />
                  <p className="mt-4 font-medium text-success">All stock levels are healthy!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="text-lg">Transfer History — {rangeLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {transfersInRange.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Ingredient</th>
                        <th className="text-right">Quantity</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...transfersInRange]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(t => {
                          const ing = ingredients.find(i => i.id === t.ingredientId);
                          return (
                            <tr key={t.id}>
                              <td className="text-muted-foreground text-sm">{format(new Date(t.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                              <td className="font-medium">{ing?.name || 'Unknown'}</td>
                              <td className="text-right">{t.quantity.toFixed(2)} {ing?.unit || ''}</td>
                              <td>
                                <span className="capitalize px-2 py-1 rounded text-xs bg-muted">{t.fromLocation}</span>
                              </td>
                              <td>
                                <span className={cn('capitalize px-2 py-1 rounded text-xs', t.toLocation === 'kitchen' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>{t.toLocation}</span>
                              </td>
                              <td className="text-muted-foreground text-sm">{t.reason || '-'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 font-medium">No transfers in this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
