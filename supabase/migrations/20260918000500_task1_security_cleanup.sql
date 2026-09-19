-- Task 1 final security cleanup after Supabase advisor validation.
-- Restrict new SECURITY DEFINER RPCs to the intended signed-in role and
-- lock trigger helper search paths.

ALTER FUNCTION public.prevent_order_activity_mutation() SET search_path = public;
ALTER FUNCTION public.bump_order_version() SET search_path = public;

REVOKE ALL ON FUNCTION public.prevent_order_activity_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_order_version() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.has_permission(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_waiter_assigned_to_table(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_atomic(text,text,jsonb,uuid,uuid,text,text,text,numeric,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_order_items_batch(uuid,jsonb,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_item_less(uuid,numeric,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_order_status(uuid,text,integer,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_kot_printed(uuid,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_order_payment(uuid,numeric,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_order_totals(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_waiter_assigned_to_table(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(text,text,jsonb,uuid,uuid,text,text,text,numeric,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_order_items_batch(uuid,jsonb,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_item_less(uuid,numeric,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(uuid,text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_kot_printed(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment(uuid,numeric,text,text,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public.recalculate_order_totals(uuid) FROM authenticated;
