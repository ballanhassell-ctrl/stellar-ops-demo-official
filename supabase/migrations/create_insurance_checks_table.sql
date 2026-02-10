-- Create insurance_checks table
CREATE TABLE IF NOT EXISTS insurance_checks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  check_eft_number TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('Check', 'EFT')),
  insurance_company TEXT NOT NULL,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN ('Bulk', 'Individual')),
  total_amount DECIMAL(10, 2) NOT NULL,
  aging INTEGER NOT NULL DEFAULT 0,
  entered_by TEXT NOT NULL,
  handler TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending Review' CHECK (status IN ('Entered', 'Pending Review')),
  payment_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on payment_date for faster filtering
CREATE INDEX IF NOT EXISTS idx_insurance_checks_payment_date ON insurance_checks(payment_date);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_insurance_checks_status ON insurance_checks(status);

-- Create index on payment_type for totals calculation
CREATE INDEX IF NOT EXISTS idx_insurance_checks_payment_type ON insurance_checks(payment_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_insurance_checks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_insurance_checks_updated_at
  BEFORE UPDATE ON insurance_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_insurance_checks_updated_at();

-- Create audit history table for insurance_checks
CREATE TABLE IF NOT EXISTS insurance_checks_audit_history (
  audit_id BIGSERIAL PRIMARY KEY,
  check_id TEXT NOT NULL REFERENCES insurance_checks(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  old_values JSONB,
  new_values JSONB,
  changes JSONB
);

-- Create indexes for audit history
CREATE INDEX IF NOT EXISTS idx_insurance_checks_audit_check_id ON insurance_checks_audit_history(check_id);
CREATE INDEX IF NOT EXISTS idx_insurance_checks_audit_changed_at ON insurance_checks_audit_history(changed_at DESC);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION track_insurance_checks_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO insurance_checks_audit_history (check_id, action, new_values, changed_by)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW) - 'created_at' - 'updated_at', NEW.handler);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO insurance_checks_audit_history (check_id, action, old_values, new_values, changes, changed_by)
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
      ),
      NEW.handler
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO insurance_checks_audit_history (check_id, action, old_values, changed_by)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD) - 'created_at' - 'updated_at', OLD.handler);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
CREATE TRIGGER trigger_track_insurance_checks_changes
  AFTER INSERT OR UPDATE OR DELETE ON insurance_checks
  FOR EACH ROW
  EXECUTE FUNCTION track_insurance_checks_changes();

-- Create updates table for insurance checks (for manual progression notes)
CREATE TABLE IF NOT EXISTS insurance_check_updates (
  update_id BIGSERIAL PRIMARY KEY,
  check_id TEXT NOT NULL REFERENCES insurance_checks(id) ON DELETE CASCADE,
  handler TEXT NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN ('status_change', 'note', 'follow_up', 'amount_change', 'general')),
  old_status TEXT,
  new_status TEXT,
  old_amount DECIMAL(10, 2),
  new_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for updates
CREATE INDEX IF NOT EXISTS idx_insurance_check_updates_check_id ON insurance_check_updates(check_id);
CREATE INDEX IF NOT EXISTS idx_insurance_check_updates_created_at ON insurance_check_updates(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE insurance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_checks_audit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_check_updates ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for authenticated and anon users)
CREATE POLICY "Enable all operations for all users" ON insurance_checks
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON insurance_checks_audit_history
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON insurance_check_updates
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
