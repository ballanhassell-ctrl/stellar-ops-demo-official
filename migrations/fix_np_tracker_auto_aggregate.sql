-- Migration: Auto-update monthly_metric_trends when daily values change
-- Purpose: Fix NP tracker inconsistency by automatically aggregating monthly data
-- Date: 2025-12-04

-- ============================================================================
-- STEP 1: Create function to aggregate monthly metrics for a specific month
-- ============================================================================

CREATE OR REPLACE FUNCTION update_monthly_metric_for_date(
  p_field_key TEXT,
  p_date DATE
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_month_name TEXT;
  v_month_total NUMERIC;
  v_goal_value NUMERIC;
BEGIN
  -- Extract year and month from the date
  v_year := EXTRACT(YEAR FROM p_date);
  v_month := EXTRACT(MONTH FROM p_date);

  -- Generate month name (e.g., "Nov 2025")
  v_month_name := TO_CHAR(p_date, 'Mon YYYY');

  -- Calculate the monthly total by summing all daily values for this month
  SELECT COALESCE(SUM(value), 0)
  INTO v_month_total
  FROM csd_metric_values
  WHERE field_key = p_field_key
    AND EXTRACT(YEAR FROM as_of_date) = v_year
    AND EXTRACT(MONTH FROM as_of_date) = v_month;

  -- Set default goal value based on metric type
  -- You can customize this logic based on your business rules
  CASE p_field_key
    WHEN 'eod_new_patients' THEN v_goal_value := 40;
    ELSE v_goal_value := 0;
  END CASE;

  -- Upsert the monthly aggregate
  INSERT INTO monthly_metric_trends (
    field_key,
    year,
    month,
    month_name,
    value,
    goal_value,
    updated_at
  )
  VALUES (
    p_field_key,
    v_year,
    v_month,
    v_month_name,
    v_month_total,
    v_goal_value,
    NOW()
  )
  ON CONFLICT (field_key, year, month)
  DO UPDATE SET
    value = EXCLUDED.value,
    month_name = EXCLUDED.month_name,
    updated_at = NOW();

  RAISE NOTICE 'Updated monthly aggregate for % - %: %', p_field_key, v_month_name, v_month_total;
END;
$$;

-- ============================================================================
-- STEP 2: Create trigger function to auto-update on daily value changes
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_monthly_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only aggregate metrics that need monthly totals
  -- Add more field_keys here as needed
  IF NEW.field_key IN ('eod_new_patients', 'eod_daily_production', 'eod_payments_collected') THEN
    -- Update the monthly aggregate for the affected month
    PERFORM update_monthly_metric_for_date(NEW.field_key, NEW.as_of_date);
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 3: Create triggers on INSERT and UPDATE
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_csd_metric_values_insert ON csd_metric_values;
DROP TRIGGER IF EXISTS trg_csd_metric_values_update ON csd_metric_values;

-- Trigger on INSERT
CREATE TRIGGER trg_csd_metric_values_insert
  AFTER INSERT ON csd_metric_values
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_monthly_metrics();

-- Trigger on UPDATE
CREATE TRIGGER trg_csd_metric_values_update
  AFTER UPDATE ON csd_metric_values
  FOR EACH ROW
  WHEN (OLD.value IS DISTINCT FROM NEW.value)
  EXECUTE FUNCTION trigger_update_monthly_metrics();

-- ============================================================================
-- STEP 4: Backfill existing data (last 12 months)
-- ============================================================================

DO $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_current_date DATE;
BEGIN
  -- Calculate date range (last 12 months)
  v_end_date := CURRENT_DATE;
  v_start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months');
  v_current_date := v_start_date;

  RAISE NOTICE 'Backfilling monthly aggregates from % to %', v_start_date, v_end_date;

  -- Loop through each month and aggregate
  WHILE v_current_date <= v_end_date LOOP
    -- Aggregate new patients
    PERFORM update_monthly_metric_for_date('eod_new_patients', v_current_date);

    -- Add more metrics here as needed
    -- PERFORM update_monthly_metric_for_date('eod_daily_production', v_current_date);
    -- PERFORM update_monthly_metric_for_date('eod_payments_collected', v_current_date);

    -- Move to next month
    v_current_date := v_current_date + INTERVAL '1 month';
  END LOOP;

  RAISE NOTICE 'Backfill complete!';
END;
$$;

-- ============================================================================
-- STEP 5: Verification queries
-- ============================================================================

-- View the results
SELECT
  field_key,
  year,
  month,
  month_name,
  value,
  goal_value,
  ROUND((value::NUMERIC / NULLIF(goal_value, 0)::NUMERIC) * 100, 1) as pct_of_goal,
  updated_at
FROM monthly_metric_trends
WHERE field_key = 'eod_new_patients'
ORDER BY year DESC, month DESC
LIMIT 12;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

/*
After running this migration:

1. ✅ Monthly aggregates update AUTOMATICALLY when daily values change
2. ✅ Works for INSERT, UPDATE operations on csd_metric_values
3. ✅ Historical data backfilled for last 12 months
4. ✅ NP tracker will always show consistent data

To manually refresh a specific month (if needed):
  SELECT update_monthly_metric_for_date('eod_new_patients', '2025-11-01');

To add more metrics to auto-aggregation:
  Edit the trigger function and add field_keys to the IN clause

To verify data consistency:
  SELECT
    DATE_TRUNC('month', as_of_date) as month,
    SUM(value) as daily_sum
  FROM csd_metric_values
  WHERE field_key = 'eod_new_patients'
  GROUP BY DATE_TRUNC('month', as_of_date)
  ORDER BY month DESC;

  -- Compare with monthly_metric_trends table
*/
