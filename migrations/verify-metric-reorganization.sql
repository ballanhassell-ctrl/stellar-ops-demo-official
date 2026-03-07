-- =====================================================
-- METRIC REORGANIZATION VERIFICATION QUERIES
-- =====================================================
-- Use these queries to verify the reorganization was successful
-- =====================================================

-- Query 1: Count metrics by entry frequency
SELECT
  entry_frequency,
  COUNT(*) as metric_count,
  ARRAY_AGG(field_key ORDER BY display_order) FILTER (WHERE entry_frequency IS NOT NULL) as sample_metrics
FROM csd_metric_catalog
WHERE is_deprecated = FALSE OR is_deprecated IS NULL
GROUP BY entry_frequency
ORDER BY entry_frequency;

-- Query 2: View all DAILY metrics in display order (for data entry form)
SELECT
  display_order,
  field_key,
  field_name,
  category,
  data_type,
  description_notes
FROM csd_metric_catalog
WHERE entry_frequency = 'daily'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
ORDER BY display_order;

-- Query 3: View all MONTHLY metrics in display order
SELECT
  display_order,
  field_key,
  field_name,
  category,
  data_type,
  description_notes
FROM csd_metric_catalog
WHERE entry_frequency = 'monthly'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
ORDER BY display_order;

-- Query 4: View all AUTOMATED metrics
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

-- Query 5: View DEPRECATED metrics (should be removed after code cleanup)
SELECT
  field_key,
  field_name,
  section,
  description_notes
FROM csd_metric_catalog
WHERE is_deprecated = TRUE
ORDER BY field_key;

-- Query 6: Count metrics by category (for daily entry)
SELECT
  category,
  COUNT(*) as metric_count
FROM csd_metric_catalog
WHERE entry_frequency = 'daily'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
GROUP BY category
ORDER BY MIN(display_order);

-- Query 7: Check for metrics without classification
SELECT
  field_key,
  field_name,
  section
FROM csd_metric_catalog
WHERE entry_frequency IS NULL
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)
ORDER BY section, field_key;

-- Query 8: Verify display_order uniqueness for daily metrics
SELECT
  display_order,
  COUNT(*) as count_at_order,
  ARRAY_AGG(field_key) as metrics
FROM csd_metric_catalog
WHERE entry_frequency = 'daily'
GROUP BY display_order
HAVING COUNT(*) > 1;

-- Query 9: Get sample data for today's date to verify values exist
SELECT
  c.field_key,
  c.field_name,
  c.entry_frequency,
  c.category,
  v.value,
  v.text_value,
  v.as_of_date
FROM csd_metric_catalog c
LEFT JOIN csd_metric_values v ON c.field_key = v.field_key
  AND v.as_of_date = CURRENT_DATE
WHERE c.entry_frequency IN ('daily', 'monthly')
  AND (c.is_deprecated = FALSE OR c.is_deprecated IS NULL)
ORDER BY c.display_order
LIMIT 50;

-- Query 10: Summary statistics
SELECT
  'Total Active Metrics' as metric,
  COUNT(*) as count
FROM csd_metric_catalog
WHERE is_deprecated = FALSE OR is_deprecated IS NULL

UNION ALL

SELECT
  'Daily Entry Required',
  COUNT(*)
FROM csd_metric_catalog
WHERE entry_frequency = 'daily'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)

UNION ALL

SELECT
  'Monthly Updates',
  COUNT(*)
FROM csd_metric_catalog
WHERE entry_frequency = 'monthly'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)

UNION ALL

SELECT
  'Automated',
  COUNT(*)
FROM csd_metric_catalog
WHERE entry_frequency = 'automated'
  AND (is_deprecated = FALSE OR is_deprecated IS NULL)

UNION ALL

SELECT
  'Deprecated (To Remove)',
  COUNT(*)
FROM csd_metric_catalog
WHERE is_deprecated = TRUE;

-- =====================================================
-- RECOMMENDED DATA ENTRY QUERY
-- This is what your team should use for daily data entry
-- =====================================================

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
