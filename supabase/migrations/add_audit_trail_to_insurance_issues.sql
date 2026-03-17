-- Add missing audit_trail JSONB column to insurance_issues table.
-- This column exists on patient_ar, claims, patient_credits, and eft_reconciliation
-- but was never added to insurance_issues, causing write failures on status changes.
ALTER TABLE insurance_issues
  ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_insurance_issues_audit_trail
  ON insurance_issues USING gin (audit_trail);
