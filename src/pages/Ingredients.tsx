import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Ingredient } from '@/types/restaurant';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

export default function Ingredients() {
  const { ingredients, ingredientCategories, addIngredient, updateIngredient, deleteIngredient } = useRestaurant();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    costPerUnit: '',
    category: '',
    lowStockThreshold: '',
    storeStock: '',
    kitchenStock: '',
  });
  
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || ing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenDialog = (item?: Ingredient) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        unit: item.unit,
        costPerUnit: item.costPerUnit.toString(),
        category: item.category,
        lowStockThreshold: item.lowStockThreshold.toString(),
        storeStock: item.storeStock.toString(),
        kitchenStock: item.kitchenStock.toString(),
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        unit: 'kg',
        costPerUnit: '',
        category: ingredientCategories[0]?.id || '',
        lowStockThreshold: '',
        storeStock: '0',
        kitchenStock: '0',
      });
    }
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.unit || !formData.costPerUnit || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    const costPerUnit = parseFloat(formData.costPerUnit);
    const lowStockThreshold = parseFloat(formData.lowStockThreshold) || 0;
    const storeStock = parseFloat(formData.storeStock) || 0;
    const kitchenStock = parseFloat(formData.kitchenStock) || 0;

    if (isNaN(costPerUnit) || costPerUnit <= 0) {
      toast.error('Please enter a valid cost');
      return;
    }

    if (editingItem) {
      updateIngredient(editingItem.id, {
        name: formData.name,
        unit: formData.unit,
        costPerUnit,
        category: formData.category,
        lowStockThreshold,
        storeStock,
        kitchenStock,
      });
      toast.success('Ingredient updated');
    } else {
      addIngredient({
        name: formData.name,
        unit: formData.unit,
        costPerUnit,
        category: formData.category,
        lowStockThreshold,
        storeStock,
        kitchenStock,
      });
      toast.success('Ingredient added');
    }
    setShowDialog(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteIngredient(deleteTarget.id);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getTotalStock = (ing: Ingredient) => ing.storeStock + ing.kitchenStock;
  const isLowStock = (ing: Ingredient) => getTotalStock(ing) <= ing.lowStockThreshold;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Ingredients</h1>
          <p className="page-subtitle">Manage your ingredient inventory</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Ingredient
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory || 'all'} onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ingredientCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ingredients Table */}
      <div className="section-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Cost/Unit</th>
              <th>Store Stock</th>
              <th>Kitchen Stock</th>
              <th>Threshold</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIngredients.map((ing) => {
              const category = ingredientCategories.find((c) => c.id === ing.category);
              const lowStock = isLowStock(ing);
              return (
                <tr key={ing.id} className={lowStock ? 'bg-destructive/5' : ''}>
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
                  <td className="font-medium">${ing.costPerUnit.toFixed(2)}</td>
                  <td>{ing.storeStock.toFixed(2)}</td>
                  <td>{ing.kitchenStock.toFixed(2)}</td>
                  <td className="text-muted-foreground">{ing.lowStockThreshold}</td>
                  <td>
                    <span className={lowStock ? 'badge-destructive' : 'badge-success'}>
                      {lowStock ? 'Low Stock' : 'OK'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(ing)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(ing)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredIngredients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium">No ingredients found</p>
            <p className="text-sm text-muted-foreground">Add your first ingredient to get started</p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Ingredient' : 'Add Ingredient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Chicken Breast"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="g">Gram (g)</SelectItem>
                    <SelectItem value="L">Liter (L)</SelectItem>
                    <SelectItem value="ml">Milliliter (ml)</SelectItem>
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="dozen">Dozen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost per Unit ($) *</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ingredientCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="store">Store Stock</Label>
                <Input
                  id="store"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.storeStock}
                  onChange={(e) => setFormData({ ...formData, storeStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kitchen">Kitchen Stock</Label>
                <Input
                  id="kitchen"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.kitchenStock}
                  onChange={(e) => setFormData({ ...formData, kitchenStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Low Stock Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingItem ? 'Update' : 'Add'} Ingredient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Ingredient?"
        description={`This will permanently delete "${deleteTarget?.name}" and remove it from all recipes. This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
