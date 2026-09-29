-- Atomic waiter assignment writer used by Staff Management.
CREATE OR REPLACE FUNCTION public.set_waiter_table_assignments(
  p_waiter_id uuid,
  p_table_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'manager'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized to manage waiter table assignments';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.waiters WHERE id = p_waiter_id) THEN
    RAISE EXCEPTION 'Waiter not found';
  END IF;

  UPDATE public.waiter_table_assignments
  SET is_active = false
  WHERE waiter_id = p_waiter_id
    AND is_active = true
    AND NOT (table_id = ANY(COALESCE(p_table_ids, ARRAY[]::uuid[])));

  INSERT INTO public.waiter_table_assignments (waiter_id, table_id, is_active, assigned_by)
  SELECT p_waiter_id, table_id, true, auth.uid()
  FROM unnest(COALESCE(p_table_ids, ARRAY[]::uuid[])) AS table_id
  ON CONFLICT (waiter_id, table_id)
  DO UPDATE SET is_active = true, assigned_by = auth.uid(), assigned_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_waiter_table_assignments(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_waiter_table_assignments(uuid, uuid[]) TO authenticated;
