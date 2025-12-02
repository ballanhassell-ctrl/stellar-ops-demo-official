-- Remove payment_date field and add archive fields to insurance_checks

-- Remove payment_date column
ALTER TABLE insurance_checks DROP COLUMN IF EXISTS payment_date;

-- Add archive fields
ALTER TABLE insurance_checks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE insurance_checks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE insurance_checks ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Create index for archived status
CREATE INDEX IF NOT EXISTS idx_insurance_checks_archived ON insurance_checks(is_archived);

-- Update the trigger function to track archival in audit history
CREATE OR REPLACE FUNCTION track_insurance_checks_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO insurance_checks_audit_history (check_id, action, changed_by, changed_at, old_values, new_values, changes)
    VALUES (NEW.id, 'INSERT', NEW.handler, NOW(), NULL, to_jsonb(NEW), NULL);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    changes := jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
      FROM jsonb_each(to_jsonb(OLD)) AS old(key, old_val)
      JOIN jsonb_each(to_jsonb(NEW)) AS new(key, new_val) ON old.key = new.key
      WHERE old.old_val IS DISTINCT FROM new.new_val;

    IF changes IS NOT NULL THEN
      INSERT INTO insurance_checks_audit_history (check_id, action, changed_by, changed_at, old_values, new_values, changes)
      VALUES (NEW.id,
              CASE WHEN NEW.is_archived != OLD.is_archived AND NEW.is_archived = TRUE THEN 'ARCHIVE'
                   WHEN NEW.is_archived != OLD.is_archived AND NEW.is_archived = FALSE THEN 'UNARCHIVE'
                   ELSE 'UPDATE' END,
              NEW.handler, NOW(), to_jsonb(OLD), to_jsonb(NEW), changes);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO insurance_checks_audit_history (check_id, action, changed_by, changed_at, old_values, new_values, changes)
    VALUES (OLD.id, 'DELETE', OLD.handler, NOW(), to_jsonb(OLD), NULL, NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;
