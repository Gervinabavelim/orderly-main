-- Add composite indexes for common query patterns
-- Run in Supabase SQL Editor
-- These are all CREATE IF NOT EXISTS so safe to re-run

-- Dashboard: orders list filtered by user, sorted by date
create index if not exists idx_orders_user_created on orders(user_id, created_at desc);

-- Dashboard: orders filtered by user + status
create index if not exists idx_orders_user_status on orders(user_id, status);

-- WhatsApp: find active orders for a customer
create index if not exists idx_orders_customer_status_created on orders(customer_id, status, created_at desc);

-- Customer list sorted by date
create index if not exists idx_customers_user_created on customers(user_id, created_at desc);

-- Order detail: status history sorted chronologically
create index if not exists idx_order_history_order_created on order_status_history(order_id, created_at);

-- Drop redundant single-column indexes now covered by composites
drop index if exists idx_orders_user;
drop index if exists idx_orders_status;
drop index if exists idx_orders_created;
drop index if exists idx_customers_user;
drop index if exists idx_history_user;
drop index if exists idx_wa_messages_user;
drop index if exists idx_payments_user;
