-- =====================================================
-- Add three-step status flow: Open → Corrected → Resolved
--
-- Previously: Open ↔ Corrected (where "Corrected" meant resolved)
-- Now: Open → Corrected (in-charge did their fix) → Resolved (claim resubmitted & resolved)
--
-- New columns:
--   corrected_at    — when the in-charge person completed their correction
--   corrected_by    — initials of the person who did the correction
--   correction_note — optional note from corrector about what was fixed
-- =====================================================

-- 1. Add new columns for the correction step
ALTER TABLE insurance_issues
  ADD COLUMN IF NOT EXISTS corrected_at    TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS corrected_by    TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS correction_note TEXT          DEFAULT NULL;

-- 2. Migrate existing "Corrected" rows to "Resolved"
--    (Previously "Corrected" meant the issue was done/resolved.
--     In the new flow, these should be "Resolved".)
UPDATE insurance_issues
  SET status = 'Resolved',
      corrected_at = COALESCE(resolved_at, updated_at, created_at),
      corrected_by = COALESCE(submitted_by, 'staff')
  WHERE status = 'Corrected';

-- 3. Create index on corrected_at for queries
CREATE INDEX IF NOT EXISTS idx_insurance_issues_corrected_at
  ON insurance_issues(corrected_at);

-- 4. Update status constraint (drop old if exists, add new)
ALTER TABLE insurance_issues
  DROP CONSTRAINT IF EXISTS insurance_issues_status_check;

ALTER TABLE insurance_issues
  ADD CONSTRAINT insurance_issues_status_check
  CHECK (status IN ('Open', 'Corrected', 'Resolved'));
