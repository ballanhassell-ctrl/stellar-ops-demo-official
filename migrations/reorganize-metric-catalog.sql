-- =====================================================
-- METRIC CATALOG REORGANIZATION MIGRATION
-- =====================================================
-- Purpose: Reorganize csd_metric_catalog with entry_frequency
--          to separate daily manual entries from monthly static data
-- Date: 2025-12-04
-- =====================================================

-- Step 1: Add entry_frequency column to existing catalog
ALTER TABLE csd_metric_catalog
ADD COLUMN IF NOT EXISTS entry_frequency TEXT CHECK (entry_frequency IN ('daily', 'monthly', 'automated', 'calculated'));

-- Step 2: Add display_order for organizing data entry forms
ALTER TABLE csd_metric_catalog
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Step 3: Add category for grouping related metrics
ALTER TABLE csd_metric_catalog
ADD COLUMN IF NOT EXISTS category TEXT;

-- Step 4: Update existing metrics with entry_frequency classification
-- =====================================================

-- DAILY MANUAL ENTRIES (entry_frequency = 'daily')
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 1, category = 'BAM Revenue' WHERE field_key = 'bam_current_revenue';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 2, category = 'Dashboard KPIs' WHERE field_key = 'collection_rate';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 3, category = 'Dashboard KPIs' WHERE field_key = 'active_patients';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 4, category = 'Dashboard KPIs' WHERE field_key = 'active_claims';

-- EOD Daily Summary (display_order 10-19)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 10, category = 'EOD Summary' WHERE field_key = 'eod_daily_production';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 11, category = 'EOD Summary' WHERE field_key = 'eod_payments_collected';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 12, category = 'EOD Summary' WHERE field_key = 'eod_insurance_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 13, category = 'EOD Summary' WHERE field_key = 'eod_patient_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 14, category = 'EOD Summary' WHERE field_key = 'eod_patients_seen';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 15, category = 'EOD Summary' WHERE field_key = 'eod_new_patients';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 16, category = 'EOD Summary' WHERE field_key = 'eod_procedures_completed';

-- Payment Methods (display_order 20-30)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 20, category = 'Payment Methods' WHERE field_key = 'eod_payment_visa';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 21, category = 'Payment Methods' WHERE field_key = 'eod_payment_mastercard';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 22, category = 'Payment Methods' WHERE field_key = 'eod_payment_amex';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 23, category = 'Payment Methods' WHERE field_key = 'eod_payment_discover';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 24, category = 'Payment Methods' WHERE field_key = 'eod_payment_cherry';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 25, category = 'Payment Methods' WHERE field_key = 'eod_payment_carecredit';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 26, category = 'Payment Methods' WHERE field_key = 'eod_payment_insurance_check';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 27, category = 'Payment Methods' WHERE field_key = 'eod_payment_other_check';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 28, category = 'Payment Methods' WHERE field_key = 'eod_payment_cash';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 29, category = 'Payment Methods' WHERE field_key = 'eod_payment_eft';

-- Provider Production (display_order 40-50)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 40, category = 'Provider Production' WHERE field_key = 'provider_dr_gajjar';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 41, category = 'Provider Production' WHERE field_key = 'provider_dr_judge';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 42, category = 'Provider Production' WHERE field_key = 'provider_dr_strachan';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 43, category = 'Provider Production' WHERE field_key = 'provider_farah';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 44, category = 'Provider Production' WHERE field_key = 'provider_olga';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 45, category = 'Provider Production' WHERE field_key = 'provider_jissel';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 46, category = 'Provider Production' WHERE field_key = 'provider_temp_hyg';

-- MTD Metrics (display_order 60-65)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 60, category = 'MTD Summary' WHERE field_key = 'eod_mtd_production';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 61, category = 'MTD Summary' WHERE field_key = 'eod_mtd_collected';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 62, category = 'MTD Summary' WHERE field_key = 'eod_mtd_new_patients';

-- Payments (display_order 70-75)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 70, category = 'Payments' WHERE field_key = 'todays_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 71, category = 'Payments' WHERE field_key = 'insurance_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 72, category = 'Payments' WHERE field_key = 'patient_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 73, category = 'Payments' WHERE field_key = 'unapplied_credits';

-- Patient AR (display_order 80-90)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 80, category = 'Patient AR' WHERE field_key = 'patients_with_balance';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 81, category = 'Patient AR' WHERE field_key = 'total_patient_ar';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 82, category = 'Patient AR' WHERE field_key = 'past_due_accounts';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 83, category = 'Patient AR Aging' WHERE field_key = 'patient_ar_0_30';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 84, category = 'Patient AR Aging' WHERE field_key = 'patient_ar_31_60';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 85, category = 'Patient AR Aging' WHERE field_key = 'patient_ar_61_90';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 86, category = 'Patient AR Aging' WHERE field_key = 'patient_ar_90_plus';

