-- ==============================================================================
-- CORRECTED SQL FOR DEPLOYMENT
-- Table name: scheduling_list_items (not scheduling_lists)
-- ==============================================================================

-- ==============================================================================
-- PART 1: Add last_visit_date to scheduling_list_items table
-- Purpose: Track when recare/recall patients were last seen
-- ==============================================================================

ALTER TABLE scheduling_list_items
ADD COLUMN IF NOT EXISTS last_visit_date DATE;

COMMENT ON COLUMN scheduling_list_items.last_visit_date IS
'Date of patient''s last hygiene visit (cleaning or perio maintenance). Used to track 3, 4, or 6-month recall schedules.';

CREATE INDEX IF NOT EXISTS idx_scheduling_list_items_last_visit_date
ON scheduling_list_items(last_visit_date)
WHERE list_type = 'recare' AND last_visit_date IS NOT NULL;


-- ==============================================================================
-- PART 2: Add last_visit_date to patients table
-- Purpose: Support "Patients Due for Recall" action item
-- ==============================================================================

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS last_visit_date DATE;

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

COMMENT ON COLUMN patients.last_visit_date IS
'Date of patient''s most recent visit/appointment. Used to identify patients due for recall (6+ months since last visit).';

COMMENT ON COLUMN patients.status IS
'Patient status: active, inactive, archived. Only active patients are included in recall calculations.';

CREATE INDEX IF NOT EXISTS idx_patients_last_visit_status
ON patients(last_visit_date, status)
WHERE status = 'active';


-- ==============================================================================
-- PART 3: Add next_follow_up_date to scheduling_list_items
-- Purpose: Track when VIP/Treatment patients need next follow-up contact
-- ==============================================================================

ALTER TABLE scheduling_list_items
ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;

COMMENT ON COLUMN scheduling_list_items.next_follow_up_date IS
'Automatically calculated next contact date. Used to trigger follow-up reminders for VIP and Treatment lists.';

CREATE INDEX IF NOT EXISTS idx_scheduling_next_follow_up
ON scheduling_list_items(next_follow_up_date)
WHERE next_follow_up_date IS NOT NULL;


-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Check columns were added to scheduling_list_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'scheduling_list_items'
AND column_name IN ('last_visit_date', 'next_follow_up_date')
ORDER BY column_name;

-- Check columns were added to patients
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name IN ('last_visit_date', 'status')
ORDER BY column_name;

-- Test query: Check patients due for recall
SELECT COUNT(*) as patients_due_for_recall
FROM patients
WHERE status = 'active'
AND last_visit_date < CURRENT_DATE - INTERVAL '6 months';


-- ==============================================================================
-- OPTIONAL: BACKFILL DATA
-- ==============================================================================

-- Backfill last_visit_date from most recent completed appointment
-- UNCOMMENT TO RUN:
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


-- ==============================================================================
-- AUTOMATIC TRIGGERS
-- ==============================================================================

-- ============================================
-- TRIGGER 1: Auto-update patient last_visit_date when appointment is completed
-- ============================================

CREATE OR REPLACE FUNCTION update_patient_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  -- When appointment is completed, update patient's last_visit_date
  IF NEW.status IN ('completed', 'checked_in') THEN
    UPDATE patients
    SET last_visit_date = NEW.appointment_date
    WHERE id = NEW.patient_id
    AND (last_visit_date IS NULL OR last_visit_date < NEW.appointment_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_completed_trigger
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_patient_last_visit();


-- ============================================
-- TRIGGER 2: Auto-calculate next_follow_up_date for VIP/Treatment lists
-- Calculates based on contact dates to ensure timely follow-up
-- ============================================

CREATE OR REPLACE FUNCTION calculate_next_follow_up_date()
RETURNS TRIGGER AS $$
DECLARE
  days_to_add INTEGER;
  last_contact DATE;
BEGIN
  -- Only calculate for VIP and Treatment lists
  IF NEW.list_type IN ('vip', 'treatment') THEN

    -- Determine the most recent contact date
    last_contact := GREATEST(
      COALESCE(NEW.first_contact_date, '1900-01-01'::DATE),
      COALESCE(NEW.second_contact_date, '1900-01-01'::DATE),
      COALESCE(NEW.third_contact_date, '1900-01-01'::DATE)
    );

    -- If no contacts yet, start from today
    IF last_contact = '1900-01-01'::DATE THEN
      last_contact := CURRENT_DATE;
    END IF;

    -- Calculate days to add based on number of contacts
    IF NEW.third_contact_date IS NOT NULL THEN
      -- After 3rd contact, wait 7 days before next follow-up
      days_to_add := 7;
    ELSIF NEW.second_contact_date IS NOT NULL THEN
      -- After 2nd contact, wait 5 days
      days_to_add := 5;
    ELSIF NEW.first_contact_date IS NOT NULL THEN
      -- After 1st contact, wait 3 days
      days_to_add := 3;
    ELSE
      -- No contacts yet, follow up in 2 days
      days_to_add := 2;
    END IF;

    -- Set the next follow-up date
    NEW.next_follow_up_date := last_contact + days_to_add;

    -- If patient is already scheduled, clear the follow-up date
    IF NEW.status = 'scheduled' THEN
      NEW.next_follow_up_date := NULL;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_follow_up_trigger
BEFORE INSERT OR UPDATE ON scheduling_list_items
FOR EACH ROW
EXECUTE FUNCTION calculate_next_follow_up_date();


-- ==============================================================================
-- TEST THE TRIGGERS
-- ==============================================================================

-- Test 1: See which VIP/Treatment patients need follow-up TODAY
SELECT
  id,
  list_type,
  patient_initials,
  COALESCE(first_contact_date::TEXT, 'None') as first_contact,
  COALESCE(second_contact_date::TEXT, 'None') as second_contact,
  COALESCE(third_contact_date::TEXT, 'None') as third_contact,
  next_follow_up_date,
  status
FROM scheduling_list_items
WHERE list_type IN ('vip', 'treatment')
AND next_follow_up_date <= CURRENT_DATE
AND status = 'unscheduled'
ORDER BY next_follow_up_date;

-- Test 2: Count follow-ups needed by list type
SELECT
  list_type,
  COUNT(*) as needs_follow_up_today
FROM scheduling_list_items
WHERE next_follow_up_date <= CURRENT_DATE
AND status = 'unscheduled'
GROUP BY list_type;


-- ==============================================================================
-- SUMMARY
-- ==============================================================================

-- Columns Added:
-- • scheduling_list_items.last_visit_date - For recare tracking
-- • scheduling_list_items.next_follow_up_date - For VIP/Treatment follow-ups
-- • patients.last_visit_date - For recall calculations
-- • patients.status - For filtering active patients

-- Triggers Created:
-- • appointment_completed_trigger - Auto-updates patient last_visit_date
-- • calculate_follow_up_trigger - Auto-calculates next contact date for VIP/Treatment

-- What Each Trigger Does:
-- 1. Patient Last Visit: When appointment marked "completed", updates patient table
-- 2. Next Follow-Up: Based on contact history, calculates when to reach out next
--    - No contacts yet: Follow up in 2 days
--    - After 1st contact: Follow up in 3 days
--    - After 2nd contact: Follow up in 5 days
--    - After 3rd contact: Follow up in 7 days
--    - If scheduled: Clears follow-up date (no longer needed)
