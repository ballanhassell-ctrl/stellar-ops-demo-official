-- Fix ambiguous column reference in audit triggers
-- Run this in your Supabase SQL Editor

-- Fixed function for claims
CREATE OR REPLACE FUNCTION track_claims_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_json JSONB;
BEGIN
  -- Calculate what changed
  IF (TG_OP = 'UPDATE') THEN
    changes_json := jsonb_build_object(
      'changed_fields', (
        SELECT jsonb_object_agg(OLD_record.key, jsonb_build_object('old', OLD_record.value, 'new', NEW_record.value))
        FROM jsonb_each(to_jsonb(OLD)) AS OLD_record
        INNER JOIN jsonb_each(to_jsonb(NEW)) AS NEW_record
          ON OLD_record.key = NEW_record.key
        WHERE OLD_record.value IS DISTINCT FROM NEW_record.value
      )
    );

    INSERT INTO claims_audit_history (
      claim_id, action, old_values, new_values, changes
    ) VALUES (
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      changes_json
    );

  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO claims_audit_history (
      claim_id, action, new_values
    ) VALUES (
      NEW.id,
      'INSERT',
      to_jsonb(NEW)
    );

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO claims_audit_history (
      claim_id, action, old_values
    ) VALUES (
      OLD.id,
      'DELETE',
      to_jsonb(OLD)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fixed function for pre-auths
CREATE OR REPLACE FUNCTION track_pre_auths_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_json JSONB;
BEGIN
  -- Calculate what changed
  IF (TG_OP = 'UPDATE') THEN
    changes_json := jsonb_build_object(
      'changed_fields', (
        SELECT jsonb_object_agg(OLD_record.key, jsonb_build_object('old', OLD_record.value, 'new', NEW_record.value))
        FROM jsonb_each(to_jsonb(OLD)) AS OLD_record
        INNER JOIN jsonb_each(to_jsonb(NEW)) AS NEW_record
          ON OLD_record.key = NEW_record.key
        WHERE OLD_record.value IS DISTINCT FROM NEW_record.value
      )
    );

    INSERT INTO pre_auths_audit_history (
      pre_auth_id, action, old_values, new_values, changes
    ) VALUES (
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      changes_json
    );

  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO pre_auths_audit_history (
      pre_auth_id, action, new_values
    ) VALUES (
      NEW.id,
      'INSERT',
      to_jsonb(NEW)
    );

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO pre_auths_audit_history (
      pre_auth_id, action, old_values
    ) VALUES (
      OLD.id,
      'DELETE',
      to_jsonb(OLD)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Verify the triggers are using the new functions
DROP TRIGGER IF EXISTS claims_audit_insert ON claims;
CREATE TRIGGER claims_audit_insert
  AFTER INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION track_claims_changes();

DROP TRIGGER IF EXISTS claims_audit_update ON claims;
CREATE TRIGGER claims_audit_update
  AFTER UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION track_claims_changes();

DROP TRIGGER IF EXISTS claims_audit_delete ON claims;
CREATE TRIGGER claims_audit_delete
  AFTER DELETE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION track_claims_changes();

DROP TRIGGER IF EXISTS pre_auths_audit_insert ON pre_auths;
CREATE TRIGGER pre_auths_audit_insert
  AFTER INSERT ON pre_auths
  FOR EACH ROW
  EXECUTE FUNCTION track_pre_auths_changes();

DROP TRIGGER IF EXISTS pre_auths_audit_update ON pre_auths;
CREATE TRIGGER pre_auths_audit_update
  AFTER UPDATE ON pre_auths
  FOR EACH ROW
  EXECUTE FUNCTION track_pre_auths_changes();

DROP TRIGGER IF EXISTS pre_auths_audit_delete ON pre_auths;
CREATE TRIGGER pre_auths_audit_delete
  AFTER DELETE ON pre_auths
  FOR EACH ROW
  EXECUTE FUNCTION track_pre_auths_changes();
