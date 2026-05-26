-- Orderly: Personal Shopper Order Management
-- Run in Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- =====================
-- CUSTOMERS
-- =====================
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  phone text not null,
  name text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (phone, user_id)
);

-- =====================
-- ORDERS
-- =====================
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  order_number serial unique,
  customer_id uuid references customers(id) not null,
  request_text text not null,
  request_images text[] default '{}',
  status text not null default 'REQUEST_RECEIVED'
    check (status in (
      'REQUEST_RECEIVED', 'QUOTED', 'ACCEPTED', 'PAID',
      'SOURCING', 'SOURCED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'REFUND_PENDING', 'REFUNDED',
      'SOURCING_DELAYED', 'DISPUTED'
    )),
  item_cost_pesewas int,
  service_fee_pesewas int,
  delivery_fee_pesewas int,
  total_amount_pesewas int,
  quote_note text,
  payment_reference text,
  payment_channel text,
  paid_at timestamptz,
  cancel_reason text,
  refund_amount_pesewas int,
  refunded_at timestamptz,
  delivery_address text,
  delivery_notes text,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- ORDER STATUS HISTORY
-- =====================
create table if not exists order_status_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  order_id uuid references orders(id) on delete cascade not null,
  from_status text,
  to_status text not null,
  changed_by text not null default 'system',
  note text,
  created_at timestamptz default now()
);

-- =====================
-- WHATSAPP MESSAGES LOG
-- =====================
create table if not exists whatsapp_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  wa_message_id text unique,
  customer_id uuid references customers(id),
  order_id uuid references orders(id),
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null default 'text',
  body text,
  media_url text,
  raw_payload jsonb,
  created_at timestamptz default now()
);

-- =====================
-- PAYMENT TRANSACTIONS
-- =====================
create table if not exists payment_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  order_id uuid references orders(id) not null,
  paystack_reference text unique not null,
  paystack_transaction_id text,
  amount_pesewas int not null,
  currency text default 'GHS',
  channel text,
  mobile_money_number text,
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'abandoned', 'reversed')),
  paystack_payload jsonb,
  created_at timestamptz default now()
);

-- =====================
-- INDEXES
-- =====================

-- Composite indexes for common query patterns
create index if not exists idx_orders_user_created on orders(user_id, created_at desc);
create index if not exists idx_orders_user_status on orders(user_id, status);
create index if not exists idx_orders_customer_status_created on orders(customer_id, status, created_at desc);
create index if not exists idx_customers_user_created on customers(user_id, created_at desc);
create index if not exists idx_order_history_order_created on order_status_history(order_id, created_at);

-- Single-column indexes for joins and lookups
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_order_history_order on order_status_history(order_id);
create index if not exists idx_wa_messages_customer on whatsapp_messages(customer_id);
create index if not exists idx_wa_messages_order on whatsapp_messages(order_id);
create index if not exists idx_payment_order on payment_transactions(order_id);
create index if not exists idx_customers_phone on customers(phone);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

create trigger customers_updated_at
  before update on customers
  for each row execute function update_updated_at();

-- =====================
-- ROW LEVEL SECURITY
-- =====================
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_status_history enable row level security;
alter table whatsapp_messages enable row level security;
alter table payment_transactions enable row level security;

create policy "tenant_customers" on customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tenant_orders" on orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tenant_history" on order_status_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tenant_wa_messages" on whatsapp_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tenant_payments" on payment_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
