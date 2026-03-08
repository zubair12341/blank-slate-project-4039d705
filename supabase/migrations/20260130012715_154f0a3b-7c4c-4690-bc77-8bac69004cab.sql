
-- Add recipe-related columns to menu_item_variants table
-- This allows each variant to have its own unique recipe

ALTER TABLE menu_item_variants 
ADD COLUMN IF NOT EXISTS recipe jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE menu_item_variants 
ADD COLUMN IF NOT EXISTS recipe_cost numeric NOT NULL DEFAULT 0;

ALTER TABLE menu_item_variants 
ADD COLUMN IF NOT EXISTS profit_margin numeric NOT NULL DEFAULT 0;

-- Add a comment to explain the structure
COMMENT ON COLUMN menu_item_variants.recipe IS 'JSONB array of {ingredientId, quantity} objects for this variant';
COMMENT ON COLUMN menu_item_variants.recipe_cost IS 'Total cost of ingredients in PKR';
COMMENT ON COLUMN menu_item_variants.profit_margin IS 'Profit margin percentage based on price - recipe_cost';
