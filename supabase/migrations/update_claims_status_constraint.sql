-- Update claims_status_check to include all UnifiedClaimStatus values
-- Phase 1 (Submission pipeline) + Phase 2 (A/R follow-up pipeline)

ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;

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
    'Waiting for CSD/Moved to IIR',
    'Lori Review',
    'Paid/Check or EFT Pending',
    'SEE NOTES'
  ));
