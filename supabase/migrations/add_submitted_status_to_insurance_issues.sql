-- =====================================================
-- Migration: Add 'Submitted' status to insurance_issues
-- The flow is now: Open → Corrected → Submitted → Resolved
-- 'Submitted' means the claim has been resubmitted and
-- we're waiting for payment from the insurance company.
-- =====================================================

-- 1. Drop old CHECK constraint and recreate with new status
ALTER TABLE insurance_issues
  DROP CONSTRAINT IF EXISTS insurance_issues_status_check;

ALTER TABLE insurance_issues
  ADD CONSTRAINT insurance_issues_status_check
  CHECK (status IN ('Open', 'Corrected', 'Submitted', 'Resolved'));

-- 2. Ensure all necessary columns exist for submitted tracking
-- (submitted_by and submitted_at already exist from prior migration)
-- No new columns needed - we reuse submitted_by, submitted_at for the Submitted status.
