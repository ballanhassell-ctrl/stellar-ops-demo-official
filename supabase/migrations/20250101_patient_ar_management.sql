-- =====================================================
-- Patient A/R Management System - Database Migration
-- Created: 2025-01-01
-- Purpose: Complete database schema for Patient A/R tracking,
--          automated workflows, and write-off suggestions
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: patient_ar
-- Main table for tracking patient accounts receivable
-- =====================================================
CREATE TABLE IF NOT EXISTS patient_ar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Patient Information
  patient_id TEXT,
  patient_name VARCHAR(255) NOT NULL,
  patient_contact VARCHAR(255),

  -- Financial Information
  dos DATE NOT NULL,
  original_balance DECIMAL(10,2) NOT NULL CHECK (original_balance >= 0),
  current_balance DECIMAL(10,2) NOT NULL CHECK (current_balance >= 0),
  balance_created_date DATE NOT NULL,

  -- Aging Calculations (Computed on read via view)
  -- Note: aging_days and aging_bucket are calculated dynamically
  -- to avoid immutability issues with CURRENT_DATE in generated columns

  -- Status Tracking
  status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'collections', 'paid', 'written_off', 'uncollectible', 'write_off_suggested', 'archived')),
  moved_to_collections_date DATE,

  -- Contact Management
  next_contact_due_date DATE,
  assigned_to_staff_id UUID,

  -- Write-off Information
  write_off_suggested_date DATE,
  write_off_suggestion_reason VARCHAR(255),

  -- Audit Fields
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(50) NOT NULL
);

-- Indexes for patient_ar
CREATE INDEX IF NOT EXISTS idx_patient_ar_status ON patient_ar(status);
CREATE INDEX IF NOT EXISTS idx_patient_ar_dos ON patient_ar(dos);
CREATE INDEX IF NOT EXISTS idx_patient_ar_next_contact ON patient_ar(next_contact_due_date);
CREATE INDEX IF NOT EXISTS idx_patient_ar_patient_id ON patient_ar(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_ar_write_off_suggested
  ON patient_ar(write_off_suggested_date) WHERE status = 'write_off_suggested';

-- =====================================================
-- VIEW: patient_ar_with_aging
-- Provides aging calculations dynamically
-- =====================================================
CREATE OR REPLACE VIEW patient_ar_with_aging AS
SELECT
  *,
  (CURRENT_DATE - dos) AS aging_days,
  CASE
    WHEN (CURRENT_DATE - dos) <= 30 THEN '0-30'::VARCHAR(10)
    WHEN (CURRENT_DATE - dos) <= 60 THEN '31-60'::VARCHAR(10)
    WHEN (CURRENT_DATE - dos) <= 90 THEN '61-90'::VARCHAR(10)
    ELSE '90+'::VARCHAR(10)
  END AS aging_bucket
FROM patient_ar;

-- =====================================================
-- TABLE: patient_ar_contacts
-- Track all contact attempts and outcomes
-- =====================================================
CREATE TABLE IF NOT EXISTS patient_ar_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_ar_id UUID NOT NULL REFERENCES patient_ar(id) ON DELETE CASCADE,

  -- Contact Details
  contact_type VARCHAR(30) NOT NULL
    CHECK (contact_type IN ('1st_contact', '2nd_contact', 'final_contact', 'collections_activity', 'manual')),
  contact_date DATE NOT NULL,
  staff_initials VARCHAR(50) NOT NULL,
  notes TEXT,

  -- Outcome Tracking
  outcome VARCHAR(50)
    CHECK (outcome IN ('promise_to_pay', 'payment_plan_setup', 'dispute', 'no_answer', 'no_response', 'other') OR outcome IS NULL),
  next_action_date DATE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(50) NOT NULL
);

-- Indexes for patient_ar_contacts
CREATE INDEX IF NOT EXISTS idx_contacts_patient_ar ON patient_ar_contacts(patient_ar_id);
CREATE INDEX IF NOT EXISTS idx_contacts_date ON patient_ar_contacts(contact_date DESC);

