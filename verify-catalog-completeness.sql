-- =====================================================
-- VERIFY CATALOG COMPLETENESS
-- =====================================================
-- Run these queries in Supabase to verify your catalog

-- 1. Total field count (should be 153)
SELECT COUNT(*) as total_fields FROM csd_metric_catalog;

-- 2. Count by section (should show all 23 sections)
SELECT
  section,
  COUNT(*) as field_count
FROM csd_metric_catalog
GROUP BY section
ORDER BY section;

-- 3. Expected counts by section:
-- BAM_CYCLE: 5
-- DASHBOARD_KPI: 5
-- EOD_REPORT: 12
-- EOD_PAYMENT_METHODS: 10
-- EOD_ACTION_ITEMS: 5
-- EOD_MTD: 5
-- PROVIDER_PRODUCTION: 10
-- PAYMENTS: 8
-- PATIENTS: 5
-- PATIENT_AR_AGING: 4
-- PRE_AUTH: 6
-- CLAIMS: 4
-- INSURANCE_AR_AGING: 8 (4 amounts + 4 counts)
-- SCORECARD: 21
-- ADVANCED_METRICS: 5
-- ADVANCED_METRICS_COGS: 7
-- ADVANCED_METRICS_LIFECYCLE: 8
-- ADVANCED_METRICS_SATISFACTION: 3
-- NEW_PATIENT_TRACKER: 8
-- THIRD_PARTY_FINANCING: 6
-- INSURANCE: 8
-- TOTAL: 153

-- 4. Check for any uppercase/camelCase issues (should return 0 rows)
SELECT field_key
FROM csd_metric_catalog
WHERE field_key ~ '[A-Z]';

-- 5. Check calculated vs manual fields
SELECT
  is_calculated,
  COUNT(*) as count
FROM csd_metric_catalog
GROUP BY is_calculated;

-- 6. Verify critical EOD fields exist
SELECT field_key, field_name
FROM csd_metric_catalog
WHERE section = 'EOD_PAYMENT_METHODS'
ORDER BY field_key;

-- 7. Verify provider production fields exist
SELECT field_key, field_name
FROM csd_metric_catalog
WHERE section = 'PROVIDER_PRODUCTION'
ORDER BY field_key;

-- 8. Check if any fields are missing (compare to old data)
-- This shows field_keys in your old data that aren't in the new catalog
SELECT DISTINCT field_key
FROM csd_metric_values
WHERE field_key NOT IN (SELECT field_key FROM csd_metric_catalog)
ORDER BY field_key;
