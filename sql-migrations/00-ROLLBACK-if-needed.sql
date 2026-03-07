-- =====================================================
-- ROLLBACK SCRIPT (EMERGENCY USE ONLY)
-- =====================================================
-- ⚠️ ONLY USE IF SOMETHING GOES WRONG!
-- This will restore your data from backups
-- =====================================================

-- =====================================================
-- VERIFY BACKUPS EXIST FIRST
-- =====================================================
SELECT 'Checking backups...' as status;

SELECT
  'csd_metric_catalog_backup' as table_name,
  COUNT(*) as record_count
FROM csd_metric_catalog_backup_2025_12_04
UNION ALL
SELECT
  'csd_metric_values_backup',
  COUNT(*)
FROM csd_metric_values_backup_2025_12_04;

-- If both show counts > 0, you're safe to proceed

-- =====================================================
-- OPTION 1: RESTORE CATALOG ONLY
-- =====================================================
-- Use this if only the catalog structure is messed up

-- Drop the current catalog
DROP TABLE IF EXISTS csd_metric_catalog CASCADE;

-- Restore from backup
CREATE TABLE csd_metric_catalog AS
SELECT * FROM csd_metric_catalog_backup_2025_12_04;

-- Recreate foreign key constraint
ALTER TABLE csd_metric_values
DROP CONSTRAINT IF EXISTS csd_metric_values_field_key_fkey;

ALTER TABLE csd_metric_values
ADD CONSTRAINT csd_metric_values_field_key_fkey
FOREIGN KEY (field_key)
REFERENCES csd_metric_catalog(field_key)
ON DELETE CASCADE;

SELECT '✅ Catalog restored from backup' as status;

-- =====================================================
-- OPTION 2: RESTORE BOTH CATALOG AND VALUES
-- =====================================================
-- Use this if both tables are affected

-- Drop current tables
DROP TABLE IF EXISTS csd_metric_values CASCADE;
DROP TABLE IF EXISTS csd_metric_catalog CASCADE;

-- Restore from backups
CREATE TABLE csd_metric_catalog AS
SELECT * FROM csd_metric_catalog_backup_2025_12_04;

CREATE TABLE csd_metric_values AS
SELECT * FROM csd_metric_values_backup_2025_12_04;

-- Recreate foreign key
ALTER TABLE csd_metric_values
ADD CONSTRAINT csd_metric_values_field_key_fkey
FOREIGN KEY (field_key)
REFERENCES csd_metric_catalog(field_key)
ON DELETE CASCADE;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_metric_values_date ON csd_metric_values(as_of_date);
CREATE INDEX IF NOT EXISTS idx_metric_values_field_key ON csd_metric_values(field_key);
CREATE INDEX IF NOT EXISTS idx_metric_catalog_section ON csd_metric_catalog(section);

-- Recreate unique constraint
ALTER TABLE csd_metric_values
ADD CONSTRAINT csd_metric_values_as_of_date_field_key_key
UNIQUE (as_of_date, field_key);

SELECT '✅ Both tables restored from backup' as status;

-- =====================================================
-- VERIFICATION AFTER ROLLBACK
-- =====================================================

SELECT
  'catalog' as table_name,
  COUNT(*) as record_count
FROM csd_metric_catalog
UNION ALL
SELECT
  'values',
  COUNT(*)
FROM csd_metric_values;

SELECT '✅ ROLLBACK COMPLETE - System restored to backup state' as status;

-- =====================================================
-- NOTE: After rollback, you'll need to:
-- 1. Revert code changes in the application
-- 2. Restart your application
-- 3. Investigate what went wrong before trying again
-- =====================================================
