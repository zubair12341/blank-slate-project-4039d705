-- Step 1: Clean up existing data (user approved reset)
-- First, delete order_items (foreign key constraint)
DELETE FROM public.order_items;

-- Delete all orders
DELETE FROM public.orders;

-- Free all tables
UPDATE public.restaurant_tables SET status = 'available', current_order_id = NULL;

-- Delete existing menu items
DELETE FROM public.menu_items;

-- Delete existing menu categories  
DELETE FROM public.menu_categories;

-- Delete existing ingredients (and related stock records)
DELETE FROM public.stock_purchases;
DELETE FROM public.stock_transfers;
DELETE FROM public.stock_removals;
DELETE FROM public.stock_sales;
DELETE FROM public.ingredients;

-- Step 2: Create menu item variants table for size-based pricing
CREATE TABLE IF NOT EXISTS public.menu_item_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Small', 'Medium', 'Large', '5 PCS', '10 PCS'
  price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on variants
ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for menu_item_variants
CREATE POLICY "Anyone can view menu item variants"
  ON public.menu_item_variants
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage menu item variants"
  ON public.menu_item_variants
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Step 3: Update order_items to support variant selection
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.menu_item_variants(id),
  ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Step 4: Insert new menu categories for Arabic Shinwari
INSERT INTO public.menu_categories (name, icon, color, sort_order) VALUES
  ('Fast Food Burgers', '🍔', 'bg-amber-100', 1),
  ('Special Burgers', '🌟', 'bg-yellow-100', 2),
  ('Broast', '🍗', 'bg-orange-100', 3),
  ('Sandwich', '🥪', 'bg-lime-100', 4),
  ('Shawarma', '🌯', 'bg-green-100', 5),
  ('Rolls', '🌮', 'bg-teal-100', 6),
  ('Fries', '🍟', 'bg-red-100', 7),
  ('Pizza', '🍕', 'bg-rose-100', 8),
  ('Pasta', '🍝', 'bg-purple-100', 9),
  ('Deals', '🎁', 'bg-blue-100', 10),
  ('Appetizers', '🍿', 'bg-cyan-100', 11),
  ('BBQ & Tikka', '🔥', 'bg-orange-200', 12),
  ('Karahi', '🥘', 'bg-red-200', 13),
  ('Rice Dishes', '🍚', 'bg-yellow-200', 14),
  ('Drinks', '🥤', 'bg-sky-100', 15);