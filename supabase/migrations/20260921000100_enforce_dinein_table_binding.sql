-- Ensure a dine-in order can never be created against a table that is already
-- bound to another open order, and keep the table/order relationship atomic.
CREATE OR REPLACE FUNCTION public.assert_dinein_table_available(p_table_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE v_order_id uuid; v_status text;
BEGIN
  IF p_table_id IS NULL THEN RAISE EXCEPTION 'Dine-in orders require a table'; END IF;
  SELECT current_order_id, status INTO v_order_id, v_status
  FROM public.restaurant_tables WHERE id=p_table_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Table not found'; END IF;
  IF v_order_id IS NOT NULL OR v_status='occupied' THEN
    RAISE EXCEPTION 'Table is already occupied';
  END IF;
END $$;