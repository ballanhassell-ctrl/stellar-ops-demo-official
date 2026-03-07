-- =====================================================
-- Enhance insurance_issues table for:
--   1. Status toggle (Open / Corrected)
--   2. Submitted By initials
--   3. Structured notes with source tagging
--   4. Auto-logged submission & resolution timestamps
-- =====================================================

-- 1. Add new columns
ALTER TABLE insurance_issues
  ADD COLUMN IF NOT EXISTS submitted_by     TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submitted_at     TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resolved_at      TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS structured_notes JSONB         DEFAULT '[]'::jsonb;

-- 2. Migrate existing submission_status → submitted_by
--    e.g. "Submitted - BH" → submitted_by = 'BH'
--         "Submitted - BH/LP" → submitted_by = 'BH/LP'
UPDATE insurance_issues
  SET submitted_by = TRIM(SPLIT_PART(submission_status, '-', 2))
  WHERE submission_status IS NOT NULL
    AND submission_status ILIKE 'submitted%'
    AND submitted_by IS NULL;

-- 3. Set submitted_at for rows already marked as Submitted
UPDATE insurance_issues
  SET submitted_at = COALESCE(updated_at, created_at)
  WHERE submission_status IS NOT NULL
    AND submission_status ILIKE 'submitted%'
    AND submitted_at IS NULL;

-- 4. Normalize submission_status to just 'Submitted' (remove initials)
UPDATE insurance_issues
  SET submission_status = 'Submitted'
  WHERE submission_status IS NOT NULL
    AND submission_status ILIKE 'submitted%';

-- 5. Migrate existing notes text → structured_notes JSONB array
UPDATE insurance_issues
  SET structured_notes = jsonb_build_array(
    jsonb_build_object(
      'text', notes,
      'source', 'stellar',
      'author', '',
      'created_at', COALESCE(updated_at, created_at, NOW())
    )
  )
  WHERE notes IS NOT NULL
    AND notes != ''
    AND (structured_notes IS NULL OR structured_notes = '[]'::jsonb);

-- 6. Migrate existing status text → 'Open' or 'Corrected'
--    Set resolved_at for anything that was already corrected
UPDATE insurance_issues
  SET resolved_at = COALESCE(updated_at, created_at)
  WHERE status IS NOT NULL
    AND LOWER(status) LIKE '%corrected%'
    AND resolved_at IS NULL;

UPDATE insurance_issues
  SET status = 'Corrected'
  WHERE status IS NOT NULL
    AND LOWER(status) LIKE '%corrected%';

UPDATE insurance_issues
  SET status = 'Open'
  WHERE status IS NULL
    OR (LOWER(status) NOT LIKE '%corrected%' AND status != 'Open');

-- 7. Create index on resolved_at for resolution time queries
CREATE INDEX IF NOT EXISTS idx_insurance_issues_resolved_at
  ON insurance_issues(resolved_at);

CREATE INDEX IF NOT EXISTS idx_insurance_issues_submitted_at
  ON insurance_issues(submitted_at);
