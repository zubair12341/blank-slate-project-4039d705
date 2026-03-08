# Laravel + MySQL Migration Guide
## Arabic Shinwari Restaurant POS

### Files Provided
1. **`mysql_migration.sql`** — MySQL-compatible schema + data (import directly)
2. **`database_export.json`** — Complete JSON export of all tables (generated via edge function)
3. **`combined_schema.sql`** — Original PostgreSQL schema (reference only)
4. **This file** — Column mapping & Laravel model guide

---

### Table → Laravel Model Mapping

| Supabase Table | Laravel Model | Migration File |
|---|---|---|
| `users` (auth.users) | `User` | `create_users_table` |
| `profiles` | `Profile` | `create_profiles_table` |
| `user_roles` | `UserRole` | `create_user_roles_table` |
| `ingredients` | `Ingredient` | `create_ingredients_table` |
| `menu_categories` | `MenuCategory` | `create_menu_categories_table` |
| `menu_items` | `MenuItem` | `create_menu_items_table` |
| `menu_item_variants` | `MenuItemVariant` | `create_menu_item_variants_table` |
| `orders` | `Order` | `create_orders_table` |
| `order_items` | `OrderItem` | `create_order_items_table` |
| `restaurant_tables` | `RestaurantTable` | `create_restaurant_tables_table` |
| `waiters` | `Waiter` | `create_waiters_table` |
| `stock_purchases` | `StockPurchase` | `create_stock_purchases_table` |
| `stock_transfers` | `StockTransfer` | `create_stock_transfers_table` |
| `stock_removals` | `StockRemoval` | `create_stock_removals_table` |
| `stock_sales` | `StockSale` | `create_stock_sales_table` |
| `expenses` | `Expense` | `create_expenses_table` |
| `restaurant_settings` | `RestaurantSetting` | `create_restaurant_settings_table` |

---

### Column Mapping (PostgreSQL → MySQL)

| PostgreSQL Type | MySQL Equivalent | Notes |
|---|---|---|
| `uuid` | `CHAR(36)` | Use `Str::uuid()` in Laravel |
| `text` | `VARCHAR(255)` or `TEXT` | Depends on usage |
| `numeric` | `DECIMAL(12,2)` or `DECIMAL(12,4)` | Stock uses 4 decimals |
| `boolean` | `TINYINT(1)` | Laravel casts to bool |
| `jsonb` | `JSON` | Laravel `$casts = ['recipe' => 'array']` |
| `timestamp with time zone` | `TIMESTAMP` | MySQL stores in UTC |
| `date` | `DATE` | Same |
| `integer` | `INT` | Same |

---

### Key Relationships

```
User (1) ──→ (1) Profile
User (1) ──→ (many) UserRole
User (1) ──→ (many) Order (created_by)
User (1) ──→ (many) Expense (created_by)

MenuCategory (1) ──→ (many) MenuItem
MenuItem (1) ──→ (many) MenuItemVariant

Order (1) ──→ (many) OrderItem
OrderItem (many) ──→ (1) MenuItemVariant (optional)

Ingredient (1) ──→ (many) StockPurchase
Ingredient (1) ──→ (many) StockTransfer
Ingredient (1) ──→ (many) StockRemoval
Ingredient (1) ──→ (many) StockSale

RestaurantTable (many) ──→ (1) Order (current_order_id, optional)
```

---

### Laravel Model Examples

```php
// app/Models/User.php
class User extends Authenticatable
{
    use HasUuids;
    
    public function profile() { return $this->hasOne(Profile::class); }
    public function roles() { return $this->hasMany(UserRole::class); }
    public function hasRole(string $role): bool {
        return $this->roles()->where('role', $role)->exists();
    }
}

// app/Models/MenuItem.php
class MenuItem extends Model
{
    use HasUuids;
    
    protected $casts = [
        'recipe' => 'array',
        'is_available' => 'boolean',
        'price' => 'decimal:2',
        'recipe_cost' => 'decimal:2',
        'profit_margin' => 'decimal:2',
    ];
    
    public function category() { return $this->belongsTo(MenuCategory::class, 'category_id'); }
    public function variants() { return $this->hasMany(MenuItemVariant::class); }
}

// app/Models/Order.php  
class Order extends Model
{
    use HasUuids;
    
    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'completed_at' => 'datetime',
    ];
    
    public function items() { return $this->hasMany(OrderItem::class); }
    public function createdBy() { return $this->belongsTo(User::class, 'created_by'); }
}

// app/Models/Ingredient.php
class Ingredient extends Model
{
    use HasUuids;
    
    protected $casts = [
        'cost_per_unit' => 'decimal:4',
        'store_stock' => 'decimal:4',
        'kitchen_stock' => 'decimal:4',
    ];
    
    public function purchases() { return $this->hasMany(StockPurchase::class); }
    public function transfers() { return $this->hasMany(StockTransfer::class); }
    public function removals() { return $this->hasMany(StockRemoval::class); }
    public function sales() { return $this->hasMany(StockSale::class); }
}
```

---

### Role-Based Access (Middleware)

```php
// app/Http/Middleware/CheckRole.php
class CheckRole
{
    public function handle($request, Closure $next, ...$roles)
    {
        if (!$request->user() || !$request->user()->roles()
            ->whereIn('role', $roles)->exists()) {
            abort(403);
        }
        return $next($request);
    }
}

// Usage in routes:
Route::middleware(['auth', 'role:admin,manager'])->group(function () {
    Route::resource('ingredients', IngredientController::class);
});
```

---

### Important Notes

1. **Passwords**: User passwords in the SQL dump are placeholders (`$2y$10$placeholder_hash_change_me`). You must reset them or use Laravel's `Hash::make()`.

2. **UUIDs**: All primary keys are UUIDs. Use `HasUuids` trait in Laravel 9.7+ or set `$incrementing = false` and `$keyType = 'string'`.

3. **JSON columns**: The `recipe` column in `menu_items` and `menu_item_variants` stores arrays of `{ingredientId, quantity}` objects. Cast them as arrays in Laravel.

4. **The ingredients and menu data** are large (100+ ingredients, 150+ menu items, 200+ variants). Import them from the JSON export or use the SQL dump which includes the complete data.

5. **Logo**: The `invoice_logo_url` in settings contains a base64-encoded image. Store it as a file in Laravel's storage and reference the path instead.
