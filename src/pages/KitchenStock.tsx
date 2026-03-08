import { useState } from 'react';
import { ChefHat, ArrowLeft, Package, AlertTriangle, History } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function KitchenStock() {
  const { ingredients, ingredientCategories, settings, transferToStore, getLowStockAlerts, stockTransfers } = useRestaurant();
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');

  const lowStockAlerts = getLowStockAlerts();
  const kitchenIngredients = ingredients.filter((ing) => ing.kitchenStock > 0);

  // Get recent stock transfers sorted by date
  const recentTransfers = [...stockTransfers]
    .filter((t) => t.toLocation === 'kitchen' || t.fromLocation === 'kitchen')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  const getIngredientName = (id: string) => ingredients.find((i) => i.id === id)?.name || 'Unknown';

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  const handleReturnToStore = () => {
    if (!selectedIngredient || !quantity) {
      toast.error('Please select ingredient and enter quantity');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const ing = ingredients.find((i) => i.id === selectedIngredient);
    if (ing && qty > ing.kitchenStock) {
      toast.error(`Insufficient stock. Available: ${ing.kitchenStock} ${ing.unit}`);
      return;
    }

    transferToStore(selectedIngredient, qty);
    toast.success('Stock returned to store');
    setShowReturnDialog(false);
    setSelectedIngredient('');
    setQuantity('');
  };

  const totalKitchenValue = ingredients.reduce((sum, ing) => sum + ing.kitchenStock * ing.costPerUnit, 0);
  const totalKitchenItems = kitchenIngredients.length;
  const lowStockCount = lowStockAlerts.filter(alert => alert.ingredient.kitchenStock > 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Kitchen Stock</h1>
          <p className="page-subtitle">View and manage kitchen inventory</p>
        </div>
        <Button variant="outline" onClick={() => setShowReturnDialog(true)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Return to Store
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
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
            <div className="rounded-xl bg-success/10 p-3 text-success">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items in Kitchen</p>
              <p className="text-2xl font-bold">{totalKitchenItems}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-accent/10 p-3 text-accent">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ingredients</p>
              <p className="text-2xl font-bold">{ingredients.length}</p>
            </div>
          </div>
        </Card>
        <Card className={`stat-card ${lowStockCount > 0 ? 'border-destructive/50' : ''}`}>
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${lowStockCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
              <p className="text-2xl font-bold">{lowStockCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Current Stock</TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Deduction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          {/* Kitchen Stock by Category */}
          {ingredientCategories.map((category) => {
            const categoryIngredients = kitchenIngredients.filter((ing) => ing.category === category.id);
            if (categoryIngredients.length === 0) return null;

            return (
              <Card key={category.id} className="section-card mb-4">
                <CardHeader>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Unit</th>
                          <th>Kitchen Stock</th>
                          <th>Cost/Unit</th>
                          <th>Total Value</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryIngredients.map((ing) => {
                          const totalStock = ing.storeStock + ing.kitchenStock;
                          const isLow = totalStock <= ing.lowStockThreshold;
                          const value = ing.kitchenStock * ing.costPerUnit;

                          return (
                            <tr key={ing.id} className={isLow ? 'bg-destructive/5' : ''}>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <ChefHat className="h-5 w-5 text-primary" />
                                  </div>
                                  <span className="font-medium">{ing.name}</span>
                                </div>
                              </td>
                              <td>{ing.unit}</td>
                              <td className="font-medium">{ing.kitchenStock.toFixed(2)}</td>
                              <td className="text-muted-foreground">{formatPrice(ing.costPerUnit)}</td>
                              <td className="font-medium">{formatPrice(value)}</td>
                              <td>
                                <span className={isLow ? 'badge-destructive' : 'badge-success'}>
                                  {isLow ? 'Low' : 'OK'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {kitchenIngredients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ChefHat className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 font-medium">No items in kitchen</p>
              <p className="text-sm text-muted-foreground">Transfer items from store to kitchen</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="text-lg">Stock Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransfers.length > 0 ? (
                <div className="overflow-hidden rounded-lg border">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Ingredient</th>
                        <th>Quantity</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransfers.map((transfer) => (
                        <tr key={transfer.id}>
                          <td className="text-muted-foreground">
                            {format(new Date(transfer.createdAt), 'dd MMM yyyy, hh:mm a')}
                          </td>
                          <td className="font-medium">{getIngredientName(transfer.ingredientId)}</td>
                          <td>{transfer.quantity.toFixed(2)}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-sm ${
                              transfer.toLocation === 'kitchen' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {transfer.toLocation === 'kitchen' ? 'To Kitchen' : 'To Store'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 font-medium">No transfers yet</p>
                  <p className="text-sm text-muted-foreground">Stock transfers will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Return to Store Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ingredient</Label>
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {kitchenIngredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} - Available: {ing.kitchenStock} {ing.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-qty">Quantity to Return</Label>
              <Input
                id="return-qty"
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>Cancel</Button>
            <Button onClick={handleReturnToStore}>Return to Store</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
