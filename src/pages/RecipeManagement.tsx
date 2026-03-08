import { useState } from 'react';
import { Plus, X, BookOpen, Banknote, Search, ChefHat } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { RecipeIngredient, MenuItem } from '@/types/restaurant';

export default function RecipeManagement() {
  const { menuItems, menuCategories, ingredients, settings, updateMenuItem, calculateRecipeCost } = useRestaurant();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [recipe, setRecipe] = useState<RecipeIngredient[]>([]);
  const [newIngredient, setNewIngredient] = useState({ ingredientId: '', quantity: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  const selectedItem = menuItems.find((item) => item.id === selectedItemId);

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category
  const itemsByCategory = menuCategories.map((cat) => ({
    category: cat,
    items: filteredItems.filter((item) => item.categoryId === cat.id),
  })).filter((group) => group.items.length > 0);

  const handleEditRecipe = (itemId: string) => {
    const item = menuItems.find((m) => m.id === itemId);
    if (item) {
      setSelectedItemId(itemId);
      setRecipe([...item.recipe]);
      setShowDialog(true);
    }
  };

  const handleAddIngredient = () => {
    if (!newIngredient.ingredientId || !newIngredient.quantity) {
      toast.error('Please select an ingredient and enter quantity');
      return;
    }

    const quantity = parseFloat(newIngredient.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (recipe.some((r) => r.ingredientId === newIngredient.ingredientId)) {
      toast.error('Ingredient already in recipe');
      return;
    }

    setRecipe([...recipe, { ingredientId: newIngredient.ingredientId, quantity }]);
    setNewIngredient({ ingredientId: '', quantity: '' });
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setRecipe(recipe.filter((r) => r.ingredientId !== ingredientId));
  };

  const handleUpdateQuantity = (ingredientId: string, newQty: string) => {
    const quantity = parseFloat(newQty);
    if (isNaN(quantity) || quantity <= 0) return;
    
    setRecipe(recipe.map((r) =>
      r.ingredientId === ingredientId ? { ...r, quantity } : r
    ));
  };

  const handleSaveRecipe = () => {
    if (selectedItemId) {
      updateMenuItem(selectedItemId, { recipe });
      toast.success('Recipe saved successfully');
      setShowDialog(false);
    }
  };

  const getRecipeCost = () => calculateRecipeCost(recipe);

  const getItemStats = (item: MenuItem) => {
    const recipeCost = calculateRecipeCost(item.recipe);
    const profitMargin = item.price > 0 ? ((item.price - recipeCost) / item.price) * 100 : 0;
    return { recipeCost, profitMargin };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Recipe Management</h1>
        <p className="page-subtitle">Create and manage recipes with ingredient costing</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items by Category */}
      {itemsByCategory.map(({ category, items }) => (
        <Card key={category.id} className="section-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{category.icon}</span>
              {category.name}
            </CardTitle>
            <CardDescription>{items.length} items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const { recipeCost, profitMargin } = getItemStats(item);
                const hasRecipe = item.recipe.length > 0;

                return (
                  <div key={item.id} className="rounded-lg border p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Price: {formatPrice(item.price)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleEditRecipe(item.id)}>
                        {hasRecipe ? 'Edit Recipe' : 'Add Recipe'}
                      </Button>
                    </div>

                    {hasRecipe ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ingredients:</span>
                          <span>{item.recipe.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Recipe Cost:</span>
                          <span className="font-medium">{formatPrice(recipeCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Profit Margin:</span>
                          <span className={`font-medium ${profitMargin >= 50 ? 'text-success' : profitMargin >= 30 ? 'text-warning' : 'text-destructive'}`}>
                            {profitMargin.toFixed(0)}%
                          </span>
                        </div>
                        {/* Quick ingredient preview */}
                        <div className="pt-2 border-t mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Ingredients:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.recipe.slice(0, 3).map((r) => {
                              const ing = ingredients.find((i) => i.id === r.ingredientId);
                              return ing ? (
                                <span key={r.ingredientId} className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {ing.name}
                                </span>
                              ) : null;
                            })}
                            {item.recipe.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{item.recipe.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                        <ChefHat className="h-4 w-4 mr-2" />
                        No recipe defined
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {menuItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 font-medium">No menu items</p>
          <p className="text-sm text-muted-foreground">Add food items first to create recipes</p>
        </div>
      )}

      {/* Edit Recipe Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Recipe: {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Add Ingredient Form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add Ingredient</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Select
                    value={newIngredient.ingredientId}
                    onValueChange={(v) => setNewIngredient({ ...newIngredient, ingredientId: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients
                        .filter((ing) => !recipe.some((r) => r.ingredientId === ing.id))
                        .map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} ({formatPrice(ing.costPerUnit)}/{ing.unit})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Quantity"
                    className="w-32"
                    value={newIngredient.quantity}
                    onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                  />
                  <Button onClick={handleAddIngredient}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Recipe */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recipe Ingredients ({recipe.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {recipe.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No ingredients added yet. Add ingredients above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recipe.map((r) => {
                      const ing = ingredients.find((i) => i.id === r.ingredientId);
                      if (!ing) return null;
                      const cost = ing.costPerUnit * r.quantity;
                      return (
                        <div key={r.ingredientId} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-medium min-w-[150px]">{ing.name}</span>
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={r.quantity}
                              onChange={(e) => handleUpdateQuantity(r.ingredientId, e.target.value)}
                              className="w-24 h-8"
                            />
                            <span className="text-sm text-muted-foreground">{ing.unit}</span>
                            <span className="text-sm text-muted-foreground">@ {formatPrice(ing.costPerUnit)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{formatPrice(cost)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveIngredient(r.ingredientId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    <span className="font-medium">Total Recipe Cost</span>
                  </div>
                  <span className="text-3xl font-bold text-primary">{formatPrice(getRecipeCost())}</span>
                </div>
                {selectedItem && (
                  <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Selling Price</p>
                      <p className="text-lg font-semibold">{formatPrice(selectedItem.price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className="text-lg font-semibold text-success">
                        {formatPrice(selectedItem.price - getRecipeCost())}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Margin</p>
                      <p className={`text-lg font-semibold ${
                        selectedItem.price > 0 && ((selectedItem.price - getRecipeCost()) / selectedItem.price) * 100 >= 50
                          ? 'text-success'
                          : 'text-warning'
                      }`}>
                        {selectedItem.price > 0
                          ? (((selectedItem.price - getRecipeCost()) / selectedItem.price) * 100).toFixed(0)
                          : 0}%
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRecipe}>Save Recipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
