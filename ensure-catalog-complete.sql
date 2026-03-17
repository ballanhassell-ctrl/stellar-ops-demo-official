-- =====================================================
-- ENSURE CATALOG HAS ALL FIELDS FROM COMPLETE CSV
-- =====================================================
-- This adds any missing field definitions to csd_metric_catalog
-- Run this BEFORE importing data to csd_metric_values

-- Check current count
SELECT COUNT(*) as current_field_count FROM csd_metric_catalog;

-- Add any missing fields (these should already exist from the recreate script)
-- But this ensures they're there just in case

INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated)
VALUES
-- BAM CYCLE
('bam_current_revenue', 'BAM_CYCLE', 'BAM Current Revenue', 'currency', 'Current revenue for the BAM (Business Acceleration Month) cycle', false),
('bam_target_goal', 'BAM_CYCLE', 'BAM Target Goal', 'currency', 'Target revenue goal for the current BAM cycle', false),
('practice_goal', 'BAM_CYCLE', 'Practice Goal', 'currency', 'Monthly practice revenue goal', false),
-- ... (rest of fields already in catalog)

-- DASHBOARD KPI
('collection_rate', 'DASHBOARD_KPI', 'Collection Rate', 'percentage', 'Percentage of production that was collected', false),
('active_patients', 'DASHBOARD_KPI', 'Active Patients', 'count', 'Number of active patients', false),
('active_claims', 'DASHBOARD_KPI', 'Active Claims', 'count', 'Number of active insurance claims', false),
('pending_payments', 'DASHBOARD_KPI', 'Pending Payments', 'currency', 'Total amount of pending payments', false),
('outstanding_ar', 'DASHBOARD_KPI', 'Outstanding A/R', 'currency', 'Total outstanding accounts receivable', false)

-- Add more fields as needed...

ON CONFLICT (field_key) DO NOTHING;  -- Skip if already exists

-- Verify all fields now exist
SELECT COUNT(*) as final_field_count FROM csd_metric_catalog;
