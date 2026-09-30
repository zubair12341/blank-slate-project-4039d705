-- Restore POS authorization compatibility after Task 26 while keeping PINs hashed.
-- Existing installations that never configured a separate discount PIN use the current
-- cancellation/authorization PIN as the initial discount PIN. Admins can change either later.
update public.security_credentials
set discount_pin_hash = cancel_pin_hash, updated_at = now()
where id=true and discount_pin_hash is null and cancel_pin_hash is not null;

update public.restaurant_settings
set security_discount_pin_configured = exists(
  select 1 from public.security_credentials where id=true and discount_pin_hash is not null
);

create or replace function public.set_security_pins(p_cancel_pin text default null, p_discount_pin text default null)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_user uuid:=auth.uid(); v_cancel_set boolean; v_discount_set boolean;
begin
  if v_user is null or not public.has_permission(v_user,'settings.manage') then
    raise exception 'Settings management permission required';
  end if;
  if p_cancel_pin is null and p_discount_pin is null then raise exception 'Enter at least one security PIN'; end if;
  if p_cancel_pin is not null and p_cancel_pin !~ '^[0-9]{5}$' then raise exception 'Cancellation PIN must be exactly 5 digits'; end if;
  if p_discount_pin is not null and p_discount_pin !~ '^[0-9]{5}$' then raise exception 'Discount PIN must be exactly 5 digits'; end if;

  insert into public.security_credentials(id,cancel_pin_hash,discount_pin_hash,updated_at,updated_by)
  values(
    true,
    case when p_cancel_pin is null then null else extensions.crypt(p_cancel_pin,extensions.gen_salt('bf',10)) end,
    case when p_discount_pin is null then null else extensions.crypt(p_discount_pin,extensions.gen_salt('bf',10)) end,
    now(),v_user
  )
  on conflict(id) do update set
    cancel_pin_hash=coalesce(excluded.cancel_pin_hash,public.security_credentials.cancel_pin_hash),
    discount_pin_hash=coalesce(excluded.discount_pin_hash,public.security_credentials.discount_pin_hash),
    updated_at=now(),updated_by=v_user;

  select cancel_pin_hash is not null, discount_pin_hash is not null
    into v_cancel_set,v_discount_set from public.security_credentials where id=true;
  update public.restaurant_settings
    set security_cancel_pin_configured=v_cancel_set,
        security_discount_pin_configured=v_discount_set,
        security_cancel_password=null,security_discount_password=null,updated_at=now();
  return jsonb_build_object('updated',true,'cancel_pin_configured',v_cancel_set,'discount_pin_configured',v_discount_set);
end $$;
revoke all on function public.set_security_pins(text,text) from public,anon;
grant execute on function public.set_security_pins(text,text) to authenticated;
