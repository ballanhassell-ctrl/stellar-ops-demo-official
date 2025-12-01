-- =====================================================
-- Create monthly_metric_trends table for pre-aggregated monthly data
-- =====================================================

-- Drop table if it exists (for clean re-runs)
DROP TABLE IF EXISTS monthly_metric_trends CASCADE;

-- Create the monthly_metric_trends table
CREATE TABLE monthly_metric_trends (
    id BIGSERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL,
    month TEXT NOT NULL,           -- Format: 'YYYY-MM' (e.g., '2025-11')
    count INTEGER DEFAULT 0,       -- For count-based metrics (e.g., new patients)
    value DECIMAL(15,2),           -- For value-based metrics (e.g., revenue)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique combination of metric and month
    UNIQUE(metric_name, month)
);

-- Create indexes for performance
CREATE INDEX idx_monthly_trends_metric ON monthly_metric_trends(metric_name);
CREATE INDEX idx_monthly_trends_month ON monthly_metric_trends(month);
CREATE INDEX idx_monthly_trends_metric_month ON monthly_metric_trends(metric_name, month);

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

-- =====================================================
-- Optional: Function to aggregate data from csd_metric_values
-- =====================================================

CREATE OR REPLACE FUNCTION aggregate_monthly_metrics(
    p_metric_name TEXT,
    p_start_month TEXT,  -- Format: 'YYYY-MM'
    p_end_month TEXT     -- Format: 'YYYY-MM'
)
RETURNS void AS $$
DECLARE
    v_month TEXT;
    v_count INTEGER;
    v_value DECIMAL(15,2);
BEGIN
    -- Loop through each month in the range
    FOR v_month IN
        SELECT TO_CHAR(generate_series(
            TO_DATE(p_start_month || '-01', 'YYYY-MM-DD'),
            TO_DATE(p_end_month || '-01', 'YYYY-MM-DD'),
            '1 month'::interval
        ), 'YYYY-MM')
    LOOP
        -- Aggregate count (number of records)
        SELECT COUNT(*)
        INTO v_count
        FROM csd_metric_values
        WHERE field_key = p_metric_name
          AND TO_CHAR(as_of_date, 'YYYY-MM') = v_month
          AND value IS NOT NULL
          AND value > 0;

        -- Aggregate sum of values
        SELECT COALESCE(SUM(value), 0)
        INTO v_value
        FROM csd_metric_values
        WHERE field_key = p_metric_name
          AND TO_CHAR(as_of_date, 'YYYY-MM') = v_month
          AND value IS NOT NULL;

        -- Insert or update the monthly aggregate
        INSERT INTO monthly_metric_trends (metric_name, month, count, value)
        VALUES (p_metric_name, v_month, v_count, v_value)
        ON CONFLICT (metric_name, month)
        DO UPDATE SET
            count = EXCLUDED.count,
            value = EXCLUDED.value,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Sample data population for existing metrics
-- =====================================================

-- Example: Populate new patients monthly trends for last 6 months
-- You can adjust the months based on your data range
DO $$
DECLARE
    current_month TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    six_months_ago TEXT := TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYY-MM');
BEGIN
    -- Aggregate new patients data
    PERFORM aggregate_monthly_metrics('eod_new_patients', six_months_ago, current_month);

    -- Add more metrics as needed:
    -- PERFORM aggregate_monthly_metrics('active_patients', six_months_ago, current_month);
    -- PERFORM aggregate_monthly_metrics('bam_current_revenue', six_months_ago, current_month);
END $$;

-- =====================================================
-- Verify the aggregated data
-- =====================================================

-- View all monthly trends
-- SELECT * FROM monthly_metric_trends ORDER BY month DESC, metric_name;

-- View specific metric trends
-- SELECT * FROM monthly_metric_trends WHERE metric_name = 'eod_new_patients' ORDER BY month DESC;

COMMENT ON TABLE monthly_metric_trends IS 'Pre-aggregated monthly trend data for faster dashboard performance';
COMMENT ON COLUMN monthly_metric_trends.metric_name IS 'The field_key from csd_metric_values being aggregated';
COMMENT ON COLUMN monthly_metric_trends.month IS 'Month in YYYY-MM format';
COMMENT ON COLUMN monthly_metric_trends.count IS 'Number of records/occurrences in the month';
COMMENT ON COLUMN monthly_metric_trends.value IS 'Sum or average of values in the month';
