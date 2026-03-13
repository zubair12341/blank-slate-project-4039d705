
-- Set default stock for Bakery items (PCS)
UPDATE ingredients SET store_stock = 50, kitchen_stock = 20 WHERE category = 'Bakery' AND store_stock = 0 AND kitchen_stock = 0;

-- Set default stock for Beverages (bottles/cans - PCS equivalent)
UPDATE ingredients SET store_stock = 24, kitchen_stock = 12 WHERE category = 'Beverages' AND store_stock = 0 AND kitchen_stock = 0;

-- Dairy items
UPDATE ingredients SET store_stock = 2000, kitchen_stock = 500 WHERE category = 'Dairy' AND unit = 'GRM' AND store_stock = 0 AND kitchen_stock = 0;
UPDATE ingredients SET store_stock = 5000, kitchen_stock = 2000 WHERE category = 'Dairy' AND unit = 'ML' AND store_stock = 0 AND kitchen_stock = 0;
UPDATE ingredients SET store_stock = 60, kitchen_stock = 30 WHERE category = 'Dairy' AND unit = 'PCS' AND store_stock = 0 AND kitchen_stock = 0;

-- Grocery - spices/masala (small quantities in GRM)
UPDATE ingredients SET store_stock = 1000, kitchen_stock = 250 WHERE category = 'Grocery' AND unit = 'GRM' AND store_stock = 0 AND kitchen_stock = 0;
UPDATE ingredients SET store_stock = 2000, kitchen_stock = 500 WHERE category = 'Grocery' AND unit = 'ML' AND store_stock = 0 AND kitchen_stock = 0;
UPDATE ingredients SET store_stock = 50, kitchen_stock = 20 WHERE category = 'Grocery' AND unit = 'PCS' AND store_stock = 0 AND kitchen_stock = 0;
UPDATE ingredients SET store_stock = 20, kitchen_stock = 10 WHERE category = 'Grocery' AND unit = 'KG' AND store_stock = 0 AND kitchen_stock = 0;

-- Meat items (GRM)
UPDATE ingredients SET store_stock = 5000, kitchen_stock = 2000 WHERE category = 'Meat' AND store_stock = 0 AND kitchen_stock = 0;

-- Packing items (PCS)
UPDATE ingredients SET store_stock = 200, kitchen_stock = 50 WHERE category = 'Packing' AND store_stock = 0 AND kitchen_stock = 0;

-- Seafood (GRM)
UPDATE ingredients SET store_stock = 3000, kitchen_stock = 1000 WHERE category = 'Seafood' AND store_stock = 0 AND kitchen_stock = 0;

-- Sub Recipe
UPDATE ingredients SET store_stock = 500, kitchen_stock = 200 WHERE category = 'Sub Recipe' AND store_stock = 0 AND kitchen_stock = 0;

-- Vegetable items
UPDATE ingredients SET store_stock = 5000, kitchen_stock = 2000 WHERE category = 'Vegetable' AND unit = 'GRM' AND store_stock = 0 AND kitchen_stock = 0;
UPDATE ingredients SET store_stock = 50, kitchen_stock = 20 WHERE category = 'Vegetable' AND unit = 'PCS' AND store_stock = 0 AND kitchen_stock = 0;

-- Also update items that already have some stock in one location but not the other
UPDATE ingredients SET store_stock = 1000 WHERE store_stock = 0 AND kitchen_stock > 0 AND category = 'Grocery';
UPDATE ingredients SET store_stock = 5000 WHERE store_stock = 0 AND kitchen_stock > 0 AND category = 'Meat';
