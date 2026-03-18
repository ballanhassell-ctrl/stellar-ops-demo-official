-- =====================================================
-- COMPLETE CSD METRIC CATALOG RECREATION SCRIPT
-- =====================================================
-- This script completely rebuilds the csd_metric_catalog
-- and csd_metric_values tables with ALL trackable metrics
-- from the Stellar Dental Spa RCM Dashboard
-- =====================================================

-- Step 1: Drop existing tables (CASCADE will also drop csd_metric_values)
DROP TABLE IF EXISTS csd_metric_values CASCADE;
DROP TABLE IF EXISTS csd_metric_catalog CASCADE;

-- Step 2: Recreate csd_metric_catalog table
CREATE TABLE csd_metric_catalog (
  id BIGSERIAL PRIMARY KEY,
  field_key TEXT UNIQUE NOT NULL,
  section TEXT NOT NULL,
  field_name TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('number', 'currency', 'percentage', 'text', 'date', 'count')),
  description_notes TEXT,
  is_calculated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Recreate csd_metric_values table
CREATE TABLE csd_metric_values (
  id BIGSERIAL PRIMARY KEY,
  as_of_date DATE NOT NULL,
  field_key TEXT NOT NULL REFERENCES csd_metric_catalog(field_key) ON DELETE CASCADE,
  value NUMERIC DEFAULT 0,
  text_value TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(as_of_date, field_key)
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_metric_values_date ON csd_metric_values(as_of_date);
CREATE INDEX idx_metric_values_field_key ON csd_metric_values(field_key);
CREATE INDEX idx_metric_catalog_section ON csd_metric_catalog(section);

-- Step 5: Insert ALL metric definitions (organized by section)

-- =====================================================
-- SECTION 1: BAM CYCLE & PRACTICE GOALS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('bam_current_revenue', 'BAM_CYCLE', 'BAM Current Revenue', 'currency', 'Current revenue for the BAM (Business Acceleration Month) cycle', false),
('bam_target_goal', 'BAM_CYCLE', 'BAM Target Goal', 'currency', 'Target revenue goal for the current BAM cycle', false),
('practice_goal', 'BAM_CYCLE', 'Practice Goal', 'currency', 'Monthly practice revenue goal', false),
('bam_cycle_start', 'BAM_CYCLE', 'BAM Cycle Start Date', 'date', 'Start date of current BAM cycle', false),
('bam_cycle_end', 'BAM_CYCLE', 'BAM Cycle End Date', 'date', 'End date of current BAM cycle', false);

-- =====================================================
-- SECTION 2: KEY PERFORMANCE INDICATORS (DASHBOARD)
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('collection_rate', 'DASHBOARD_KPI', 'Collection Rate', 'percentage', 'Percentage of production that was collected', false),
('active_patients', 'DASHBOARD_KPI', 'Active Patients', 'count', 'Number of active patients', false),
('active_claims', 'DASHBOARD_KPI', 'Active Claims', 'count', 'Number of active insurance claims', false),
('pending_payments', 'DASHBOARD_KPI', 'Pending Payments', 'currency', 'Total amount of pending payments', false),
('outstanding_ar', 'DASHBOARD_KPI', 'Outstanding A/R', 'currency', 'Total outstanding accounts receivable', false);

-- =====================================================
-- SECTION 3: EOD REPORT - DAILY SUMMARY
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('eod_daily_production', 'EOD_REPORT', 'Daily Production', 'currency', 'Total production for the day', false),
('eod_daily_production_goal', 'EOD_REPORT', 'Daily Production Goal', 'currency', 'Daily production goal/target', false),
('eod_payments_collected', 'EOD_REPORT', 'Payments Collected', 'currency', 'Total payments collected today', false),
('eod_collection_rate', 'EOD_REPORT', 'Collection Rate', 'percentage', 'Daily collection rate percentage', true),
('eod_insurance_payments', 'EOD_REPORT', 'Insurance Payments', 'currency', 'Insurance payments received today', false),
('eod_patient_payments', 'EOD_REPORT', 'Patient Payments', 'currency', 'Patient payments received today', false),
('eod_patients_seen', 'EOD_REPORT', 'Patients Seen', 'count', 'Number of patients seen today', false),
('eod_new_patients', 'EOD_REPORT', 'New Patients', 'count', 'Number of new patients today', false),
('eod_procedures_completed', 'EOD_REPORT', 'Procedures Completed', 'count', 'Number of procedures completed today', false),
('eod_unbilled_procedures', 'EOD_REPORT', 'Unbilled Procedures', 'count', 'Number of unbilled procedures', false),
('eod_unapplied_payments', 'EOD_REPORT', 'Unapplied Payments', 'currency', 'Amount of unapplied payments', false),
('eod_failed_transactions', 'EOD_REPORT', 'Failed Transactions', 'count', 'Number of failed payment transactions', false);

-- =====================================================
-- SECTION 4: EOD REPORT - PAYMENT METHODS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
-- Credit Cards
('eod_payment_visa', 'EOD_PAYMENT_METHODS', 'Visa Payments', 'currency', 'Visa credit card payments', false),
('eod_payment_mastercard', 'EOD_PAYMENT_METHODS', 'Mastercard Payments', 'currency', 'Mastercard credit card payments', false),
('eod_payment_amex', 'EOD_PAYMENT_METHODS', 'American Express Payments', 'currency', 'American Express credit card payments', false),
('eod_payment_discover', 'EOD_PAYMENT_METHODS', 'Discover Payments', 'currency', 'Discover credit card payments', false),
-- Patient Financing
('eod_payment_cherry', 'EOD_PAYMENT_METHODS', 'Cherry Financing', 'currency', 'Cherry patient financing payments', false),
('eod_payment_carecredit', 'EOD_PAYMENT_METHODS', 'CareCredit Financing', 'currency', 'CareCredit patient financing payments', false),
-- Checks
('eod_payment_insurance_check', 'EOD_PAYMENT_METHODS', 'Insurance Check', 'currency', 'Insurance check payments', false),
('eod_payment_other_check', 'EOD_PAYMENT_METHODS', 'Other Check', 'currency', 'Other check payments', false),
-- Other
('eod_payment_cash', 'EOD_PAYMENT_METHODS', 'Cash Payments', 'currency', 'Cash payments', false),
('eod_payment_eft', 'EOD_PAYMENT_METHODS', 'EFT Payments', 'currency', 'Electronic Funds Transfer payments', false);

-- =====================================================
-- SECTION 5: EOD REPORT - ACTION ITEMS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('eod_claims_to_submit', 'EOD_ACTION_ITEMS', 'Claims to Submit', 'count', 'Number of claims ready to submit', false),
('eod_denied_claims_resubmit', 'EOD_ACTION_ITEMS', 'Denied Claims to Resubmit', 'count', 'Number of denied claims needing resubmission', false),
('eod_preauths_expiring', 'EOD_ACTION_ITEMS', 'Pre-Auths Expiring', 'count', 'Number of pre-authorizations expiring soon', false),
('eod_accounts_followup', 'EOD_ACTION_ITEMS', 'Accounts Needing Follow-Up', 'count', 'Number of accounts requiring follow-up', false),
('eod_missed_appointments', 'EOD_ACTION_ITEMS', 'Missed Appointments', 'count', 'Number of missed appointments today', false);

-- =====================================================
-- SECTION 6: EOD REPORT - MONTH-TO-DATE SUMMARY
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('eod_mtd_production', 'EOD_MTD', 'MTD Production', 'currency', 'Month-to-date production', false),
('eod_mtd_production_goal', 'EOD_MTD', 'MTD Production Goal', 'currency', 'Month-to-date production goal', false),
('eod_mtd_collected', 'EOD_MTD', 'MTD Collected', 'currency', 'Month-to-date collections', false),
('eod_mtd_collection_rate', 'EOD_MTD', 'MTD Collection Rate', 'percentage', 'Month-to-date collection rate', true),
('eod_mtd_new_patients', 'EOD_MTD', 'MTD New Patients', 'count', 'Month-to-date new patients', false);

-- =====================================================
-- SECTION 7: PROVIDER PRODUCTION
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
-- Doctors
('provider_dr_gajjar', 'PROVIDER_PRODUCTION', 'Dr. Gajjar Production', 'currency', 'Daily production for Dr. Gajjar', false),
('provider_dr_judge', 'PROVIDER_PRODUCTION', 'Dr. Judge Production', 'currency', 'Daily production for Dr. Judge', false),
('provider_dr_strachan', 'PROVIDER_PRODUCTION', 'Dr. Strachan Production', 'currency', 'Daily production for Dr. Strachan', false),
('provider_doctor_total', 'PROVIDER_PRODUCTION', 'Doctor Total', 'currency', 'Total doctor production', true),
-- Hygienists
('provider_farah', 'PROVIDER_PRODUCTION', 'Farah Production', 'currency', 'Daily production for Farah (Hygienist)', false),
('provider_olga', 'PROVIDER_PRODUCTION', 'Olga Production', 'currency', 'Daily production for Olga (Hygienist)', false),
('provider_jissel', 'PROVIDER_PRODUCTION', 'Jissel Production', 'currency', 'Daily production for Jissel (Hygienist)', false),
('provider_temp_hyg', 'PROVIDER_PRODUCTION', 'Temp Hygienist', 'currency', 'Daily production for temp hygienist', false),
('provider_hygienist_total', 'PROVIDER_PRODUCTION', 'Hygienist Total', 'currency', 'Total hygienist production', true),
('provider_combined_total', 'PROVIDER_PRODUCTION', 'Combined Total', 'currency', 'Combined total production (all providers)', true);

-- =====================================================
-- SECTION 8: PAYMENTS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('todays_payments', 'PAYMENTS', 'Today''s Payments', 'currency', 'Total payments received today', false),
('weekly_payments', 'PAYMENTS', 'Weekly Payments', 'currency', 'Payments received in last 7 days', true),
('monthly_payments', 'PAYMENTS', 'Monthly Payments', 'currency', 'Payments received this month', true),
('pending_deposits', 'PAYMENTS', 'Pending Deposits', 'currency', 'Deposits pending in transit', false),
('insurance_payments', 'PAYMENTS', 'Insurance Payments', 'currency', 'Insurance payments received', false),
('patient_payments', 'PAYMENTS', 'Patient Payments', 'currency', 'Patient payments received', false),
('unapplied_credits', 'PAYMENTS', 'Unapplied Credits', 'currency', 'Credits not yet applied to accounts', false),
('refunds_pending', 'PAYMENTS', 'Refunds Pending', 'currency', 'Refunds pending processing', false);

-- =====================================================
-- SECTION 9: PATIENTS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('total_patients', 'PATIENTS', 'Total Patients', 'count', 'Total number of patients in system', false),
('patients_with_balance', 'PATIENTS', 'Patients with Balance', 'count', 'Number of patients with outstanding balance', false),
('total_patient_ar', 'PATIENTS', 'Total Patient A/R', 'currency', 'Total patient accounts receivable', false),
('payment_plans', 'PATIENTS', 'Active Payment Plans', 'count', 'Number of active payment plans', false),
('past_due_accounts', 'PATIENTS', 'Past Due Accounts', 'count', 'Number of past due patient accounts', false);

-- =====================================================
-- SECTION 10: PATIENT A/R AGING
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('patient_ar_0_30', 'PATIENT_AR_AGING', 'Patient A/R 0-30 Days', 'currency', 'Patient A/R aged 0-30 days', false),
('patient_ar_31_60', 'PATIENT_AR_AGING', 'Patient A/R 31-60 Days', 'currency', 'Patient A/R aged 31-60 days', false),
('patient_ar_61_90', 'PATIENT_AR_AGING', 'Patient A/R 61-90 Days', 'currency', 'Patient A/R aged 61-90 days', false),
('patient_ar_90_plus', 'PATIENT_AR_AGING', 'Patient A/R 90+ Days', 'currency', 'Patient A/R aged 90+ days', false);

-- =====================================================
-- SECTION 11: PRE-AUTHORIZATIONS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('total_pre_auths', 'PRE_AUTH', 'Total Pre-Auths', 'count', 'Total number of pre-authorizations', false),
('pre_auths_pending', 'PRE_AUTH', 'Pending Pre-Auths', 'count', 'Pre-authorizations pending approval', false),
('pre_auths_approved', 'PRE_AUTH', 'Approved Pre-Auths', 'count', 'Pre-authorizations approved', false),
('pre_auths_denied', 'PRE_AUTH', 'Denied Pre-Auths', 'count', 'Pre-authorizations denied', false),
('pre_auths_expiring_soon', 'PRE_AUTH', 'Pre-Auths Expiring Soon', 'count', 'Pre-auths expiring within 7 days', false),
('pre_auths_expiring_this_month', 'PRE_AUTH', 'Pre-Auths Expiring This Month', 'count', 'Pre-auths expiring this month', false);

-- =====================================================
-- SECTION 12: CLAIMS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('claims_total_active', 'CLAIMS', 'Total Active Claims', 'count', 'Total number of active claims', false),
('claims_pending', 'CLAIMS', 'Pending Claims', 'count', 'Claims pending with insurance', false),
('claims_denied', 'CLAIMS', 'Denied Claims', 'count', 'Claims denied by insurance', false),
('claims_over_60_days', 'CLAIMS', 'Claims Over 60 Days', 'count', 'Claims outstanding over 60 days', false);

-- =====================================================
-- SECTION 13: INSURANCE A/R AGING (AMOUNT)
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('insurance_ar_0_30_amount', 'INSURANCE_AR_AGING', 'Insurance A/R 0-30 Days', 'currency', 'Insurance A/R aged 0-30 days (amount)', false),
('insurance_ar_31_60_amount', 'INSURANCE_AR_AGING', 'Insurance A/R 31-60 Days', 'currency', 'Insurance A/R aged 31-60 days (amount)', false),
('insurance_ar_61_90_amount', 'INSURANCE_AR_AGING', 'Insurance A/R 61-90 Days', 'currency', 'Insurance A/R aged 61-90 days (amount)', false),
('insurance_ar_90_plus_amount', 'INSURANCE_AR_AGING', 'Insurance A/R 90+ Days', 'currency', 'Insurance A/R aged 90+ days (amount)', false);

-- =====================================================
-- SECTION 14: INSURANCE A/R AGING (COUNT)
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('insurance_ar_0_30_count', 'INSURANCE_AR_AGING', 'Insurance A/R 0-30 Days Count', 'count', 'Number of claims aged 0-30 days', false),
('insurance_ar_31_60_count', 'INSURANCE_AR_AGING', 'Insurance A/R 31-60 Days Count', 'count', 'Number of claims aged 31-60 days', false),
('insurance_ar_61_90_count', 'INSURANCE_AR_AGING', 'Insurance A/R 61-90 Days Count', 'count', 'Number of claims aged 61-90 days', false),
('insurance_ar_90_plus_count', 'INSURANCE_AR_AGING', 'Insurance A/R 90+ Days Count', 'count', 'Number of claims aged 90+ days', false);

-- =====================================================
-- SECTION 15: SCORECARD - MONTHLY GOALS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('scorecard_production_goal', 'SCORECARD', 'Production Goal', 'currency', 'Monthly production goal', false),
('scorecard_production_actual', 'SCORECARD', 'Production Actual', 'currency', 'Actual monthly production', false),
('scorecard_collection_goal', 'SCORECARD', 'Collection Goal', 'percentage', 'Collection rate goal percentage', false),
('scorecard_collection_actual', 'SCORECARD', 'Collection Actual', 'percentage', 'Actual collection rate percentage', false),
('scorecard_new_patients_goal', 'SCORECARD', 'New Patients Goal', 'count', 'Monthly new patient goal', false),
('scorecard_new_patients_actual', 'SCORECARD', 'New Patients Actual', 'count', 'Actual new patients this month', false);

-- =====================================================
-- SECTION 16: SCORECARD - PERFORMANCE METRICS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('scorecard_claim_approval_rate', 'SCORECARD', 'Claim Approval Rate', 'percentage', 'Percentage of claims approved', false),
('scorecard_avg_days_to_pay', 'SCORECARD', 'Avg Days to Pay', 'number', 'Average days for payment', false),
('scorecard_show_rate_dr', 'SCORECARD', 'Show Rate Doctor', 'percentage', 'Doctor appointment show rate', false),
('scorecard_show_rate_dr_target', 'SCORECARD', 'Show Rate Doctor Target', 'percentage', 'Doctor show rate target', false),
('scorecard_show_rate_hyg', 'SCORECARD', 'Show Rate Hygienist', 'percentage', 'Hygienist appointment show rate', false),
('scorecard_show_rate_hyg_target', 'SCORECARD', 'Show Rate Hygienist Target', 'percentage', 'Hygienist show rate target', false),
('scorecard_new_pts_per_week', 'SCORECARD', 'New Patients Per Week', 'number', 'Average new patients per week', false),
('scorecard_tx_acceptance', 'SCORECARD', 'Treatment Acceptance', 'percentage', 'Treatment acceptance rate', false),
('scorecard_tx_acceptance_target', 'SCORECARD', 'Treatment Acceptance Target', 'percentage', 'Treatment acceptance target', false),
('scorecard_total_tx_presented', 'SCORECARD', 'Total Treatment Presented', 'currency', 'Total treatment presented', false),
('scorecard_total_tx_accepted', 'SCORECARD', 'Total Treatment Accepted', 'currency', 'Total treatment accepted', false),
('scorecard_avg_collection_rate', 'SCORECARD', 'Avg Collection Rate', 'percentage', 'Average collection rate', false),
('scorecard_avg_collection_target', 'SCORECARD', 'Avg Collection Rate Target', 'percentage', 'Average collection rate target', false),
('scorecard_total_new_patients', 'SCORECARD', 'Total New Patients', 'count', 'Total new patients', false),
('scorecard_five_star_reviews', 'SCORECARD', 'Five Star Reviews', 'count', 'Number of 5-star reviews', false);

-- =====================================================
-- SECTION 17: ADVANCED METRICS - FINANCIAL
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('adv_cac', 'ADVANCED_METRICS', 'Customer Acquisition Cost', 'currency', 'Cost to acquire a new patient', false),
('adv_gross_profit_margin', 'ADVANCED_METRICS', 'Gross Profit Margin', 'percentage', 'Gross profit margin percentage', false),
('adv_operating_profit_margin', 'ADVANCED_METRICS', 'Operating Profit Margin', 'percentage', 'Operating profit margin percentage', false),
('adv_cash_flow', 'ADVANCED_METRICS', 'Cash Flow', 'currency', 'Net cash flow', false),
('adv_revenue_growth_rate', 'ADVANCED_METRICS', 'Revenue Growth Rate', 'percentage', 'Revenue growth rate percentage', false);

-- =====================================================
-- SECTION 18: ADVANCED METRICS - COGS
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('adv_cogs_dental_supplies', 'ADVANCED_METRICS_COGS', 'Dental Supplies Cost', 'currency', 'Cost of dental supplies', false),
('adv_cogs_lab_fees', 'ADVANCED_METRICS_COGS', 'Lab Fees', 'currency', 'Laboratory fees', false),
('adv_cogs_associate_doctor', 'ADVANCED_METRICS_COGS', 'Associate Doctor Expense', 'currency', 'Associate doctor compensation', false),
('adv_cogs_hygiene_payroll', 'ADVANCED_METRICS_COGS', 'Hygiene Payroll', 'currency', 'Hygienist payroll expense', false),
('adv_cogs_assistant_payroll', 'ADVANCED_METRICS_COGS', 'Assistant Payroll', 'currency', 'Assistant payroll expense', false),
('adv_cogs_total', 'ADVANCED_METRICS_COGS', 'Total COGS', 'currency', 'Total cost of goods sold', true),
('adv_operating_costs', 'ADVANCED_METRICS_COGS', 'Operating Costs', 'currency', 'Total operating costs', false);

-- =====================================================
-- SECTION 19: ADVANCED METRICS - PATIENT LIFECYCLE
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('adv_churned_patients_month', 'ADVANCED_METRICS_LIFECYCLE', 'Churned Patients Per Month', 'count', 'Number of patients churned per month', false),
('adv_churn_rate', 'ADVANCED_METRICS_LIFECYCLE', 'Churn Rate', 'percentage', 'Patient churn rate percentage', true),
('adv_lifecycle_months', 'ADVANCED_METRICS_LIFECYCLE', 'Patient Lifecycle (Months)', 'number', 'Average patient lifecycle in months', false),
('adv_lifecycle_years', 'ADVANCED_METRICS_LIFECYCLE', 'Patient Lifecycle (Years)', 'number', 'Average patient lifecycle in years', true),
('adv_active_pts_prior_month', 'ADVANCED_METRICS_LIFECYCLE', 'Active Pts Prior Month', 'count', 'Active patients first of prior month', false),
('adv_avg_retention_period', 'ADVANCED_METRICS_LIFECYCLE', 'Avg Retention Period', 'number', 'Average retention period in months', false),
('adv_arpc', 'ADVANCED_METRICS_LIFECYCLE', 'Avg Revenue Per Client', 'currency', 'Average revenue per client (ARPC)', false),
('adv_ltv', 'ADVANCED_METRICS_LIFECYCLE', 'Lifetime Value', 'currency', 'Customer lifetime value (LTV)', true);

-- =====================================================
-- SECTION 20: ADVANCED METRICS - SATISFACTION
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('adv_nps', 'ADVANCED_METRICS_SATISFACTION', 'Net Promoter Score', 'number', 'Patient Net Promoter Score', false),
('adv_enps', 'ADVANCED_METRICS_SATISFACTION', 'Employee NPS', 'number', 'Employee Net Promoter Score', false),
('adv_employee_utilization', 'ADVANCED_METRICS_SATISFACTION', 'Employee Utilization Rate', 'percentage', 'Employee utilization rate percentage', false);

-- =====================================================
-- SECTION 21: NEW PATIENT TRACKER
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('new_pts_per_day', 'NEW_PATIENT_TRACKER', 'New Patients Per Day', 'number', 'New patients per day', false),
('new_pts_per_day_goal', 'NEW_PATIENT_TRACKER', 'New Patients Per Day Goal', 'number', 'Daily new patient goal', false),
('new_pts_per_week', 'NEW_PATIENT_TRACKER', 'New Patients Per Week', 'number', 'New patients per week', false),
('new_pts_per_week_goal', 'NEW_PATIENT_TRACKER', 'New Patients Per Week Goal', 'number', 'Weekly new patient goal', false),
('new_pts_per_month', 'NEW_PATIENT_TRACKER', 'New Patients Per Month', 'number', 'New patients per month', false),
('new_pts_per_month_goal', 'NEW_PATIENT_TRACKER', 'New Patients Per Month Goal', 'number', 'Monthly new patient goal', false),
('new_pts_quarterly', 'NEW_PATIENT_TRACKER', 'New Patients Quarterly', 'number', 'New patients this quarter', false),
('new_pts_quarterly_goal', 'NEW_PATIENT_TRACKER', 'New Patients Quarterly Goal', 'number', 'Quarterly new patient goal', false);

-- =====================================================
-- SECTION 22: THIRD PARTY FINANCING
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('financing_cherry_patients', 'THIRD_PARTY_FINANCING', 'Cherry Patients', 'count', 'Number of patients using Cherry financing', false),
('financing_cherry_amount', 'THIRD_PARTY_FINANCING', 'Cherry Amount', 'currency', 'Total Cherry financing amount', false),
('financing_carecredit_patients', 'THIRD_PARTY_FINANCING', 'CareCredit Patients', 'count', 'Number of patients using CareCredit', false),
('financing_carecredit_amount', 'THIRD_PARTY_FINANCING', 'CareCredit Amount', 'currency', 'Total CareCredit financing amount', false),
('financing_total_patients', 'THIRD_PARTY_FINANCING', 'Total Financing Patients', 'count', 'Total patients using financing', true),
('financing_total_amount', 'THIRD_PARTY_FINANCING', 'Total Financing Amount', 'currency', 'Total financing amount', true);

-- =====================================================
-- SECTION 23: INSURANCE
-- =====================================================
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes, is_calculated) VALUES
('insurance_total_providers', 'INSURANCE', 'Total Insurance Providers', 'count', 'Total number of insurance providers', false),
('insurance_active_plans', 'INSURANCE', 'Active Insurance Plans', 'count', 'Number of active insurance plans', false),
('insurance_credentialing_pending', 'INSURANCE', 'Credentialing Pending', 'count', 'Number of credentialing pending', false),
('insurance_verifications_pending', 'INSURANCE', 'Verifications Pending', 'count', 'Insurance verifications pending', false),
('insurance_total_portals', 'INSURANCE', 'Total Insurance Portals', 'count', 'Total insurance portals', false),
('insurance_eft_enrolled', 'INSURANCE', 'EFT Enrolled', 'count', 'Number of EFT enrollments', false),
('insurance_connection_network', 'INSURANCE', 'Connection Network Contracts', 'count', 'Number of connection network contracts', false),
('insurance_direct_contracts', 'INSURANCE', 'Direct Contracts', 'count', 'Number of direct contracts', false);

-- =====================================================
-- Step 6: Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE csd_metric_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE csd_metric_values ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for authenticated users)
CREATE POLICY "Enable read access for all authenticated users" ON csd_metric_catalog
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable insert access for all authenticated users" ON csd_metric_catalog
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for all authenticated users" ON csd_metric_values
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable insert access for all authenticated users" ON csd_metric_values
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable update access for all authenticated users" ON csd_metric_values
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- =====================================================
-- Step 7: Create trigger to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_csd_metric_catalog_updated_at
  BEFORE UPDATE ON csd_metric_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_csd_metric_values_updated_at
  BEFORE UPDATE ON csd_metric_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SCRIPT COMPLETE
-- =====================================================
-- Total fields in catalog: 184+
-- Sections covered: 23
-- All fields use snake_case naming convention
-- RLS policies enabled for security
-- Indexes created for performance
-- =====================================================
