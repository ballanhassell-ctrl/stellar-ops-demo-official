-- =====================================================
-- Create monthly_metric_trends table for pre-aggregated monthly data
-- CORRECTED VERSION - matches code expectations
-- =====================================================

-- Drop table if it exists (for clean re-runs)
DROP TABLE IF EXISTS monthly_metric_trends CASCADE;

-- Create the monthly_metric_trends table with correct schema
CREATE TABLE monthly_metric_trends (
    id BIGSERIAL PRIMARY KEY,
    field_key TEXT NOT NULL,           -- Metric field_key (e.g., 'eod_new_patients')
    year INTEGER NOT NULL,              -- Year (e.g., 2025)
    month INTEGER NOT NULL,             -- Month number 1-12 (e.g., 7 for July)
    month_name TEXT NOT NULL,           -- Human-readable month (e.g., 'Jul 2025')
    value DECIMAL(15,2) DEFAULT 0,      -- The count or value for that month
    goal_value DECIMAL(15,2) DEFAULT 0, -- Optional goal for that month
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique combination of field_key, year, and month
    UNIQUE(field_key, year, month)
);

-- Create indexes for performance
CREATE INDEX idx_monthly_trends_field_key ON monthly_metric_trends(field_key);
CREATE INDEX idx_monthly_trends_year_month ON monthly_metric_trends(year, month);
CREATE INDEX idx_monthly_trends_field_year_month ON monthly_metric_trends(field_key, year, month);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monthly_metric_trends_updated_at
    BEFORE UPDATE ON monthly_metric_trends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE monthly_metric_trends IS 'Pre-aggregated monthly trend data for faster dashboard performance';
COMMENT ON COLUMN monthly_metric_trends.field_key IS 'The field_key from csd_metric_values being aggregated';
COMMENT ON COLUMN monthly_metric_trends.year IS 'Year (e.g., 2025)';
COMMENT ON COLUMN monthly_metric_trends.month IS 'Month number 1-12';
COMMENT ON COLUMN monthly_metric_trends.month_name IS 'Human-readable format (e.g., Jul 2025)';
COMMENT ON COLUMN monthly_metric_trends.value IS 'The aggregated count or value for that month';
COMMENT ON COLUMN monthly_metric_trends.goal_value IS 'Optional goal value for that month';
