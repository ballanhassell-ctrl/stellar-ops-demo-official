# Monthly Metric Trends Table Setup Guide

## Overview

The `monthly_metric_trends` table stores pre-aggregated monthly metrics for faster querying and historical trend analysis. Instead of summing daily values from `csd_metric_values` every time, monthly totals are stored in this table for improved performance.

## Table Structure

```sql
monthly_metric_trends (
  id BIGSERIAL PRIMARY KEY,
  field_key TEXT NOT NULL,           -- e.g., 'eod_new_patients'
  year INTEGER NOT NULL,              -- e.g., 2025
  month INTEGER NOT NULL,             -- 1-12
  month_name TEXT NOT NULL,           -- e.g., 'Nov 2025'
  value NUMERIC DEFAULT 0,            -- The aggregated monthly value
  goal_value NUMERIC DEFAULT 0,       -- Monthly goal for this metric
  notes TEXT,                         -- Optional notes
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(field_key, year, month)      -- One record per metric per month
)
```

## Setup Instructions

### Step 1: Create the Table

Run the SQL migration file in your Supabase SQL Editor:

```bash
# The SQL file is located at:
supabase-create-monthly-trends.sql
```

Or run it directly in Supabase:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-create-monthly-trends.sql`
4. Click "Run"

### Step 2: Initial Data Population

The migration automatically populates the last 12 months of new patient data by calling the `aggregate_monthly_new_patients()` function.

If you need to manually populate or refresh the data:

```sql
-- Populate all available historical data for new patients
SELECT * FROM aggregate_monthly_new_patients();

-- Populate starting from a specific month
SELECT * FROM aggregate_monthly_new_patients(2024, 1);  -- From January 2024
```

### Step 3: Verify Data

Check that the data was populated correctly:

```sql
-- View last 6 months of new patient trends
SELECT year, month, month_name, value, goal_value,
       ROUND((value::NUMERIC / NULLIF(goal_value, 0)::NUMERIC) * 100, 1) as percentage_of_goal
FROM monthly_metric_trends
WHERE field_key = 'eod_new_patients'
ORDER BY year DESC, month DESC
LIMIT 6;
```

## How It Works

### Automatic Fallback

The application uses a smart fallback mechanism:

1. **First**: Try to fetch from `monthly_metric_trends` table (fast)
2. **Fallback**: If no data found, aggregate from daily `csd_metric_values` (slower)

This ensures the app works even if the monthly table isn't set up yet.

### Code Example

```typescript
// In useNewPatientTracker hook
let monthlyData = await getMonthlyTrends('eod_new_patients', 6);

if (monthlyData.length === 0) {
  // Fallback to daily aggregation
  const dailyMonthlyData = await getNewPatientsByMonth(6);
  monthlyData = dailyMonthlyData.map(m => ({
    month: m.month,
    year: m.year,
    count: m.count,
    goal: 40
  }));
}
```

## Maintaining the Table

### Option 1: Manual Updates

When you add new daily data, manually update the monthly totals:

```sql
-- After adding data for November 2025, aggregate it
SELECT * FROM aggregate_monthly_new_patients(2025, 11);
```

### Option 2: Scheduled Updates (Recommended)

Set up a Supabase Edge Function or cron job to run monthly:

```sql
-- Run this on the 1st of each month to update the previous month
SELECT * FROM aggregate_monthly_new_patients();
```

### Option 3: Programmatic Updates

Use the `upsertMonthlyTrend` function in your application:

```typescript
import { upsertMonthlyTrend } from './services/metrics';

// Update November 2025 with 18 new patients
await upsertMonthlyTrend('eod_new_patients', 2025, 11, 18, 40);
```

## Adding More Metrics

You can use this table for any monthly metric, not just new patients:

```sql
-- Add monthly production totals
INSERT INTO monthly_metric_trends (field_key, year, month, month_name, value, goal_value)
VALUES ('monthly_production', 2025, 11, 'Nov 2025', 127126.53, 300000);

-- Add monthly collection rate
INSERT INTO monthly_metric_trends (field_key, year, month, month_name, value, goal_value)
VALUES ('monthly_collection_rate', 2025, 11, 'Nov 2025', 73, 98);
```

## Benefits

1. **Performance**: Pre-aggregated data is much faster to query than summing daily values
2. **Historical Snapshots**: Monthly totals remain stable even if daily data is corrected
3. **Flexibility**: Can store any metric aggregated by month
4. **Scalability**: As your data grows, queries remain fast
5. **Goal Tracking**: Built-in storage for monthly goals alongside actual values

## Troubleshooting

### Table doesn't exist error
If you see "relation 'monthly_metric_trends' does not exist", the table hasn't been created yet. Run the migration SQL file.

### No data showing
The app will automatically fall back to daily aggregation. To populate the table:
```sql
SELECT * FROM aggregate_monthly_new_patients();
```

### Data seems outdated
The table needs to be manually or automatically updated when new daily data is added. Run the aggregation function to refresh.

## Sample Queries

```sql
-- Get all metrics for a specific month
SELECT * FROM monthly_metric_trends
WHERE year = 2025 AND month = 11
ORDER BY field_key;

-- Compare actual vs goal for new patients
SELECT month_name,
       value as actual,
       goal_value as goal,
       ROUND((value::NUMERIC / NULLIF(goal_value, 0)::NUMERIC) * 100, 1) || '%' as achievement
FROM monthly_metric_trends
WHERE field_key = 'eod_new_patients'
  AND year = 2025
ORDER BY month;

-- Year-over-year comparison
SELECT
  t1.month,
  t1.value as "2025",
  t2.value as "2024",
  t1.value - t2.value as difference
FROM monthly_metric_trends t1
LEFT JOIN monthly_metric_trends t2
  ON t1.field_key = t2.field_key
  AND t1.month = t2.month
  AND t1.year = 2025
  AND t2.year = 2024
WHERE t1.field_key = 'eod_new_patients'
ORDER BY t1.month;
```
