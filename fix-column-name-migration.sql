-- =====================================================
-- MIGRATION: Rename metric_date to as_of_date
-- =====================================================
-- This migration renames the column from metric_date to as_of_date
-- to match the expected schema in the application code.
--
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Rename the column
ALTER TABLE csd_metric_values
  RENAME COLUMN metric_date TO as_of_date;

-- Step 2: Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'csd_metric_values'
  AND column_name = 'as_of_date';

-- Step 3: Check that the index was automatically renamed (if it exists)
-- If you have an index on metric_date, it should be renamed to as_of_date
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'csd_metric_values'
  AND indexdef LIKE '%as_of_date%';

-- Step 4: Verify the UNIQUE constraint still works
-- This should show the unique constraint on (as_of_date, field_key)
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'csd_metric_values'::regclass
  AND contype = 'u';

-- Step 5: Test query with sample data
SELECT COUNT(*) as record_count
FROM csd_metric_values
WHERE as_of_date = '2025-11-24';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- After running this migration:
-- - The column metric_date is now as_of_date
-- - All indexes and constraints are preserved
-- - Your dashboard should work correctly
-- =====================================================