-- Insurance AR (display_order 90-100)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 90, category = 'Insurance AR' WHERE field_key = 'insurance_ar_0_30_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 91, category = 'Insurance AR' WHERE field_key = 'insurance_ar_31_60_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 92, category = 'Insurance AR' WHERE field_key = 'insurance_ar_61_90_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 93, category = 'Insurance AR' WHERE field_key = 'insurance_ar_90_plus_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 94, category = 'Insurance AR' WHERE field_key = 'insurance_ar_0_30_count';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 95, category = 'Insurance AR' WHERE field_key = 'insurance_ar_31_60_count';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 96, category = 'Insurance AR' WHERE field_key = 'insurance_ar_61_90_count';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 97, category = 'Insurance AR' WHERE field_key = 'insurance_ar_90_plus_count';

-- Pre-Auths & Claims (display_order 100-105)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 100, category = 'Pre-Auths' WHERE field_key = 'total_pre_auths';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 101, category = 'EOD Action Items' WHERE field_key = 'eod_claims_to_submit';

-- Scorecard Actuals (display_order 110-115)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 110, category = 'Scorecard' WHERE field_key = 'scorecard_production_actual';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 111, category = 'Scorecard' WHERE field_key = 'scorecard_collection_actual';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 112, category = 'Scorecard' WHERE field_key = 'scorecard_new_patients_actual';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 113, category = 'Scorecard' WHERE field_key = 'scorecard_show_rate_dr';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 114, category = 'Scorecard' WHERE field_key = 'scorecard_show_rate_hyg';

-- New Patient Tracker (display_order 120-125)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 120, category = 'New Patients' WHERE field_key = 'new_pts_per_day';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 121, category = 'New Patients' WHERE field_key = 'new_pts_per_week';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 122, category = 'New Patients' WHERE field_key = 'new_pts_per_month';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 123, category = 'New Patients' WHERE field_key = 'new_pts_quarterly';

-- =====================================================
-- MONTHLY STATIC ENTRIES (entry_frequency = 'monthly')
-- =====================================================

-- Goals & Targets (display_order 500-520)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 500, category = 'Goals & Targets' WHERE field_key = 'bam_target_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 501, category = 'Goals & Targets' WHERE field_key = 'practice_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 502, category = 'Goals & Targets' WHERE field_key = 'eod_daily_production_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 503, category = 'Goals & Targets' WHERE field_key = 'eod_mtd_production_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 504, category = 'Goals & Targets' WHERE field_key = 'scorecard_production_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 505, category = 'Goals & Targets' WHERE field_key = 'scorecard_collection_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 506, category = 'Goals & Targets' WHERE field_key = 'scorecard_new_patients_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 507, category = 'Goals & Targets' WHERE field_key = 'scorecard_show_rate_dr_target';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 508, category = 'Goals & Targets' WHERE field_key = 'scorecard_show_rate_hyg_target';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 509, category = 'Goals & Targets' WHERE field_key = 'scorecard_tx_acceptance_target';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 510, category = 'Goals & Targets' WHERE field_key = 'scorecard_avg_collection_target';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 511, category = 'Goals & Targets' WHERE field_key = 'new_pts_per_day_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 512, category = 'Goals & Targets' WHERE field_key = 'new_pts_per_week_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 513, category = 'Goals & Targets' WHERE field_key = 'new_pts_per_month_goal';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 514, category = 'Goals & Targets' WHERE field_key = 'new_pts_quarterly_goal';

-- Advanced Financial Metrics (display_order 600-620)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 600, category = 'Advanced Metrics' WHERE field_key = 'adv_cac';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 601, category = 'Advanced Metrics' WHERE field_key = 'adv_gross_profit_margin';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 602, category = 'Advanced Metrics' WHERE field_key = 'adv_operating_profit_margin';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 603, category = 'Advanced Metrics' WHERE field_key = 'adv_cash_flow';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 604, category = 'Advanced Metrics' WHERE field_key = 'adv_revenue_growth_rate';

-- COGS (display_order 620-630)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 620, category = 'COGS' WHERE field_key = 'adv_cogs_dental_supplies';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 621, category = 'COGS' WHERE field_key = 'adv_cogs_lab_fees';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 622, category = 'COGS' WHERE field_key = 'adv_cogs_associate_doctor';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 623, category = 'COGS' WHERE field_key = 'adv_cogs_hygiene_payroll';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 624, category = 'COGS' WHERE field_key = 'adv_cogs_assistant_payroll';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 625, category = 'COGS' WHERE field_key = 'adv_operating_costs';

