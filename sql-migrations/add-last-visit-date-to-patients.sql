-- Migration: Add last_visit_date to patients table
-- Date: 2025-12-04
-- Purpose: Support "Patients Due for Recall" action item feature

-- Add last_visit_date column to patients table if it doesn't exist
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS last_visit_date DATE;

-- Add status column if it doesn't exist (for filtering active patients)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add comments to explain the columns
COMMENT ON COLUMN patients.last_visit_date IS
'Date of patient''s most recent visit/appointment. Used to identify patients due for recall (6+ months since last visit).';

COMMENT ON COLUMN patients.status IS
'Patient status: active, inactive, archived. Only active patients are included in recall calculations.';

-- Create index for efficient recall queries (patients not seen in 6+ months)
CREATE INDEX IF NOT EXISTS idx_patients_last_visit_status
ON patients(last_visit_date, status)
WHERE status = 'active';

-- Optional: Update last_visit_date from appointments table if you have historical data
-- This will set last_visit_date to the most recent completed appointment
-- UNCOMMENT if you want to backfill data:
/*
UPDATE patients p
SET last_visit_date = (
  SELECT MAX(a.appointment_date)
  FROM appointments a
  WHERE a.patient_id = p.id
  AND a.status IN ('completed', 'checked_in')
)
WHERE p.last_visit_date IS NULL;
*/

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name IN ('last_visit_date', 'status')
ORDER BY column_name;

-- Check how many patients are due for recall (6+ months)
SELECT
  COUNT(*) as patients_due_for_recall
FROM patients
WHERE status = 'active'
AND last_visit_date < CURRENT_DATE - INTERVAL '6 months';
