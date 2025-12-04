-- =====================================================
-- Patient Accounts Receivable (AR) Tracker
-- Date: 2025-12-04
-- Description: Comprehensive patient balance tracking and follow-up system
-- =====================================================

-- Create patient_ar_tracker table
CREATE TABLE IF NOT EXISTS patient_ar_tracker (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  balance_due DECIMAL(10, 2) NOT NULL,
  notes TEXT,

  -- Statement tracking
  first_statement_sent_date DATE,
  first_statement_contact_date DATE,
  first_statement_contact_method TEXT, -- Phone, Email, Text, In-Person, etc.
  first_statement_contacted_by TEXT, -- Employee initials
  first_statement_notes TEXT,

  second_statement_sent_date DATE,
  second_statement_contact_date DATE,
  second_statement_contact_method TEXT,
  second_statement_contacted_by TEXT,
  second_statement_notes TEXT,

  third_statement_sent_date DATE,
  third_statement_contact_date DATE,
  third_statement_contact_method TEXT,
  third_statement_contacted_by TEXT,
  third_statement_notes TEXT,

  -- Collections tracking
  sent_to_collections BOOLEAN DEFAULT FALSE,
  collections_date DATE,
  collections_agency TEXT,

  -- Assignment and follow-up
  handled_by_initials TEXT NOT NULL,
  next_contact_date DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'pending_payment', 'payment_plan', 'sent_to_collections', 'resolved', 'write_off')) DEFAULT 'active',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patient_ar_patient_id ON patient_ar_tracker(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_ar_patient_name ON patient_ar_tracker(patient_name);
CREATE INDEX IF NOT EXISTS idx_patient_ar_balance ON patient_ar_tracker(balance_due);
CREATE INDEX IF NOT EXISTS idx_patient_ar_status ON patient_ar_tracker(status);
CREATE INDEX IF NOT EXISTS idx_patient_ar_handled_by ON patient_ar_tracker(handled_by_initials);
CREATE INDEX IF NOT EXISTS idx_patient_ar_next_contact ON patient_ar_tracker(next_contact_date);
CREATE INDEX IF NOT EXISTS idx_patient_ar_collections ON patient_ar_tracker(sent_to_collections);

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to patient_ar_tracker table
DROP TRIGGER IF EXISTS update_patient_ar_tracker_updated_at ON patient_ar_tracker;
CREATE TRIGGER update_patient_ar_tracker_updated_at
  BEFORE UPDATE ON patient_ar_tracker
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-CALCULATE NEXT CONTACT DATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_next_contact_date()
RETURNS TRIGGER AS $$
DECLARE
  days_since_last_contact INTEGER;
  last_contact_date DATE;
BEGIN
  -- Determine the most recent contact date
  last_contact_date := GREATEST(
    COALESCE(NEW.first_statement_contact_date, '1900-01-01'::DATE),
    COALESCE(NEW.second_statement_contact_date, '1900-01-01'::DATE),
    COALESCE(NEW.third_statement_contact_date, '1900-01-01'::DATE)
  );

  -- If no contacts yet, use the most recent statement sent date
  IF last_contact_date = '1900-01-01'::DATE THEN
    last_contact_date := GREATEST(
      COALESCE(NEW.first_statement_sent_date, '1900-01-01'::DATE),
      COALESCE(NEW.second_statement_sent_date, '1900-01-01'::DATE),
      COALESCE(NEW.third_statement_sent_date, '1900-01-01'::DATE)
    );
  END IF;

  -- Calculate next contact date based on statement count
  -- 1st statement: Follow up after 10 days
  -- 2nd statement: Follow up after 7 days
  -- 3rd statement: Follow up after 5 days (urgent)
  IF NEW.third_statement_sent_date IS NOT NULL THEN
    NEW.next_contact_date := last_contact_date + INTERVAL '5 days';
  ELSIF NEW.second_statement_sent_date IS NOT NULL THEN
    NEW.next_contact_date := last_contact_date + INTERVAL '7 days';
  ELSIF NEW.first_statement_sent_date IS NOT NULL THEN
    NEW.next_contact_date := last_contact_date + INTERVAL '10 days';
  ELSE
    -- No statements sent yet, default to 7 days from creation
    NEW.next_contact_date := CURRENT_DATE + INTERVAL '7 days';
  END IF;

  -- If sent to collections, clear next contact date
  IF NEW.sent_to_collections = TRUE THEN
    NEW.next_contact_date := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_next_contact_date ON patient_ar_tracker;
CREATE TRIGGER trg_calculate_next_contact_date
  BEFORE INSERT OR UPDATE ON patient_ar_tracker
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_contact_date();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for patients needing immediate follow-up (next contact date is today or past)
CREATE OR REPLACE VIEW patient_ar_alerts AS
SELECT
  id,
  patient_id,
  patient_name,
  balance_due,
  next_contact_date,
  handled_by_initials,
  status,
  CASE
    WHEN next_contact_date < CURRENT_DATE THEN 'overdue'
    WHEN next_contact_date = CURRENT_DATE THEN 'due_today'
    ELSE 'upcoming'
  END as alert_priority
FROM patient_ar_tracker
WHERE
  sent_to_collections = FALSE
  AND status NOT IN ('resolved', 'write_off')
  AND next_contact_date <= CURRENT_DATE + INTERVAL '3 days'
ORDER BY next_contact_date ASC;

-- View for collections-ready accounts (3 statements sent, no recent contact)
CREATE OR REPLACE VIEW patient_ar_collections_ready AS
SELECT
  id,
  patient_id,
  patient_name,
  balance_due,
  third_statement_sent_date,
  third_statement_contact_date,
  CURRENT_DATE - COALESCE(third_statement_contact_date, third_statement_sent_date) as days_since_last_action
FROM patient_ar_tracker
WHERE
  sent_to_collections = FALSE
  AND third_statement_sent_date IS NOT NULL
  AND status NOT IN ('resolved', 'write_off')
  AND (
    third_statement_contact_date IS NULL
    OR CURRENT_DATE - third_statement_contact_date > 14
  )
ORDER BY balance_due DESC;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE patient_ar_tracker IS 'Tracks patient account receivables with detailed statement and contact history';
COMMENT ON COLUMN patient_ar_tracker.balance_due IS 'Current outstanding balance owed by patient';
COMMENT ON COLUMN patient_ar_tracker.sent_to_collections IS 'Flag indicating if account has been sent to collections agency';
COMMENT ON COLUMN patient_ar_tracker.next_contact_date IS 'Auto-calculated date for next patient contact attempt';
COMMENT ON COLUMN patient_ar_tracker.status IS 'Current status of the AR: active, pending_payment, payment_plan, sent_to_collections, resolved, write_off';

COMMENT ON VIEW patient_ar_alerts IS 'Patients requiring immediate follow-up based on next_contact_date';
COMMENT ON VIEW patient_ar_collections_ready IS 'Accounts that have received 3 statements and may be ready for collections';

-- =====================================================
-- SAMPLE DATA (OPTIONAL - REMOVE FOR PRODUCTION)
-- =====================================================

-- Uncomment to insert sample data for testing:
/*
INSERT INTO patient_ar_tracker (
  id, patient_id, patient_name, balance_due, notes,
  first_statement_sent_date, first_statement_contact_date,
  first_statement_contact_method, first_statement_contacted_by,
  handled_by_initials, status
) VALUES
(
  'AR-001',
  'PT-12345',
  'John Smith',
  1250.00,
  'Patient called to dispute charges, requested itemized bill',
  '2025-11-01',
  '2025-11-05',
  'Phone',
  'MK',
  'MK',
  'active'
);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify table was created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'patient_ar_tracker'
ORDER BY ordinal_position;

-- Verify triggers exist
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'patient_ar_tracker';

-- Verify views exist
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_name IN ('patient_ar_alerts', 'patient_ar_collections_ready');
