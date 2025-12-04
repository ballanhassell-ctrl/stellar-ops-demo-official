-- =====================================================
-- STEP 1: BACKUP EXISTING DATA (RUN THIS FIRST!)
-- =====================================================
-- Create backup tables before making any changes

-- Backup the catalog
CREATE TABLE IF NOT EXISTS csd_metric_catalog_backup_2025_12_04 AS
SELECT * FROM csd_metric_catalog;

-- Backup recent metric values (last 3 months)
CREATE TABLE IF NOT EXISTS csd_metric_values_backup_2025_12_04 AS
SELECT * FROM csd_metric_values
WHERE as_of_date >= '2025-09-01';

-- Verify backups
SELECT 'Catalog backup count' as backup_type, COUNT(*) as record_count
FROM csd_metric_catalog_backup_2025_12_04
UNION ALL
SELECT 'Values backup count', COUNT(*)
FROM csd_metric_values_backup_2025_12_04;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ BACKUP COMPLETE - You can now proceed with Step 2' as status;
