-- Fix Item Less for legacy order_items.menu_item_id stored as text.
-- Validate UUID text before joining to menu_items; variants remain UUID.
CREATE OR REPLACE FUNCTION public.create_item_less(
  p_order_item_id uuid,
  p_quantity_less numeric,
  p_reason_code text,
  p_reason_details text DEFAULT NULL::text,
  p_inventory_disposition text DEFAULT 'not_prepared'::text,
  p_source_device text DEFAULT 'POS'::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid:=auth.uid(); v_item public.order_items%ROWTYPE; v_order public.orders%ROWTYPE;
  v_event_id uuid; v_new_qty numeric; v_amount numeric; v_recipe jsonb; v_recipe_item jsonb;
  v_ing_id uuid; v_ing_qty numeric; v_menu_item_uuid uuid;
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

  UPDATE public.order_items SET less_quantity=less_quantity+p_quantity_less, final_quantity=v_new_qty, quantity=v_new_qty,
    total=v_new_qty*unit_price, item_status=CASE WHEN v_new_qty=0 THEN 'cancelled' ELSE 'less' END, updated_at=now()
  WHERE id=p_order_item_id;

  IF p_inventory_disposition IN ('not_prepared','returned') THEN
    IF v_item.variant_id IS NOT NULL THEN
      SELECT recipe INTO v_recipe FROM public.menu_item_variants WHERE id=v_item.variant_id;
    ELSIF v_item.menu_item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_menu_item_uuid:=v_item.menu_item_id::uuid;
      SELECT recipe INTO v_recipe FROM public.menu_items WHERE id=v_menu_item_uuid;
    END IF;
    IF jsonb_typeof(v_recipe)='array' THEN
      FOR v_recipe_item IN SELECT value FROM jsonb_array_elements(v_recipe) LOOP
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
  INSERT INTO public.item_less_events(order_id,order_item_id,quantity_less,unit_price,amount_affected,reason_code,reason_details,performed_by,original_waiter_id,inventory_disposition)
  VALUES(v_item.order_id,p_order_item_id,p_quantity_less,v_item.unit_price,v_amount,p_reason_code,NULLIF(trim(p_reason_details),''),v_user,v_order.waiter_id::uuid,p_inventory_disposition)
  RETURNING id INTO v_event_id;

  INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,before_data,after_data,details)
  VALUES(v_item.order_id,'ITEM_LESS',v_user,public.get_user_role(v_user)::text,p_source_device,'order_item',p_order_item_id,
    jsonb_build_object('final_quantity',v_item.final_quantity,'total',v_item.total),
    jsonb_build_object('final_quantity',v_new_qty,'total',v_new_qty*v_item.unit_price),
    jsonb_build_object('item_less_event_id',v_event_id,'quantity_less',p_quantity_less,'reason_code',p_reason_code,'reason_details',p_reason_details,'amount_affected',v_amount,'inventory_disposition',p_inventory_disposition));
  RETURN jsonb_build_object('event_id',v_event_id,'order_id',v_item.order_id,'final_quantity',v_new_qty,'amount_affected',v_amount);
END;
$function$;