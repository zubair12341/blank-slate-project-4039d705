-- Customer ledger foundation
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists customers_name_lower_unique on public.customers (lower(trim(name)));
alter table public.orders add column if not exists customer_id uuid references public.customers(id) on delete set null;
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create table if not exists public.customer_receipts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_method text not null default 'cash',
  reference text,
  notes text,
  received_at timestamptz not null default now(),
  received_by uuid references auth.users(id) on delete set null
);
create index if not exists customer_receipts_customer_id_idx on public.customer_receipts(customer_id, received_at desc);
alter table public.customers enable row level security;
alter table public.customer_receipts enable row level security;
drop policy if exists customers_authenticated_all on public.customers;
create policy customers_authenticated_all on public.customers for all to authenticated using (true) with check (true);
drop policy if exists customer_receipts_authenticated_all on public.customer_receipts;
create policy customer_receipts_authenticated_all on public.customer_receipts for all to authenticated using (true) with check (true);
grant select, insert, update on public.customers to authenticated;
grant select, insert, update on public.customer_receipts to authenticated;
