-- Task 26: security hardening.
-- Keep secret authorization material out of client-readable settings and enforce privileged RPC checks server-side.

create table if not exists public.security_credentials (
  id boolean primary key default true check (id),
  cancel_pin_hash text,
  discount_pin_hash text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.security_credentials enable row level security;
revoke all on table public.security_credentials from public, anon, authenticated;
grant all on table public.security_credentials to service_role;

insert into public.security_credentials(id, cancel_pin_hash, discount_pin_hash)
select true,
  case when nullif(security_cancel_password,'') is not null then extensions.crypt(security_cancel_password, extensions.gen_salt('bf', 10)) end,
  case when nullif(security_discount_password,'') is not null then extensions.crypt(security_discount_password, extensions.gen_salt('bf', 10)) end
from public.restaurant_settings
order by updated_at desc
limit 1
on conflict (id) do update set
  cancel_pin_hash = coalesce(public.security_credentials.cancel_pin_hash, excluded.cancel_pin_hash),
  discount_pin_hash = coalesce(public.security_credentials.discount_pin_hash, excluded.discount_pin_hash);

alter table public.restaurant_settings alter column security_cancel_password drop not null;
alter table public.restaurant_settings alter column security_discount_password drop not null;
alter table public.restaurant_settings add column if not exists security_cancel_pin_configured boolean not null default false;
alter table public.restaurant_settings add column if not exists security_discount_pin_configured boolean not null default false;
update public.restaurant_settings
set security_cancel_pin_configured = exists(select 1 from public.security_credentials where id=true and cancel_pin_hash is not null),
    security_discount_pin_configured = exists(select 1 from public.security_credentials where id=true and discount_pin_hash is not null),
    security_cancel_password = null,
    security_discount_password = null;

create or replace function public.set_security_pins(p_cancel_pin text, p_discount_pin text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null or not public.has_permission(v_user,'settings.manage') then raise exception 'Settings management permission required'; end if;
  if p_cancel_pin !~ '^[0-9]{5}$' or p_discount_pin !~ '^[0-9]{5}$' then raise exception 'Security PINs must be exactly 5 digits'; end if;
  insert into public.security_credentials(id,cancel_pin_hash,discount_pin_hash,updated_at,updated_by)
  values(true,extensions.crypt(p_cancel_pin,extensions.gen_salt('bf',10)),extensions.crypt(p_discount_pin,extensions.gen_salt('bf',10)),now(),v_user)
  on conflict(id) do update set cancel_pin_hash=excluded.cancel_pin_hash,discount_pin_hash=excluded.discount_pin_hash,updated_at=now(),updated_by=v_user;
  update public.restaurant_settings set security_cancel_pin_configured=true,security_discount_pin_configured=true,security_cancel_password=null,security_discount_password=null,updated_at=now();
  return jsonb_build_object('updated',true);
end $$;
revoke all on function public.set_security_pins(text,text) from public,anon;
grant execute on function public.set_security_pins(text,text) to authenticated;

create or replace function public.verify_security_pin(p_kind text,p_pin text)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare v_hash text;
begin
  if auth.uid() is null then return false; end if;
  if p_pin !~ '^[0-9]{5}$' then return false; end if;
  select case p_kind when 'cancel' then cancel_pin_hash when 'discount' then discount_pin_hash else null end into v_hash
  from public.security_credentials where id=true;
  return v_hash is not null and extensions.crypt(p_pin,v_hash)=v_hash;
end $$;
revoke all on function public.verify_security_pin(text,text) from public,anon,authenticated;

create or replace function public.authorize_discount(p_password text,p_discount_type text,p_discount_value numeric,p_subtotal numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_user uuid:=auth.uid();v_hash text;v_amount numeric;
begin
 if v_user is null or not public.has_permission(v_user,'discount.apply') then raise exception 'Discount not permitted';end if;
 if coalesce(p_discount_value,0)<=0 then return jsonb_build_object('authorized',true,'discount_amount',0);end if;
 select discount_pin_hash into v_hash from public.security_credentials where id=true;
 if v_hash is null then raise exception 'Discount authorization PIN is not configured';end if;
 if p_password is null or extensions.crypt(p_password,v_hash)<>v_hash then raise exception 'Invalid discount authorization PIN';end if;
 if btrim(coalesce(p_reason,''))='' then raise exception 'Discount reason is required';end if;
 if p_discount_type not in ('fixed','percentage') then raise exception 'Invalid discount type';end if;
 if p_discount_type='percentage' then if p_discount_value>100 then raise exception 'Invalid discount percentage';end if;v_amount:=p_subtotal*p_discount_value/100;else v_amount:=p_discount_value;end if;
 if v_amount>p_subtotal then raise exception 'Discount cannot exceed subtotal';end if;
 return jsonb_build_object('authorized',true,'discount_amount',v_amount);
end $$;
revoke all on function public.authorize_discount(text,text,numeric,numeric,text) from public,anon;
grant execute on function public.authorize_discount(text,text,numeric,numeric,text) to authenticated;

create or replace function public.cancel_order_controlled(p_order_id uuid,p_reason text,p_source_device text default 'POS',p_authorization_password text default null)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_user uuid:=auth.uid();v_order public.orders%rowtype;v_reason text:=btrim(coalesce(p_reason,''));v_paid numeric:=0;v_hash text;
begin
 if v_user is null or not public.has_permission(v_user,'order.cancel') then raise exception 'Order cancellation not permitted';end if;
 select cancel_pin_hash into v_hash from public.security_credentials where id=true;
 if v_hash is null then raise exception 'Cancellation PIN is not configured';end if;
 if p_authorization_password is null or extensions.crypt(p_authorization_password,v_hash)<>v_hash then raise exception 'Invalid cancellation PIN';end if;
 if v_reason='' then raise exception 'Cancellation reason is required';end if;
 select * into v_order from public.orders where id=p_order_id for update;if not found then raise exception 'Order not found';end if;
 if v_order.status in ('cancelled','refunded') or v_order.operational_status in ('cancelled','refunded') then raise exception 'Order is already cancelled/refunded';end if;
 select coalesce(sum(amount),0) into v_paid from public.order_payments where order_id=p_order_id and status='paid';
 if v_paid>0 or v_order.payment_status in ('paid','partially_paid') then raise exception 'Paid or partially paid orders must be refunded, not cancelled';end if;
 update public.orders set status='cancelled',operational_status='cancelled',cancellation_reason=v_reason,cancelled_at=now(),updated_at=now() where id=p_order_id;
 update public.restaurant_tables set status='available',current_order_id=null where current_order_id=p_order_id;
 insert into public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,before_data,after_data,details)
 values(p_order_id,'ORDER_CANCELLED',v_user,public.get_user_role(v_user)::text,p_source_device,'order',p_order_id,jsonb_build_object('status',v_order.status,'operational_status',v_order.operational_status),jsonb_build_object('status','cancelled','operational_status','cancelled'),jsonb_build_object('reason',v_reason));
 return jsonb_build_object('order_id',p_order_id,'status','cancelled','operational_status','cancelled','reason',v_reason);
end $$;
revoke all on function public.cancel_order_controlled(uuid,text,text,text) from public,anon;
grant execute on function public.cancel_order_controlled(uuid,text,text,text) to authenticated;
revoke all on function public.cancel_order_controlled(uuid,text,text) from public,anon,authenticated;

-- Replace the password-bearing Item Less overload with hash verification.
create or replace function public.create_item_less(
  p_order_item_id uuid, p_quantity_less numeric, p_reason_code text, p_reason_details text default null,
  p_inventory_disposition text default 'not_prepared', p_source_device text default 'POS',
  p_authorization_password text default null
) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
  v_user uuid:=auth.uid(); v_item public.order_items%rowtype; v_order public.orders%rowtype;
  v_event_id uuid; v_new_qty numeric; v_amount numeric; v_recipe jsonb; v_recipe_item jsonb;
  v_ing_id uuid; v_ing_qty numeric; v_menu_item_uuid uuid; v_hash text;
begin
  if v_user is null or not public.has_permission(v_user,'item_less.create') then raise exception 'Item Less not permitted'; end if;
  select cancel_pin_hash into v_hash from public.security_credentials where id=true;
  if v_hash is null then raise exception 'Authorization PIN is not configured'; end if;
  if p_authorization_password is null or extensions.crypt(p_authorization_password,v_hash)<>v_hash then raise exception 'Incorrect authorization PIN'; end if;
  if p_quantity_less<=0 then raise exception 'Item Less quantity must be positive'; end if;
  if p_reason_code not in ('customer_changed_mind','wrong_item_entered','item_unavailable','duplicate_entry','kitchen_issue','customer_complaint','other') then raise exception 'Invalid Item Less reason'; end if;
  if p_reason_code='other' and nullif(trim(p_reason_details),'') is null then raise exception 'Details are required for Other reason'; end if;
  if p_inventory_disposition not in ('not_prepared','waste','returned') then raise exception 'Invalid inventory disposition'; end if;
  select * into v_item from public.order_items where id=p_order_item_id for update;
  if not found then raise exception 'Order item not found'; end if;
  select * into v_order from public.orders where id=v_item.order_id for update;
  if v_order.operational_status in ('completed','cancelled','refunded','delivered','picked_up') then raise exception 'Order is closed'; end if;
  v_new_qty:=v_item.final_quantity-p_quantity_less;if v_new_qty<0 then raise exception 'Item Less exceeds billable quantity';end if;v_amount:=p_quantity_less*v_item.unit_price;
  update public.order_items set less_quantity=less_quantity+p_quantity_less,final_quantity=v_new_qty,quantity=v_new_qty,total=v_new_qty*unit_price,item_status=case when v_new_qty=0 then 'cancelled' else 'less' end,updated_at=now() where id=p_order_item_id;
  if p_inventory_disposition in ('not_prepared','returned') then
    if v_item.variant_id is not null then select recipe into v_recipe from public.menu_item_variants where id=v_item.variant_id;
    elsif v_item.menu_item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_menu_item_uuid:=v_item.menu_item_id::uuid;select recipe into v_recipe from public.menu_items where id=v_menu_item_uuid;end if;
    if jsonb_typeof(v_recipe)='array' then for v_recipe_item in select value from jsonb_array_elements(v_recipe) loop begin v_ing_id:=(v_recipe_item->>'ingredientId')::uuid;v_ing_qty:=coalesce((v_recipe_item->>'quantity')::numeric,0)*p_quantity_less;update public.ingredients set kitchen_stock=kitchen_stock+v_ing_qty,updated_at=now() where id=v_ing_id;exception when invalid_text_representation then null;end;end loop;end if;
  end if;
  perform public.recalculate_order_totals(v_item.order_id);
  insert into public.item_less_events(order_id,order_item_id,quantity_less,unit_price,amount_affected,reason_code,reason_details,performed_by,original_waiter_id,inventory_disposition)
  values(v_item.order_id,p_order_item_id,p_quantity_less,v_item.unit_price,v_amount,p_reason_code,nullif(trim(p_reason_details),''),v_user,v_order.waiter_id::uuid,p_inventory_disposition) returning id into v_event_id;
  insert into public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,before_data,after_data,details)
  values(v_item.order_id,'ITEM_LESS',v_user,public.get_user_role(v_user)::text,p_source_device,'order_item',p_order_item_id,jsonb_build_object('final_quantity',v_item.final_quantity,'total',v_item.total),jsonb_build_object('final_quantity',v_new_qty,'total',v_new_qty*v_item.unit_price),jsonb_build_object('item_less_event_id',v_event_id,'quantity_less',p_quantity_less,'reason_code',p_reason_code,'reason_details',p_reason_details,'amount_affected',v_amount,'inventory_disposition',p_inventory_disposition));
  return jsonb_build_object('event_id',v_event_id,'order_id',v_item.order_id,'final_quantity',v_new_qty,'amount_affected',v_amount);
end $$;
revoke all on function public.create_item_less(uuid,numeric,text,text,text,text,text) from public,anon;
grant execute on function public.create_item_less(uuid,numeric,text,text,text,text,text) to authenticated;
revoke all on function public.create_item_less(uuid,numeric,text,text,text,text) from public,anon,authenticated;

-- Customer ledger is permission-scoped, not "any authenticated user".
drop policy if exists "customers_authenticated_all" on public.customers;
drop policy if exists "customer_receipts_authenticated_all" on public.customer_receipts;
drop policy if exists "Authenticated users can view customers" on public.customers;
drop policy if exists "Authenticated users can manage customers" on public.customers;
drop policy if exists "Authenticated users can view customer receipts" on public.customer_receipts;
drop policy if exists "Authenticated users can manage customer receipts" on public.customer_receipts;
drop policy if exists "Authenticated can view customers" on public.customers;
drop policy if exists "Authenticated can manage customers" on public.customers;
drop policy if exists "Authenticated can view customer receipts" on public.customer_receipts;
drop policy if exists "Authenticated can manage customer receipts" on public.customer_receipts;

create policy "Ledger permission can view customers" on public.customers for select to authenticated using (public.has_permission((select auth.uid()),'customer_ledger.view'));
create policy "Ledger permission can manage customers" on public.customers for all to authenticated using (public.has_permission((select auth.uid()),'customer_ledger.view')) with check (public.has_permission((select auth.uid()),'customer_ledger.view'));
create policy "Ledger permission can view receipts" on public.customer_receipts for select to authenticated using (public.has_permission((select auth.uid()),'customer_ledger.view'));
create policy "Payment permission can manage receipts" on public.customer_receipts for all to authenticated using (public.has_permission((select auth.uid()),'payment.collect')) with check (public.has_permission((select auth.uid()),'payment.collect'));

-- Plaintext columns remain only for migration compatibility and are no longer selectable/writable by clients.
revoke select(security_cancel_password,security_discount_password), update(security_cancel_password,security_discount_password) on public.restaurant_settings from anon,authenticated;
grant select(id,name,address,phone,tax_rate,currency,currency_symbol,invoice_title,invoice_footer,invoice_show_logo,invoice_logo_url,invoice_gst_enabled,business_day_cutoff_hour,business_day_cutoff_minute,created_at,updated_at,security_cancel_pin_configured,security_discount_pin_configured) on public.restaurant_settings to authenticated;