-- =====================================================
-- TABLE: patient_ar_payments
-- Track all payments received
-- =====================================================
CREATE TABLE IF NOT EXISTS patient_ar_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_ar_id UUID NOT NULL REFERENCES patient_ar(id) ON DELETE CASCADE,

  -- Payment Details
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL CHECK (payment_amount > 0),
  payment_method VARCHAR(30) NOT NULL
    CHECK (payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'ach', 'online_portal', 'other')),
  reference_number VARCHAR(100),
  notes TEXT,

  -- Audit
  recorded_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for patient_ar_payments
CREATE INDEX IF NOT EXISTS idx_payments_patient_ar ON patient_ar_payments(patient_ar_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON patient_ar_payments(payment_date DESC);

-- =====================================================
-- TABLE: patient_payment_plans
-- Track payment plan agreements
-- =====================================================
CREATE TABLE IF NOT EXISTS patient_payment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_ar_id UUID NOT NULL REFERENCES patient_ar(id) ON DELETE CASCADE,

  -- Plan Details
  setup_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  monthly_payment DECIMAL(10,2) NOT NULL,
  number_of_payments INTEGER NOT NULL,
  payments_made INTEGER DEFAULT 0,
  next_payment_due DATE NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),

  -- Audit
  setup_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: write_off_rules
-- Configurable rules for automated write-off suggestions
-- =====================================================
CREATE TABLE IF NOT EXISTS write_off_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Rule Configuration
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL
    CHECK (rule_type IN ('small_balance', 'aged_out', 'collections_exhausted', 'cost_to_collect')),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,

  -- Rule Parameters
  balance_threshold DECIMAL(10,2),
  aging_days_threshold INTEGER,
  contacts_minimum INTEGER,
  collections_days_threshold INTEGER,

  -- Automation Settings
  auto_suggest BOOLEAN DEFAULT true,
  require_manual_approval BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(50)
);

