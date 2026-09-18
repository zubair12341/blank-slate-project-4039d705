-- Task 1: waiter-safe RLS and atomic operational mutations.

-- Replace legacy broad order policies so authenticated waiter accounts cannot see/edit every order.
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;

CREATE POLICY "Authorized users can view orders"
ON public.orders FOR SELECT TO authenticated
USING (
  public.has_permission(auth.uid(), 'order.view_all')
  OR (
    public.has_permission(auth.uid(), 'order.view_assigned')
    AND (
      public.is_waiter_assigned_to_table(auth.uid(), table_id)
      OR EXISTS (SELECT 1 FROM public.waiters w WHERE w.id = waiter_id AND w.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Authorized users can create orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  public.has_permission(auth.uid(), 'order.create')
  AND (
    NOT public.has_permission(auth.uid(), 'order.view_assigned')
    OR table_id IS NULL
    OR public.is_waiter_assigned_to_table(auth.uid(), table_id)
  )
);

CREATE POLICY "Authorized users can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'order.edit'))
WITH CHECK (public.has_permission(auth.uid(), 'order.edit'));

DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON public.order_items;

CREATE POLICY "Authorized users can view order items"
ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (
        public.has_permission(auth.uid(), 'order.view_all')
        OR (
          public.has_permission(auth.uid(), 'order.view_assigned')
          AND (
            public.is_waiter_assigned_to_table(auth.uid(), o.table_id)
            OR EXISTS (SELECT 1 FROM public.waiters w WHERE w.id = o.waiter_id AND w.user_id = auth.uid())
          )
        )
      )
  )
);

CREATE POLICY "Authorized users can create order items"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
  public.has_permission(auth.uid(), 'order.add_items')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (
        public.has_permission(auth.uid(), 'order.view_all')
        OR public.is_waiter_assigned_to_table(auth.uid(), o.table_id)
      )
  )
);

CREATE POLICY "POS can update order items"
ON public.order_items FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'order.edit') OR public.has_permission(auth.uid(), 'item_less.create'))
WITH CHECK (public.has_permission(auth.uid(), 'order.edit') OR public.has_permission(auth.uid(), 'item_less.create'));

-- Waiters may read tables, but may not directly occupy/free arbitrary tables.
DROP POLICY IF EXISTS "Authenticated users can update tables" ON public.restaurant_tables;
CREATE POLICY "Authorized users can update tables"
ON public.restaurant_tables FOR UPDATE TO authenticated
USING (
  public.has_permission(auth.uid(), 'order.view_all')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'order.view_all')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- Atomic initial order creation. Prices/costs are resolved server-side.
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_order_number text,
  p_fulfillment_type text,
  p_items jsonb,
  p_table_id uuid DEFAULT NULL,
  p_waiter_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_discount_type text DEFAULT 'fixed',
  p_discount_value numeric DEFAULT 0,
  p_discount_reason text DEFAULT NULL,
  p_source_device text DEFAULT 'POS',
  p_order_channel text DEFAULT 'pos',
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_batch_id uuid;
  v_waiter_id uuid := p_waiter_id;
  v_waiter_name text;
  v_table_number integer;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_tax_rate numeric := 0;
  v_gst_enabled boolean := true;
  v_item jsonb;
  v_menu public.menu_items%ROWTYPE;
  v_variant public.menu_item_variants%ROWTYPE;
  v_qty numeric;
  v_price numeric;
  v_name text;
  v_recipe jsonb;
  v_recipe_cost numeric;
  v_recipe_item jsonb;
  v_ing_id uuid;
  v_ing_qty numeric;
