-- ==============================================================================
-- COMPLETE SQL SETUP - Creates tables if they don't exist
-- Run this entire script in your Supabase SQL Editor
-- ==============================================================================

-- ==============================================================================
-- STEP 1: Create scheduling_list_items table if it doesn't exist
-- ==============================================================================

CREATE TABLE IF NOT EXISTS scheduling_list_items (
  id TEXT PRIMARY KEY,
  list_type TEXT NOT NULL CHECK (list_type IN ('vip', 'recare', 'treatment')),
  patient_id TEXT NOT NULL,
  patient_initials TEXT NOT NULL,
  treatment_needed TEXT NOT NULL,
  last_visit_date DATE,
  first_contact_date DATE,
  second_contact_date DATE,
  third_contact_date DATE,
  total_tx_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  follow_up_date DATE NOT NULL,
  employee_initials TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unscheduled' CHECK (status IN ('unscheduled', 'scheduled')),
  notes TEXT,
  next_follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for scheduling_list_items
CREATE INDEX IF NOT EXISTS idx_scheduling_list_items_list_type
ON scheduling_list_items(list_type);

CREATE INDEX IF NOT EXISTS idx_scheduling_list_items_status
ON scheduling_list_items(status);

CREATE INDEX IF NOT EXISTS idx_scheduling_list_items_follow_up
ON scheduling_list_items(follow_up_date);

CREATE INDEX IF NOT EXISTS idx_scheduling_list_items_last_visit_date
ON scheduling_list_items(last_visit_date)
WHERE list_type = 'recare' AND last_visit_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduling_next_follow_up
ON scheduling_list_items(next_follow_up_date)
WHERE next_follow_up_date IS NOT NULL;

-- Add comments
COMMENT ON TABLE scheduling_list_items IS
'Manages VIP, Recare, and Treatment scheduling lists for patient follow-up';

COMMENT ON COLUMN scheduling_list_items.last_visit_date IS
'Date of patient''s last hygiene visit (cleaning or perio maintenance). Used to track 3, 4, or 6-month recall schedules.';

COMMENT ON COLUMN scheduling_list_items.next_follow_up_date IS
'Automatically calculated next contact date. Used to trigger follow-up reminders for VIP and Treatment lists.';


-- ==============================================================================
-- STEP 2: Create or update patients table
-- ==============================================================================

-- Check if patients table exists and add columns if needed
DO $$
BEGIN
  -- Add last_visit_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'last_visit_date'
  ) THEN
    ALTER TABLE patients ADD COLUMN last_visit_date DATE;
  END IF;

  -- Add status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'status'
  ) THEN
    ALTER TABLE patients ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- Add indexes for patients
CREATE INDEX IF NOT EXISTS idx_patients_last_visit_status
ON patients(last_visit_date, status)
WHERE status = 'active';

-- Add comments
COMMENT ON COLUMN patients.last_visit_date IS
'Date of patient''s most recent visit/appointment. Used to identify patients due for recall (6+ months since last visit).';

COMMENT ON COLUMN patients.status IS
'Patient status: active, inactive, archived. Only active patients are included in recall calculations.';


-- ==============================================================================
-- STEP 3: Create trigger to auto-update patient last_visit_date
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_patient_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'checked_in') THEN
    UPDATE patients
    SET last_visit_date = NEW.appointment_date
    WHERE id = NEW.patient_id
    AND (last_visit_date IS NULL OR last_visit_date < NEW.appointment_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointment_completed_trigger ON appointments;
CREATE TRIGGER appointment_completed_trigger
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_patient_last_visit();


-- ==============================================================================
-- STEP 4: Create trigger to auto-calculate next_follow_up_date
-- ==============================================================================

CREATE OR REPLACE FUNCTION calculate_next_follow_up_date()
RETURNS TRIGGER AS $$
DECLARE
  days_to_add INTEGER;
  last_contact DATE;
BEGIN
  -- Only calculate for VIP and Treatment lists
  IF NEW.list_type IN ('vip', 'treatment') THEN

    -- Find most recent contact date
    last_contact := GREATEST(
      COALESCE(NEW.first_contact_date, '1900-01-01'::DATE),
      COALESCE(NEW.second_contact_date, '1900-01-01'::DATE),
      COALESCE(NEW.third_contact_date, '1900-01-01'::DATE)
    );

    IF last_contact = '1900-01-01'::DATE THEN
      last_contact := CURRENT_DATE;
    END IF;

    -- Calculate days based on contact history
    IF NEW.third_contact_date IS NOT NULL THEN
      days_to_add := 7;  -- After 3rd contact, wait 7 days
    ELSIF NEW.second_contact_date IS NOT NULL THEN
      days_to_add := 5;  -- After 2nd contact, wait 5 days
    ELSIF NEW.first_contact_date IS NOT NULL THEN
      days_to_add := 3;  -- After 1st contact, wait 3 days
    ELSE
      days_to_add := 2;  -- No contacts yet, follow up in 2 days
    END IF;

    NEW.next_follow_up_date := last_contact + days_to_add;

    -- If scheduled, clear follow-up date
    IF NEW.status = 'scheduled' THEN
      NEW.next_follow_up_date := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_follow_up_trigger ON scheduling_list_items;
CREATE TRIGGER calculate_follow_up_trigger
BEFORE INSERT OR UPDATE ON scheduling_list_items
FOR EACH ROW
EXECUTE FUNCTION calculate_next_follow_up_date();


-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Check scheduling_list_items table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'scheduling_list_items'
ORDER BY ordinal_position;

-- Check patients table columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name IN ('last_visit_date', 'status')
ORDER BY column_name;

-- Verify triggers were created
SELECT
  trigger_name,
  event_object_table as table_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('appointment_completed_trigger', 'calculate_follow_up_trigger');


-- ==============================================================================
-- TEST QUERIES
-- ==============================================================================

-- Test 1: Count records in scheduling_list_items
SELECT
  list_type,
  COUNT(*) as total_items
FROM scheduling_list_items
GROUP BY list_type;

-- Test 2: See patients due for recall (6+ months)
SELECT COUNT(*) as patients_due_for_recall
FROM patients
WHERE status = 'active'
AND last_visit_date < CURRENT_DATE - INTERVAL '6 months';

-- Test 3: See VIP/Treatment patients needing follow-up TODAY
SELECT
  id,
  list_type,
  patient_initials,
  next_follow_up_date,
  status
FROM scheduling_list_items
WHERE list_type IN ('vip', 'treatment')
AND next_follow_up_date <= CURRENT_DATE
AND status = 'unscheduled'
ORDER BY next_follow_up_date;


-- ==============================================================================
-- OPTIONAL: Enable Row Level Security (RLS)
-- Uncomment if you want to enable RLS on the table
-- ==============================================================================

/*
ALTER TABLE scheduling_list_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users"
ON scheduling_list_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
*/


-- ==============================================================================
-- SUMMARY
-- ==============================================================================

-- ✅ Created scheduling_list_items table with all necessary columns
-- ✅ Added indexes for performance
-- ✅ Added last_visit_date and status to patients table
-- ✅ Created trigger to auto-update patient last_visit_date from appointments
-- ✅ Created trigger to auto-calculate next_follow_up_date for VIP/Treatment

-- 📊 Follow-Up Schedule:
--    No contacts yet     → Follow up in 2 days
--    After 1st contact   → Follow up in 3 days
--    After 2nd contact   → Follow up in 5 days
--    After 3rd contact   → Follow up in 7 days
--    Status = Scheduled  → Clear follow-up date
