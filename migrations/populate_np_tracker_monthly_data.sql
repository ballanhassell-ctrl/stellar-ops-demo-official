-- =====================================================
-- Populate 6-month New Patient Tracker data
-- Run this AFTER create_monthly_metric_trends.sql
-- =====================================================

-- Insert monthly new patient data
INSERT INTO monthly_metric_trends (metric_name, month, count, value)
VALUES
    ('eod_new_patients', '2025-07', 23, 23),
    ('eod_new_patients', '2025-08', 18, 18),
    ('eod_new_patients', '2025-09', 26, 26),
    ('eod_new_patients', '2025-10', 29, 29),
    ('eod_new_patients', '2025-11', 22, 22),
    ('eod_new_patients', '2025-12', 10, 10)
ON CONFLICT (metric_name, month)
DO UPDATE SET
    count = EXCLUDED.count,
    value = EXCLUDED.value,
    updated_at = NOW();

-- Verify the data was inserted
SELECT
    month,
    count as new_patients_in_month,
    created_at
FROM monthly_metric_trends
WHERE metric_name = 'eod_new_patients'
ORDER BY month DESC;

-- Expected result:
-- 2025-12: 10 patients
-- 2025-11: 22 patients
-- 2025-10: 29 patients
-- 2025-09: 26 patients
-- 2025-08: 18 patients
-- 2025-07: 23 patients
