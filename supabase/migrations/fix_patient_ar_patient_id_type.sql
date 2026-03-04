-- =====================================================
-- Migration: Fix patient_ar.patient_id column type
-- Date: 2026-03-04
-- Purpose: Change patient_id from UUID to TEXT so that
--          plain patient identifiers (e.g. "0101010") can
--          be stored without "invalid input syntax for
--          type uuid" errors.
-- =====================================================

-- Only run the ALTER if the column is currently uuid-typed.
-- This keeps the migration idempotent (safe to re-run).
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
