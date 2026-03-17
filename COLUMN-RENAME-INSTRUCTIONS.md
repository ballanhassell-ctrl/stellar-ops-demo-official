# Column Rename Instructions

## Problem
Your Supabase `csd_metric_values` table has a column named `metric_date`, but the application code expects `as_of_date`.

## Solution
Run the SQL migration to rename the column in Supabase.

## Steps to Fix

### 1. Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor tab
3. Create a new query

### 2. Run the Migration Script
Copy and paste the contents of `fix-column-name-migration.sql` and execute it:

```sql
ALTER TABLE csd_metric_values
  RENAME COLUMN metric_date TO as_of_date;
```

### 3. Verify the Change
The migration script includes verification queries. Check that:
- ✅ Column `as_of_date` exists
- ✅ Indexes are preserved
- ✅ UNIQUE constraint on (as_of_date, field_key) still exists
- ✅ Data is queryable using `as_of_date`

### 4. Test Your Dashboard
After running the migration:
1. Refresh your dashboard
2. Metrics should load successfully
3. Check browser console for success logs

## What This Fixes
- ❌ Before: "column csd_metric_values.as_of_date does not exist"
- ✅ After: Metrics load successfully from Supabase

## Files Already Correct
All application code already uses `as_of_date`:
- ✅ `src/services/metrics.ts`
- ✅ `src/hooks/useMetrics.ts`
- ✅ `src/hooks/useEODMetrics.ts`
- ✅ `src/hooks/useProviderMetrics.ts`
- ✅ All CSV data files
- ✅ All SQL schema files

## No Code Changes Needed
After renaming the column in Supabase, the existing code will work immediately. No code changes are required.

## Rollback (if needed)
If you need to revert:
```sql
ALTER TABLE csd_metric_values
  RENAME COLUMN as_of_date TO metric_date;
```
