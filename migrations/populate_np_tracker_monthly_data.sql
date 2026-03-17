-- =====================================================
-- Populate 6-month New Patient Tracker data
-- Run this AFTER create_monthly_metric_trends.sql
-- =====================================================

-- Insert monthly new patient data with correct schema
INSERT INTO monthly_metric_trends (field_key, year, month, month_name, value, goal_value)
VALUES
    ('eod_new_patients', 2025, 7, 'Jul 2025', 23, 0),
    ('eod_new_patients', 2025, 8, 'Aug 2025', 18, 0),
    ('eod_new_patients', 2025, 9, 'Sep 2025', 26, 0),
    ('eod_new_patients', 2025, 10, 'Oct 2025', 29, 0),
    ('eod_new_patients', 2025, 11, 'Nov 2025', 22, 0),
    ('eod_new_patients', 2025, 12, 'Dec 2025', 10, 0)
ON CONFLICT (field_key, year, month)
DO UPDATE SET
    value = EXCLUDED.value,
    month_name = EXCLUDED.month_name,
    updated_at = NOW();

-- Verify the data was inserted
SELECT
    month_name,
    value as new_patients_in_month,
    created_at
FROM monthly_metric_trends
WHERE field_key = 'eod_new_patients'
ORDER BY year DESC, month DESC;

-- Expected result:
-- Dec 2025: 10 patients
-- Nov 2025: 22 patients
-- Oct 2025: 29 patients
-- Sep 2025: 26 patients
-- Aug 2025: 18 patients
-- Jul 2025: 23 patients
