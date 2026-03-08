-- Add discount_reason column to orders table
ALTER TABLE public.orders
ADD COLUMN discount_reason text;

-- Create stock_removals table for tracking rejected/wasted stock
CREATE TABLE public.stock_removals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  reason text NOT NULL,
  location text NOT NULL DEFAULT 'kitchen', -- 'store' or 'kitchen'
  removed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for stock_removals
ALTER TABLE public.stock_removals ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_removals
CREATE POLICY "Authenticated users can view stock removals"
ON public.stock_removals FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage stock removals"
ON public.stock_removals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create stock_sales table for direct stock selling
CREATE TABLE public.stock_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_sale numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  customer_name text,
  notes text,
  sold_by uuid REFERENCES auth.users(id),
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for stock_sales
ALTER TABLE public.stock_sales ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_sales
CREATE POLICY "Authenticated users can view stock sales"
ON public.stock_sales FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage stock sales"
ON public.stock_sales FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add tables to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_removals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_sales;