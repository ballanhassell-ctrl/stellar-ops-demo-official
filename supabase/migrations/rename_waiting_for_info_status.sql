-- Rename "Waiting for Info" status to "Waiting for CSD/Moved to IIR" across claims and pre_auths tables
-- This migration:
--   1. Updates existing rows that have the old status value
--   2. Replaces the CHECK constraint to use the new status name

BEGIN;

-- 1. Update existing claims rows
UPDATE claims SET status = 'Waiting for CSD/Moved to IIR' WHERE status = 'Waiting for Info';

-- 2. Update existing pre_auths rows
UPDATE pre_auths SET status = 'Waiting for CSD/Moved to IIR' WHERE status = 'Waiting for Info';

-- 3. Replace the CHECK constraint on claims
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;
ALTER TABLE claims ADD CONSTRAINT claims_status_check CHECK (status IN (
    'Pending Review',
    'Resubmitted - 1st',
    'Resubmitted - 2nd',
    'Final Review',
    'Consultant Review',
    'Closed/Paid',
    'Closed/Unpaid',
    'Appeal Filed',
    'Denied',
    'Waiting for CSD/Moved to IIR',
    'Lori Review',
    'Paid/Check or EFT Pending',
    'SEE NOTES'
));

-- 4. Replace the CHECK constraint on pre_auths
ALTER TABLE pre_auths DROP CONSTRAINT IF EXISTS pre_auths_status_check;
ALTER TABLE pre_auths ADD CONSTRAINT pre_auths_status_check CHECK (status IN (
    'Pending Review',
    'Resubmitted - 1st',
    'Resubmitted - 2nd',
    'Final Review',
    'Consultant Review',
    'Closed/Paid',
    'Closed/Unpaid',
    'Appeal Filed',
    'Denied',
    'Waiting for CSD/Moved to IIR',
    'Lori Review',
    'Paid/Check or EFT Pending',
    'SEE NOTES'
));

COMMIT;
