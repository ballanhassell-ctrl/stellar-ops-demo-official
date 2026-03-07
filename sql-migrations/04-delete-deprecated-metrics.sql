-- =====================================================
-- STEP 4: DELETE DEPRECATED METRICS
-- =====================================================
-- ⚠️ ONLY RUN THIS AFTER:
-- 1. All code changes are deployed
-- 2. Dashboard tested and working
-- 3. No errors for at least 1 week
-- =====================================================

-- =====================================================
-- PHASE 1: ARCHIVE OLD VALUES FIRST (JUST IN CASE)
-- =====================================================

-- Create archive table if it doesn't exist
CREATE TABLE IF NOT EXISTS csd_metric_values_archived AS
SELECT * FROM csd_metric_values WHERE 1=0;

-- Archive values for deprecated metrics
INSERT INTO csd_metric_values_archived
SELECT * FROM csd_metric_values
WHERE field_key IN (
  -- Metrics with no dependencies (safe to delete)
  'adv_lifecycle_months',
  'adv_active_pts_prior_month',
  'adv_avg_retention_period',
  'adv_arpc',
  -- Metrics with code dependencies (now fixed)
  'pending_payments',
  'eod_unbilled_procedures',
  'eod_unapplied_payments',
  'eod_failed_transactions',
  'pre_auths_expiring_soon',
  'pre_auths_expiring_this_month'
);

SELECT '✅ Archived values for deprecated metrics' as status,
       COUNT(*) as archived_records
FROM csd_metric_values_archived;

-- =====================================================
-- PHASE 2: DELETE VALUES FOR DEPRECATED METRICS
-- =====================================================

DELETE FROM csd_metric_values
WHERE field_key IN (
  -- Metrics with no dependencies (safe to delete)
  'adv_lifecycle_months',
  'adv_active_pts_prior_month',
  'adv_avg_retention_period',
  'adv_arpc',
  -- Metrics with code dependencies (now fixed)
  'pending_payments',
  'eod_unbilled_procedures',
  'eod_unapplied_payments',
  'eod_failed_transactions',
  'pre_auths_expiring_soon',
  'pre_auths_expiring_this_month'
);

SELECT '✅ Deleted deprecated metric values' as status;

-- =====================================================
-- PHASE 3: DELETE CATALOG ENTRIES FOR DEPRECATED METRICS
-- =====================================================

DELETE FROM csd_metric_catalog
WHERE is_deprecated = TRUE;

SELECT '✅ Deleted deprecated metric catalog entries' as status;

-- =====================================================
-- VERIFICATION: Ensure no deprecated metrics remain
-- =====================================================

SELECT
  COUNT(*) as remaining_deprecated_count
FROM csd_metric_catalog
WHERE is_deprecated = TRUE;

-- Should return 0

-- =====================================================
-- VERIFICATION: Count active metrics by frequency
-- =====================================================

SELECT
  entry_frequency,
  COUNT(*) as metric_count
FROM csd_metric_catalog
WHERE is_deprecated = FALSE OR is_deprecated IS NULL
GROUP BY entry_frequency
ORDER BY entry_frequency;

-- Expected results (approximately):
-- automated: 13
-- calculated: 3
-- daily: 60
-- monthly: 36

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ DEPRECATED METRICS DELETED - Reorganization Complete!' as status;
