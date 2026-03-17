-- =====================================================
-- Migration: Add structured_notes and audit_trail to claims table
-- Date: 2026-02-18
-- Purpose: Add JSONB columns for structured notes and audit trail
--          to the claims table. These columns were previously only
--          added to the patient_ar table but are also needed on
--          claims for the Insurance A/R Report's notes/audit
--          drawer functionality.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add JSONB columns to claims
-- =====================================================

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS structured_notes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb;

-- =====================================================
-- STEP 2: Create indexes for efficient JSONB queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_claims_structured_notes ON claims USING gin (structured_notes);
CREATE INDEX IF NOT EXISTS idx_claims_audit_trail ON claims USING gin (audit_trail);

COMMIT;
