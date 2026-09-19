-- Explicitly remove anonymous API execution inherited/previously granted on Task 1 RPCs.
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_waiter_assigned_to_table(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_order_atomic(text,text,jsonb,uuid,uuid,text,text,text,numeric,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_order_items_batch(uuid,jsonb,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_item_less(uuid,numeric,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transition_order_status(uuid,text,integer,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_kot_printed(uuid,boolean,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_order_payment(uuid,numeric,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_order_totals(uuid) FROM anon;
