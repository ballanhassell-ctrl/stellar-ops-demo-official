# Dashboard Features Migration Guide
**Date:** December 4, 2025
**Features:** Last Visit Date for Recare + Patients Due for Recall

## Overview
This migration adds support for two new dashboard features:
1. **Last Visit Date in Recare Section** - Track when recare/recall patients were last seen
2. **Patients Due for Recall Action Item** - Auto-calculate patients who haven't been seen in 6+ months

## Prerequisites
- Supabase project with existing `scheduling_lists` and `patients` tables
- Database access with ALTER TABLE permissions

## Migration Steps

### Step 1: Add last_visit_date to scheduling_lists table
This enables tracking of last visit dates in the Recare section.

```bash
# Run from Supabase SQL Editor
psql -h your-project.supabase.co -U postgres -d postgres -f sql-migrations/add-last-visit-date-to-scheduling.sql
```

**What this does:**
- Adds `last_visit_date DATE` column to `scheduling_lists` table
- Creates an index for efficient queries on recare list items
- Adds documentation comments

**Verification:**
```sql
SELECT * FROM scheduling_lists LIMIT 1;
-- Should show last_visit_date column
```

---

### Step 2: Add last_visit_date to patients table
This enables the "Patients Due for Recall" action item calculation.

```bash
# Run from Supabase SQL Editor
psql -h your-project.supabase.co -U postgres -d postgres -f sql-migrations/add-last-visit-date-to-patients.sql
```

**What this does:**
- Adds `last_visit_date DATE` column to `patients` table
- Adds `status VARCHAR(20)` column if not exists (defaults to 'active')
- Creates an index for efficient recall queries
- Provides optional backfill query to populate from appointments table

**Verification:**
```sql
-- Check columns were added
SELECT * FROM patients LIMIT 1;

-- Check how many patients would show up in recall list
SELECT COUNT(*) as patients_due_for_recall
FROM patients
WHERE status = 'active'
AND last_visit_date < CURRENT_DATE - INTERVAL '6 months';
```

---

## Data Backfilling (Optional)

### Option A: Backfill from Appointments Table
If you have historical appointment data, you can automatically populate `last_visit_date`:

```sql
-- For patients table
UPDATE patients p
SET last_visit_date = (
  SELECT MAX(a.appointment_date)
  FROM appointments a
  WHERE a.patient_id = p.id
  AND a.status IN ('completed', 'checked_in')
)
WHERE p.last_visit_date IS NULL;

-- Verify results
SELECT
  COUNT(*) as total_patients,
  COUNT(last_visit_date) as patients_with_visit_date,
  COUNT(CASE WHEN last_visit_date < CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as due_for_recall
FROM patients
WHERE status = 'active';
```

### Option B: Manual Data Entry
For recare list items, staff can enter `last_visit_date` when:
- Adding new patients to the recare list
- Editing existing recare list entries

---

## Testing the Features

### Test 1: Last Visit Date in Recare Section
1. Navigate to Scheduling > Recare List
2. Click "Add Recare"
3. Fill out form including "Last Visit Date"
4. Save and verify the date appears in the table

### Test 2: Patients Due for Recall Action Item
1. Navigate to Dashboard Overview > EOD Report
2. Check "Action Items for Tomorrow" section
3. Verify "Patients Due for Recall" card shows a count
4. Count should match patients with `last_visit_date` > 6 months ago

**Manual verification:**
```sql
SELECT
  id,
  patient_id,
  patient_initials,
  last_visit_date,
  CURRENT_DATE - last_visit_date as days_since_visit
FROM patients
WHERE status = 'active'
AND last_visit_date < CURRENT_DATE - INTERVAL '6 months'
ORDER BY last_visit_date
LIMIT 10;
```

---

## Rollback Instructions

If you need to rollback these changes:

```sql
-- Remove from scheduling_lists
ALTER TABLE scheduling_lists DROP COLUMN IF EXISTS last_visit_date;
DROP INDEX IF EXISTS idx_scheduling_lists_last_visit_date;

-- Remove from patients (CAREFUL - may have data you want to keep!)
ALTER TABLE patients DROP COLUMN IF EXISTS last_visit_date;
DROP INDEX IF EXISTS idx_patients_last_visit_status;
```

---

## Performance Considerations

**Indexes Created:**
1. `idx_scheduling_lists_last_visit_date` - Speeds up recare list queries
2. `idx_patients_last_visit_status` - Speeds up recall calculations

**Query Performance:**
- Patients Due for Recall query: O(log n) with index, should be <10ms for 10k patients
- Recare list display: No performance impact, column is optional

---

## Post-Migration Tasks

### 1. Update Patient Records
Ensure staff knows to:
- Update `last_visit_date` after each completed appointment
- Set patient `status` to 'inactive' when appropriate

### 2. Create Automation (Optional)
Consider creating a Supabase function or trigger to auto-update `last_visit_date`:

```sql
-- Example trigger to update last_visit_date when appointment is completed
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

CREATE TRIGGER appointment_completed_trigger
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_patient_last_visit();
```

### 3. Training
Train staff on:
- Entering last visit dates in recare section
- Understanding the 6-month recall threshold
- Following up on patients in the recall list

---

## Support

If you encounter issues:
1. Check Supabase logs for errors
2. Verify table permissions (SELECT, INSERT, UPDATE)
3. Ensure RLS policies allow access to new columns
4. Check browser console for any frontend errors

---

## Summary

**Tables Modified:**
- `scheduling_lists` - Added `last_visit_date`
- `patients` - Added `last_visit_date` and `status`

**Indexes Added:**
- `idx_scheduling_lists_last_visit_date`
- `idx_patients_last_visit_status`

**Features Enabled:**
- Last Visit Date tracking in Recare section
- Patients Due for Recall action item (6+ month threshold)
- Improved recall workflow for dental hygiene schedules
