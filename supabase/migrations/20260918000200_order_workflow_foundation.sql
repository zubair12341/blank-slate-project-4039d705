-- Task 1: restaurant order workflow foundation
-- Forward-only and non-destructive. Existing orders/items are preserved.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Existing entity extensions ----------
ALTER TABLE public.waiters
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS waiters_user_id_unique
  ON public.waiters(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS fulfillment_type text,
  ADD COLUMN IF NOT EXISTS order_channel text NOT NULL DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS source_device text NOT NULL DEFAULT 'POS',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS served_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

UPDATE public.orders
SET
  operational_status = CASE
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'refunded' THEN 'refunded'
    ELSE 'open'
  END,
  payment_status = CASE
    WHEN status = 'completed' THEN 'paid'
    WHEN status = 'refunded' THEN 'refunded'
    ELSE 'unpaid'
  END,
  fulfillment_type = COALESCE(
    fulfillment_type,
    CASE
      WHEN order_type = 'dine-in' THEN 'dine-in'
      WHEN order_type = 'takeaway' THEN 'takeaway'
      WHEN order_type = 'online' THEN 'delivery'
      ELSE 'takeaway'
    END
  ),
  order_channel = CASE WHEN order_type = 'online' THEN 'online' ELSE COALESCE(order_channel, 'pos') END,
  opened_at = COALESCE(opened_at, created_at)
WHERE fulfillment_type IS NULL
   OR opened_at IS NULL
   OR operational_status = 'open';

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_operational_status_check
    CHECK (operational_status IN ('open','in_progress','ready','served','picked_up','delivered','completed','cancelled','refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('unpaid','partially_paid','paid','refunded','partially_refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_type_check
    CHECK (fulfillment_type IN ('dine-in','takeaway','delivery'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_source_device_check
    CHECK (source_device IN ('POS','WAITER_MOBILE','ADMIN','ONLINE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Waiter table assignment ----------
CREATE TABLE IF NOT EXISTS public.waiter_table_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiter_id uuid NOT NULL REFERENCES public.waiters(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (waiter_id, table_id)
);

CREATE INDEX IF NOT EXISTS waiter_table_assignments_waiter_idx
  ON public.waiter_table_assignments(waiter_id, is_active);
CREATE INDEX IF NOT EXISTS waiter_table_assignments_table_idx
  ON public.waiter_table_assignments(table_id, is_active);

-- ---------- Capability permissions ----------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  permission_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_name, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  is_allowed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);

INSERT INTO public.role_permissions(role_name, permission_key) VALUES
  ('admin','order.create'),('admin','order.view_all'),('admin','order.add_items'),
  ('admin','order.edit'),('admin','order.cancel'),('admin','order.refund'),
  ('admin','item_less.create'),('admin','item_less.report'),
  ('admin','discount.apply'),('admin','payment.collect'),
  ('admin','kot.print'),('admin','kot.reprint'),
  ('admin','reports.sales'),('admin','reports.profit'),('admin','inventory.view'),
  ('manager','order.create'),('manager','order.view_all'),('manager','order.add_items'),
  ('manager','order.edit'),('manager','order.cancel'),('manager','order.refund'),
  ('manager','item_less.create'),('manager','item_less.report'),
  ('manager','discount.apply'),('manager','payment.collect'),
  ('manager','kot.print'),('manager','kot.reprint'),
  ('manager','reports.sales'),('manager','reports.profit'),('manager','inventory.view'),
  ('pos_user','order.create'),('pos_user','order.view_all'),('pos_user','order.add_items'),
  ('pos_user','item_less.create'),('pos_user','item_less.report'),
  ('pos_user','discount.apply'),('pos_user','payment.collect'),
  ('pos_user','kot.print'),('pos_user','kot.reprint'),('pos_user','reports.sales'),
  ('waiter','order.create'),('waiter','order.view_assigned'),('waiter','order.add_items')
ON CONFLICT (role_name, permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT up.is_allowed
       FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.permission_key = _permission_key
      LIMIT 1),
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_name = ur.role::text
      WHERE ur.user_id = _user_id AND rp.permission_key = _permission_key
    ),
    false
  );
$$;

-- ---------- Order batches / KOT ----------
CREATE TABLE IF NOT EXISTS public.order_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  batch_number integer NOT NULL,
  batch_type text NOT NULL DEFAULT 'initial',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_device text NOT NULL DEFAULT 'POS',
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, batch_number),
  UNIQUE(idempotency_key)
);

DO $$ BEGIN
  ALTER TABLE public.order_batches ADD CONSTRAINT order_batches_type_check
    CHECK (batch_type IN ('initial','addition'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.kot_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kot_number bigint GENERATED BY DEFAULT AS IDENTITY UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL REFERENCES public.order_batches(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending',
  is_additional boolean NOT NULL DEFAULT false,
  print_requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  printed_at timestamptz,
  reprint_count integer NOT NULL DEFAULT 0,
  last_reprinted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(batch_id)
);

DO $$ BEGIN
  ALTER TABLE public.kot_tickets ADD CONSTRAINT kot_status_check
    CHECK (status IN ('pending','printed','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Item history / Item Less ----------
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.order_batches(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS original_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS less_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_status text NOT NULL DEFAULT 'ordered',
  ADD COLUMN IF NOT EXISTS unit_cost_at_sale numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.order_items
SET original_quantity = CASE WHEN original_quantity = 0 THEN quantity ELSE original_quantity END,
    final_quantity = CASE WHEN final_quantity = 0 THEN quantity ELSE final_quantity END
WHERE quantity <> 0 AND (original_quantity = 0 OR final_quantity = 0);

DO $$ BEGIN
  ALTER TABLE public.order_items ADD CONSTRAINT order_items_item_status_check
    CHECK (item_status IN ('ordered','added','less','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.item_less_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  quantity_less numeric NOT NULL CHECK (quantity_less > 0),
  unit_price numeric NOT NULL DEFAULT 0,
  amount_affected numeric NOT NULL DEFAULT 0,
  reason_code text NOT NULL,
  reason_details text,
  performed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  original_waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL,
  inventory_disposition text NOT NULL DEFAULT 'not_prepared',
  slip_status text NOT NULL DEFAULT 'not_printed',
  slip_printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.item_less_events ADD CONSTRAINT item_less_reason_check
    CHECK (reason_code IN ('customer_changed_mind','wrong_item_entered','item_unavailable','duplicate_entry','kitchen_issue','customer_complaint','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.item_less_events ADD CONSTRAINT item_less_inventory_check
    CHECK (inventory_disposition IN ('not_prepared','waste','returned'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Payments ----------
CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  reference text,
  collected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(idempotency_key)
);

-- ---------- Immutable activity/audit history ----------
CREATE TABLE IF NOT EXISTS public.order_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  source_device text NOT NULL DEFAULT 'POS',
  entity_type text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_activity_log_order_idx
  ON public.order_activity_log(order_id, created_at);
CREATE INDEX IF NOT EXISTS item_less_events_order_idx
  ON public.item_less_events(order_id, created_at);
CREATE INDEX IF NOT EXISTS order_batches_order_idx
  ON public.order_batches(order_id, batch_number);
CREATE INDEX IF NOT EXISTS order_payments_order_idx
  ON public.order_payments(order_id, created_at);

CREATE OR REPLACE FUNCTION public.prevent_order_activity_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'order_activity_log is immutable';
END;
$$;

DROP TRIGGER IF EXISTS order_activity_log_immutable ON public.order_activity_log;
CREATE TRIGGER order_activity_log_immutable
BEFORE UPDATE OR DELETE ON public.order_activity_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_order_activity_mutation();

-- ---------- Optimistic concurrency ----------
CREATE OR REPLACE FUNCTION public.bump_order_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_bump_version ON public.orders;
CREATE TRIGGER orders_bump_version
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.bump_order_version();

-- ---------- RLS ----------
ALTER TABLE public.waiter_table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kot_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_less_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_activity_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_waiter_assigned_to_table(_user_id uuid, _table_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.waiters w
    JOIN public.waiter_table_assignments a ON a.waiter_id = w.id
    WHERE w.user_id = _user_id
      AND a.table_id = _table_id
      AND w.is_active = true
      AND a.is_active = true
  );
$$;

DROP POLICY IF EXISTS "Users can view own waiter assignments" ON public.waiter_table_assignments;
CREATE POLICY "Users can view own waiter assignments"
ON public.waiter_table_assignments FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.waiters w WHERE w.id = waiter_id AND w.user_id = auth.uid())
  OR public.has_permission(auth.uid(), 'order.view_all')
);

DROP POLICY IF EXISTS "Managers manage waiter assignments" ON public.waiter_table_assignments;
CREATE POLICY "Managers manage waiter assignments"
ON public.waiter_table_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Authenticated can read role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated can read role permissions"
ON public.role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own permission overrides" ON public.user_permissions;
CREATE POLICY "Users can read own permission overrides"
ON public.user_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage permission overrides" ON public.user_permissions;
CREATE POLICY "Admins manage permission overrides"
ON public.user_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users view permitted order batches" ON public.order_batches;
CREATE POLICY "Users view permitted order batches"
ON public.order_batches FOR SELECT TO authenticated
USING (
  public.has_permission(auth.uid(), 'order.view_all')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND public.has_permission(auth.uid(), 'order.view_assigned')
      AND public.is_waiter_assigned_to_table(auth.uid(), o.table_id)
  )
);

DROP POLICY IF EXISTS "Users create order batches" ON public.order_batches;
CREATE POLICY "Users create order batches"
ON public.order_batches FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'order.add_items'));

DROP POLICY IF EXISTS "Users view KOT" ON public.kot_tickets;
CREATE POLICY "Users view KOT"
ON public.kot_tickets FOR SELECT TO authenticated
USING (
  public.has_permission(auth.uid(), 'kot.print')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND public.has_permission(auth.uid(), 'order.view_assigned')
      AND public.is_waiter_assigned_to_table(auth.uid(), o.table_id)
  )
);

DROP POLICY IF EXISTS "KOT printers create tickets" ON public.kot_tickets;
CREATE POLICY "KOT printers create tickets"
ON public.kot_tickets FOR INSERT TO authenticated
WITH CHECK (
  public.has_permission(auth.uid(), 'kot.print')
  OR public.has_permission(auth.uid(), 'order.create')
);

DROP POLICY IF EXISTS "KOT printers update tickets" ON public.kot_tickets;
CREATE POLICY "KOT printers update tickets"
ON public.kot_tickets FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'kot.print') OR public.has_permission(auth.uid(), 'kot.reprint'))
WITH CHECK (public.has_permission(auth.uid(), 'kot.print') OR public.has_permission(auth.uid(), 'kot.reprint'));

DROP POLICY IF EXISTS "Authorized users view item less" ON public.item_less_events;
CREATE POLICY "Authorized users view item less"
ON public.item_less_events FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'item_less.report'));

DROP POLICY IF EXISTS "POS users create item less" ON public.item_less_events;
CREATE POLICY "POS users create item less"
ON public.item_less_events FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'item_less.create') AND performed_by = auth.uid());