-- Patient Lifecycle & Satisfaction (display_order 630-640)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 630, category = 'Lifecycle' WHERE field_key = 'adv_churned_patients_month';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 640, category = 'Satisfaction' WHERE field_key = 'adv_nps';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 641, category = 'Satisfaction' WHERE field_key = 'adv_enps';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 642, category = 'Satisfaction' WHERE field_key = 'adv_employee_utilization';

-- Insurance Contracts (display_order 700-710)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 700, category = 'Insurance' WHERE field_key = 'insurance_total_providers';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 701, category = 'Insurance' WHERE field_key = 'insurance_active_plans';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 702, category = 'Insurance' WHERE field_key = 'insurance_total_portals';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 703, category = 'Insurance' WHERE field_key = 'insurance_eft_enrolled';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 704, category = 'Insurance' WHERE field_key = 'insurance_connection_network';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 705, category = 'Insurance' WHERE field_key = 'insurance_direct_contracts';

-- =====================================================
-- AUTOMATED METRICS (entry_frequency = 'automated')
-- =====================================================

-- Claims (already automated via getClaimsTotals())
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = true WHERE field_key = 'claims_total_active';
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = true WHERE field_key = 'claims_pending';
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = true WHERE field_key = 'claims_denied';
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = true WHERE field_key = 'claims_over_60_days';

-- New Patient Aggregates (automated via getNewPatientsAggregates())
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = true WHERE field_key = 'scorecard_new_pts_per_week';
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = true WHERE field_key = 'scorecard_total_new_patients';

-- Can be automated from existing data
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'eod_denied_claims_resubmit';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'eod_preauths_expiring';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'pre_auths_pending';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'pre_auths_approved';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'pre_auths_denied';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'financing_cherry_patients';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'financing_cherry_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'financing_carecredit_patients';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'financing_carecredit_amount';

-- =====================================================
-- CALCULATED METRICS (entry_frequency = 'calculated')
-- =====================================================

-- Outstanding AR is calculated from Patient AR + Insurance AR
UPDATE csd_metric_catalog
SET entry_frequency = 'calculated', is_calculated = true
WHERE field_key IN ('outstanding_ar');

-- Payment aggregates
UPDATE csd_metric_catalog
SET entry_frequency = 'calculated', is_calculated = true
WHERE field_key IN ('weekly_payments', 'monthly_payments');

-- =====================================================
-- Step 5: Mark deprecated metrics for deletion
-- Add is_deprecated flag before actually deleting
-- =====================================================

ALTER TABLE csd_metric_catalog
ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN DEFAULT FALSE;

-- Mark metrics for deletion (safe to delete - no code dependencies)
UPDATE csd_metric_catalog SET is_deprecated = TRUE WHERE field_key IN (
  'adv_lifecycle_months',
  'adv_active_pts_prior_month',
  'adv_avg_retention_period',
  'adv_arpc'
);

-- Mark for review/consolidation (have code dependencies - need code changes first)
UPDATE csd_metric_catalog SET is_deprecated = TRUE, description_notes = 'DEPRECATED: Use unapplied_credits instead' WHERE field_key = 'eod_unapplied_payments';
UPDATE csd_metric_catalog SET is_deprecated = TRUE, description_notes = 'DEPRECATED: Use eod_preauths_expiring instead' WHERE field_key = 'pre_auths_expiring_soon';
UPDATE csd_metric_catalog SET is_deprecated = TRUE, description_notes = 'DEPRECATED: Use eod_preauths_expiring instead' WHERE field_key = 'pre_auths_expiring_this_month';

-- =====================================================
-- Step 6: Create index for better query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_metric_catalog_entry_frequency ON csd_metric_catalog(entry_frequency);
CREATE INDEX IF NOT EXISTS idx_metric_catalog_display_order ON csd_metric_catalog(display_order);
CREATE INDEX IF NOT EXISTS idx_metric_catalog_category ON csd_metric_catalog(category);
CREATE INDEX IF NOT EXISTS idx_metric_catalog_deprecated ON csd_metric_catalog(is_deprecated) WHERE is_deprecated = FALSE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary:
-- - Added entry_frequency, display_order, category, is_deprecated columns
-- - Classified 46 metrics as 'daily' (manual entry)
-- - Classified 36 metrics as 'monthly' (static updates)
-- - Classified 15 metrics as 'automated'
-- - Classified 3 metrics as 'calculated'
-- - Marked 7 metrics as deprecated
-- - Created indexes for query performance
-- =====================================================
