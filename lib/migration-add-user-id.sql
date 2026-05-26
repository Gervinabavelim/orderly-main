-- Multi-tenant authorization migration
-- Run in Supabase SQL Editor
--
-- BEFORE RUNNING: Replace '571fe3a7-b4b9-4ceb-820a-753baacdaa65' with your actual Supabase auth user UUID.
-- Find it in Supabase Dashboard > Authentication > Users.

BEGIN;

-- 1. Add user_id columns (nullable initially for backfill)
ALTER TABLE customers ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE order_status_history ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE whatsapp_messages ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE payment_transactions ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- 2. Backfill existing data with your user UUID
UPDATE customers SET user_id = '571fe3a7-b4b9-4ceb-820a-753baacdaa65' WHERE user_id IS NULL;
UPDATE orders SET user_id = '571fe3a7-b4b9-4ceb-820a-753baacdaa65' WHERE user_id IS NULL;
UPDATE order_status_history SET user_id = '571fe3a7-b4b9-4ceb-820a-753baacdaa65' WHERE user_id IS NULL;
UPDATE whatsapp_messages SET user_id = '571fe3a7-b4b9-4ceb-820a-753baacdaa65' WHERE user_id IS NULL;
UPDATE payment_transactions SET user_id = '571fe3a7-b4b9-4ceb-820a-753baacdaa65' WHERE user_id IS NULL;

-- 3. Make user_id NOT NULL
ALTER TABLE customers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE order_status_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE whatsapp_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE payment_transactions ALTER COLUMN user_id SET NOT NULL;

-- 4. Update unique constraint on customers (phone unique per tenant, not globally)
ALTER TABLE customers DROP CONSTRAINT customers_phone_key;
ALTER TABLE customers ADD CONSTRAINT customers_phone_user_unique UNIQUE (phone, user_id);

-- 5. Drop old permissive RLS policies
DROP POLICY "owner_all_customers" ON customers;
DROP POLICY "owner_all_orders" ON orders;
DROP POLICY "owner_all_history" ON order_status_history;
DROP POLICY "owner_all_wa_messages" ON whatsapp_messages;
DROP POLICY "owner_all_payments" ON payment_transactions;

-- 6. Create tenant-scoped RLS policies
CREATE POLICY "tenant_customers" ON customers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_orders" ON orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_history" ON order_status_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_wa_messages" ON whatsapp_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_payments" ON payment_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Add indexes for query performance
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_history_user ON order_status_history(user_id);
CREATE INDEX idx_wa_messages_user ON whatsapp_messages(user_id);
CREATE INDEX idx_payments_user ON payment_transactions(user_id);

COMMIT;
