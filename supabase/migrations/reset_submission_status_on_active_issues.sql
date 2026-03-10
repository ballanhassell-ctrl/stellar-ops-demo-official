-- Reset submission_status on active (non-resolved, non-submitted) issues
-- so they display as "--" instead of "Submitted"
UPDATE insurance_issues
  SET submission_status = NULL,
      submitted_by = NULL,
      submitted_at = NULL
  WHERE status IN ('Open', 'Corrected')
    AND submission_status = 'Submitted';
