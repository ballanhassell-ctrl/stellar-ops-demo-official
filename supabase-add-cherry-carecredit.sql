-- Add Cherry and CareCredit payment method fields to Supabase
-- Run this in your Supabase SQL Editor

-- Add Cherry payment method to catalog
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes)
VALUES (
  'eod_payment_cherry',
  'EOD_REPORT',
  'Cherry Payments',
  'currency',
  'Payments received via Cherry financing on the given date'
) ON CONFLICT (field_key) DO NOTHING;

-- Add CareCredit payment method to catalog
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes)
VALUES (
  'eod_payment_carecredit',
  'EOD_REPORT',
  'CareCredit Payments',
  'currency',
  'Payments received via CareCredit financing on the given date'
) ON CONFLICT (field_key) DO NOTHING;

-- Verify the insertions
SELECT field_key, field_name, section, data_type, description_notes
FROM csd_metric_catalog
WHERE field_key IN ('eod_payment_cherry', 'eod_payment_carecredit')
ORDER BY field_key;