-- =====================================================
-- TABLE: write_off_suggestions
-- Pending write-off suggestions for review
-- =====================================================
CREATE TABLE IF NOT EXISTS write_off_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_ar_id UUID NOT NULL REFERENCES patient_ar(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES write_off_rules(id),

  -- Suggestion Details
  suggested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  suggestion_reason TEXT NOT NULL,
  balance_at_suggestion DECIMAL(10,2) NOT NULL,
  aging_days_at_suggestion INTEGER NOT NULL,

  -- Review Status
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by VARCHAR(50),
  reviewed_date DATE,
  review_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for write_off_suggestions
CREATE INDEX IF NOT EXISTS idx_write_off_suggestions_status ON write_off_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_write_off_suggestions_patient_ar ON write_off_suggestions(patient_ar_id);

-- =====================================================
-- FUNCTION: update_patient_ar_balance
-- Automatically updates current_balance after payment
-- =====================================================
CREATE OR REPLACE FUNCTION update_patient_ar_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_payments DECIMAL(10,2);
  new_balance DECIMAL(10,2);
BEGIN
  -- Calculate total payments
  SELECT COALESCE(SUM(payment_amount), 0)
  INTO total_payments
  FROM patient_ar_payments
  WHERE patient_ar_id = NEW.patient_ar_id;

  -- Calculate new balance
  SELECT original_balance - total_payments
  INTO new_balance
  FROM patient_ar
  WHERE id = NEW.patient_ar_id;

  -- Update patient_ar record
  UPDATE patient_ar
  SET
    current_balance = new_balance,
    status = CASE
      WHEN new_balance <= 0 THEN 'paid'
      ELSE status
    END,
    updated_at = NOW(),
    updated_by = NEW.recorded_by
  WHERE id = NEW.patient_ar_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: calculate_next_contact_date
-- Automatically calculates next contact date based on type
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_next_contact_date()
RETURNS TRIGGER AS $$
DECLARE
  next_date DATE;
BEGIN
  -- Calculate next contact date based on type
  next_date := CASE NEW.contact_type
    WHEN '1st_contact' THEN NEW.contact_date + INTERVAL '14 days'
    WHEN '2nd_contact' THEN NEW.contact_date + INTERVAL '21 days'
    WHEN 'final_contact' THEN NEW.contact_date + INTERVAL '30 days'
    ELSE NULL
  END;

  -- Update patient_ar record
  UPDATE patient_ar
  SET
    next_contact_due_date = next_date,
    status = CASE
      WHEN NEW.contact_type = 'final_contact' THEN 'collections'
      ELSE status
    END,
    moved_to_collections_date = CASE
      WHEN NEW.contact_type = 'final_contact' THEN NEW.contact_date
      ELSE moved_to_collections_date
    END,
    updated_at = NOW(),
    updated_by = NEW.staff_initials
  WHERE id = NEW.patient_ar_id;

  -- Set next_action_date on the contact record
  NEW.next_action_date := next_date;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: evaluate_write_off_rules
-- Evaluates all active rules and returns eligible records
-- =====================================================
CREATE OR REPLACE FUNCTION evaluate_write_off_rules()
RETURNS TABLE(
  patient_ar_id UUID,
  rule_id UUID,
  rule_name VARCHAR(100),
  reason TEXT,
  current_balance DECIMAL(10,2),
  aging_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.id,
    wr.id,
    wr.rule_name,
    CASE wr.rule_type
      WHEN 'small_balance' THEN
        'Balance of $' || pa.current_balance || ' is below threshold of $' ||
        wr.balance_threshold || ' and aged ' || pa.aging_days || ' days'
      WHEN 'aged_out' THEN
        'Balance has been outstanding for ' || pa.aging_days ||
        ' days (threshold: ' || wr.aging_days_threshold || ')'
      WHEN 'collections_exhausted' THEN
        'In collections for ' || (CURRENT_DATE - pa.moved_to_collections_date) ||
        ' days with no payment activity'
      ELSE 'Meets write-off criteria'
    END,
    pa.current_balance,
    pa.aging_days
  FROM patient_ar_with_aging pa
  CROSS JOIN write_off_rules wr
  WHERE wr.is_active = true
    AND pa.status IN ('active', 'collections')
    AND pa.current_balance > 0
    -- Prevent duplicate suggestions
    AND NOT EXISTS (
      SELECT 1 FROM write_off_suggestions wos
      WHERE wos.patient_ar_id = pa.id
      AND wos.status = 'pending'
    )
    -- Apply rule criteria
    AND (
      -- Small balance rule
      (wr.rule_type = 'small_balance'
        AND pa.current_balance <= wr.balance_threshold
        AND pa.aging_days >= wr.aging_days_threshold)
      OR
      -- Aged out rule
      (wr.rule_type = 'aged_out'
        AND pa.aging_days >= wr.aging_days_threshold)
      OR
      -- Collections exhausted rule
      (wr.rule_type = 'collections_exhausted'
        AND pa.status = 'collections'
        AND pa.moved_to_collections_date IS NOT NULL
        AND (CURRENT_DATE - pa.moved_to_collections_date) >= wr.collections_days_threshold
        AND NOT EXISTS (
          SELECT 1 FROM patient_ar_payments pap
          WHERE pap.patient_ar_id = pa.id
          AND pap.payment_date > pa.moved_to_collections_date
        ))
    )
  ORDER BY wr.priority, pa.aging_days DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: generate_write_off_suggestions
-- Creates write-off suggestions based on active rules
-- =====================================================
CREATE OR REPLACE FUNCTION generate_write_off_suggestions()
RETURNS INTEGER AS $$
DECLARE
  suggestion_count INTEGER := 0;
  suggestion_record RECORD;
BEGIN
  FOR suggestion_record IN
    SELECT * FROM evaluate_write_off_rules()
  LOOP
    -- Insert suggestion
    INSERT INTO write_off_suggestions (
      patient_ar_id,
      rule_id,
      suggestion_reason,
      balance_at_suggestion,
      aging_days_at_suggestion
    ) VALUES (
      suggestion_record.patient_ar_id,
      suggestion_record.rule_id,
      suggestion_record.reason,
      suggestion_record.current_balance,
      suggestion_record.aging_days
    );

    -- Update patient_ar status
    UPDATE patient_ar
    SET
      status = 'write_off_suggested',
      write_off_suggested_date = CURRENT_DATE,
      write_off_suggestion_reason = suggestion_record.rule_name,
      updated_at = NOW()
    WHERE id = suggestion_record.patient_ar_id;

    suggestion_count := suggestion_count + 1;
  END LOOP;

  RETURN suggestion_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: update_updated_at
-- Generic function to update timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update balance after payment
DROP TRIGGER IF EXISTS trigger_update_balance_after_payment ON patient_ar_payments;
CREATE TRIGGER trigger_update_balance_after_payment
  AFTER INSERT ON patient_ar_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_ar_balance();

-- Trigger: Calculate next contact date
DROP TRIGGER IF EXISTS trigger_calculate_next_contact ON patient_ar_contacts;
CREATE TRIGGER trigger_calculate_next_contact
  BEFORE INSERT ON patient_ar_contacts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_contact_date();

-- Trigger: Update patient_ar timestamp
DROP TRIGGER IF EXISTS trigger_patient_ar_updated_at ON patient_ar;
CREATE TRIGGER trigger_patient_ar_updated_at
  BEFORE UPDATE ON patient_ar
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: Update payment_plans timestamp
DROP TRIGGER IF EXISTS trigger_payment_plans_updated_at ON patient_payment_plans;
CREATE TRIGGER trigger_payment_plans_updated_at
  BEFORE UPDATE ON patient_payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: Update write_off_rules timestamp
DROP TRIGGER IF EXISTS trigger_write_off_rules_updated_at ON write_off_rules;
CREATE TRIGGER trigger_write_off_rules_updated_at
  BEFORE UPDATE ON write_off_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE patient_ar ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_ar_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_ar_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_off_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_off_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all users (authenticated and anon) to view and manage
CREATE POLICY "Allow all users to view patient_ar"
  ON patient_ar FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow all users to insert patient_ar"
  ON patient_ar FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Allow all users to update patient_ar"
  ON patient_ar FOR UPDATE TO authenticated, anon USING (true);

CREATE POLICY "Allow all users to delete patient_ar"
  ON patient_ar FOR DELETE TO authenticated, anon USING (true);

-- Contacts policies
CREATE POLICY "Allow all users to manage contacts"
  ON patient_ar_contacts FOR ALL TO authenticated, anon USING (true);

-- Payments policies
CREATE POLICY "Allow all users to manage payments"
  ON patient_ar_payments FOR ALL TO authenticated, anon USING (true);

-- Payment plans policies
CREATE POLICY "Allow all users to manage payment_plans"
  ON patient_payment_plans FOR ALL TO authenticated, anon USING (true);

-- Write-off rules policies
CREATE POLICY "Allow all users to view write_off_rules"
  ON write_off_rules FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow all users to manage write_off_rules"
  ON write_off_rules FOR ALL TO authenticated, anon USING (true);

-- Write-off suggestions policies
CREATE POLICY "Allow all users to view write_off_suggestions"
  ON write_off_suggestions FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow all users to manage write_off_suggestions"
  ON write_off_suggestions FOR ALL TO authenticated, anon USING (true);

-- =====================================================
-- DEFAULT DATA: Write-Off Rules
-- =====================================================
INSERT INTO write_off_rules (
  rule_name,
  rule_type,
  balance_threshold,
  aging_days_threshold,
  priority,
  created_by
) VALUES
  ('Small Balance Write-Off', 'small_balance', 10.00, 90, 1, 'system'),
  ('Aged Out (365+ days)', 'aged_out', NULL, 365, 2, 'system'),
  ('Collections Exhausted (180 days)', 'collections_exhausted', NULL, 180, 3, 'system')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS (Documentation)
-- =====================================================
COMMENT ON TABLE patient_ar IS 'Main table for patient accounts receivable tracking';
COMMENT ON TABLE patient_ar_contacts IS 'Contact history and follow-up tracking';
COMMENT ON TABLE patient_ar_payments IS 'Payment records with automatic balance updates';
COMMENT ON TABLE patient_payment_plans IS 'Payment plan agreements and tracking';
COMMENT ON TABLE write_off_rules IS 'Configurable rules for automated write-off suggestions';
COMMENT ON TABLE write_off_suggestions IS 'Pending write-off suggestions for admin review';

COMMENT ON FUNCTION generate_write_off_suggestions() IS
  'Evaluates all active write-off rules and generates suggestions for eligible A/R records';
COMMENT ON FUNCTION evaluate_write_off_rules() IS
  'Returns all A/R records that meet write-off rule criteria without creating suggestions';

-- =====================================================
-- Migration Complete
-- =====================================================
