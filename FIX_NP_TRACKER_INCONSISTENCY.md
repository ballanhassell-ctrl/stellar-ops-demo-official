# NP Tracker Inconsistency Fix

## Problem Description

The New Patient (NP) Tracker was not consistently registering data entered into Supabase, causing the following issues:

1. **Stale Monthly Aggregates**: When daily `eod_new_patients` values were entered into the `csd_metric_values` table, the `monthly_metric_trends` table was not automatically updated
2. **Manual Refresh Required**: Users had to manually run aggregation functions to see updated monthly/weekly/quarterly totals
3. **Inconsistent Display**: The tracker would show outdated or missing data even though the daily values existed in the database

## Root Cause

The NP tracker uses a two-tier data architecture:

```
┌─────────────────────────┐
│  csd_metric_values      │  ← Daily values entered here (via CSV or SQL)
│  field_key = eod_new... │
└─────────────────────────┘
            ↓
     [MISSING LINK] ← **This was the problem!**
            ↓
┌─────────────────────────┐
│ monthly_metric_trends   │  ← Monthly aggregates stored here
│  (used for display)     │
└─────────────────────────┘
```

**The Issue**: There was no automatic synchronization between daily values and monthly aggregates. The monthly table had to be manually updated using:
- Edge functions
- SQL stored procedures
- Manual aggregation scripts

This led to inconsistencies where new daily data existed but wasn't reflected in the tracker display.

## Solution Implemented

### 1. **Automatic Database Triggers** ✅

Created a PostgreSQL trigger system that automatically updates monthly aggregates whenever daily values change:

```sql
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
```

**How it works**:
- Every time a row is inserted or updated in `csd_metric_values` with `field_key = 'eod_new_patients'`
- The trigger automatically recalculates the monthly total for that month
- Updates the `monthly_metric_trends` table immediately
- No manual intervention required!

### 2. **Manual Refresh Button** ✅

Added a refresh button to the NP Tracker UI as a backup mechanism:

```tsx
<button
  onClick={refreshNewPatients}
  className="p-2 rounded-lg transition-colors..."
  title="Refresh tracker data"
>
  <RefreshCw className="w-5 h-5" />
</button>
```

Users can manually refresh the tracker data if needed, which re-fetches from the database.

### 3. **Data Backfill** ✅

The migration automatically backfills the last 12 months of historical data to ensure consistency:

```sql
-- Backfill existing data for last 12 months
DO $$
BEGIN
  v_start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months');
  -- Loops through each month and aggregates
END;
$$;
```

## Installation Instructions

### Step 1: Apply the Database Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `migrations/fix_np_tracker_auto_aggregate.sql`
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute the migration

**Expected Output**:
```
NOTICE: Updated monthly aggregate for eod_new_patients - Nov 2025: 18
NOTICE: Updated monthly aggregate for eod_new_patients - Oct 2025: 14
... (continues for 12 months)
NOTICE: Backfill complete!
```

### Step 2: Verify the Fix

Run this query to verify data consistency:

```sql
-- Check that monthly aggregates match daily sums
SELECT
  DATE_TRUNC('month', as_of_date) as month,
  SUM(value) as daily_sum
FROM csd_metric_values
WHERE field_key = 'eod_new_patients'
  AND as_of_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', as_of_date)
ORDER BY month DESC;

-- Compare with monthly_metric_trends
SELECT
  month_name,
  value as monthly_value
FROM monthly_metric_trends
WHERE field_key = 'eod_new_patients'
  AND year >= EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '6 months')
ORDER BY year DESC, month DESC;
```

The values should match exactly!

### Step 3: Test the Automatic Trigger

Insert a test daily value and verify it auto-updates the monthly aggregate:

```sql
-- Insert a test value for today
INSERT INTO csd_metric_values (as_of_date, field_key, value)
VALUES (CURRENT_DATE, 'eod_new_patients', 5)
ON CONFLICT (as_of_date, field_key)
DO UPDATE SET value = EXCLUDED.value;

-- Immediately check the monthly aggregate (should include the new value)
SELECT
  month_name,
  value
FROM monthly_metric_trends
WHERE field_key = 'eod_new_patients'
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE);
```

The monthly value should now include your test entry!

### Step 4: Deploy the UI Changes

The UI changes are already in the codebase. Simply rebuild and deploy:

