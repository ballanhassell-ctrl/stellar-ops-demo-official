-- =====================================================
-- Fix vcc_payments status check constraint
-- The original CREATE TABLE migration uses IF NOT EXISTS,
-- so renaming the status value in the migration file did
-- NOT update the live database constraint. This migration
-- drops the stale constraint, migrates existing rows to
-- the current status value, and recreates the constraint.
-- =====================================================

-- 1. Drop the old constraint
ALTER TABLE vcc_payments DROP CONSTRAINT IF EXISTS vcc_payments_status_check;

-- 2. Migrate any rows that still use old status names
UPDATE vcc_payments
  SET status = 'Pending Payment Deposit via CC Terminal/Check'
  WHERE status IN ('Pending', 'Pending/Needs Payment');

-- 3. Update the column default to the current status name
ALTER TABLE vcc_payments
  ALTER COLUMN status SET DEFAULT 'Pending Payment Deposit via CC Terminal/Check';

-- 4. Recreate the constraint with the correct values
ALTER TABLE vcc_payments
  ADD CONSTRAINT vcc_payments_status_check
  CHECK (status IN ('Pending Payment Deposit via CC Terminal/Check', 'Posted', 'Closed'));
