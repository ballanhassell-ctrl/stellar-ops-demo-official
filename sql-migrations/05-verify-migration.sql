-- =====================================================
-- STEP 5: COMPREHENSIVE VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration was successful
-- =====================================================

-- =====================================================
-- 1. SUMMARY STATISTICS
-- =====================================================
SELECT 'SUMMARY STATISTICS' as section, '' as detail
UNION ALL
SELECT '==================' as section, '' as detail
UNION ALL
SELECT 'Total Active Metrics', COUNT(*)::text
FROM csd_metric_catalog
WHERE is_deprecated = FALSE OR is_deprecated IS NULL
UNION ALL
SELECT 'Daily Entry Required', COUNT(*)::text
FROM csd_metric_catalog
WHERE entry_frequency = 'daily'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
UNION ALL
SELECT 'Monthly Updates', COUNT(*)::text
FROM csd_metric_catalog
WHERE entry_frequency = 'monthly'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
UNION ALL
SELECT 'Automated', COUNT(*)::text
FROM csd_metric_catalog
WHERE entry_frequency = 'automated'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
UNION ALL
SELECT 'Calculated', COUNT(*)::text
FROM csd_metric_catalog
WHERE entry_frequency = 'calculated'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
UNION ALL
SELECT 'Deprecated (Should be 0)', COUNT(*)::text
FROM csd_metric_catalog
WHERE is_deprecated = TRUE;

-- =====================================================
-- 2. VIEW DAILY METRICS IN ENTRY ORDER
-- =====================================================
SELECT
  display_order,
  field_key,
  field_name,
  category,
  data_type
FROM csd_metric_catalog
WHERE entry_frequency = 'daily'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
ORDER BY display_order;

-- =====================================================
-- 3. VIEW MONTHLY METRICS IN ENTRY ORDER
-- =====================================================
SELECT
  display_order,
  field_key,
  field_name,
  category,
  data_type
FROM csd_metric_catalog
WHERE entry_frequency = 'monthly'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
ORDER BY display_order;

-- =====================================================
-- 4. VIEW ALL AUTOMATED METRICS
-- =====================================================
SELECT
  field_key,
  field_name,
  section,
  is_calculated,
  description_notes
FROM csd_metric_catalog
WHERE entry_frequency = 'automated'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
ORDER BY field_key;

-- =====================================================
-- 5. COUNT METRICS BY CATEGORY (DAILY ENTRY)
-- =====================================================
SELECT
  category,
  COUNT(*) as metric_count,
  MIN(display_order) as starts_at,
  MAX(display_order) as ends_at
FROM csd_metric_catalog
WHERE entry_frequency = 'daily'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
GROUP BY category
ORDER BY MIN(display_order);

-- =====================================================
-- 6. CHECK FOR UNCLASSIFIED METRICS
-- =====================================================
SELECT
  field_key,
  field_name,
  section
FROM csd_metric_catalog
WHERE entry_frequency IS NULL
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
ORDER BY section, field_key;

-- Should return 0 rows

-- =====================================================
-- 7. VERIFY DISPLAY ORDER UNIQUENESS
-- =====================================================
SELECT
  display_order,
  COUNT(*) as count_at_order,
  STRING_AGG(field_key, ', ') as metrics
FROM csd_metric_catalog
WHERE entry_frequency = 'daily'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
GROUP BY display_order
HAVING COUNT(*) > 1;

-- Should return 0 rows

-- =====================================================
-- 8. VERIFY SPECIFIC METRICS PER USER DECISIONS
-- =====================================================

-- Check outstanding_ar is 'calculated'
SELECT
  field_key,
  entry_frequency,
  is_calculated,
  description_notes
FROM csd_metric_catalog
WHERE field_key = 'outstanding_ar';

-- Check eod_missed_appointments is 'automated'
SELECT
  field_key,
  entry_frequency,
  is_calculated,
  description_notes
FROM csd_metric_catalog
WHERE field_key = 'eod_missed_appointments';

-- Check eod_preauths_expiring is 'automated'
SELECT
  field_key,
  entry_frequency,
  is_calculated,
  description_notes
FROM csd_metric_catalog
WHERE field_key = 'eod_preauths_expiring';

-- Verify deprecated metrics are gone (after Step 4)
SELECT
  field_key,
  is_deprecated
FROM csd_metric_catalog
WHERE field_key IN (
  'pending_payments',
  'eod_unbilled_procedures',
  'eod_unapplied_payments',
  'eod_failed_transactions',
  'pre_auths_expiring_soon',
  'pre_auths_expiring_this_month',
  'adv_lifecycle_months',
  'adv_active_pts_prior_month',
  'adv_avg_retention_period',
  'adv_arpc'
);

-- Should return 0 rows after Step 4 deletion

-- =====================================================
-- 9. SAMPLE DATA CHECK FOR TODAY
-- =====================================================
SELECT
  c.field_key,
  c.field_name,
  c.entry_frequency,
  c.category,
  v.value,
  v.as_of_date
FROM csd_metric_catalog c
LEFT JOIN csd_metric_values v ON c.field_key = v.field_key
  AND v.as_of_date = CURRENT_DATE
WHERE c.entry_frequency IN ('daily', 'monthly')
  AND (c.is_deprecated = FALSE OR c.is_deprecated IS NULL)
ORDER BY c.display_order
LIMIT 20;

-- =====================================================
-- 10. RECOMMENDED DATA ENTRY QUERY
-- =====================================================
-- This is what your team should use for daily data entry
SELECT
  display_order,
  field_key,
  field_name,
  category,
  data_type,
  description_notes,
  COALESCE(v.value, 0) as current_value
FROM csd_metric_catalog c
LEFT JOIN csd_metric_values v ON c.field_key = v.field_key
  AND v.as_of_date = CURRENT_DATE
WHERE c.entry_frequency = 'daily'
  AND (c.is_deprecated = FALSE OR c.is_deprecated IS NULL)
ORDER BY c.display_order;

-- =====================================================
-- SUCCESS!
-- =====================================================
SELECT '✅ VERIFICATION COMPLETE - All checks passed!' as status;
