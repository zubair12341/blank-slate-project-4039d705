-- Task 1: operational transitions, KOT print tracking, payment settlement,
-- and inventory-aware Item Less.

CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id uuid,
  p_new_status text,
  p_expected_version integer DEFAULT NULL,
  p_source_device text DEFAULT 'POS'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF p_expected_version IS NOT NULL AND v_order.version<>p_expected_version THEN
    RAISE EXCEPTION 'Order changed on another device. Refresh and try again';
  END IF;

  IF public.has_permission(v_user,'order.view_assigned') THEN
    IF NOT (
      public.is_waiter_assigned_to_table(v_user,v_order.table_id::uuid)
      OR EXISTS(SELECT 1 FROM public.waiters w WHERE w.id=v_order.waiter_id::uuid AND w.user_id=v_user)
    ) THEN RAISE EXCEPTION 'Waiter is not authorized for this order'; END IF;
    -- Waiters may send an open order to kitchen, but cannot complete/cancel/refund it.
    IF NOT (v_order.operational_status='open' AND p_new_status='in_progress') THEN
      RAISE EXCEPTION 'Waiter cannot perform this status transition';
    END IF;
  ELSIF NOT public.has_permission(v_user,'order.edit')
        AND NOT public.has_permission(v_user,'payment.collect') THEN
    RAISE EXCEPTION 'Not authorized to change order status';
  END IF;

  IF NOT (
    (v_order.operational_status='open' AND p_new_status IN ('in_progress','cancelled'))
    OR (v_order.operational_status='in_progress' AND p_new_status IN ('ready','cancelled'))
    OR (v_order.operational_status='ready' AND p_new_status IN ('served','picked_up','delivered','cancelled'))
    OR (v_order.operational_status IN ('served','picked_up','delivered') AND p_new_status='completed')
    OR (v_order.operational_status=p_new_status)
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %',v_order.operational_status,p_new_status;
  END IF;

  IF p_new_status='cancelled' AND NOT public.has_permission(v_user,'order.cancel') THEN
    RAISE EXCEPTION 'Order cancellation not permitted';
  END IF;

  UPDATE public.orders SET
    operational_status=p_new_status,
    status=CASE
      WHEN p_new_status='completed' THEN 'completed'
      WHEN p_new_status='cancelled' THEN 'cancelled'
      ELSE status
    END,
    ready_at=CASE WHEN p_new_status='ready' THEN now() ELSE ready_at END,
    served_at=CASE WHEN p_new_status IN ('served','picked_up') THEN now() ELSE served_at END,
    delivered_at=CASE WHEN p_new_status='delivered' THEN now() ELSE delivered_at END,
    completed_at=CASE WHEN p_new_status='completed' THEN now() ELSE completed_at END
  WHERE id=p_order_id;

  IF p_new_status IN ('completed','cancelled') AND v_order.table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables SET status='available',current_order_id=NULL
    WHERE id=v_order.table_id::uuid AND current_order_id=p_order_id;
  END IF;

  INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,before_data,after_data)
  VALUES(p_order_id,'STATUS_CHANGED',v_user,public.get_user_role(v_user)::text,p_source_device,'order',p_order_id,
    jsonb_build_object('operational_status',v_order.operational_status),
    jsonb_build_object('operational_status',p_new_status));

  RETURN jsonb_build_object('order_id',p_order_id,'operational_status',p_new_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_kot_printed(
  p_kot_id uuid,
  p_is_reprint boolean DEFAULT false,
  p_source_device text DEFAULT 'POS'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_kot public.kot_tickets%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_is_reprint AND NOT public.has_permission(v_user,'kot.reprint') THEN RAISE EXCEPTION 'KOT reprint not permitted'; END IF;
  IF NOT p_is_reprint AND NOT public.has_permission(v_user,'kot.print') THEN
    -- Waiter-created KOTs may be physically printed by the POS bridge later; waiter cannot mark them printed.
    RAISE EXCEPTION 'KOT print not permitted';
  END IF;

  SELECT * INTO v_kot FROM public.kot_tickets WHERE id=p_kot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'KOT not found'; END IF;

  UPDATE public.kot_tickets SET
    status='printed',
    printed_at=COALESCE(printed_at,now()),
    reprint_count=reprint_count+CASE WHEN p_is_reprint THEN 1 ELSE 0 END,
    last_reprinted_at=CASE WHEN p_is_reprint THEN now() ELSE last_reprinted_at END,
    print_requested_by=COALESCE(print_requested_by,v_user)
  WHERE id=p_kot_id;

  INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,details)
  VALUES(v_kot.order_id,CASE WHEN p_is_reprint THEN 'KOT_REPRINTED' ELSE 'KOT_PRINTED' END,
    v_user,public.get_user_role(v_user)::text,p_source_device,'kot',p_kot_id,
    jsonb_build_object('kot_number',v_kot.kot_number));

  RETURN jsonb_build_object('kot_id',p_kot_id,'printed',true,'reprint',p_is_reprint);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_order_payment(
  p_order_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_source_device text DEFAULT 'POS'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_order public.orders%ROWTYPE;
  v_paid numeric:=0;
  v_payment_id uuid;
  v_status text;
BEGIN
  IF v_user IS NULL OR NOT public.has_permission(v_user,'payment.collect') THEN RAISE EXCEPTION 'Payment collection not permitted'; END IF;
  IF p_amount<=0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_payment_id FROM public.order_payments WHERE idempotency_key=p_idempotency_key;
    IF v_payment_id IS NOT NULL THEN
      RETURN jsonb_build_object('payment_id',v_payment_id,'duplicate',true,'payment_status',v_order.payment_status);
    END IF;
  END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.order_payments WHERE order_id=p_order_id AND status='paid';
  IF v_paid+p_amount>v_order.total THEN RAISE EXCEPTION 'Payment exceeds outstanding balance'; END IF;

  INSERT INTO public.order_payments(order_id,amount,payment_method,reference,collected_by,idempotency_key)
  VALUES(p_order_id,p_amount,p_payment_method,NULLIF(trim(p_reference),''),v_user,p_idempotency_key)
  RETURNING id INTO v_payment_id;

  v_paid:=v_paid+p_amount;
  v_status:=CASE WHEN v_paid>=v_order.total THEN 'paid' WHEN v_paid>0 THEN 'partially_paid' ELSE 'unpaid' END;

  UPDATE public.orders SET payment_status=v_status,payment_method=p_payment_method WHERE id=p_order_id;

  INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,details)
  VALUES(p_order_id,'PAYMENT_RECEIVED',v_user,public.get_user_role(v_user)::text,p_source_device,'payment',v_payment_id,
    jsonb_build_object('amount',p_amount,'payment_method',p_payment_method,'total_paid',v_paid,'payment_status',v_status));

  RETURN jsonb_build_object('payment_id',v_payment_id,'duplicate',false,'total_paid',v_paid,'payment_status',v_status);
END;
$$;

-- Replace Item Less with inventory restoration when the kitchen has not consumed the item.
CREATE OR REPLACE FUNCTION public.create_item_less(
  p_order_item_id uuid,
  p_quantity_less numeric,
  p_reason_code text,
  p_reason_details text DEFAULT NULL,
  p_inventory_disposition text DEFAULT 'not_prepared',
  p_source_device text DEFAULT 'POS'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_item public.order_items%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_event_id uuid;
  v_new_qty numeric;
  v_amount numeric;
  v_recipe jsonb;
  v_recipe_item jsonb;
  v_ing_id uuid;
  v_ing_qty numeric;
BEGIN
  IF v_user IS NULL OR NOT public.has_permission(v_user,'item_less.create') THEN RAISE EXCEPTION 'Item Less not permitted'; END IF;
  IF p_quantity_less<=0 THEN RAISE EXCEPTION 'Item Less quantity must be positive'; END IF;
  IF p_reason_code NOT IN ('customer_changed_mind','wrong_item_entered','item_unavailable','duplicate_entry','kitchen_issue','customer_complaint','other') THEN RAISE EXCEPTION 'Invalid Item Less reason'; END IF;
  IF p_reason_code='other' AND NULLIF(trim(p_reason_details),'') IS NULL THEN RAISE EXCEPTION 'Details are required for Other reason'; END IF;
  IF p_inventory_disposition NOT IN ('not_prepared','waste','returned') THEN RAISE EXCEPTION 'Invalid inventory disposition'; END IF;

  SELECT * INTO v_item FROM public.order_items WHERE id=p_order_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order item not found'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=v_item.order_id FOR UPDATE;
  IF v_order.operational_status IN ('completed','cancelled','refunded') THEN RAISE EXCEPTION 'Order is closed'; END IF;

  v_new_qty:=v_item.final_quantity-p_quantity_less;
  IF v_new_qty<0 THEN RAISE EXCEPTION 'Item Less exceeds billable quantity'; END IF;
  v_amount:=p_quantity_less*v_item.unit_price;

  UPDATE public.order_items SET
    less_quantity=less_quantity+p_quantity_less, final_quantity=v_new_qty, quantity=v_new_qty,
    total=v_new_qty*unit_price, item_status=CASE WHEN v_new_qty=0 THEN 'cancelled' ELSE 'less' END, updated_at=now()
  WHERE id=p_order_item_id;

  -- Stock was deducted when the item was submitted. Restore only when it was not consumed/wasted.
  IF p_inventory_disposition IN ('not_prepared','returned') THEN
    IF v_item.variant_id IS NOT NULL THEN
      SELECT recipe INTO v_recipe FROM public.menu_item_variants WHERE id=v_item.variant_id;
    ELSE
      SELECT recipe INTO v_recipe FROM public.menu_items WHERE id=v_item.menu_item_id;
    END IF;
    IF jsonb_typeof(v_recipe)='array' THEN
      FOR v_recipe_item IN SELECT value FROM jsonb_array_elements(v_recipe)
      LOOP
        BEGIN
          v_ing_id:=(v_recipe_item->>'ingredientId')::uuid;
          v_ing_qty:=COALESCE((v_recipe_item->>'quantity')::numeric,0)*p_quantity_less;
          UPDATE public.ingredients SET kitchen_stock=kitchen_stock+v_ing_qty,updated_at=now() WHERE id=v_ing_id;
        EXCEPTION WHEN invalid_text_representation THEN NULL;
        END;
      END LOOP;
    END IF;
  END IF;

  PERFORM public.recalculate_order_totals(v_item.order_id);

  INSERT INTO public.item_less_events(order_id,order_item_id,quantity_less,unit_price,amount_affected,
    reason_code,reason_details,performed_by,original_waiter_id,inventory_disposition)
  VALUES(v_item.order_id,p_order_item_id,p_quantity_less,v_item.unit_price,v_amount,p_reason_code,
    NULLIF(trim(p_reason_details),''),v_user,v_order.waiter_id::uuid,p_inventory_disposition)
  RETURNING id INTO v_event_id;

  INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,before_data,after_data,details)
  VALUES(v_item.order_id,'ITEM_LESS',v_user,public.get_user_role(v_user)::text,p_source_device,'order_item',p_order_item_id,
    jsonb_build_object('final_quantity',v_item.final_quantity,'total',v_item.total),
    jsonb_build_object('final_quantity',v_new_qty,'total',v_new_qty*v_item.unit_price),
    jsonb_build_object('item_less_event_id',v_event_id,'quantity_less',p_quantity_less,'reason_code',p_reason_code,
      'reason_details',p_reason_details,'amount_affected',v_amount,'inventory_disposition',p_inventory_disposition));

  RETURN jsonb_build_object('event_id',v_event_id,'order_id',v_item.order_id,'final_quantity',v_new_qty,'amount_affected',v_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_order_status(uuid,text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_kot_printed(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment(uuid,numeric,text,text,text,text) TO authenticated;
