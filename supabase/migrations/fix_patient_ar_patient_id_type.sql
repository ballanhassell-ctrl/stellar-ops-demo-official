-- =====================================================
-- Migration: Fix patient_ar.patient_id column type
-- Date: 2026-03-04
-- Purpose: Change patient_id from UUID to TEXT so that
--          plain patient identifiers (e.g. "0101010") can
--          be stored without "invalid input syntax for
--          type uuid" errors.
--
-- Must drop and recreate patient_ar_with_aging view
-- because PostgreSQL cannot ALTER a column type while
-- a view depends on it.
-- =====================================================

BEGIN;

-- Step 1: Drop the dependent view
DROP VIEW IF EXISTS patient_ar_with_aging;

-- Step 2: Change column type (only if it's currently uuid)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'patient_ar'
       AND column_name = 'patient_id'
       AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE patient_ar ALTER COLUMN patient_id TYPE TEXT USING patient_id::TEXT;
    RAISE NOTICE 'patient_ar.patient_id changed from UUID to TEXT';
  ELSE
    RAISE NOTICE 'patient_ar.patient_id is already TEXT — no change needed';
  END IF;
END;
$$;

-- Step 3: Recreate the view (matches revamp_patient_ar_table.sql definition)
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
  structured_notes,
  audit_trail,
  created_by,
  created_at,
  updated_at,
  updated_by
FROM patient_ar;

COMMIT;
