import { useState } from 'react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, DollarSign, Package, TrendingUp, AlertTriangle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function DirectStockSales() {
  const { ingredients, ingredientCategories, stockSales, settings, sellStock, removeStock } = useRestaurant();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  
  // Sale form state
  const [saleQuantity, setSaleQuantity] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  
  // Remove form state
  const [removeQuantity, setRemoveQuantity] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [removeLocation, setRemoveLocation] = useState<'store' | 'kitchen'>('kitchen');

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  // Filter ingredients
  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from ingredients
  const categories = [...new Set(ingredients.map(ing => ing.category))];

  const handleOpenSaleDialog = (ingredient: any) => {
    setSelectedIngredient(ingredient);
    setSaleQuantity('');
    setSalePrice(ingredient.costPerUnit.toString());
    setCustomerName('');
    setSaleNotes('');
    setShowSaleDialog(true);
  };

  const handleOpenRemoveDialog = (ingredient: any) => {
    setSelectedIngredient(ingredient);
    setRemoveQuantity('');
    setRemoveReason('');
    setRemoveLocation('kitchen');
    setShowRemoveDialog(true);
  };

  const handleSellStock = async () => {
    if (!selectedIngredient) return;
    const qty = parseFloat(saleQuantity);
    const price = parseFloat(salePrice);
    
    if (!qty || qty <= 0 || !price || price <= 0) return;
    
    await sellStock(
      selectedIngredient.id,
      qty,
      price,
      customerName || undefined,
      saleNotes || undefined
    );
    
    setShowSaleDialog(false);
  };

  const handleRemoveStock = async () => {
    if (!selectedIngredient || !removeReason.trim()) return;
    const qty = parseFloat(removeQuantity);
    
    if (!qty || qty <= 0) return;
    
    await removeStock(
      selectedIngredient.id,
      qty,
      removeReason,
      removeLocation
    );
    
    setShowRemoveDialog(false);
  };

  // Calculate profit for sale preview
  const saleProfit = selectedIngredient && saleQuantity && salePrice
    ? (parseFloat(salePrice) - selectedIngredient.costPerUnit) * parseFloat(saleQuantity)
    : 0;

  // Recent sales
  const recentSales = stockSales
    .slice(0, 10)
    .map(sale => ({
      ...sale,
      ingredientName: ingredients.find(i => i.id === sale.ingredientId)?.name || 'Unknown',
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Direct Stock Sales</h1>
          <p className="text-muted-foreground mt-1">
            Sell ingredients directly (e.g., sell beef, vegetables to customers)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(
                stockSales
                  .filter(s => new Date(s.saleDate).toDateString() === new Date().toDateString())
                  .reduce((sum, s) => sum + s.totalSale, 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(
                stockSales
                  .filter(s => new Date(s.saleDate).toDateString() === new Date().toDateString())
                  .reduce((sum, s) => sum + s.profit, 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold Today</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockSales.filter(s => new Date(s.saleDate).toDateString() === new Date().toDateString()).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ingredients List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Stock</CardTitle>
          <CardDescription>Select an ingredient to sell or remove</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Store Stock</TableHead>
                <TableHead className="text-right">Kitchen Stock</TableHead>
                <TableHead className="text-right">Cost/Unit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIngredients.map((ingredient) => (
                <TableRow key={ingredient.id}>
                  <TableCell className="font-medium">{ingredient.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ingredient.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {ingredient.storeStock.toFixed(2)} {ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {ingredient.kitchenStock.toFixed(2)} {ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(ingredient.costPerUnit)}/{ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenSaleDialog(ingredient)}
                        disabled={ingredient.storeStock <= 0}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Sell
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleOpenRemoveDialog(ingredient)}
                        disabled={ingredient.storeStock + ingredient.kitchenStock <= 0}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Customer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{format(new Date(sale.saleDate), 'PP')}</TableCell>
                    <TableCell className="font-medium">{sale.ingredientName}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right">{formatPrice(sale.salePrice)}</TableCell>
                    <TableCell className="text-right">{formatPrice(sale.totalSale)}</TableCell>
                    <TableCell className="text-right">
                      <span className={sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPrice(sale.profit)}
                      </span>
                    </TableCell>
                    <TableCell>{sale.customerName || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sell Stock Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sell {selectedIngredient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Available: {selectedIngredient?.storeStock.toFixed(2)} {selectedIngredient?.unit}</p>
                <p className="text-xs text-muted-foreground">Cost: {formatPrice(selectedIngredient?.costPerUnit || 0)}/{selectedIngredient?.unit}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity ({selectedIngredient?.unit})</Label>
              <Input
                type="number"
                min="0"
                max={selectedIngredient?.storeStock}
                step="0.01"
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-2">
              <Label>Sale Price per {selectedIngredient?.unit}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Enter sale price"
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Name (Optional)</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            {saleQuantity && salePrice && (
              <div className="p-3 rounded-lg bg-primary/10 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Sale:</span>
                  <span className="font-bold">{formatPrice(parseFloat(salePrice) * parseFloat(saleQuantity))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost:</span>
                  <span>{formatPrice((selectedIngredient?.costPerUnit || 0) * parseFloat(saleQuantity))}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span>Profit:</span>
                  <span className={saleProfit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {formatPrice(saleProfit)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaleDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSellStock}
              disabled={!saleQuantity || parseFloat(saleQuantity) <= 0 || !salePrice || parseFloat(salePrice) <= 0}
            >
              Confirm Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Stock Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove {selectedIngredient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Store: {selectedIngredient?.storeStock.toFixed(2)} {selectedIngredient?.unit} | 
                  Kitchen: {selectedIngredient?.kitchenStock.toFixed(2)} {selectedIngredient?.unit}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remove From</Label>
              <Select value={removeLocation} onValueChange={(v) => setRemoveLocation(v as 'store' | 'kitchen')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Kitchen Stock</SelectItem>
                  <SelectItem value="store">Store Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity ({selectedIngredient?.unit})</Label>
              <Input
                type="number"
                min="0"
                max={removeLocation === 'store' ? selectedIngredient?.storeStock : selectedIngredient?.kitchenStock}
                step="0.01"
                value={removeQuantity}
                onChange={(e) => setRemoveQuantity(e.target.value)}
                placeholder="Enter quantity to remove"
              />
            </div>

            <div className="space-y-2">
              <Label>Reason for Removal *</Label>
              <Textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="e.g., Rejected by cook, expired, damaged, spoiled..."
                rows={3}
              />
            </div>

            {removeQuantity && selectedIngredient && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <p>Loss: {formatPrice((selectedIngredient.costPerUnit || 0) * parseFloat(removeQuantity))}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={handleRemoveStock}
              disabled={!removeQuantity || parseFloat(removeQuantity) <= 0 || !removeReason.trim()}
            >
              Remove Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
