-- =====================================================
-- Migration: Create eft_reconciliation Tables
-- Date: 2026-03-07
-- Purpose: Track EFT (Electronic Fund Transfer) reconciliation
--          organized by weekly periods with individual payment entries
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create eft_reconciliation_periods table
-- Tracks weekly EFT periods (e.g., "EFT (02/07/2026 - 02/13/2026)")
-- =====================================================

CREATE TABLE IF NOT EXISTS eft_reconciliation_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label TEXT NOT NULL,  -- e.g., "EFT (02/07/2026 - 02/13/2026)"
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  entry_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT eft_period_dates_check CHECK (period_end >= period_start)
);

-- =====================================================
-- STEP 2: Create eft_reconciliation_entries table
-- Individual EFT payment entries within a period
-- =====================================================

CREATE TABLE IF NOT EXISTS eft_reconciliation_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES eft_reconciliation_periods(id) ON DELETE CASCADE,
  insurance_company TEXT NOT NULL,
  payment_date DATE NOT NULL,
  trn_number TEXT NOT NULL,  -- Transaction/trace number
  date_posted DATE,          -- Date posted to system (nullable for pending items)
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT ''
    CHECK (status IN ('', 'posted', 'pending', 'posted already by via', 'exception', 'reconciled')),
  notes TEXT,
  structured_notes JSONB DEFAULT '[]'::jsonb,
  audit_trail JSONB DEFAULT '[]'::jsonb,
  entered_by TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_eft_periods_dates ON eft_reconciliation_periods(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_eft_periods_label ON eft_reconciliation_periods(period_label);

CREATE INDEX IF NOT EXISTS idx_eft_entries_period_id ON eft_reconciliation_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_eft_entries_insurance ON eft_reconciliation_entries(insurance_company);
CREATE INDEX IF NOT EXISTS idx_eft_entries_payment_date ON eft_reconciliation_entries(payment_date);
CREATE INDEX IF NOT EXISTS idx_eft_entries_trn ON eft_reconciliation_entries(trn_number);
CREATE INDEX IF NOT EXISTS idx_eft_entries_status ON eft_reconciliation_entries(status);
CREATE INDEX IF NOT EXISTS idx_eft_entries_date_posted ON eft_reconciliation_entries(date_posted);

-- =====================================================
-- STEP 4: Auto-update updated_at triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_eft_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_eft_periods_updated_at ON eft_reconciliation_periods;
CREATE TRIGGER trigger_eft_periods_updated_at
  BEFORE UPDATE ON eft_reconciliation_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_eft_periods_updated_at();

CREATE OR REPLACE FUNCTION update_eft_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_eft_entries_updated_at ON eft_reconciliation_entries;
CREATE TRIGGER trigger_eft_entries_updated_at
  BEFORE UPDATE ON eft_reconciliation_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_eft_entries_updated_at();

-- =====================================================
-- STEP 5: Auto-recalculate period totals on entry changes
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_eft_period_totals()
RETURNS TRIGGER AS $$
DECLARE
  target_period_id UUID;
BEGIN
  -- Determine which period to recalculate
  IF TG_OP = 'DELETE' THEN
    target_period_id := OLD.period_id;
  ELSE
    target_period_id := NEW.period_id;
  END IF;

  -- If period_id changed on UPDATE, also recalculate the old period
  IF TG_OP = 'UPDATE' AND OLD.period_id != NEW.period_id THEN
    UPDATE eft_reconciliation_periods
    SET total_amount = COALESCE((SELECT SUM(amount) FROM eft_reconciliation_entries WHERE period_id = OLD.period_id), 0),
        entry_count = COALESCE((SELECT COUNT(*) FROM eft_reconciliation_entries WHERE period_id = OLD.period_id), 0)
    WHERE id = OLD.period_id;
  END IF;

  -- Recalculate the target period
  UPDATE eft_reconciliation_periods
  SET total_amount = COALESCE((SELECT SUM(amount) FROM eft_reconciliation_entries WHERE period_id = target_period_id), 0),
      entry_count = COALESCE((SELECT COUNT(*) FROM eft_reconciliation_entries WHERE period_id = target_period_id), 0)
  WHERE id = target_period_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_eft_totals ON eft_reconciliation_entries;
CREATE TRIGGER trigger_recalculate_eft_totals
  AFTER INSERT OR UPDATE OR DELETE ON eft_reconciliation_entries
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_eft_period_totals();

-- =====================================================
-- STEP 6: RLS Policies
-- =====================================================

ALTER TABLE eft_reconciliation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE eft_reconciliation_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on eft_reconciliation_periods"
  ON eft_reconciliation_periods FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on eft_reconciliation_entries"
  ON eft_reconciliation_entries FOR ALL
  USING (true)
  WITH CHECK (true);

COMMIT;
