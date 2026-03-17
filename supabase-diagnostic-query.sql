-- Diagnostic Query: Check what field_keys you have in Supabase vs what the app expects
-- Run this in Supabase SQL Editor to see all your data for a specific date

SELECT
  v.field_key,
  c.field_name,
  c.section,
  v.value,
  v.as_of_date
FROM csd_metric_values v
LEFT JOIN csd_metric_catalog c ON v.field_key = c.field_key
WHERE v.as_of_date = '2025-11-24'  -- Change this to your date
ORDER BY c.section, v.field_key;

-- Also check what field_keys are defined in catalog
SELECT field_key, field_name, section
FROM csd_metric_catalog
ORDER BY section, field_key;
