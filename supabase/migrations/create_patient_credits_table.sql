-- =====================================================
-- Migration: Create patient_credits Table
-- Date: 2026-03-04
-- Purpose: Track patient credits (unapplied credits,
--          overpayments, insurance overpayments, pending refunds)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create patient_credits table
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  credit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  credit_source VARCHAR(30) NOT NULL DEFAULT 'overpayment'
    CHECK (credit_source IN ('overpayment', 'insurance_overpayment', 'refund_pending', 'adjustment', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'unapplied'
    CHECK (status IN ('unapplied', 'applied', 'refunded', 'pending_refund')),
  applied_to TEXT,
  applied_date DATE,
  notes TEXT,
  structured_notes JSONB DEFAULT '[]'::jsonb,
  audit_trail JSONB DEFAULT '[]'::jsonb,
  created_by TEXT NOT NULL DEFAULT 'staff',
  updated_by TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patient_credits_status ON patient_credits(status);
CREATE INDEX IF NOT EXISTS idx_patient_credits_patient_name ON patient_credits(patient_name);
CREATE INDEX IF NOT EXISTS idx_patient_credits_credit_date ON patient_credits(credit_date);

-- =====================================================
-- STEP 3: Auto-update updated_at trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_patient_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_patient_credits_updated_at ON patient_credits;
CREATE TRIGGER trigger_patient_credits_updated_at
  BEFORE UPDATE ON patient_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_credits_updated_at();

-- =====================================================
-- STEP 4: RLS Policies
-- =====================================================

ALTER TABLE patient_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on patient_credits"
  ON patient_credits FOR ALL
  USING (true)
  WITH CHECK (true);

COMMIT;