BEGIN
  IF v_user IS NULL OR NOT public.has_permission(v_user, 'order.create') THEN
    RAISE EXCEPTION 'Not authorized to create orders';
  END IF;

  IF p_fulfillment_type NOT IN ('dine-in','takeaway','delivery') THEN
    RAISE EXCEPTION 'Invalid fulfillment type';
  END IF;

  IF p_source_device NOT IN ('POS','WAITER_MOBILE','ADMIN','ONLINE') THEN
    RAISE EXCEPTION 'Invalid source device';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT ob.order_id INTO v_order_id
    FROM public.order_batches ob WHERE ob.idempotency_key = p_idempotency_key LIMIT 1;
    IF v_order_id IS NOT NULL THEN
      RETURN jsonb_build_object('order_id', v_order_id, 'duplicate', true);
    END IF;
  END IF;

  -- Waiter accounts are locked to assigned dine-in tables.
  IF public.has_permission(v_user, 'order.view_assigned') THEN
    IF p_fulfillment_type <> 'dine-in' OR p_table_id IS NULL
       OR NOT public.is_waiter_assigned_to_table(v_user, p_table_id) THEN
      RAISE EXCEPTION 'Waiter is not assigned to this table';
    END IF;
    SELECT id, name INTO v_waiter_id, v_waiter_name
    FROM public.waiters WHERE user_id = v_user AND is_active = true LIMIT 1;
    IF v_waiter_id IS NULL THEN RAISE EXCEPTION 'No active waiter profile linked to this user'; END IF;
  ELSIF v_waiter_id IS NOT NULL THEN
    SELECT name INTO v_waiter_name FROM public.waiters WHERE id = v_waiter_id;
  END IF;

  IF p_table_id IS NOT NULL THEN
    SELECT table_number INTO v_table_number FROM public.restaurant_tables WHERE id = p_table_id;
    IF v_table_number IS NULL THEN RAISE EXCEPTION 'Table not found'; END IF;
  END IF;

  -- Calculate from database prices, never client totals.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Item quantity must be positive'; END IF;

    SELECT * INTO v_menu FROM public.menu_items WHERE id = (v_item->>'menu_item_id')::uuid AND is_available = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Menu item unavailable'; END IF;

    IF NULLIF(v_item->>'variant_id','') IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.menu_item_variants
      WHERE id = (v_item->>'variant_id')::uuid AND menu_item_id = v_menu.id AND is_available = true;
      IF NOT FOUND THEN RAISE EXCEPTION 'Menu variant unavailable'; END IF;
      v_price := v_variant.price;
    ELSE
      v_price := v_menu.price;
    END IF;
    v_subtotal := v_subtotal + (v_price * v_qty);
  END LOOP;

  SELECT COALESCE(tax_rate,0), COALESCE(invoice_gst_enabled,true)
    INTO v_tax_rate, v_gst_enabled
  FROM public.restaurant_settings ORDER BY created_at LIMIT 1;
  IF v_gst_enabled THEN v_tax := v_subtotal * v_tax_rate / 100; END IF;

  IF COALESCE(p_discount_value,0) > 0 THEN
    IF NOT public.has_permission(v_user, 'discount.apply') THEN RAISE EXCEPTION 'Discount not permitted'; END IF;
    IF p_discount_type = 'percentage' THEN
      IF p_discount_value > 100 THEN RAISE EXCEPTION 'Invalid discount percentage'; END IF;
      v_discount := v_subtotal * p_discount_value / 100;
    ELSE
      v_discount := p_discount_value;
    END IF;
  END IF;
  v_discount := LEAST(v_discount, v_subtotal + v_tax);
  v_total := v_subtotal + v_tax - v_discount;

  INSERT INTO public.orders(
    order_number, order_type, fulfillment_type, operational_status, payment_status,
    subtotal, tax, discount, discount_type, discount_value, discount_reason, total,
    payment_method, customer_name, table_id, table_number, waiter_id, waiter_name,
    created_by, opened_at, source_device, order_channel
  ) VALUES (
    p_order_number,
    CASE WHEN p_fulfillment_type='dine-in' THEN 'dine-in'
         WHEN p_fulfillment_type='takeaway' THEN 'takeaway'
         ELSE 'online' END,
    p_fulfillment_type, 'open', 'unpaid',
    v_subtotal, v_tax, v_discount, p_discount_type, COALESCE(p_discount_value,0), p_discount_reason, v_total,
    p_payment_method, p_customer_name, p_table_id, v_table_number, v_waiter_id, v_waiter_name,
    v_user, now(), p_source_device, p_order_channel
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_batches(order_id,batch_number,batch_type,created_by,source_device,idempotency_key)
  VALUES(v_order_id,1,'initial',v_user,p_source_device,p_idempotency_key)
  RETURNING id INTO v_batch_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    SELECT * INTO v_menu FROM public.menu_items WHERE id = (v_item->>'menu_item_id')::uuid;
    IF NULLIF(v_item->>'variant_id','') IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.menu_item_variants WHERE id = (v_item->>'variant_id')::uuid;
      v_price := v_variant.price; v_name := v_menu.name || ' (' || v_variant.name || ')';
      v_recipe := v_variant.recipe; v_recipe_cost := v_variant.recipe_cost;
    ELSE
      v_price := v_menu.price; v_name := v_menu.name;
      v_recipe := v_menu.recipe; v_recipe_cost := v_menu.recipe_cost;
    END IF;

    INSERT INTO public.order_items(
      order_id,menu_item_id,menu_item_name,variant_id,variant_name,quantity,original_quantity,
      final_quantity,less_quantity,unit_price,total,notes,batch_id,item_status,unit_cost_at_sale
    ) VALUES (
      v_order_id,v_menu.id,v_name,
      CASE WHEN NULLIF(v_item->>'variant_id','') IS NULL THEN NULL ELSE (v_item->>'variant_id')::uuid END,
      CASE WHEN NULLIF(v_item->>'variant_id','') IS NULL THEN NULL ELSE v_variant.name END,
      v_qty,v_qty,v_qty,0,v_price,v_price*v_qty,NULLIF(v_item->>'notes',''),v_batch_id,'ordered',v_recipe_cost
    );

    IF jsonb_typeof(v_recipe) = 'array' THEN
      FOR v_recipe_item IN SELECT value FROM jsonb_array_elements(v_recipe)
      LOOP
        BEGIN
          v_ing_id := (v_recipe_item->>'ingredientId')::uuid;
          v_ing_qty := COALESCE((v_recipe_item->>'quantity')::numeric,0) * v_qty;
          UPDATE public.ingredients
             SET kitchen_stock = GREATEST(0, kitchen_stock - v_ing_qty), updated_at = now()
           WHERE id = v_ing_id;
        EXCEPTION WHEN invalid_text_representation THEN NULL;
        END;
      END LOOP;
    END IF;
  END LOOP;

  INSERT INTO public.kot_tickets(order_id,batch_id,is_additional,print_requested_by)
  VALUES(v_order_id,v_batch_id,false,v_user);

  IF p_fulfillment_type='dine-in' AND p_table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables
       SET status='occupied', current_order_id=v_order_id
     WHERE id=p_table_id AND (current_order_id IS NULL OR current_order_id=v_order_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'Table is already occupied'; END IF;
  END IF;

  INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,details)
  VALUES(v_order_id,'ORDER_CREATED',v_user,public.get_user_role(v_user)::text,p_source_device,'order',v_order_id,
    jsonb_build_object('batch_id',v_batch_id,'fulfillment_type',p_fulfillment_type,'total',v_total));

  RETURN jsonb_build_object('order_id',v_order_id,'batch_id',v_batch_id,'duplicate',false,'total',v_total);
END;
$$;

-- Recalculate financial totals from current billable item rows.
CREATE OR REPLACE FUNCTION public.recalculate_order_totals(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_subtotal numeric := 0;
  v_tax_rate numeric := 0;
  v_gst_enabled boolean := true;
  v_tax numeric := 0;
  v_discount_type text;
  v_discount_value numeric := 0;
  v_discount numeric := 0;
BEGIN
  SELECT COALESCE(SUM(total),0) INTO v_subtotal FROM public.order_items WHERE order_id=p_order_id;
  SELECT discount_type, COALESCE(discount_value,0) INTO v_discount_type, v_discount_value
    FROM public.orders WHERE id=p_order_id;
  SELECT COALESCE(tax_rate,0), COALESCE(invoice_gst_enabled,true)
    INTO v_tax_rate, v_gst_enabled
    FROM public.restaurant_settings ORDER BY created_at LIMIT 1;
  IF v_gst_enabled THEN v_tax:=v_subtotal*v_tax_rate/100; END IF;
  IF v_discount_type='percentage' THEN
    v_discount:=v_subtotal*v_discount_value/100;
  ELSE
    v_discount:=v_discount_value;
  END IF;
  v_discount:=LEAST(v_discount,v_subtotal+v_tax);
  UPDATE public.orders
     SET subtotal=v_subtotal, tax=v_tax, discount=v_discount,
         total=GREATEST(0,v_subtotal+v_tax-v_discount)
   WHERE id=p_order_id;
END;
$;

-- Atomic add-items operation. It never edits/removes previously submitted rows.
CREATE OR REPLACE FUNCTION public.add_order_items_batch(
  p_order_id uuid,
  p_items jsonb,
  p_source_device text DEFAULT 'POS',
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_batch_id uuid;
  v_batch_no integer;
  v_item jsonb;
  v_menu public.menu_items%ROWTYPE;
  v_variant public.menu_item_variants%ROWTYPE;
  v_qty numeric;
  v_price numeric;
  v_name text;
  v_recipe jsonb;
  v_recipe_item jsonb;
  v_ing_id uuid;
  v_ing_qty numeric;
  v_added numeric := 0;
BEGIN
  IF v_user IS NULL OR NOT public.has_permission(v_user,'order.add_items') THEN
    RAISE EXCEPTION 'Not authorized to add items';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.operational_status IN ('completed','cancelled','refunded','delivered','picked_up') THEN
    RAISE EXCEPTION 'Order no longer accepts additions';
  END IF;
  IF public.has_permission(v_user,'order.view_assigned')
     AND NOT (
       public.is_waiter_assigned_to_table(v_user,v_order.table_id)
       OR EXISTS(SELECT 1 FROM public.waiters w WHERE w.id=v_order.waiter_id AND w.user_id=v_user)
     ) THEN
    RAISE EXCEPTION 'Waiter is not authorized for this order';
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id,batch_number INTO v_batch_id,v_batch_no FROM public.order_batches WHERE idempotency_key=p_idempotency_key;
    IF v_batch_id IS NOT NULL THEN
      RETURN jsonb_build_object('order_id',p_order_id,'batch_id',v_batch_id,'batch_number',v_batch_no,'duplicate',true);
    END IF;
  END IF;
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'No items supplied'; END IF;

  SELECT COALESCE(MAX(batch_number),0)+1 INTO v_batch_no FROM public.order_batches WHERE order_id=p_order_id;
  INSERT INTO public.order_batches(order_id,batch_number,batch_type,created_by,source_device,idempotency_key)
  VALUES(p_order_id,v_batch_no,'addition',v_user,p_source_device,p_idempotency_key) RETURNING id INTO v_batch_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty:=COALESCE((v_item->>'quantity')::numeric,0);
    IF v_qty<=0 THEN RAISE EXCEPTION 'Item quantity must be positive'; END IF;
    SELECT * INTO v_menu FROM public.menu_items WHERE id=(v_item->>'menu_item_id')::uuid AND is_available=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Menu item unavailable'; END IF;
    IF NULLIF(v_item->>'variant_id','') IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.menu_item_variants
       WHERE id=(v_item->>'variant_id')::uuid AND menu_item_id=v_menu.id AND is_available=true;
      IF NOT FOUND THEN RAISE EXCEPTION 'Menu variant unavailable'; END IF;
      v_price:=v_variant.price; v_name:=v_menu.name||' ('||v_variant.name||')'; v_recipe:=v_variant.recipe;
    ELSE
      v_price:=v_menu.price; v_name:=v_menu.name; v_recipe:=v_menu.recipe;
    END IF;

    INSERT INTO public.order_items(order_id,menu_item_id,menu_item_name,variant_id,variant_name,quantity,
      original_quantity,final_quantity,less_quantity,unit_price,total,notes,batch_id,item_status,unit_cost_at_sale)
    VALUES(p_order_id,v_menu.id,v_name,
      CASE WHEN NULLIF(v_item->>'variant_id','') IS NULL THEN NULL ELSE (v_item->>'variant_id')::uuid END,
      CASE WHEN NULLIF(v_item->>'variant_id','') IS NULL THEN NULL ELSE v_variant.name END,
      v_qty,v_qty,v_qty,0,v_price,v_price*v_qty,NULLIF(v_item->>'notes',''),v_batch_id,'added',
      CASE WHEN NULLIF(v_item->>'variant_id','') IS NULL THEN v_menu.recipe_cost ELSE v_variant.recipe_cost END);
    v_added:=v_added+(v_price*v_qty);

    IF jsonb_typeof(v_recipe)='array' THEN
      FOR v_recipe_item IN SELECT value FROM jsonb_array_elements(v_recipe)
      LOOP
        BEGIN
          v_ing_id:=(v_recipe_item->>'ingredientId')::uuid;
          v_ing_qty:=COALESCE((v_recipe_item->>'quantity')::numeric,0)*v_qty;
          UPDATE public.ingredients
             SET kitchen_stock=GREATEST(0,kitchen_stock-v_ing_qty), updated_at=now()
           WHERE id=v_ing_id;
        EXCEPTION WHEN invalid_text_representation THEN NULL;
        END;
      END LOOP;
    END IF;
  END LOOP;

  PERFORM public.recalculate_order_totals(p_order_id);
  UPDATE public.orders
     SET operational_status=CASE WHEN operational_status='open' THEN 'in_progress' ELSE operational_status END
   WHERE id=p_order_id;

  INSERT INTO public.kot_tickets(order_id,batch_id,is_additional,print_requested_by)
  VALUES(p_order_id,v_batch_id,true,v_user);

  INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,details)
  VALUES(p_order_id,'ITEMS_ADDED',v_user,public.get_user_role(v_user)::text,p_source_device,'batch',v_batch_id,
    jsonb_build_object('batch_number',v_batch_no,'amount_added',v_added));

  RETURN jsonb_build_object('order_id',p_order_id,'batch_id',v_batch_id,'batch_number',v_batch_no,'duplicate',false,'amount_added',v_added);
END;
$$;

-- Atomic Item Less. Waiters intentionally have no item_less.create permission.
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
BEGIN
  IF v_user IS NULL OR NOT public.has_permission(v_user,'item_less.create') THEN RAISE EXCEPTION 'Item Less not permitted'; END IF;
  IF p_quantity_less<=0 THEN RAISE EXCEPTION 'Item Less quantity must be positive'; END IF;
  IF p_reason_code NOT IN ('customer_changed_mind','wrong_item_entered','item_unavailable','duplicate_entry','kitchen_issue','customer_complaint','other') THEN
    RAISE EXCEPTION 'Invalid Item Less reason';
  END IF;
  IF p_reason_code='other' AND NULLIF(trim(p_reason_details),'') IS NULL THEN RAISE EXCEPTION 'Details are required for Other reason'; END IF;

  SELECT * INTO v_item FROM public.order_items WHERE id=p_order_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order item not found'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=v_item.order_id FOR UPDATE;
  IF v_order.operational_status IN ('completed','cancelled','refunded') THEN RAISE EXCEPTION 'Order is closed'; END IF;

  v_new_qty:=v_item.final_quantity-p_quantity_less;
  IF v_new_qty<0 THEN RAISE EXCEPTION 'Item Less exceeds billable quantity'; END IF;
  v_amount:=p_quantity_less*v_item.unit_price;

  UPDATE public.order_items
     SET less_quantity=less_quantity+p_quantity_less,
         final_quantity=v_new_qty,
         quantity=v_new_qty,
         total=v_new_qty*unit_price,
         item_status=CASE WHEN v_new_qty=0 THEN 'cancelled' ELSE 'less' END,
         updated_at=now()
   WHERE id=p_order_item_id;

  PERFORM public.recalculate_order_totals(v_item.order_id);

  INSERT INTO public.item_less_events(order_id,order_item_id,quantity_less,unit_price,amount_affected,
    reason_code,reason_details,performed_by,original_waiter_id,inventory_disposition)
  VALUES(v_item.order_id,p_order_item_id,p_quantity_less,v_item.unit_price,v_amount,p_reason_code,
    NULLIF(trim(p_reason_details),''),v_user,v_order.waiter_id,p_inventory_disposition)
  RETURNING id INTO v_event_id;

  INSERT INTO public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,before_data,after_data,details)
  VALUES(v_item.order_id,'ITEM_LESS',v_user,public.get_user_role(v_user)::text,p_source_device,'order_item',p_order_item_id,
    jsonb_build_object('final_quantity',v_item.final_quantity,'total',v_item.total),
    jsonb_build_object('final_quantity',v_new_qty,'total',v_new_qty*v_item.unit_price),
    jsonb_build_object('item_less_event_id',v_event_id,'quantity_less',p_quantity_less,'reason_code',p_reason_code,'amount_affected',v_amount));

  RETURN jsonb_build_object('event_id',v_event_id,'order_id',v_item.order_id,'final_quantity',v_new_qty,'amount_affected',v_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_order_totals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(text,text,jsonb,uuid,uuid,text,text,text,numeric,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_order_items_batch(uuid,jsonb,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_item_less(uuid,numeric,text,text,text,text) TO authenticated;
