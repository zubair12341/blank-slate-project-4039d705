-- Fast POS settlement: payment + close + table release in one transaction.
create or replace function public.settle_order_atomic(
  p_order_id uuid,
  p_payment_method text,
  p_idempotency_key text default null,
  p_source_device text default 'POS'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders%rowtype;
  v_paid numeric := 0;
  v_due numeric := 0;
  v_payment_id uuid;
  v_existing_payment public.order_payments%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.has_permission(v_user,'payment.collect') then raise exception 'Payment collection not permitted'; end if;
  if p_payment_method not in ('cash','card','mobile') then raise exception 'Invalid payment method'; end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  if v_order.status='cancelled' or v_order.operational_status='cancelled' then
    raise exception 'Cancelled order cannot be settled';
  end if;

  if v_order.payment_status='paid' and (v_order.status='completed' or v_order.operational_status='completed') then
    update public.restaurant_tables
       set status='available', current_order_id=null
     where current_order_id=p_order_id;
    return jsonb_build_object('order_id',p_order_id,'payment_status','paid','operational_status','completed','amount_collected',0,'duplicate',true);
  end if;

  if p_idempotency_key is not null then
    select * into v_existing_payment
      from public.order_payments
     where idempotency_key=p_idempotency_key
     limit 1;
    if found then
      return jsonb_build_object('order_id',p_order_id,'payment_status',v_order.payment_status,'operational_status',v_order.operational_status,'amount_collected',0,'duplicate',true);
    end if;
  end if;

  select coalesce(sum(amount),0) into v_paid
    from public.order_payments
   where order_id=p_order_id and status='paid';

  v_due := greatest(coalesce(v_order.total,0)-v_paid,0);

  if v_due > 0 then
    insert into public.order_payments(order_id,amount,payment_method,collected_by,idempotency_key)
    values(p_order_id,v_due,p_payment_method,v_user,p_idempotency_key)
    returning id into v_payment_id;
  end if;

  update public.orders
     set payment_status='paid',
         payment_method=p_payment_method,
         operational_status='completed',
         status='completed',
         completed_at=coalesce(completed_at,now())
   where id=p_order_id;

  update public.restaurant_tables
     set status='available', current_order_id=null
   where current_order_id=p_order_id;

  insert into public.order_activity_log(order_id,event_type,actor_user_id,actor_role,source_device,entity_type,entity_id,details)
  values(
    p_order_id,'ORDER_SETTLED',v_user,public.get_user_role(v_user)::text,p_source_device,'order',p_order_id,
    jsonb_build_object('amount_collected',v_due,'payment_method',p_payment_method,'payment_status','paid','operational_status','completed')
  );

  return jsonb_build_object('order_id',p_order_id,'payment_status','paid','operational_status','completed','amount_collected',v_due,'duplicate',false);
end;
$$;

revoke all on function public.settle_order_atomic(uuid,text,text,text) from public, anon;
grant execute on function public.settle_order_atomic(uuid,text,text,text) to authenticated;
