-- Create Claim Updates and Pre-Auth Updates Tables
-- This allows tracking status changes and notes without editing original records
-- Run this in your Supabase SQL Editor

-- =====================================================
-- CLAIM UPDATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS claim_updates (
  update_id BIGSERIAL PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  handler TEXT NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN ('status_change', 'note', 'follow_up', 'amount_change', 'general')),
  old_status TEXT,
  new_status TEXT,
  old_amount DECIMAL(10, 2),
  new_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PRE-AUTH UPDATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pre_auth_updates (
  update_id BIGSERIAL PRIMARY KEY,
  pre_auth_id TEXT NOT NULL REFERENCES pre_auths(id) ON DELETE CASCADE,
  handler TEXT NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN ('status_change', 'note', 'follow_up', 'amount_change', 'general')),
  old_status TEXT,
  new_status TEXT,
  old_amount DECIMAL(10, 2),
  new_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_claim_updates_claim_id ON claim_updates(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_updates_created_at ON claim_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_updates_handler ON claim_updates(handler);
CREATE INDEX IF NOT EXISTS idx_claim_updates_type ON claim_updates(update_type);

CREATE INDEX IF NOT EXISTS idx_pre_auth_updates_pre_auth_id ON pre_auth_updates(pre_auth_id);
CREATE INDEX IF NOT EXISTS idx_pre_auth_updates_created_at ON pre_auth_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_auth_updates_handler ON pre_auth_updates(handler);
CREATE INDEX IF NOT EXISTS idx_pre_auth_updates_type ON pre_auth_updates(update_type);

-- =====================================================
-- AUTOMATIC STATUS UPDATE TRIGGER
-- =====================================================

-- Function to automatically create update entry when claim status changes
CREATE OR REPLACE FUNCTION track_claim_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Track status changes
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO claim_updates (
        claim_id, handler, update_type, old_status, new_status, notes
      ) VALUES (
        NEW.id,
        COALESCE(NEW.handler, 'system'),
        'status_change',
        OLD.status,
        NEW.status,
        'Status automatically updated'
      );
    END IF;

    -- Track amount changes
    IF (OLD.claim_amount IS DISTINCT FROM NEW.claim_amount) THEN
      INSERT INTO claim_updates (
        claim_id, handler, update_type, old_amount, new_amount, notes
      ) VALUES (
        NEW.id,
        COALESCE(NEW.handler, 'system'),
        'amount_change',
        OLD.claim_amount,
        NEW.claim_amount,
        'Amount automatically updated'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create update entry when pre-auth status changes
CREATE OR REPLACE FUNCTION track_pre_auth_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Track status changes
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO pre_auth_updates (
        pre_auth_id, handler, update_type, old_status, new_status, notes
      ) VALUES (
        NEW.id,
        COALESCE(NEW.handler, 'system'),
        'status_change',
        OLD.status,
        NEW.status,
        'Status automatically updated'
      );
    END IF;

    -- Track amount changes
    IF (OLD.approved_amount IS DISTINCT FROM NEW.approved_amount) THEN
      INSERT INTO pre_auth_updates (
        pre_auth_id, handler, update_type, old_amount, new_amount, notes
      ) VALUES (
        NEW.id,
        COALESCE(NEW.handler, 'system'),
        'amount_change',
        OLD.approved_amount,
        NEW.approved_amount,
        'Approved amount automatically updated'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS claim_status_change_tracker ON claims;
CREATE TRIGGER claim_status_change_tracker
  AFTER UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION track_claim_status_change();

DROP TRIGGER IF EXISTS pre_auth_status_change_tracker ON pre_auths;
CREATE TRIGGER pre_auth_status_change_tracker
  AFTER UPDATE ON pre_auths
  FOR EACH ROW
  EXECUTE FUNCTION track_pre_auth_status_change();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE claim_updates IS 'Timeline of updates and notes for claims - tracks status changes, notes, and modifications';
COMMENT ON TABLE pre_auth_updates IS 'Timeline of updates and notes for pre-auths - tracks status changes, notes, and modifications';
COMMENT ON COLUMN claim_updates.update_type IS 'Type: status_change, note, follow_up, amount_change, general';
COMMENT ON COLUMN pre_auth_updates.update_type IS 'Type: status_change, note, follow_up, amount_change, general';
