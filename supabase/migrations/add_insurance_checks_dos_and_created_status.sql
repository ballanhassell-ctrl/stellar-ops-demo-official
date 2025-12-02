-- Add DOS and Date Entered fields to insurance_checks table
-- Update status constraint to include 'Created'

-- Drop existing status constraint
ALTER TABLE insurance_checks DROP CONSTRAINT IF EXISTS insurance_checks_status_check;

-- Add new status constraint with 'Created'
ALTER TABLE insurance_checks ADD CONSTRAINT insurance_checks_status_check
  CHECK (status IN ('Created', 'Entered', 'Pending Review'));

-- Add DOS (Date of Service) field
ALTER TABLE insurance_checks ADD COLUMN IF NOT EXISTS date_of_service DATE;

-- Add Date Entered field
ALTER TABLE insurance_checks ADD COLUMN IF NOT EXISTS date_entered DATE;

-- Update default status to 'Created'
ALTER TABLE insurance_checks ALTER COLUMN status SET DEFAULT 'Created';