DROP POLICY IF EXISTS "Users view permitted payments" ON public.order_payments;
CREATE POLICY "Users view permitted payments"
ON public.order_payments FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'order.view_all') OR public.has_permission(auth.uid(), 'payment.collect'));

DROP POLICY IF EXISTS "Authorized users collect payments" ON public.order_payments;
CREATE POLICY "Authorized users collect payments"
ON public.order_payments FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'payment.collect') AND (collected_by IS NULL OR collected_by = auth.uid()));

DROP POLICY IF EXISTS "Users view permitted activity" ON public.order_activity_log;
CREATE POLICY "Users view permitted activity"
ON public.order_activity_log FOR SELECT TO authenticated
USING (
  public.has_permission(auth.uid(), 'order.view_all')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND public.has_permission(auth.uid(), 'order.view_assigned')
      AND public.is_waiter_assigned_to_table(auth.uid(), o.table_id)
  )
);

DROP POLICY IF EXISTS "Authenticated append activity" ON public.order_activity_log;
CREATE POLICY "Authenticated append activity"
ON public.order_activity_log FOR INSERT TO authenticated
WITH CHECK (actor_user_id IS NULL OR actor_user_id = auth.uid());

GRANT EXECUTE ON FUNCTION public.has_permission(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_waiter_assigned_to_table(uuid,uuid) TO authenticated;
