-- Migration: Add last_visit_date to scheduling_lists table
-- Date: 2025-12-04
-- Purpose: Track when recare/recall patients were last seen for hygiene visits

-- Add last_visit_date column to scheduling_lists table
ALTER TABLE scheduling_lists
ADD COLUMN IF NOT EXISTS last_visit_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN scheduling_lists.last_visit_date IS
'Date of patient''s last hygiene visit (cleaning or perio maintenance). Used to track 3, 4, or 6-month recall schedules.';

-- Optional: Create an index if you'll be querying by last_visit_date frequently
CREATE INDEX IF NOT EXISTS idx_scheduling_lists_last_visit_date
ON scheduling_lists(last_visit_date)
WHERE list_type = 'recare' AND last_visit_date IS NOT NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'scheduling_lists'
AND column_name = 'last_visit_date';
