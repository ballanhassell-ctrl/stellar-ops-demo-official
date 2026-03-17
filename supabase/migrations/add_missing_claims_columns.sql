-- Add missing columns to claims and pre_auths tables
-- These columns are used by the application but were missing from the original schema

-- =====================================================
-- ADD MISSING COLUMNS TO CLAIMS TABLE
-- =====================================================

-- Add date_of_service column
ALTER TABLE claims ADD COLUMN IF NOT EXISTS date_of_service DATE;

-- Add date_created column (for tracking when claim record was created, separate from date_submitted)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS date_created DATE;

-- Add created_by column (who created the claim record)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add completed_by column (who is handling/completed the claim)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- Update existing handler column to be nullable since we now have created_by and completed_by
-- (handler was the old field, but we want to support both for backwards compatibility)
ALTER TABLE claims ALTER COLUMN handler DROP NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_claims_date_of_service ON claims(date_of_service);
CREATE INDEX IF NOT EXISTS idx_claims_created_by ON claims(created_by);
CREATE INDEX IF NOT EXISTS idx_claims_completed_by ON claims(completed_by);

-- =====================================================
-- ADD MISSING COLUMNS TO PRE_AUTHS TABLE
-- =====================================================

-- Add date_created column
ALTER TABLE pre_auths ADD COLUMN IF NOT EXISTS date_created DATE;

-- Add created_by column
ALTER TABLE pre_auths ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add completed_by column
ALTER TABLE pre_auths ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- Add aging_days column if it doesn't exist
ALTER TABLE pre_auths ADD COLUMN IF NOT EXISTS aging_days INTEGER DEFAULT 0;

-- Update existing handler column to be nullable
ALTER TABLE pre_auths ALTER COLUMN handler DROP NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_pre_auths_created_by ON pre_auths(created_by);
CREATE INDEX IF NOT EXISTS idx_pre_auths_completed_by ON pre_auths(completed_by);
CREATE INDEX IF NOT EXISTS idx_pre_auths_aging_days ON pre_auths(aging_days);

-- =====================================================
-- UPDATE STATUS CHECK CONSTRAINTS
-- =====================================================

-- Drop old status check constraint on claims
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;

-- Add updated status check constraint with all possible statuses
-- Phase 1 (Submission pipeline) + Phase 2 (A/R follow-up pipeline)
ALTER TABLE claims ADD CONSTRAINT claims_status_check
  CHECK (status IN (
    -- Phase 1: Submission pipeline
    'Pending',
    'Sent',
    'Entered',
    'Approved/Awaiting Payment',
    'Denied',
    'In Review/2nd Appeal',
    'Resubmitted with Attachments',
    'Resubmitted/1st Appeal',
    'Denied/2nd Appeal',
    -- Phase 2: A/R follow-up pipeline
    'Pending Review',
    'Resubmitted - 1st',
    'Resubmitted - 2nd',
    'Final Review',
    'Consultant Review',
    'Closed/Paid',
    'Closed/Unpaid',
    'Appeal Filed',
    'Waiting for Info',
    'Lori Review',
    'Paid/Check or EFT Pending',
    'SEE NOTES'
  ));

-- Drop old status check constraint on pre_auths
ALTER TABLE pre_auths DROP CONSTRAINT IF EXISTS pre_auths_status_check;

-- Add updated status check constraint with all possible statuses
ALTER TABLE pre_auths ADD CONSTRAINT pre_auths_status_check
  CHECK (status IN (
    'Pending',
    'Approved',
    'Denied',
    'Expired',
    'In Review',
    'Scheduled'
  ));

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN claims.date_of_service IS 'Date when the service was provided to the patient';
COMMENT ON COLUMN claims.date_created IS 'Date when the claim record was created in the system';
COMMENT ON COLUMN claims.created_by IS 'User who created the claim record';
COMMENT ON COLUMN claims.completed_by IS 'User who is handling or completed the claim';
COMMENT ON COLUMN pre_auths.date_created IS 'Date when the pre-auth record was created in the system';
COMMENT ON COLUMN pre_auths.created_by IS 'User who created the pre-auth record';
COMMENT ON COLUMN pre_auths.completed_by IS 'User who is handling or completed the pre-auth';
