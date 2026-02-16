-- =====================================================
-- Migration: Add structured_notes and audit_trail to patient_ar
-- Date: 2026-02-16
-- Purpose: Add JSONB columns for structured notes and audit trail
--          to the patient_ar table, matching the TypeScript PatientAR
--          type definition. Also updates the patient_ar_with_aging
--          view to expose these columns.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add JSONB columns to patient_ar
-- =====================================================

ALTER TABLE patient_ar
  ADD COLUMN IF NOT EXISTS structured_notes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE patient_ar
  ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb;

-- =====================================================
-- STEP 2: Recreate the patient_ar_with_aging view
--         to include the new columns
-- =====================================================

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

-- =====================================================
-- Migration Complete
-- =====================================================
