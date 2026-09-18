-- Task 1 / Step 1: add waiter as an authenticated application role.
-- Kept separate because PostgreSQL requires a newly-added enum value to be committed
-- before it is safely used by later migrations.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'waiter';
