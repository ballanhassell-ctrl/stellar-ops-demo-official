# Fix metrics fetch error on dashboard

## Summary
Fixes the "Error fetching metrics" issue on the main dashboard that occurred after uploading data to Supabase.

## Root Cause
The Supabase `csd_metric_values` table had a column named `metric_date`, but all application code expected `as_of_date`, causing PostgREST to return the error: **"column csd_metric_values.as_of_date does not exist"**

## Changes Made

### 1. Database Migration
- **Created SQL migration script** (`fix-column-name-migration.sql`) to rename `metric_date` → `as_of_date`
- Preserves all indexes, constraints, and data
- Includes verification queries

### 2. Improved Metrics Service (`src/services/metrics.ts`)
- **Client-side join approach** - Fetches `csd_metric_values` and `csd_metric_catalog` separately and joins them in the application
- **More reliable** - Doesn't depend on foreign key constraints
- **Better error handling** - Clear error messages with detailed logging
- **Defensive defaults** - Handles missing data gracefully
- **Wildcard SELECT** - Adapts to actual column names in database

### 3. Documentation
- **COLUMN-RENAME-INSTRUCTIONS.md** - Step-by-step guide for running the migration
- Detailed troubleshooting information

## Testing
- ✅ Build succeeds locally
- ✅ Migration executed successfully in Supabase
- ✅ Dashboard loads metrics without errors
- ✅ All metric sections display correctly
- ✅ Date switching works properly

## Technical Details

**Files Modified:**
- `src/services/metrics.ts` - Enhanced metrics fetching with fallback logic

**Files Added:**
- `fix-column-name-migration.sql` - Database migration script
- `COLUMN-RENAME-INSTRUCTIONS.md` - Migration documentation

**Commits:**
1. Fix metrics fetch error caused by incorrect type handling
2. Fix TypeScript build error in metrics service
3. Add robust fallback for metrics fetch with detailed logging
4. Fix column name error by using wildcard select
5. Add SQL migration to fix column name mismatch

## Migration Required
⚠️ **Before merging, ensure the database migration has been run in Supabase:**
```sql
ALTER TABLE csd_metric_values
  RENAME COLUMN metric_date TO as_of_date;
```

✅ **Migration has been successfully executed**

## Result
Dashboard now successfully loads and displays all metrics from Supabase without errors.
