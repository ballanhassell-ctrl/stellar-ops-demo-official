-- Make claim_number nullable for Pending and Sent claims
-- This addresses the issue where claims with 'Pending' or 'Sent' status
-- don't have a claim number yet, but need to be tracked in the system

-- Drop the NOT NULL constraint and UNIQUE constraint on claim_number
ALTER TABLE claims
  ALTER COLUMN claim_number DROP NOT NULL;

-- Drop the old unique constraint if it exists
ALTER TABLE claims
  DROP CONSTRAINT IF EXISTS claims_claim_number_key;

-- Create a partial unique index that only applies to non-null claim numbers
-- This allows multiple null values but enforces uniqueness for actual claim numbers
CREATE UNIQUE INDEX IF NOT EXISTS claims_claim_number_unique_idx
  ON claims (claim_number)
  WHERE claim_number IS NOT NULL AND claim_number != '';

-- Add a comment explaining the change
COMMENT ON COLUMN claims.claim_number IS 'Claim number assigned by insurance company. Optional for Pending/Sent status claims';