```bash
npm run build
# Then deploy to your hosting platform
```

## What This Fixes

✅ **Automatic Synchronization**: Daily values instantly reflect in monthly aggregates
✅ **Consistent Display**: The NP tracker always shows current, accurate data
✅ **No Manual Intervention**: No need to run aggregation scripts or edge functions
✅ **Real-Time Updates**: Changes appear immediately in the dashboard
✅ **Historical Accuracy**: Backfilled last 12 months of data
✅ **User Control**: Manual refresh button for additional peace of mind

## How It Works Now

```
User enters daily data:
┌─────────────────────────────────────┐
│ CSV Upload or SQL Insert            │
│ ↓                                   │
│ csd_metric_values (field_key =      │
│ 'eod_new_patients')                 │
└─────────────────────────────────────┘
            ↓
    [TRIGGER FIRES]  ← **NEW!**
            ↓
┌─────────────────────────────────────┐
│ Automatic aggregation:              │
│ - Sums all daily values for month   │
│ - Updates monthly_metric_trends     │
│ - Sets goal_value = 40 (default)    │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ Dashboard displays updated data     │
│ immediately (no refresh needed)     │
└─────────────────────────────────────┘
```

## Maintenance

The trigger system requires **zero maintenance**. It automatically:

- Updates monthly aggregates on INSERT/UPDATE
- Handles new months as they occur
- Maintains data consistency indefinitely

Optional: If you ever need to manually refresh a specific month:

```sql
SELECT update_monthly_metric_for_date('eod_new_patients', '2025-11-01');
```

## Monitoring

To verify the triggers are working correctly:

```sql
-- View all recent monthly updates
SELECT
  field_key,
  month_name,
  value,
  updated_at
FROM monthly_metric_trends
WHERE field_key = 'eod_new_patients'
ORDER BY updated_at DESC
LIMIT 10;
```

The `updated_at` timestamp should reflect recent changes.

## Adding More Metrics

To auto-aggregate other metrics (like production or payments), edit the trigger function:

```sql
-- Edit this section in the migration file
IF NEW.field_key IN (
  'eod_new_patients',
  'eod_daily_production',     -- ADD THIS
  'eod_payments_collected'    -- AND THIS
) THEN
```

Then update the goal values in the function:

```sql
CASE p_field_key
  WHEN 'eod_new_patients' THEN v_goal_value := 40;
  WHEN 'eod_daily_production' THEN v_goal_value := 19991;
  WHEN 'eod_payments_collected' THEN v_goal_value := 15000;
  ELSE v_goal_value := 0;
END CASE;
```

## Rollback Instructions

If you need to rollback this change (not recommended):

```sql
-- Drop the triggers
DROP TRIGGER IF EXISTS trg_csd_metric_values_insert ON csd_metric_values;
DROP TRIGGER IF EXISTS trg_csd_metric_values_update ON csd_metric_values;

-- Drop the functions
DROP FUNCTION IF EXISTS trigger_update_monthly_metrics();
DROP FUNCTION IF EXISTS update_monthly_metric_for_date(TEXT, DATE);
```

## Technical Details

**Files Modified**:
- `migrations/fix_np_tracker_auto_aggregate.sql` - Database migration (NEW)
- `src/App.tsx` - Added refresh button to NP Tracker UI
- `FIX_NP_TRACKER_INCONSISTENCY.md` - This documentation (NEW)

**Database Objects Created**:
- Function: `update_monthly_metric_for_date(field_key, date)` - Aggregates a specific month
- Function: `trigger_update_monthly_metrics()` - Trigger handler
- Trigger: `trg_csd_metric_values_insert` - Fires on INSERT
- Trigger: `trg_csd_metric_values_update` - Fires on UPDATE

**Performance Impact**:
- Minimal: Triggers only fire on affected rows
- Aggregation is scoped to a single month (fast)
- No impact on read queries (same as before)

## Questions?

If you encounter any issues:

1. Check that the migration ran successfully (no errors in SQL Editor)
2. Verify triggers exist: `\d csd_metric_values` in psql should show triggers
3. Check function exists: `\df update_monthly_metric_for_date`
4. Review Supabase logs for any error messages

---

**Migration Date**: 2025-12-04
**Status**: ✅ Ready to deploy
**Breaking Changes**: None
**Backwards Compatible**: Yes
