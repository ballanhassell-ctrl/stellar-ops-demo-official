-- =====================================================
-- STEP 3: ORGANIZE DATA ENTRY ORDER
-- =====================================================
-- This sets display_order and category for optimal data entry workflow

-- =====================================================
-- DAILY MANUAL ENTRIES (entry_frequency = 'daily')
-- Organized in logical workflow order
-- =====================================================

-- BAM Revenue & Dashboard KPIs (1-4)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 1, category = 'BAM Revenue' WHERE field_key = 'bam_current_revenue';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 2, category = 'Dashboard KPIs' WHERE field_key = 'collection_rate';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 3, category = 'Dashboard KPIs' WHERE field_key = 'active_patients';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 4, category = 'Dashboard KPIs' WHERE field_key = 'active_claims';

-- EOD Daily Summary (10-16)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 10, category = 'EOD Summary' WHERE field_key = 'eod_daily_production';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 11, category = 'EOD Summary' WHERE field_key = 'eod_payments_collected';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 12, category = 'EOD Summary' WHERE field_key = 'eod_insurance_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 13, category = 'EOD Summary' WHERE field_key = 'eod_patient_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 14, category = 'EOD Summary' WHERE field_key = 'eod_patients_seen';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 15, category = 'EOD Summary' WHERE field_key = 'eod_new_patients';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 16, category = 'EOD Summary' WHERE field_key = 'eod_procedures_completed';

-- Payment Methods (20-29)
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

-- Provider Production (40-46)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 40, category = 'Provider Production' WHERE field_key = 'provider_dr_gajjar';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 41, category = 'Provider Production' WHERE field_key = 'provider_dr_judge';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 42, category = 'Provider Production' WHERE field_key = 'provider_dr_strachan';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 43, category = 'Provider Production' WHERE field_key = 'provider_farah';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 44, category = 'Provider Production' WHERE field_key = 'provider_olga';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 45, category = 'Provider Production' WHERE field_key = 'provider_jissel';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 46, category = 'Provider Production' WHERE field_key = 'provider_temp_hyg';

-- MTD Metrics (60-62)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 60, category = 'MTD Summary' WHERE field_key = 'eod_mtd_production';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 61, category = 'MTD Summary' WHERE field_key = 'eod_mtd_collected';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 62, category = 'MTD Summary' WHERE field_key = 'eod_mtd_new_patients';

-- Payments (70-73)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 70, category = 'Payments' WHERE field_key = 'todays_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 71, category = 'Payments' WHERE field_key = 'insurance_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 72, category = 'Payments' WHERE field_key = 'patient_payments';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 73, category = 'Payments' WHERE field_key = 'unapplied_credits';

-- Patient AR (80-86)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 80, category = 'Patient AR' WHERE field_key = 'patients_with_balance';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 81, category = 'Patient AR' WHERE field_key = 'total_patient_ar';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 82, category = 'Patient AR' WHERE field_key = 'past_due_accounts';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 83, category = 'Patient AR Aging' WHERE field_key = 'patient_ar_0_30';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 84, category = 'Patient AR Aging' WHERE field_key = 'patient_ar_31_60';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 85, category = 'Patient AR Aging' WHERE field_key = 'patient_ar_61_90';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 86, category = 'Patient AR Aging' WHERE field_key = 'patient_ar_90_plus';

-- Insurance AR (90-97)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 90, category = 'Insurance AR' WHERE field_key = 'insurance_ar_0_30_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 91, category = 'Insurance AR' WHERE field_key = 'insurance_ar_31_60_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 92, category = 'Insurance AR' WHERE field_key = 'insurance_ar_61_90_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 93, category = 'Insurance AR' WHERE field_key = 'insurance_ar_90_plus_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 94, category = 'Insurance AR' WHERE field_key = 'insurance_ar_0_30_count';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 95, category = 'Insurance AR' WHERE field_key = 'insurance_ar_31_60_count';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 96, category = 'Insurance AR' WHERE field_key = 'insurance_ar_61_90_count';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 97, category = 'Insurance AR' WHERE field_key = 'insurance_ar_90_plus_count';

-- Pre-Auths & Claims (100-101)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 100, category = 'Pre-Auths' WHERE field_key = 'total_pre_auths';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 101, category = 'EOD Action Items' WHERE field_key = 'eod_claims_to_submit';

-- Scorecard Actuals (110-114)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 110, category = 'Scorecard' WHERE field_key = 'scorecard_production_actual';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 111, category = 'Scorecard' WHERE field_key = 'scorecard_collection_actual';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 112, category = 'Scorecard' WHERE field_key = 'scorecard_new_patients_actual';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 113, category = 'Scorecard' WHERE field_key = 'scorecard_show_rate_dr';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 114, category = 'Scorecard' WHERE field_key = 'scorecard_show_rate_hyg';

