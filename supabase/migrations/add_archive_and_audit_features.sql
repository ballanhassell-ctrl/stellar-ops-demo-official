-- Add Archive and Audit History Features to Claims and Pre-Auths
-- Run this in your Supabase SQL Editor

-- =====================================================
-- ADD ARCHIVED COLUMN TO EXISTING TABLES
-- =====================================================

-- Add archived column to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Add archived column to pre_auths table
ALTER TABLE pre_auths ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pre_auths ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pre_auths ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Create indexes for archived column
CREATE INDEX IF NOT EXISTS idx_claims_archived ON claims(archived);
CREATE INDEX IF NOT EXISTS idx_pre_auths_archived ON pre_auths(archived);

-- =====================================================
-- AUDIT HISTORY TABLES
-- =====================================================

-- Claims Audit History Table
CREATE TABLE IF NOT EXISTS claims_audit_history (
  audit_id BIGSERIAL PRIMARY KEY,
  claim_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'ARCHIVE', 'UNARCHIVE')),
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT
);

-- Pre-Auths Audit History Table
CREATE TABLE IF NOT EXISTS pre_auths_audit_history (
  audit_id BIGSERIAL PRIMARY KEY,
  pre_auth_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'ARCHIVE', 'UNARCHIVE')),
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes for audit tables
CREATE INDEX IF NOT EXISTS idx_claims_audit_claim_id ON claims_audit_history(claim_id);
CREATE INDEX IF NOT EXISTS idx_claims_audit_changed_at ON claims_audit_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_claims_audit_action ON claims_audit_history(action);
CREATE INDEX IF NOT EXISTS idx_pre_auths_audit_pre_auth_id ON pre_auths_audit_history(pre_auth_id);
CREATE INDEX IF NOT EXISTS idx_pre_auths_audit_changed_at ON pre_auths_audit_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_pre_auths_audit_action ON pre_auths_audit_history(action);

-- =====================================================
-- AUDIT TRIGGER FUNCTIONS
-- =====================================================

-- Function to track claims changes
CREATE OR REPLACE FUNCTION track_claims_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_json JSONB;
BEGIN
  -- Calculate what changed
  IF (TG_OP = 'UPDATE') THEN
    changes_json := jsonb_build_object(
      'changed_fields', (
        SELECT jsonb_object_agg(key, jsonb_build_object('old', OLD_record.value, 'new', NEW_record.value))
        FROM jsonb_each(to_jsonb(OLD)) AS OLD_record
        INNER JOIN jsonb_each(to_jsonb(NEW)) AS NEW_record ON OLD_record.key = NEW_record.key
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

-- Function to track pre_auths changes
CREATE OR REPLACE FUNCTION track_pre_auths_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_json JSONB;
BEGIN
  -- Calculate what changed
  IF (TG_OP = 'UPDATE') THEN
    changes_json := jsonb_build_object(
      'changed_fields', (
        SELECT jsonb_object_agg(key, jsonb_build_object('old', OLD_record.value, 'new', NEW_record.value))
        FROM jsonb_each(to_jsonb(OLD)) AS OLD_record
        INNER JOIN jsonb_each(to_jsonb(NEW)) AS NEW_record ON OLD_record.key = NEW_record.key
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

-- =====================================================
-- CREATE AUDIT TRIGGERS
-- =====================================================

-- Claims audit triggers
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

-- Pre-auths audit triggers
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

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN claims.archived IS 'Soft delete flag - archived records are hidden by default';
COMMENT ON COLUMN pre_auths.archived IS 'Soft delete flag - archived records are hidden by default';
COMMENT ON TABLE claims_audit_history IS 'Complete audit trail of all changes to claims';
COMMENT ON TABLE pre_auths_audit_history IS 'Complete audit trail of all changes to pre-auths';
