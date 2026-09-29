-- Task 6: publish order item and waiter assignment changes for live POS synchronization.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='order_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='waiter_table_assignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_table_assignments;
  END IF;
END
$$;
