-- =====================================================
-- VERIFY 11/24/2025 DATA IN SUPABASE
-- =====================================================

-- 1. Check if any data exists for 11/24/2025
SELECT COUNT(*) as total_fields
FROM csd_metric_values
WHERE as_of_date = '2025-11-24';

-- 2. See all fields that have data for this date
SELECT
  mc.section,
  mc.field_name,
  mv.field_key,
  mv.value,
  mc.data_type
FROM csd_metric_values mv
JOIN csd_metric_catalog mc ON mv.field_key = mc.field_key
WHERE mv.as_of_date = '2025-11-24'
ORDER BY mc.section, mc.field_name;

-- 3. Check completion percentage
SELECT
  as_of_date,
  COUNT(*) as fields_filled,
  (SELECT COUNT(*) FROM csd_metric_catalog WHERE is_calculated = FALSE) as total_manual_fields,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM csd_metric_catalog WHERE is_calculated = FALSE), 2) as completion_percentage
FROM csd_metric_values
WHERE as_of_date = '2025-11-24'
GROUP BY as_of_date;

-- 4. Find which sections have data
SELECT
  mc.section,
  COUNT(*) as field_count
FROM csd_metric_values mv
JOIN csd_metric_catalog mc ON mv.field_key = mc.field_key
WHERE mv.as_of_date = '2025-11-24'
GROUP BY mc.section
ORDER BY mc.section;

-- 5. Find what's MISSING for this date (fields that should be filled but aren't)
SELECT
  mc.section,
  mc.field_key,
  mc.field_name,
  mc.data_type
FROM csd_metric_catalog mc
LEFT JOIN csd_metric_values mv ON mc.field_key = mv.field_key
  AND mv.as_of_date = '2025-11-24'
WHERE mv.id IS NULL
  AND mc.is_calculated = FALSE
ORDER BY mc.section, mc.field_key;
