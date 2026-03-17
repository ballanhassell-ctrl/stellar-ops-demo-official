-- =====================================================
-- STEP 2: UPDATE METRIC CLASSIFICATIONS
-- =====================================================
-- Run this after Step 1 (backup) is complete

-- Add new columns if they don't exist
ALTER TABLE csd_metric_catalog
ADD COLUMN IF NOT EXISTS entry_frequency TEXT CHECK (entry_frequency IN ('daily', 'monthly', 'automated', 'calculated'));

ALTER TABLE csd_metric_catalog
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

ALTER TABLE csd_metric_catalog
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE csd_metric_catalog
ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN DEFAULT FALSE;

-- =====================================================
-- IMPORTANT CLASSIFICATION UPDATES BASED ON USER DECISIONS
-- =====================================================

-- 1. outstanding_ar → Move to 'calculated' (automated/calculated)
UPDATE csd_metric_catalog
SET entry_frequency = 'calculated',
    is_calculated = TRUE,
    description_notes = 'Auto-calculated from Patient A/R + Insurance A/R aging totals'
WHERE field_key = 'outstanding_ar';

-- 2. eod_missed_appointments → Move to 'automated' (will query appointments table)
UPDATE csd_metric_catalog
SET entry_frequency = 'automated',
    is_calculated = TRUE,
    description_notes = 'Auto-calculated from appointments table (status=no_show)'
WHERE field_key = 'eod_missed_appointments';

-- =====================================================
-- MARK METRICS FOR DELETION
-- =====================================================

-- Metrics with NO code dependencies (safe to delete immediately)
UPDATE csd_metric_catalog
SET is_deprecated = TRUE,
    description_notes = 'DEPRECATED: Not calculated or used'
WHERE field_key IN (
  'adv_lifecycle_months',
  'adv_active_pts_prior_month',
  'adv_avg_retention_period',
  'adv_arpc'
);

-- Metrics with code dependencies (marked deprecated, code now updated)
UPDATE csd_metric_catalog
SET is_deprecated = TRUE,
    description_notes = 'DEPRECATED: Removed from dashboard, not actively tracked'
WHERE field_key = 'pending_payments';

UPDATE csd_metric_catalog
SET is_deprecated = TRUE,
    description_notes = 'DEPRECATED: Not actively tracked by team'
WHERE field_key = 'eod_unbilled_procedures';

UPDATE csd_metric_catalog
SET is_deprecated = TRUE,
    description_notes = 'DEPRECATED: Duplicate of unapplied_credits, use that instead'
WHERE field_key = 'eod_unapplied_payments';

UPDATE csd_metric_catalog
SET is_deprecated = TRUE,
    description_notes = 'DEPRECATED: Not actively monitored'
WHERE field_key = 'eod_failed_transactions';

-- Pre-auth metrics to be FULLY REMOVED (merged into eod_preauths_expiring)
UPDATE csd_metric_catalog
SET is_deprecated = TRUE,
    description_notes = 'DEPRECATED: Merged into eod_preauths_expiring (automated)'
WHERE field_key IN (
  'pre_auths_expiring_soon',
  'pre_auths_expiring_this_month'
);

-- =====================================================
-- UPDATE eod_preauths_expiring TO AUTOMATED
-- =====================================================
UPDATE csd_metric_catalog
SET entry_frequency = 'automated',
    is_calculated = TRUE,
    description_notes = 'Auto-calculated from pre-auth data (replaces pre_auths_expiring_soon and pre_auths_expiring_this_month)'
WHERE field_key = 'eod_preauths_expiring';

-- =====================================================
-- VERIFICATION: View all deprecated metrics
-- =====================================================
SELECT
  field_key,
  field_name,
  section,
  entry_frequency,
  description_notes
FROM csd_metric_catalog
WHERE is_deprecated = TRUE
ORDER BY field_key;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ CLASSIFICATION UPDATE COMPLETE - Proceed to Step 3' as status;
