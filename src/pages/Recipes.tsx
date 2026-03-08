import { useState } from 'react';
import { Plus, X, BookOpen, Banknote } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { RecipeIngredient } from '@/types/restaurant';

export default function Recipes() {
  const { menuItems, menuCategories, ingredients, settings, updateMenuItem, calculateRecipeCost } = useRestaurant();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [recipe, setRecipe] = useState<RecipeIngredient[]>([]);
  const [newIngredient, setNewIngredient] = useState({ ingredientId: '', quantity: '' });

  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  const selectedItem = menuItems.find((item) => item.id === selectedItemId);

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

    // Check if ingredient already in recipe
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

  const handleSaveRecipe = () => {
    if (selectedItemId) {
      updateMenuItem(selectedItemId, { recipe });
      toast.success('Recipe updated successfully');
      setShowDialog(false);
    }
  };

  const getRecipeCost = () => calculateRecipeCost(recipe);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Recipe Builder</h1>
        <p className="page-subtitle">Create and manage recipes with ingredient costing</p>
      </div>

      {/* Menu Items with Recipes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => {
          const category = menuCategories.find((c) => c.id === item.categoryId);
          const recipeCost = calculateRecipeCost(item.recipe);
          const profitMargin = item.price > 0 ? ((item.price - recipeCost) / item.price) * 100 : 0;

          return (
            <Card key={item.id} className="section-card overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category?.icon || '🍽️'}</span>
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{category?.name}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEditRecipe(item.id)}>
                    Edit Recipe
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recipe Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-semibold">{formatPrice(item.price)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Cost</p>
                    <p className="font-semibold">{formatPrice(recipeCost)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Margin</p>
                    <p className={`font-semibold ${profitMargin >= 50 ? 'text-success' : 'text-warning'}`}>
                      {profitMargin.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Ingredients List */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Ingredients ({item.recipe.length})
                  </p>
                  {item.recipe.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No recipe defined</p>
                  ) : (
                    <div className="space-y-1">
                      {item.recipe.slice(0, 3).map((r) => {
                        const ing = ingredients.find((i) => i.id === r.ingredientId);
                        return ing ? (
                          <div key={r.ingredientId} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{ing.name}</span>
                            <span>{r.quantity} {ing.unit}</span>
                          </div>
                        ) : null;
                      })}
                      {item.recipe.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{item.recipe.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {menuItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 font-medium">No menu items</p>
          <p className="text-sm text-muted-foreground">Add menu items first to create recipes</p>
        </div>
      )}

      {/* Edit Recipe Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Recipe: {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Add Ingredient Form */}
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
                placeholder="Qty"
                className="w-28"
                value={newIngredient.quantity}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
              />
              <Button onClick={handleAddIngredient}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Current Recipe */}
            <div className="space-y-2">
              <Label>Recipe Ingredients</Label>
              {recipe.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No ingredients added yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recipe.map((r) => {
                    const ing = ingredients.find((i) => i.id === r.ingredientId);
                    if (!ing) return null;
                    const cost = ing.costPerUnit * r.quantity;
                    return (
                      <div key={r.ingredientId} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{ing.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {r.quantity} {ing.unit} @ {formatPrice(ing.costPerUnit)}
                          </span>
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
            </div>

            {/* Cost Summary */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  <span className="font-medium">Total Recipe Cost</span>
                </div>
                <span className="text-2xl font-bold text-primary">{formatPrice(getRecipeCost())}</span>
              </div>
              {selectedItem && (
                <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                  <span>Selling Price: {formatPrice(selectedItem.price)}</span>
                  <span>
                    Profit Margin:{' '}
                    <span className={getRecipeCost() < selectedItem.price ? 'text-success' : 'text-destructive'}>
                      {selectedItem.price > 0
                        ? (((selectedItem.price - getRecipeCost()) / selectedItem.price) * 100).toFixed(0)
                        : 0}
                      %
                    </span>
                  </span>
                </div>
              )}
            </div>
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
