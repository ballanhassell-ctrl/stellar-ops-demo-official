-- Backfill Audit History for Existing Claims and Pre-Auths
-- This creates INSERT audit entries for all existing records
-- Run this in your Supabase SQL Editor AFTER running add_archive_and_audit_features.sql

-- =====================================================
-- BACKFILL CLAIMS AUDIT HISTORY
-- =====================================================

-- Insert audit history for all existing claims
INSERT INTO claims_audit_history (claim_id, action, new_values, changed_at)
SELECT
  id,
  'INSERT',
  to_jsonb(claims.*) - 'created_at' - 'updated_at',
  COALESCE(created_at, CURRENT_TIMESTAMP)
FROM claims
WHERE id NOT IN (
  SELECT DISTINCT claim_id
  FROM claims_audit_history
  WHERE action = 'INSERT'
);

-- =====================================================
-- BACKFILL PRE-AUTHS AUDIT HISTORY
-- =====================================================

-- Insert audit history for all existing pre-auths
INSERT INTO pre_auths_audit_history (pre_auth_id, action, new_values, changed_at)
SELECT
  id,
  'INSERT',
  to_jsonb(pre_auths.*) - 'created_at' - 'updated_at',
  COALESCE(created_at, CURRENT_TIMESTAMP)
FROM pre_auths
WHERE id NOT IN (
  SELECT DISTINCT pre_auth_id
  FROM pre_auths_audit_history
  WHERE action = 'INSERT'
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check claims audit history counts
SELECT
  'Claims' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT claim_id) as unique_claims,
  COUNT(*) FILTER (WHERE action = 'INSERT') as inserts,
  COUNT(*) FILTER (WHERE action = 'UPDATE') as updates,
  COUNT(*) FILTER (WHERE action = 'DELETE') as deletes,
  COUNT(*) FILTER (WHERE action = 'ARCHIVE') as archives
FROM claims_audit_history

UNION ALL

-- Check pre-auths audit history counts
SELECT
  'Pre-Auths' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT pre_auth_id) as unique_pre_auths,
  COUNT(*) FILTER (WHERE action = 'INSERT') as inserts,
  COUNT(*) FILTER (WHERE action = 'UPDATE') as updates,
  COUNT(*) FILTER (WHERE action = 'DELETE') as deletes,
  COUNT(*) FILTER (WHERE action = 'ARCHIVE') as archives
FROM pre_auths_audit_history;
