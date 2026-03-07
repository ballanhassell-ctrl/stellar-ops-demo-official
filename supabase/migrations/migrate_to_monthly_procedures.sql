-- Migration: Convert top_procedures_daily to top_procedures_monthly
-- This script renames the table and updates the date column to handle monthly data

-- Step 1: Rename the table
ALTER TABLE top_procedures_daily RENAME TO top_procedures_monthly;

-- Step 2: Rename the date column to reflect monthly periods
ALTER TABLE top_procedures_monthly RENAME COLUMN procedure_date TO procedure_month;

-- Step 3: Drop old constraint and create new one with updated name
ALTER TABLE top_procedures_monthly
  DROP CONSTRAINT IF EXISTS top_procedures_daily_date_idx;

ALTER TABLE top_procedures_monthly
  ADD CONSTRAINT top_procedures_monthly_month_idx
  UNIQUE (procedure_month, procedure_name, procedure_code);

-- Step 4: Drop old indexes and create new ones with updated names
DROP INDEX IF EXISTS idx_top_procedures_date;
DROP INDEX IF EXISTS idx_top_procedures_revenue;

CREATE INDEX idx_top_procedures_month ON top_procedures_monthly(procedure_month DESC);
CREATE INDEX idx_top_procedures_revenue_monthly ON top_procedures_monthly(procedure_month, revenue DESC);

-- Step 5: Drop old trigger before recreating it
DROP TRIGGER IF EXISTS update_top_procedures_timestamp ON top_procedures_monthly;

-- Step 6: Recreate trigger with correct table reference
CREATE TRIGGER update_top_procedures_timestamp
  BEFORE UPDATE ON top_procedures_monthly
  FOR EACH ROW
  EXECUTE FUNCTION update_top_procedures_updated_at();

-- Step 7: Update table and column comments
COMMENT ON TABLE top_procedures_monthly IS 'Stores monthly top procedures performed with counts and revenue';
COMMENT ON COLUMN top_procedures_monthly.procedure_month IS 'Month when the procedure was performed (stored as first day of month, e.g., 2025-01-01 for January 2025)';
COMMENT ON COLUMN top_procedures_monthly.procedure_name IS 'Name of the dental procedure';
COMMENT ON COLUMN top_procedures_monthly.procedure_code IS 'ADA procedure code (e.g., D2740)';
COMMENT ON COLUMN top_procedures_monthly.count IS 'Number of times this procedure was performed during the month';
COMMENT ON COLUMN top_procedures_monthly.revenue IS 'Total revenue generated from this procedure during the month';

-- Note: RLS policies are automatically transferred when renaming tables
-- If you need to verify, you can check with:
-- SELECT * FROM pg_policies WHERE tablename = 'top_procedures_monthly';
