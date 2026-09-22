-- POS customer persistence, unpaid parking, and dine-in table/waiter reassignment.
create or replace function public.save_order_customer(p_order_id uuid, p_customer_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid(); v_name text:=btrim(p_customer_name); v_customer_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.has_permission(v_user,'order.edit') and not public.has_permission(v_user,'payment.collect') then raise exception 'Not authorized'; end if;
  if v_name='' then raise exception 'Customer name is required'; end if;
  select id into v_customer_id from public.customers where lower(btrim(name))=lower(v_name) limit 1;
  if v_customer_id is null then
    begin
      insert into public.customers(name) values(v_name) returning id into v_customer_id;
    exception when unique_violation then
      select id into v_customer_id from public.customers where lower(btrim(name))=lower(v_name) limit 1;
    end;
  end if;
  update public.orders set customer_id=v_customer_id,customer_name=v_name where id=p_order_id;
  if not found then raise exception 'Order not found'; end if;
  return jsonb_build_object('order_id',p_order_id,'customer_id',v_customer_id,'customer_name',v_name);
end; $$;

create or replace function public.park_order_unpaid(p_order_id uuid,p_customer_name text,p_source_device text default 'POS')
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid(); v_order public.orders%rowtype; v_name text:=btrim(p_customer_name); v_customer_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.has_permission(v_user,'order.edit') and not public.has_permission(v_user,'payment.collect') then raise exception 'Not authorized'; end if;
  if v_name='' then raise exception 'Customer name is required before creating an unpaid bill'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.payment_status<>'unpaid' then raise exception 'Only unpaid orders can be moved to the unpaid list'; end if;

  select id into v_customer_id from public.customers where lower(btrim(name))=lower(v_name) limit 1;
  if v_customer_id is null then
    begin
      insert into public.customers(name) values(v_name) returning id into v_customer_id;
    exception when unique_violation then
      select id into v_customer_id from public.customers where lower(btrim(name))=lower(v_name) limit 1;
    end;
  end if;

  update public.orders
     set customer_id=v_customer_id,customer_name=v_name,table_id=null,updated_at=now()
   where id=p_order_id;

  if v_order.table_id is not null then
    update public.restaurant_tables set status='available',current_order_id=null
     where id=v_order.table_id::uuid and current_order_id=p_order_id;
  end if;

  insert into public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,details)
  values(p_order_id,'ORDER_PARKED_UNPAID',v_user,public.get_user_role(v_user)::text,p_source_device,'order',p_order_id,
    jsonb_build_object('customer_name',v_name,'previous_table_id',v_order.table_id,'previous_table_number',v_order.table_number));

  return jsonb_build_object('order_id',p_order_id,'customer_id',v_customer_id,'customer_name',v_name,'payment_status','unpaid');
end; $$;

create or replace function public.reassign_dine_in_order(p_order_id uuid,p_table_id uuid,p_waiter_id uuid,p_source_device text default 'POS')
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid(); v_order public.orders%rowtype; v_table public.restaurant_tables%rowtype; v_waiter public.waiters%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.has_permission(v_user,'order.edit') then raise exception 'Order editing not permitted'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if coalesce(v_order.fulfillment_type,v_order.order_type)<>'dine-in' then raise exception 'Only dine-in orders can change tables'; end if;
  if v_order.payment_status='paid' or v_order.status in ('completed','cancelled','refunded') then raise exception 'Closed orders cannot be reassigned'; end if;

  select * into v_table from public.restaurant_tables where id=p_table_id for update;
  if not found then raise exception 'Table not found'; end if;
  if v_table.current_order_id is not null and v_table.current_order_id<>p_order_id then raise exception 'Selected table already has an open order'; end if;

  select * into v_waiter from public.waiters where id=p_waiter_id and is_active=true;
  if not found then raise exception 'Select an active waiter'; end if;

  if v_order.table_id is not null and v_order.table_id::uuid<>p_table_id then
    update public.restaurant_tables set status='available',current_order_id=null
     where id=v_order.table_id::uuid and current_order_id=p_order_id;
  end if;

  update public.restaurant_tables set status='occupied',current_order_id=p_order_id where id=p_table_id;
  update public.orders
     set table_id=p_table_id::text,table_number=v_table.table_number,waiter_id=p_waiter_id::text,waiter_name=v_waiter.name,updated_at=now()
   where id=p_order_id;

  insert into public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,before_data,after_data)
  values(p_order_id,'ORDER_REASSIGNED',v_user,public.get_user_role(v_user)::text,p_source_device,'order',p_order_id,
    jsonb_build_object('table_id',v_order.table_id,'table_number',v_order.table_number,'waiter_id',v_order.waiter_id,'waiter_name',v_order.waiter_name),
    jsonb_build_object('table_id',p_table_id,'table_number',v_table.table_number,'waiter_id',p_waiter_id,'waiter_name',v_waiter.name));

  return jsonb_build_object('order_id',p_order_id,'table_id',p_table_id,'table_number',v_table.table_number,'waiter_id',p_waiter_id,'waiter_name',v_waiter.name);
end; $$;

revoke all on function public.save_order_customer(uuid,text) from public,anon;
revoke all on function public.park_order_unpaid(uuid,text,text) from public,anon;
revoke all on function public.reassign_dine_in_order(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.save_order_customer(uuid,text) to authenticated;
grant execute on function public.park_order_unpaid(uuid,text,text) to authenticated;
grant execute on function public.reassign_dine_in_order(uuid,uuid,uuid,text) to authenticated;