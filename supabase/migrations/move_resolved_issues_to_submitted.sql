-- Move all currently "Resolved" insurance issues back to "Submitted"
-- since none have actually been confirmed resolved yet.
UPDATE insurance_issues
SET
  status = 'Submitted',
  submitted_at = COALESCE(submitted_at, resolved_at, NOW()),
  submitted_by = COALESCE(submitted_by, corrected_by),
  resolved_at = NULL
WHERE status = 'Resolved';
