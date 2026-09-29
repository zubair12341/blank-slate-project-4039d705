-- Task 10: enforce table assignment and waiter identity during dine-in reassignment.
CREATE OR REPLACE FUNCTION public.reassign_dine_in_order(p_order_id uuid,p_table_id uuid,p_waiter_id uuid,p_source_device text DEFAULT 'POS')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_role public.app_role; v_order public.orders%rowtype; v_table public.restaurant_tables%rowtype; v_waiter public.waiters%rowtype; v_self_waiter uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF NOT public.has_permission(v_user,'order.edit') THEN RAISE EXCEPTION 'Order editing not permitted'; END IF;
 v_role:=public.get_user_role(v_user);
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF COALESCE(v_order.fulfillment_type,v_order.order_type)<>'dine-in' THEN RAISE EXCEPTION 'Only dine-in orders can change tables'; END IF;
 IF v_order.payment_status='paid' OR v_order.status IN ('completed','cancelled','refunded') THEN RAISE EXCEPTION 'Closed orders cannot be reassigned'; END IF;
 SELECT * INTO v_table FROM public.restaurant_tables WHERE id=p_table_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Table not found'; END IF;
 IF v_table.current_order_id IS NOT NULL AND v_table.current_order_id<>p_order_id THEN RAISE EXCEPTION 'Selected table already has an open order'; END IF;
 SELECT * INTO v_waiter FROM public.waiters WHERE id=p_waiter_id AND is_active=true; IF NOT FOUND THEN RAISE EXCEPTION 'Select an active waiter'; END IF;
 IF v_role='waiter' THEN
   SELECT id INTO v_self_waiter FROM public.waiters WHERE user_id=v_user AND is_active=true LIMIT 1;
   IF v_self_waiter IS NULL OR v_self_waiter<>p_waiter_id THEN RAISE EXCEPTION 'Waiters cannot change the assigned waiter'; END IF;
   IF NOT public.is_waiter_assigned_to_table(v_user,p_table_id) THEN RAISE EXCEPTION 'This table is not assigned to your waiter account'; END IF;
 END IF;
 IF v_order.table_id IS NOT NULL AND v_order.table_id::uuid<>p_table_id THEN UPDATE public.restaurant_tables SET status='available',current_order_id=NULL WHERE id=v_order.table_id::uuid AND current_order_id=p_order_id; END IF;
 UPDATE public.restaurant_tables SET status='occupied',current_order_id=p_order_id WHERE id=p_table_id;
 UPDATE public.orders SET table_id=p_table_id::text,table_number=v_table.table_number,waiter_id=p_waiter_id::text,waiter_name=v_waiter.name,updated_at=now() WHERE id=p_order_id;
 INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,before_data,after_data)
 VALUES(p_order_id,'ORDER_REASSIGNED',v_user,v_role::text,p_source_device,'order',p_order_id,jsonb_build_object('table_id',v_order.table_id,'table_number',v_order.table_number,'waiter_id',v_order.waiter_id,'waiter_name',v_order.waiter_name),jsonb_build_object('table_id',p_table_id,'table_number',v_table.table_number,'waiter_id',p_waiter_id,'waiter_name',v_waiter.name));
 RETURN jsonb_build_object('order_id',p_order_id,'table_id',p_table_id,'table_number',v_table.table_number,'waiter_id',p_waiter_id,'waiter_name',v_waiter.name);
END; $$;
REVOKE ALL ON FUNCTION public.reassign_dine_in_order(uuid,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reassign_dine_in_order(uuid,uuid,uuid,text) TO authenticated;
