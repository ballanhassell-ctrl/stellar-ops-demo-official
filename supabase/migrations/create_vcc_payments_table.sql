-- =====================================================
-- VCC Payments Table
-- Tracks VCC standard claim payments, Open Dental
-- posting status, terminal processing, and opt-out workflow
-- =====================================================

-- Create vcc_payments table
CREATE TABLE IF NOT EXISTS vcc_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_name TEXT NOT NULL,
  date_of_service DATE NOT NULL,
  claim_type TEXT NOT NULL DEFAULT 'VCC Standard',
  payment_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  posted_to_open_dental BOOLEAN NOT NULL DEFAULT FALSE,
  posted_by_initials TEXT NOT NULL DEFAULT '',
  processed_via_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  processed_by_initials TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending/Needs Payment' CHECK (status IN ('Pending/Needs Payment', 'Posted', 'Closed')),
  opt_out_requested BOOLEAN NOT NULL DEFAULT FALSE,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  opt_out_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vcc_payments_date_of_service ON vcc_payments(date_of_service);
CREATE INDEX IF NOT EXISTS idx_vcc_payments_status ON vcc_payments(status);
CREATE INDEX IF NOT EXISTS idx_vcc_payments_patient_name ON vcc_payments(patient_name);
CREATE INDEX IF NOT EXISTS idx_vcc_payments_posted_to_open_dental ON vcc_payments(posted_to_open_dental);
CREATE INDEX IF NOT EXISTS idx_vcc_payments_processed_via_terminal ON vcc_payments(processed_via_terminal);
CREATE INDEX IF NOT EXISTS idx_vcc_payments_opted_out ON vcc_payments(opted_out);

-- =====================================================
-- Auto-update updated_at trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_vcc_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vcc_payments_updated_at
  BEFORE UPDATE ON vcc_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_vcc_payments_updated_at();

-- =====================================================
-- Audit history table
-- =====================================================

CREATE TABLE IF NOT EXISTS vcc_payments_audit_history (
  audit_id BIGSERIAL PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES vcc_payments(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  old_values JSONB,
  new_values JSONB,
  changes JSONB
);

CREATE INDEX IF NOT EXISTS idx_vcc_payments_audit_payment_id ON vcc_payments_audit_history(payment_id);
CREATE INDEX IF NOT EXISTS idx_vcc_payments_audit_changed_at ON vcc_payments_audit_history(changed_at DESC);

-- =====================================================
-- Audit trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION track_vcc_payments_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO vcc_payments_audit_history (payment_id, action, new_values)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW) - 'created_at' - 'updated_at');
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO vcc_payments_audit_history (payment_id, action, old_values, new_values, changes)
    VALUES (
      NEW.id,
      'UPDATE',
      to_jsonb(OLD) - 'created_at' - 'updated_at',
      to_jsonb(NEW) - 'created_at' - 'updated_at',
      jsonb_build_object(
        'changed_fields',
        (
          SELECT jsonb_object_agg(OLD_record.key, jsonb_build_object('old', OLD_record.value, 'new', NEW_record.value))
          FROM jsonb_each(to_jsonb(OLD)) AS OLD_record
          INNER JOIN jsonb_each(to_jsonb(NEW)) AS NEW_record
            ON OLD_record.key = NEW_record.key
          WHERE OLD_record.value IS DISTINCT FROM NEW_record.value
            AND OLD_record.key NOT IN ('created_at', 'updated_at')
        )
      )
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO vcc_payments_audit_history (payment_id, action, old_values)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD) - 'created_at' - 'updated_at');
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_vcc_payments_changes
  AFTER INSERT OR UPDATE OR DELETE ON vcc_payments
  FOR EACH ROW
  EXECUTE FUNCTION track_vcc_payments_changes();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE vcc_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vcc_payments_audit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for all users" ON vcc_payments
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON vcc_payments_audit_history
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
