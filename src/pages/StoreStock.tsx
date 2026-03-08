import { useState } from 'react';
import { Package, ArrowRight, Plus, AlertTriangle, Warehouse, History } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StoreStock() {
  const { ingredients, ingredientCategories, settings, addStoreStock, transferToKitchen, getLowStockAlerts, getStockPurchaseHistory } = useRestaurant();
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');

  const lowStockAlerts = getLowStockAlerts();

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  const handleAddStock = () => {
    if (!selectedIngredient || !quantity || !unitCost) {
      toast.error('Please fill all fields');
      return;
    }

    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      toast.error('Please enter a valid unit cost');
      return;
    }

    addStoreStock(selectedIngredient, qty, cost);
    toast.success('Stock added successfully');
    setShowAddStockDialog(false);
    setSelectedIngredient('');
    setQuantity('');
    setUnitCost('');
  };

  const handleTransfer = () => {
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
    if (ing && qty > ing.storeStock) {
      toast.error(`Insufficient stock. Available: ${ing.storeStock} ${ing.unit}`);
      return;
    }

    transferToKitchen(selectedIngredient, qty);
    toast.success('Stock transferred to kitchen');
    setShowTransferDialog(false);
    setSelectedIngredient('');
    setQuantity('');
  };

  const handleOpenHistory = (ingredientId: string) => {
    setSelectedIngredient(ingredientId);
    setShowHistoryDialog(true);
  };

  const totalStoreValue = ingredients.reduce((sum, ing) => sum + ing.storeStock * ing.costPerUnit, 0);
  const totalKitchenValue = ingredients.reduce((sum, ing) => sum + ing.kitchenStock * ing.costPerUnit, 0);

  const selectedIngredientData = ingredients.find((i) => i.id === selectedIngredient);
  const purchaseHistory = selectedIngredient ? getStockPurchaseHistory(selectedIngredient) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Store Stock</h1>
          <p className="page-subtitle">Manage store inventory and transfers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTransferDialog(true)} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Transfer to Kitchen
          </Button>
          <Button onClick={() => setShowAddStockDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Stock
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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
              <Package className="h-6 w-6" />
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
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{ingredients.length}</p>
            </div>
          </div>
        </Card>
        <Card className={`stat-card ${lowStockAlerts.length > 0 ? 'border-destructive/50' : ''}`}>
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${lowStockAlerts.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
              <p className="text-2xl font-bold">{lowStockAlerts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lowStockAlerts.map((alert) => (
                <div
                  key={alert.ingredient.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    alert.severity === 'critical' ? 'border-destructive bg-destructive/10' : 'border-warning bg-warning/10'
                  }`}
                >
                  <div>
                    <p className="font-medium">{alert.ingredient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.currentTotal.toFixed(2)} / {alert.threshold} {alert.ingredient.unit}
                    </p>
                  </div>
                  <span className={alert.severity === 'critical' ? 'badge-destructive' : 'badge-warning'}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Stock Table */}
      <Card className="section-card">
        <CardHeader>
          <CardTitle>Store Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Avg Cost</th>
                  <th>Store Stock</th>
                  <th>Kitchen Stock</th>
                  <th>Total</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const category = ingredientCategories.find((c) => c.id === ing.category);
                  const totalStock = ing.storeStock + ing.kitchenStock;
                  const isLow = totalStock <= ing.lowStockThreshold;
                  const totalValue = totalStock * ing.costPerUnit;

                  return (
                    <tr key={ing.id} className={isLow ? 'bg-destructive/5' : ''}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium">{ing.name}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{category?.name || '-'}</td>
                      <td>{ing.unit}</td>
                      <td className="font-medium">{formatPrice(ing.costPerUnit)}</td>
                      <td className="font-medium">{ing.storeStock.toFixed(2)}</td>
                      <td className="text-muted-foreground">{ing.kitchenStock.toFixed(2)}</td>
                      <td className="font-medium">{totalStock.toFixed(2)}</td>
                      <td className="font-medium">{formatPrice(totalValue)}</td>
                      <td>
                        <span className={isLow ? 'badge-destructive' : 'badge-success'}>
                          {isLow ? 'Low' : 'OK'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenHistory(ing.id)}
                            title="View purchase history"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={ing.storeStock <= 0}
                            onClick={() => {
                              setSelectedIngredient(ing.id);
                              setShowTransferDialog(true);
                            }}
                          >
                            Transfer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Stock Dialog */}
      <Dialog open={showAddStockDialog} onOpenChange={setShowAddStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock to Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ingredient</Label>
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-cost">Unit Cost ({settings.currencySymbol})</Label>
              <Input
                id="unit-cost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Enter cost per unit"
              />
            </div>
            {selectedIngredient && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">
                  Current avg cost: <strong>{formatPrice(ingredients.find(i => i.id === selectedIngredient)?.costPerUnit || 0)}</strong>
                </p>
                <p className="text-muted-foreground mt-1">
                  The weighted average cost will be recalculated after this purchase.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStockDialog(false)}>Cancel</Button>
            <Button onClick={handleAddStock}>Add Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Kitchen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ingredient</Label>
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.filter((ing) => ing.storeStock > 0).map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} - Available: {ing.storeStock} {ing.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-qty">Quantity to Transfer</Label>
              <Input
                id="transfer-qty"
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
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button onClick={handleTransfer}>Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Purchase History - {selectedIngredientData?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {purchaseHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No purchase history available
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">Weighted Average Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(selectedIngredientData?.costPerUnit || 0)} / {selectedIngredientData?.unit}
                  </p>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Qty</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseHistory.map((purchase) => (
                        <tr key={purchase.id}>
                          <td className="text-sm">
                            {format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}
                          </td>
                          <td>{purchase.quantity.toFixed(2)}</td>
                          <td>{formatPrice(purchase.unitCost)}</td>
                          <td className="font-medium">{formatPrice(purchase.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}