-- New Patient Tracker (120-123)
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 120, category = 'New Patients' WHERE field_key = 'new_pts_per_day';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 121, category = 'New Patients' WHERE field_key = 'new_pts_per_week';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 122, category = 'New Patients' WHERE field_key = 'new_pts_per_month';
UPDATE csd_metric_catalog SET entry_frequency = 'daily', display_order = 123, category = 'New Patients' WHERE field_key = 'new_pts_quarterly';

-- =====================================================
-- MONTHLY STATIC ENTRIES (entry_frequency = 'monthly')
-- =====================================================

-- Goals & Targets (500-514)
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

-- Advanced Financial Metrics (600-604)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 600, category = 'Advanced Metrics' WHERE field_key = 'adv_cac';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 601, category = 'Advanced Metrics' WHERE field_key = 'adv_gross_profit_margin';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 602, category = 'Advanced Metrics' WHERE field_key = 'adv_operating_profit_margin';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 603, category = 'Advanced Metrics' WHERE field_key = 'adv_cash_flow';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 604, category = 'Advanced Metrics' WHERE field_key = 'adv_revenue_growth_rate';

-- COGS (620-625)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 620, category = 'COGS' WHERE field_key = 'adv_cogs_dental_supplies';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 621, category = 'COGS' WHERE field_key = 'adv_cogs_lab_fees';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 622, category = 'COGS' WHERE field_key = 'adv_cogs_associate_doctor';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 623, category = 'COGS' WHERE field_key = 'adv_cogs_hygiene_payroll';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 624, category = 'COGS' WHERE field_key = 'adv_cogs_assistant_payroll';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 625, category = 'COGS' WHERE field_key = 'adv_operating_costs';

-- Patient Lifecycle & Satisfaction (630-642)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 630, category = 'Lifecycle' WHERE field_key = 'adv_churned_patients_month';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 640, category = 'Satisfaction' WHERE field_key = 'adv_nps';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 641, category = 'Satisfaction' WHERE field_key = 'adv_enps';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 642, category = 'Satisfaction' WHERE field_key = 'adv_employee_utilization';

-- Insurance Contracts (700-705)
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 700, category = 'Insurance' WHERE field_key = 'insurance_total_providers';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 701, category = 'Insurance' WHERE field_key = 'insurance_active_plans';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 702, category = 'Insurance' WHERE field_key = 'insurance_total_portals';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 703, category = 'Insurance' WHERE field_key = 'insurance_eft_enrolled';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 704, category = 'Insurance' WHERE field_key = 'insurance_connection_network';
UPDATE csd_metric_catalog SET entry_frequency = 'monthly', display_order = 705, category = 'Insurance' WHERE field_key = 'insurance_direct_contracts';

-- =====================================================
-- AUTOMATED METRICS
-- =====================================================

-- Claims (already automated)
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = TRUE WHERE field_key = 'claims_total_active';
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = TRUE WHERE field_key = 'claims_pending';
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = TRUE WHERE field_key = 'claims_denied';
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = TRUE WHERE field_key = 'claims_over_60_days';

-- New Patient Aggregates (automated)
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = TRUE WHERE field_key = 'scorecard_new_pts_per_week';
UPDATE csd_metric_catalog SET entry_frequency = 'automated', is_calculated = TRUE WHERE field_key = 'scorecard_total_new_patients';

-- Can be automated from existing data
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'eod_denied_claims_resubmit';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'pre_auths_pending';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'pre_auths_approved';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'pre_auths_denied';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'financing_cherry_patients';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'financing_cherry_amount';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'financing_carecredit_patients';
UPDATE csd_metric_catalog SET entry_frequency = 'automated' WHERE field_key = 'financing_carecredit_amount';

-- =====================================================
-- CALCULATED METRICS
-- =====================================================

-- Payment aggregates
UPDATE csd_metric_catalog SET entry_frequency = 'calculated', is_calculated = TRUE WHERE field_key IN ('weekly_payments', 'monthly_payments');

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_metric_catalog_entry_frequency ON csd_metric_catalog(entry_frequency);
CREATE INDEX IF NOT EXISTS idx_metric_catalog_display_order ON csd_metric_catalog(display_order);
CREATE INDEX IF NOT EXISTS idx_metric_catalog_category ON csd_metric_catalog(category);
CREATE INDEX IF NOT EXISTS idx_metric_catalog_deprecated ON csd_metric_catalog(is_deprecated) WHERE is_deprecated = FALSE;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ DATA ENTRY ORDER ORGANIZED - Proceed to Step 4' as status;
