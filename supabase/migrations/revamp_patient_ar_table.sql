-- =====================================================
-- Migration: Revamp patient_ar Table Schema
-- Date: 2026-02-05
-- Purpose: Restructure patient_ar to match new flat-column
--          contact tracking and collectibility workflow.
--          Removes legacy columns, adds new workflow fields,
--          migrates existing status values, and rebuilds the
--          patient_ar_with_aging view.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Drop dependent objects that reference old columns
-- =====================================================

-- Drop the existing view so we can safely alter columns it depends on.
-- We will recreate it at the end with the new column set.
DROP VIEW IF EXISTS patient_ar_with_aging;

-- Drop indexes that reference columns we are about to remove.
DROP INDEX IF EXISTS idx_patient_ar_next_contact;
DROP INDEX IF EXISTS idx_patient_ar_write_off_suggested;

-- =====================================================
-- STEP 2: Remove columns that are no longer needed
-- =====================================================

-- patient_contact - replaced by in-row contact date/initials tracking
ALTER TABLE patient_ar DROP COLUMN IF EXISTS patient_contact;

-- balance_created_date - no longer used in the new workflow
ALTER TABLE patient_ar DROP COLUMN IF EXISTS balance_created_date;

-- moved_to_collections_date - replaced by final_contact_date
ALTER TABLE patient_ar DROP COLUMN IF EXISTS moved_to_collections_date;

-- next_contact_due_date - replaced by status-driven workflow
ALTER TABLE patient_ar DROP COLUMN IF EXISTS next_contact_due_date;

-- assigned_to_staff_id - replaced by per-contact initials fields
ALTER TABLE patient_ar DROP COLUMN IF EXISTS assigned_to_staff_id;

-- write_off_suggestion_reason - replaced by write_off_reason
ALTER TABLE patient_ar DROP COLUMN IF EXISTS write_off_suggestion_reason;

-- =====================================================
-- STEP 3: Alter existing columns
-- =====================================================

-- original_balance: change from NOT NULL to NULLABLE (some imported
-- records may not have an original balance if only current is known).
ALTER TABLE patient_ar ALTER COLUMN original_balance DROP NOT NULL;

-- Remove the old CHECK constraint on original_balance so NULL is allowed.
-- The constraint name may vary; use a DO block to drop it safely.
DO $$
DECLARE
  _con_name TEXT;
BEGIN
  SELECT conname INTO _con_name
    FROM pg_constraint
   WHERE conrelid = 'patient_ar'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%original_balance%';
  IF _con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE patient_ar DROP CONSTRAINT %I', _con_name);
  END IF;
END;
$$;

-- Re-add a check that allows NULL but still prevents negative when set.
ALTER TABLE patient_ar ADD CONSTRAINT chk_original_balance_non_negative
  CHECK (original_balance IS NULL OR original_balance >= 0);

-- =====================================================
-- STEP 4: Migrate status values BEFORE changing the constraint
-- =====================================================

-- Map old status values to the new status vocabulary.
-- 'active'              -> 'not_started'
-- 'collections'         -> 'pending_writeoff'
-- 'paid'                -> 'paid'            (unchanged)
-- 'written_off'         -> 'completed'
-- 'uncollectible'       -> 'pending_writeoff'
-- 'write_off_suggested' -> 'pending_writeoff'
-- 'archived'            -> 'completed'

UPDATE patient_ar SET status = 'not_started'       WHERE status = 'active';
UPDATE patient_ar SET status = 'pending_writeoff'  WHERE status = 'collections';
UPDATE patient_ar SET status = 'completed'         WHERE status = 'written_off';
UPDATE patient_ar SET status = 'pending_writeoff'  WHERE status = 'uncollectible';
UPDATE patient_ar SET status = 'pending_writeoff'  WHERE status = 'write_off_suggested';
UPDATE patient_ar SET status = 'completed'         WHERE status = 'archived';
-- 'paid' stays as 'paid', no update needed.

-- =====================================================
-- STEP 5: Replace the status CHECK constraint
-- =====================================================

-- Drop the old status CHECK constraint (name may vary).
DO $$
DECLARE
  _con_name TEXT;
BEGIN
  SELECT conname INTO _con_name
    FROM pg_constraint
   WHERE conrelid = 'patient_ar'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF _con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE patient_ar DROP CONSTRAINT %I', _con_name);
  END IF;
END;
$$;

-- Add the new status CHECK with the updated value set.
ALTER TABLE patient_ar ADD CONSTRAINT chk_patient_ar_status
  CHECK (status IN (
    'not_started',
    '1st_contact_made',
    '2nd_contact_made',
    'final_contact_made',
    'paid',
    'pending_writeoff',
    'high_balance_alert',
    'completed'
  ));

-- Update the default from 'active' to 'not_started'.
ALTER TABLE patient_ar ALTER COLUMN status SET DEFAULT 'not_started';

-- =====================================================
-- STEP 6: Add new columns
-- =====================================================

-- Family grouping
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS related_family TEXT DEFAULT NULL;

-- Collectibility flag (true = collectible, false = non-collectible / write-off candidate)
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS is_collectible BOOLEAN DEFAULT TRUE;

