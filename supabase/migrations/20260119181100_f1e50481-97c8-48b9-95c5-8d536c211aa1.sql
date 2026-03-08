-- Enable realtime for remaining tables (skip orders which is already added)
DO $$ 
BEGIN
  -- Try to add ingredients to realtime, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- Try to add menu_items to realtime, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- Try to add restaurant_tables to realtime, ignore if already exists  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;