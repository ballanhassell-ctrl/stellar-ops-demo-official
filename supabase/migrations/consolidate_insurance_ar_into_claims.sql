-- =====================================================
-- Migration: Consolidate Insurance A/R into Claims table
-- Adds financial tracking fields to claims table and
-- creates insurance_issues + ar_snapshots tables
-- =====================================================

-- =====================================================
-- STEP 1: Add A/R financial fields to claims table
-- =====================================================

ALTER TABLE claims ADD COLUMN IF NOT EXISTS collected NUMERIC(10,2) DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS outstanding NUMERIC(10,2) DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS pri_sec TEXT DEFAULT NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS procedure_types TEXT DEFAULT NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS rep_name TEXT DEFAULT NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS reference_number TEXT DEFAULT NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS aging_status TEXT DEFAULT NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS carrier_phone TEXT DEFAULT NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS date_sent_orig DATE DEFAULT NULL;

-- Set outstanding = claim_amount for existing rows where outstanding is 0
UPDATE claims SET outstanding = claim_amount WHERE outstanding = 0 OR outstanding IS NULL;

-- =====================================================
-- STEP 2: Drop and recreate status constraint
-- to allow all unified claim statuses
-- =====================================================

-- Drop existing status constraint if it exists
DO $$
BEGIN
  -- Try to drop any CHECK constraint on the status column
  EXECUTE (
    SELECT 'ALTER TABLE claims DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'claims'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  -- No constraint to drop, that's fine
  NULL;
END $$;

-- Note: If using text type for status (no CHECK constraint), no action needed.
-- The app handles status validation at the TypeScript level.

-- =====================================================
-- STEP 3: Add indexes for new columns
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_claims_assigned_to ON claims(assigned_to);
CREATE INDEX IF NOT EXISTS idx_claims_pri_sec ON claims(pri_sec);
CREATE INDEX IF NOT EXISTS idx_claims_aging_status ON claims(aging_status);
CREATE INDEX IF NOT EXISTS idx_claims_outstanding ON claims(outstanding);

-- =====================================================
-- STEP 4: Create insurance_issues table
-- =====================================================

CREATE TABLE IF NOT EXISTS insurance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT DEFAULT NULL,
  patient_name TEXT NOT NULL,
  date_of_service DATE NOT NULL,
  procedure_codes TEXT NOT NULL,
  in_charge TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  in_vyne BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT NULL,
  submission_status TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  is_pre_auth BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_issues_in_charge ON insurance_issues(in_charge);
CREATE INDEX IF NOT EXISTS idx_insurance_issues_issue_type ON insurance_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_insurance_issues_is_pre_auth ON insurance_issues(is_pre_auth);

-- =====================================================
-- STEP 5: Create ar_snapshots table
-- =====================================================

CREATE TABLE IF NOT EXISTS ar_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'combined',

  -- Patient A/R
  patient_ar_total NUMERIC(12,2) DEFAULT 0,
  patient_ar_collectible_count INTEGER DEFAULT 0,
  patient_ar_collectible_balance NUMERIC(12,2) DEFAULT 0,
  patient_ar_non_collectible_count INTEGER DEFAULT 0,
  patient_ar_non_collectible_balance NUMERIC(12,2) DEFAULT 0,
  patient_ar_collected_since_last NUMERIC(12,2) DEFAULT 0,
  patient_ar_written_off_since_last NUMERIC(12,2) DEFAULT 0,

  -- Insurance A/R
  insurance_ar_total NUMERIC(12,2) DEFAULT 0,
  insurance_ar_total_claims INTEGER DEFAULT 0,
  insurance_ar_total_collected NUMERIC(12,2) DEFAULT 0,
  insurance_ar_total_outstanding NUMERIC(12,2) DEFAULT 0,

  -- Patient aging buckets
  patient_aging_0_30 NUMERIC(12,2) DEFAULT 0,
  patient_aging_31_60 NUMERIC(12,2) DEFAULT 0,
  patient_aging_61_90 NUMERIC(12,2) DEFAULT 0,
  patient_aging_91_plus NUMERIC(12,2) DEFAULT 0,

  -- Insurance aging buckets
  insurance_aging_0_30 NUMERIC(12,2) DEFAULT 0,
  insurance_aging_31_60 NUMERIC(12,2) DEFAULT 0,
  insurance_aging_61_90 NUMERIC(12,2) DEFAULT 0,
  insurance_aging_91_120 NUMERIC(12,2) DEFAULT 0,
  insurance_aging_121_plus NUMERIC(12,2) DEFAULT 0,

  -- Status breakdown
  insurance_pending_review INTEGER DEFAULT 0,
  insurance_resubmitted INTEGER DEFAULT 0,
  insurance_final_review INTEGER DEFAULT 0,
  insurance_consultant_review INTEGER DEFAULT 0,
  insurance_closed_paid INTEGER DEFAULT 0,
  insurance_closed_unpaid INTEGER DEFAULT 0,
  insurance_appeal_filed INTEGER DEFAULT 0,
  insurance_denied INTEGER DEFAULT 0,

  -- Team workload (JSON)
  team_workload JSONB DEFAULT '{}'::JSONB,

  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate snapshots for the same date
  UNIQUE(snapshot_date, snapshot_type)
);

CREATE INDEX IF NOT EXISTS idx_ar_snapshots_date ON ar_snapshots(snapshot_date);

-- =====================================================
-- STEP 6: Enable RLS (Row Level Security) policies
-- Adjust these based on your auth requirements
-- =====================================================

-- For now, allow all authenticated users full access
-- Modify these policies based on your security needs

ALTER TABLE insurance_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY IF NOT EXISTS "Allow all for authenticated" ON insurance_issues
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all for authenticated" ON ar_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 7: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_insurance_issues') THEN
    CREATE TRIGGER set_updated_at_insurance_issues
      BEFORE UPDATE ON insurance_issues
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
