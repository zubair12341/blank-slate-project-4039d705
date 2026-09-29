-- Task 5: waiter account isolation and assignment enforcement.
-- Waiter users can only read their own waiter profile and their assigned tables.

DROP POLICY IF EXISTS "Authenticated users can view tables" ON public.restaurant_tables;
CREATE POLICY "Authorized users can view tables"
ON public.restaurant_tables FOR SELECT TO authenticated
USING (
  NOT public.has_permission(auth.uid(), 'order.view_assigned')
  OR public.is_waiter_assigned_to_table(auth.uid(), id)
);

DROP POLICY IF EXISTS "Authenticated users can view waiters" ON public.waiters;
CREATE POLICY "Authorized users can view waiters"
ON public.waiters FOR SELECT TO authenticated
USING (
  NOT public.has_permission(auth.uid(), 'order.view_assigned')
  OR user_id = auth.uid()
);

DELETE FROM public.role_permissions
WHERE role_name = 'waiter'
  AND permission_key NOT IN ('order.create','order.view_assigned','order.add_items');

INSERT INTO public.role_permissions(role_name, permission_key)
VALUES
  ('waiter','order.create'),
  ('waiter','order.view_assigned'),
  ('waiter','order.add_items')
ON CONFLICT (role_name, permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_my_waiter_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN w.id IS NULL THEN NULL ELSE jsonb_build_object(
    'waiter_id', w.id,
    'name', w.name,
    'is_active', w.is_active,
    'table_ids', COALESCE((
      SELECT jsonb_agg(a.table_id ORDER BY a.assigned_at)
      FROM public.waiter_table_assignments a
      WHERE a.waiter_id = w.id AND a.is_active = true
    ), '[]'::jsonb)
  ) END
  FROM (SELECT auth.uid() AS uid) u
  LEFT JOIN public.waiters w ON w.user_id = u.uid
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_waiter_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_waiter_context() TO authenticated;