-- Notes & workflow fields
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS background_notes TEXT DEFAULT NULL;
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS team_discussion_notes TEXT DEFAULT NULL;
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS action_needed TEXT DEFAULT NULL;
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS dr_decision TEXT DEFAULT NULL;

-- Inline contact tracking (date + initials per contact round)
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS first_contact_date DATE DEFAULT NULL;
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS first_contact_initials TEXT DEFAULT NULL;
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS second_contact_date DATE DEFAULT NULL;
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS second_contact_initials TEXT DEFAULT NULL;
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS final_contact_date DATE DEFAULT NULL;
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS final_contact_initials TEXT DEFAULT NULL;

-- Write-off reason (replaces the removed write_off_suggestion_reason)
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS write_off_reason TEXT DEFAULT NULL;

-- Collected amount (tracks how much has been collected when marked as paid)
ALTER TABLE patient_ar ADD COLUMN IF NOT EXISTS collected_amount NUMERIC(10,2) DEFAULT 0;

-- =====================================================
-- STEP 7: Back-fill is_collectible for legacy records
-- =====================================================

-- Records that were previously in 'collections', 'write_off_suggested',
-- or 'uncollectible' should be flagged as non-collectible.
-- We already mapped those statuses to 'pending_writeoff' or 'completed',
-- so we set is_collectible = false for those mapped rows.
-- Because the status updates already happened, we target the new values
-- that came from the three old statuses.  The safest approach is to
-- set it for 'pending_writeoff' (all three mapped there) and 'completed'
-- rows whose write_off_suggested_date is set (indicating they were
-- written_off rather than simply archived).
UPDATE patient_ar
   SET is_collectible = FALSE
 WHERE status = 'pending_writeoff';

UPDATE patient_ar
   SET is_collectible = FALSE
 WHERE status = 'completed'
   AND write_off_suggested_date IS NOT NULL;

-- =====================================================
-- STEP 8: Create new indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patient_ar_is_collectible
  ON patient_ar(is_collectible);

-- The status index may already exist from the original migration;
-- using IF NOT EXISTS keeps this idempotent.
CREATE INDEX IF NOT EXISTS idx_patient_ar_status
  ON patient_ar(status);

-- =====================================================
-- STEP 9: Recreate the patient_ar_with_aging view
-- =====================================================

-- The view now exposes all the new workflow columns alongside the
-- dynamically computed aging_days and aging_bucket.
CREATE OR REPLACE VIEW patient_ar_with_aging AS
SELECT
  id,
  patient_id,
  patient_name,
  related_family,
  dos,
  original_balance,
  current_balance,
  (CURRENT_DATE - dos) AS aging_days,
  CASE
    WHEN (CURRENT_DATE - dos) <= 30 THEN '0-30'::VARCHAR(10)
    WHEN (CURRENT_DATE - dos) <= 60 THEN '31-60'::VARCHAR(10)
    WHEN (CURRENT_DATE - dos) <= 90 THEN '61-90'::VARCHAR(10)
    ELSE '90+'::VARCHAR(10)
  END AS aging_bucket,
  is_collectible,
  status,
  background_notes,
  team_discussion_notes,
  action_needed,
  dr_decision,
  first_contact_date,
  first_contact_initials,
  second_contact_date,
  second_contact_initials,
  final_contact_date,
  final_contact_initials,
  write_off_suggested_date,
  write_off_reason,
  collected_amount,
  created_by,
  created_at,
  updated_at,
  updated_by
FROM patient_ar;

-- =====================================================
-- STEP 10: Update table and column comments
-- =====================================================

COMMENT ON COLUMN patient_ar.related_family IS 'Optional family grouping identifier for related patients';
COMMENT ON COLUMN patient_ar.is_collectible IS 'TRUE = collectible balance, FALSE = non-collectible / write-off candidate';
COMMENT ON COLUMN patient_ar.background_notes IS 'General background context about this AR record';
COMMENT ON COLUMN patient_ar.team_discussion_notes IS 'Notes from team discussions about this account';
COMMENT ON COLUMN patient_ar.action_needed IS 'Description of the next action required';
COMMENT ON COLUMN patient_ar.dr_decision IS 'Doctor decision notes, primarily for non-collectible accounts';
COMMENT ON COLUMN patient_ar.first_contact_date IS 'Date of first contact attempt';
COMMENT ON COLUMN patient_ar.first_contact_initials IS 'Initials of staff who made first contact';
COMMENT ON COLUMN patient_ar.second_contact_date IS 'Date of second contact attempt';
COMMENT ON COLUMN patient_ar.second_contact_initials IS 'Initials of staff who made second contact';
COMMENT ON COLUMN patient_ar.final_contact_date IS 'Date of final contact attempt';
COMMENT ON COLUMN patient_ar.final_contact_initials IS 'Initials of staff who made final contact';
COMMENT ON COLUMN patient_ar.write_off_reason IS 'Reason the balance was written off';
COMMENT ON COLUMN patient_ar.collected_amount IS 'Amount collected when account is marked as paid';

COMMIT;

-- =====================================================
-- Migration Complete
-- =====================================================
