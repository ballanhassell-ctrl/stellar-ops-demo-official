-- Add Missing Fields to Complete Your Supabase Setup
-- Run this in Supabase SQL Editor to add the 12 missing fields for 2025-11-24

-- STEP 1: Add missing fields to catalog (if not already there)
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes)
VALUES
  ('practice_goal', 'DASHBOARD', 'Practice Goal', 'currency', 'Overall practice revenue goal'),
  ('patient_ar_0_30', 'PATIENTS', 'Patient A/R 0-30 Days', 'currency', 'Patient A/R aged 0-30 days'),
  ('patient_ar_31_60', 'PATIENTS', 'Patient A/R 31-60 Days', 'currency', 'Patient A/R aged 31-60 days'),
  ('patient_ar_61_90', 'PATIENTS', 'Patient A/R 61-90 Days', 'currency', 'Patient A/R aged 61-90 days'),
  ('patient_ar_90_plus', 'PATIENTS', 'Patient A/R 90+ Days', 'currency', 'Patient A/R aged 90+ days'),
  ('pre_auths_pending', 'PRE_AUTHS', 'Pending Pre-Auths', 'number', 'Pre-authorizations pending approval'),
  ('pre_auths_approved', 'PRE_AUTHS', 'Approved Pre-Auths', 'number', 'Pre-authorizations approved'),
  ('pre_auths_denied', 'PRE_AUTHS', 'Denied Pre-Auths', 'number', 'Pre-authorizations denied'),
  ('pre_auths_expiring_soon', 'PRE_AUTHS', 'Expiring Soon', 'number', 'Pre-auths expiring within 30 days'),
  ('pre_auths_expiring_this_month', 'PRE_AUTHS', 'Expiring This Month', 'number', 'Pre-auths expiring this month'),
  ('eod_payment_cherry', 'EOD_REPORT', 'Cherry Payments', 'currency', 'Payments received via Cherry financing'),
  ('eod_payment_carecredit', 'EOD_REPORT', 'CareCredit Payments', 'currency', 'Payments received via CareCredit financing')
ON CONFLICT (field_key) DO NOTHING;

-- STEP 2: Add values for 2025-11-24 (set to 0 or your actual values)
INSERT INTO csd_metric_values (field_key, as_of_date, value, source, notes)
VALUES
  -- DASHBOARD
  ('practice_goal', '2025-11-24', 0, 'manual', 'Add your practice goal amount'),

  -- PATIENTS - A/R Aging (replace 0 with your actual values)
  ('patient_ar_0_30', '2025-11-24', 0, 'manual', 'Patient A/R aged 0-30 days'),
  ('patient_ar_31_60', '2025-11-24', 0, 'manual', 'Patient A/R aged 31-60 days'),
  ('patient_ar_61_90', '2025-11-24', 0, 'manual', 'Patient A/R aged 61-90 days'),
  ('patient_ar_90_plus', '2025-11-24', 0, 'manual', 'Patient A/R aged 90+ days'),

  -- PRE_AUTHS (replace 0 with your actual values)
  ('pre_auths_pending', '2025-11-24', 0, 'manual', 'Pre-auths pending approval'),
  ('pre_auths_approved', '2025-11-24', 0, 'manual', 'Pre-auths approved'),
  ('pre_auths_denied', '2025-11-24', 0, 'manual', 'Pre-auths denied'),
  ('pre_auths_expiring_soon', '2025-11-24', 0, 'manual', 'Pre-auths expiring within 30 days'),
  ('pre_auths_expiring_this_month', '2025-11-24', 0, 'manual', 'Pre-auths expiring this month'),

  -- EOD_REPORT - Payment Methods
  ('eod_payment_cherry', '2025-11-24', 0, 'manual', 'Cherry financing payments'),
  ('eod_payment_carecredit', '2025-11-24', 0, 'manual', 'CareCredit financing payments')
ON CONFLICT (field_key, as_of_date) DO UPDATE
  SET value = EXCLUDED.value,
      source = EXCLUDED.source,
      notes = EXCLUDED.notes;

-- STEP 3: Verify all fields are now present
SELECT
  'All fields added successfully!' as status,
  COUNT(*) as total_fields_for_date
FROM csd_metric_values
WHERE as_of_date = '2025-11-24';

-- Show the missing fields that were just added
SELECT field_key, value
FROM csd_metric_values
WHERE as_of_date = '2025-11-24'
  AND field_key IN (
    'practice_goal',
    'patient_ar_0_30', 'patient_ar_31_60', 'patient_ar_61_90', 'patient_ar_90_plus',
    'pre_auths_pending', 'pre_auths_approved', 'pre_auths_denied',
    'pre_auths_expiring_soon', 'pre_auths_expiring_this_month',
    'eod_payment_cherry', 'eod_payment_carecredit'
  )
ORDER BY field_key;
