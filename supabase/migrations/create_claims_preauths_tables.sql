-- Supabase SQL Schema for Claims and Pre-Authorization Management
-- Run this in your Supabase SQL Editor to create the required tables

-- =====================================================
-- CLAIMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  claim_number TEXT NOT NULL UNIQUE,
  procedure_code TEXT NOT NULL,
  claim_detail TEXT NOT NULL,
  claim_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Denied', 'In Review', 'Resubmitted')),
  date_submitted DATE NOT NULL,
  follow_up_date DATE NOT NULL,
  handler TEXT NOT NULL,
  notes TEXT,
  aging_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient_name ON claims(patient_name);
CREATE INDEX IF NOT EXISTS idx_claims_insurance_company ON claims(insurance_company);
CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_date_submitted ON claims(date_submitted);
CREATE INDEX IF NOT EXISTS idx_claims_aging_days ON claims(aging_days);

-- =====================================================
-- PRE-AUTHORIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pre_auths (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  pre_auth_number TEXT NOT NULL UNIQUE,
  procedure_code TEXT NOT NULL,
  treatment_detail TEXT NOT NULL,
  requested_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Denied', 'Expired', 'In Review')),
  date_requested DATE NOT NULL,
  expiration_date DATE NOT NULL,
  approved_amount DECIMAL(10, 2) DEFAULT 0,
  handler TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pre_auths_patient_id ON pre_auths(patient_id);
CREATE INDEX IF NOT EXISTS idx_pre_auths_patient_name ON pre_auths(patient_name);
CREATE INDEX IF NOT EXISTS idx_pre_auths_insurance_company ON pre_auths(insurance_company);
CREATE INDEX IF NOT EXISTS idx_pre_auths_pre_auth_number ON pre_auths(pre_auth_number);
CREATE INDEX IF NOT EXISTS idx_pre_auths_status ON pre_auths(status);
CREATE INDEX IF NOT EXISTS idx_pre_auths_date_requested ON pre_auths(date_requested);
CREATE INDEX IF NOT EXISTS idx_pre_auths_expiration_date ON pre_auths(expiration_date);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for claims table
DROP TRIGGER IF EXISTS update_claims_updated_at ON claims;
CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for pre_auths table
DROP TRIGGER IF EXISTS update_pre_auths_updated_at ON pre_auths;
CREATE TRIGGER update_pre_auths_updated_at
  BEFORE UPDATE ON pre_auths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE claims IS 'Stores insurance claim records for patient management';
COMMENT ON TABLE pre_auths IS 'Stores pre-authorization requests for patient treatments';

COMMENT ON COLUMN claims.aging_days IS 'Number of days since claim was submitted';
COMMENT ON COLUMN pre_auths.approved_amount IS 'Amount approved by insurance (0 if not yet approved)';
