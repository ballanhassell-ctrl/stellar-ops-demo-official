-- =====================================================
-- MONTHLY METRIC TRENDS TABLE
-- =====================================================
-- This table stores pre-aggregated monthly metrics for faster querying
-- and historical trend analysis. Instead of summing daily values each time,
-- we can store monthly totals here.
-- =====================================================

-- Create the monthly_metric_trends table
CREATE TABLE IF NOT EXISTS monthly_metric_trends (
  id BIGSERIAL PRIMARY KEY,
  field_key TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  month_name TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  goal_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_key, year, month)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_trends_field_key ON monthly_metric_trends(field_key);
CREATE INDEX IF NOT EXISTS idx_monthly_trends_year_month ON monthly_metric_trends(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_trends_field_year ON monthly_metric_trends(field_key, year);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_monthly_trends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_monthly_trends_updated_at ON monthly_metric_trends;
CREATE TRIGGER trigger_update_monthly_trends_updated_at
  BEFORE UPDATE ON monthly_metric_trends
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_trends_updated_at();

-- =====================================================
-- FUNCTION: Aggregate and store monthly new patient data
-- =====================================================
-- This function aggregates daily new patient counts by month
-- and stores them in the monthly_metric_trends table
-- =====================================================

CREATE OR REPLACE FUNCTION aggregate_monthly_new_patients(
  start_year INTEGER DEFAULT NULL,
  start_month INTEGER DEFAULT NULL
)
RETURNS TABLE(year INTEGER, month INTEGER, count BIGINT) AS $$
DECLARE
  calc_start_date DATE;
  calc_end_date DATE;
BEGIN
  -- If no start year/month provided, start from 6 months ago
  IF start_year IS NULL OR start_month IS NULL THEN
    calc_start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months');
  ELSE
    calc_start_date := make_date(start_year, start_month, 1);
  END IF;

  calc_end_date := CURRENT_DATE;

  -- Aggregate and insert/update monthly data
  INSERT INTO monthly_metric_trends (field_key, year, month, month_name, value, goal_value)
  SELECT
    'eod_new_patients' as field_key,
    EXTRACT(YEAR FROM as_of_date)::INTEGER as year,
    EXTRACT(MONTH FROM as_of_date)::INTEGER as month,
    TO_CHAR(as_of_date, 'Mon YYYY') as month_name,
    SUM(value) as value,
    40 as goal_value -- Default monthly goal for new patients
  FROM csd_metric_values
  WHERE field_key = 'eod_new_patients'
    AND as_of_date >= calc_start_date
    AND as_of_date <= calc_end_date
  GROUP BY EXTRACT(YEAR FROM as_of_date), EXTRACT(MONTH FROM as_of_date), TO_CHAR(as_of_date, 'Mon YYYY')
  ON CONFLICT (field_key, year, month)
  DO UPDATE SET
    value = EXCLUDED.value,
    month_name = EXCLUDED.month_name,
    updated_at = NOW();

  -- Return the aggregated data
  RETURN QUERY
  SELECT
    EXTRACT(YEAR FROM as_of_date)::INTEGER as year,
    EXTRACT(MONTH FROM as_of_date)::INTEGER as month,
    COUNT(*) as count
  FROM csd_metric_values
  WHERE field_key = 'eod_new_patients'
    AND as_of_date >= calc_start_date
    AND as_of_date <= calc_end_date
  GROUP BY EXTRACT(YEAR FROM as_of_date), EXTRACT(MONTH FROM as_of_date)
  ORDER BY year DESC, month DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Initial population of monthly trends
-- =====================================================
-- Run this to populate the table with historical data
-- =====================================================

-- Populate last 12 months of new patient data
SELECT * FROM aggregate_monthly_new_patients();

-- You can also manually insert data for specific months:
-- INSERT INTO monthly_metric_trends (field_key, year, month, month_name, value, goal_value, notes)
-- VALUES ('eod_new_patients', 2025, 11, 'Nov 2025', 14, 40, 'Manual entry for November 2025');

-- =====================================================
-- SAMPLE QUERIES
-- =====================================================

-- Get last 6 months of new patient trends
-- SELECT year, month, month_name, value, goal_value,
--        ROUND((value::NUMERIC / goal_value::NUMERIC) * 100, 1) as percentage_of_goal
-- FROM monthly_metric_trends
-- WHERE field_key = 'eod_new_patients'
-- ORDER BY year DESC, month DESC
-- LIMIT 6;

-- Get all metrics for a specific month
-- SELECT * FROM monthly_metric_trends
-- WHERE year = 2025 AND month = 11
-- ORDER BY field_key;
