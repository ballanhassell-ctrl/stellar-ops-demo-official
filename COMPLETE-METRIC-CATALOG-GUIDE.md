# Complete CSD Metric Catalog Guide

## Overview
This guide provides a comprehensive reference for ALL 184+ metrics tracked in the Court Street Dental RCM Dashboard. Each field uses **snake_case** naming convention and is organized by section.

---

## Quick Start

### 1. Run the Recreation Script
```sql
-- In Supabase SQL Editor, run:
supabase-recreate-complete-catalog.sql
```

This will:
- ✅ Drop existing `csd_metric_catalog` and `csd_metric_values` tables
- ✅ Recreate tables with proper schema
- ✅ Insert all 184+ field definitions
- ✅ Enable Row Level Security (RLS)
- ✅ Create performance indexes
- ✅ Set up update triggers

### 2. Verify Installation
```sql
-- Check total fields created
SELECT COUNT(*) FROM csd_metric_catalog;
-- Expected: 184+

-- View all sections
SELECT DISTINCT section FROM csd_metric_catalog ORDER BY section;
-- Expected: 23 sections

-- Check for snake_case compliance
SELECT field_key FROM csd_metric_catalog WHERE field_key ~ '[A-Z]';
-- Expected: 0 results (no uppercase letters)
```

### 3. Insert Sample Data
```sql
-- Example: Insert EOD data for today
INSERT INTO csd_metric_values (as_of_date, field_key, value) VALUES
('2025-11-30', 'eod_daily_production', 15000),
('2025-11-30', 'eod_payments_collected', 12000),
('2025-11-30', 'eod_patients_seen', 45),
('2025-11-30', 'eod_new_patients', 3),
('2025-11-30', 'eod_payment_visa', 2500),
('2025-11-30', 'eod_payment_mastercard', 1800),
('2025-11-30', 'eod_payment_cherry', 3000),
('2025-11-30', 'eod_payment_carecredit', 2000),
('2025-11-30', 'eod_payment_cash', 500),
('2025-11-30', 'provider_dr_gajjar', 8000),
('2025-11-30', 'provider_dr_judge', 4500),
('2025-11-30', 'provider_farah', 2500)
ON CONFLICT (as_of_date, field_key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

---

## Section Breakdown

### 📊 SECTION 1: BAM Cycle & Practice Goals (5 fields)
Used in: **Scorecard > BAM Cycle Section**

| Field Key | Display Name | Type | Description |
|-----------|-------------|------|-------------|
| `bam_current_revenue` | BAM Current Revenue | currency | Current revenue for BAM cycle |
| `bam_target_goal` | BAM Target Goal | currency | Target revenue goal for BAM cycle |
| `practice_goal` | Practice Goal | currency | Monthly practice revenue goal |
| `bam_cycle_start` | BAM Cycle Start | date | Start date of current BAM cycle |
| `bam_cycle_end` | BAM Cycle End | date | End date of current BAM cycle |

**Usage Example:**
```javascript
// In dashboard, displays as:
BAM Current Revenue: $125,450
BAM Target Goal: $150,000
Progress: 83.6%
```

---

### 📈 SECTION 2: Dashboard KPIs (5 fields)
Used in: **Dashboard > Key Metrics Cards**

| Field Key | Display Name | Type | Description |
|-----------|-------------|------|-------------|
| `collection_rate` | Collection Rate | percentage | Percentage of production collected |
| `active_patients` | Active Patients | count | Number of active patients |
| `active_claims` | Active Claims | count | Number of active insurance claims |
| `pending_payments` | Pending Payments | currency | Total pending payments |
| `outstanding_ar` | Outstanding A/R | currency | Total outstanding accounts receivable |

---

### 📝 SECTION 3: EOD Report - Daily Summary (12 fields)
Used in: **EOD Report > Summary Section**

| Field Key | Display Name | Type | Calculated? |
|-----------|-------------|------|-------------|
| `eod_daily_production` | Daily Production | currency | No |
| `eod_daily_production_goal` | Daily Production Goal | currency | No |
| `eod_payments_collected` | Payments Collected | currency | No |
| `eod_collection_rate` | Collection Rate | percentage | Yes (collected/production) |
| `eod_insurance_payments` | Insurance Payments | currency | No |
| `eod_patient_payments` | Patient Payments | currency | No |
| `eod_patients_seen` | Patients Seen | count | No |
| `eod_new_patients` | New Patients | count | No |
| `eod_procedures_completed` | Procedures Completed | count | No |
| `eod_unbilled_procedures` | Unbilled Procedures | count | No |
| `eod_unapplied_payments` | Unapplied Payments | currency | No |
| `eod_failed_transactions` | Failed Transactions | count | No |

---

### 💳 SECTION 4: EOD Payment Methods (10 fields)
Used in: **EOD Report > Payment Methods Breakdown**

| Field Key | Display Name | Type | Category |
|-----------|-------------|------|----------|
| `eod_payment_visa` | Visa | currency | Credit Card |
| `eod_payment_mastercard` | Mastercard | currency | Credit Card |
| `eod_payment_amex` | American Express | currency | Credit Card |
| `eod_payment_discover` | Discover | currency | Credit Card |
| `eod_payment_cherry` | Cherry | currency | Patient Financing |
| `eod_payment_carecredit` | CareCredit | currency | Patient Financing |
| `eod_payment_insurance_check` | Insurance Check | currency | Checks |
| `eod_payment_other_check` | Other Check | currency | Checks |
| `eod_payment_cash` | Cash | currency | Other |
| `eod_payment_eft` | EFT | currency | Other |

**Important:** These should sum to `eod_payments_collected`:
```sql
-- Validation query
SELECT
  as_of_date,
  (eod_payment_visa + eod_payment_mastercard + eod_payment_amex +
   eod_payment_discover + eod_payment_cherry + eod_payment_carecredit +
   eod_payment_insurance_check + eod_payment_other_check +
   eod_payment_cash + eod_payment_eft) AS total_from_methods,
  eod_payments_collected
FROM csd_metric_values
WHERE as_of_date = '2025-11-30';
```

---

### ✅ SECTION 5: EOD Action Items (5 fields)
Used in: **EOD Report > Action Items Section**

| Field Key | Display Name | Type |
|-----------|-------------|------|
| `eod_claims_to_submit` | Claims to Submit | count |
| `eod_denied_claims_resubmit` | Denied Claims to Resubmit | count |
| `eod_preauths_expiring` | Pre-Auths Expiring | count |
| `eod_accounts_followup` | Accounts Needing Follow-Up | count |
| `eod_missed_appointments` | Missed Appointments | count |

---

### 📅 SECTION 6: EOD Month-to-Date (5 fields)
Used in: **EOD Report > MTD Summary**

| Field Key | Display Name | Type | Calculated? |
|-----------|-------------|------|-------------|
| `eod_mtd_production` | MTD Production | currency | No |
| `eod_mtd_production_goal` | MTD Production Goal | currency | No |
| `eod_mtd_collected` | MTD Collected | currency | No |
| `eod_mtd_collection_rate` | MTD Collection Rate | percentage | Yes |
| `eod_mtd_new_patients` | MTD New Patients | count | No |

---

### 👨‍⚕️ SECTION 7: Provider Production (10 fields)
Used in: **Provider Production Tab**

| Field Key | Display Name | Type | Calculated? |
|-----------|-------------|------|-------------|
| `provider_dr_gajjar` | Dr. Gajjar | currency | No |
| `provider_dr_judge` | Dr. Judge | currency | No |
| `provider_dr_strachan` | Dr. Strachan | currency | No |
| `provider_doctor_total` | Doctor Total | currency | Yes (sum of doctors) |
| `provider_farah` | Farah | currency | No |
| `provider_olga` | Olga | currency | No |
| `provider_jissel` | Jissel | currency | No |
| `provider_temp_hyg` | Temp Hygienist | currency | No |
| `provider_hygienist_total` | Hygienist Total | currency | Yes (sum of hygienists) |
| `provider_combined_total` | Combined Total | currency | Yes (all providers) |

---

### 💰 SECTION 8: Payments (8 fields)
Used in: **Payments Tab**

| Field Key | Display Name | Type |
|-----------|-------------|------|
| `todays_payments` | Today's Payments | currency |
| `weekly_payments` | Weekly Payments | currency |
| `monthly_payments` | Monthly Payments | currency |
| `pending_deposits` | Pending Deposits | currency |
| `insurance_payments` | Insurance Payments | currency |
| `patient_payments` | Patient Payments | currency |
| `unapplied_credits` | Unapplied Credits | currency |
| `refunds_pending` | Refunds Pending | currency |

---

### 👥 SECTION 9: Patients (5 fields)
Used in: **Patients Tab > Overview**

| Field Key | Display Name | Type |
|-----------|-------------|------|
| `total_patients` | Total Patients | count |
| `patients_with_balance` | Patients with Balance | count |
| `total_patient_ar` | Total Patient A/R | currency |
| `payment_plans` | Active Payment Plans | count |
| `past_due_accounts` | Past Due Accounts | count |

---

### 📊 SECTION 10: Patient A/R Aging (4 fields)
Used in: **Patients Tab > A/R Aging Chart**

| Field Key | Display Name | Type |
|-----------|-------------|------|
| `patient_ar_0_30` | Patient A/R 0-30 Days | currency |
| `patient_ar_31_60` | Patient A/R 31-60 Days | currency |
| `patient_ar_61_90` | Patient A/R 61-90 Days | currency |
| `patient_ar_90_plus` | Patient A/R 90+ Days | currency |

**Should sum to:** `total_patient_ar`

---

### 🔐 SECTION 11: Pre-Authorizations (6 fields)
Used in: **Pre-Auth Tab**

| Field Key | Display Name | Type |
|-----------|-------------|------|
| `total_pre_auths` | Total Pre-Auths | count |
| `pre_auths_pending` | Pending | count |
| `pre_auths_approved` | Approved | count |
| `pre_auths_denied` | Denied | count |
| `pre_auths_expiring_soon` | Expiring Soon (7 days) | count |
| `pre_auths_expiring_this_month` | Expiring This Month | count |

---

### 🏥 SECTION 12: Claims (4 fields)
Used in: **Claims Tab > Overview**

| Field Key | Display Name | Type |
|-----------|-------------|------|
| `claims_total_active` | Total Active Claims | count |
| `claims_pending` | Pending Claims | count |
| `claims_denied` | Denied Claims | count |
| `claims_over_60_days` | Claims Over 60 Days | count |

---

### 📈 SECTION 13-14: Insurance A/R Aging (8 fields)
Used in: **Claims Tab > Insurance A/R Aging**

#### Amount Fields:
| Field Key | Display Name | Type |
|-----------|-------------|------|
| `insurance_ar_0_30_amount` | Insurance A/R 0-30 Days | currency |
| `insurance_ar_31_60_amount` | Insurance A/R 31-60 Days | currency |
| `insurance_ar_61_90_amount` | Insurance A/R 61-90 Days | currency |
| `insurance_ar_90_plus_amount` | Insurance A/R 90+ Days | currency |

#### Count Fields:
| Field Key | Display Name | Type |
|-----------|-------------|------|
| `insurance_ar_0_30_count` | Claims 0-30 Days | count |
| `insurance_ar_31_60_count` | Claims 31-60 Days | count |
| `insurance_ar_61_90_count` | Claims 61-90 Days | count |
| `insurance_ar_90_plus_count` | Claims 90+ Days | count |

---

### 🎯 SECTION 15-16: Scorecard (21 fields)
Used in: **Scorecard Tab**

#### Goals:
| Field Key | Display Name | Type |
|-----------|-------------|------|
| `scorecard_production_goal` | Production Goal | currency |
| `scorecard_production_actual` | Production Actual | currency |
| `scorecard_collection_goal` | Collection Goal | percentage |
| `scorecard_collection_actual` | Collection Actual | percentage |
| `scorecard_new_patients_goal` | New Patients Goal | count |
| `scorecard_new_patients_actual` | New Patients Actual | count |

#### Performance Metrics:
| Field Key | Display Name | Type |
|-----------|-------------|------|
| `scorecard_claim_approval_rate` | Claim Approval Rate | percentage |
| `scorecard_avg_days_to_pay` | Avg Days to Pay | number |
| `scorecard_show_rate_dr` | Show Rate Doctor | percentage |
| `scorecard_show_rate_dr_target` | Show Rate Doctor Target | percentage |
| `scorecard_show_rate_hyg` | Show Rate Hygienist | percentage |
| `scorecard_show_rate_hyg_target` | Show Rate Hygienist Target | percentage |
| `scorecard_new_pts_per_week` | New Patients Per Week | number |
| `scorecard_tx_acceptance` | Treatment Acceptance | percentage |
| `scorecard_tx_acceptance_target` | Treatment Acceptance Target | percentage |
| `scorecard_total_tx_presented` | Total Treatment Presented | currency |
| `scorecard_total_tx_accepted` | Total Treatment Accepted | currency |
| `scorecard_avg_collection_rate` | Avg Collection Rate | percentage |
| `scorecard_avg_collection_target` | Avg Collection Rate Target | percentage |
| `scorecard_total_new_patients` | Total New Patients | count |
| `scorecard_five_star_reviews` | Five Star Reviews | count |

---

### 🚀 SECTION 17-20: Advanced Metrics (30 fields)
Used in: **Advanced Business Metrics Tab**

#### Financial (5 fields):
- `adv_cac` - Customer Acquisition Cost
- `adv_gross_profit_margin` - Gross Profit Margin
- `adv_operating_profit_margin` - Operating Profit Margin
- `adv_cash_flow` - Cash Flow
- `adv_revenue_growth_rate` - Revenue Growth Rate

#### COGS (7 fields):
- `adv_cogs_dental_supplies` - Dental Supplies Cost
- `adv_cogs_lab_fees` - Lab Fees
- `adv_cogs_associate_doctor` - Associate Doctor Expense
- `adv_cogs_hygiene_payroll` - Hygiene Payroll
- `adv_cogs_assistant_payroll` - Assistant Payroll
- `adv_cogs_total` - Total COGS (calculated)
- `adv_operating_costs` - Operating Costs

#### Patient Lifecycle (8 fields):
- `adv_churned_patients_month` - Churned Patients Per Month
- `adv_churn_rate` - Churn Rate (calculated)
- `adv_lifecycle_months` - Patient Lifecycle (Months)
- `adv_lifecycle_years` - Patient Lifecycle (Years, calculated)
- `adv_active_pts_prior_month` - Active Pts Prior Month
- `adv_avg_retention_period` - Avg Retention Period
- `adv_arpc` - Average Revenue Per Client
- `adv_ltv` - Lifetime Value (calculated)

#### Satisfaction (3 fields):
- `adv_nps` - Net Promoter Score
- `adv_enps` - Employee NPS
- `adv_employee_utilization` - Employee Utilization Rate

---

### 🆕 SECTION 21: New Patient Tracker (8 fields)
Used in: **New Patient Tracker Tab**

| Field Key | Display Name | Type |
|-----------|-------------|------|
| `new_pts_per_day` | New Patients Per Day | number |
| `new_pts_per_day_goal` | Per Day Goal | number |
| `new_pts_per_week` | New Patients Per Week | number |
| `new_pts_per_week_goal` | Per Week Goal | number |
| `new_pts_per_month` | New Patients Per Month | number |
| `new_pts_per_month_goal` | Per Month Goal | number |
| `new_pts_quarterly` | New Patients Quarterly | number |
| `new_pts_quarterly_goal` | Quarterly Goal | number |

---

### 💳 SECTION 22: Third Party Financing (6 fields)
Used in: **Third Party Financing Section**

| Field Key | Display Name | Type | Calculated? |
|-----------|-------------|------|-------------|
| `financing_cherry_patients` | Cherry Patients | count | No |
| `financing_cherry_amount` | Cherry Amount | currency | No |
| `financing_carecredit_patients` | CareCredit Patients | count | No |
| `financing_carecredit_amount` | CareCredit Amount | currency | No |
| `financing_total_patients` | Total Financing Patients | count | Yes |
| `financing_total_amount` | Total Financing Amount | currency | Yes |

---

### 🏢 SECTION 23: Insurance (8 fields)
Used in: **Insurance Tab**

| Field Key | Display Name | Type |
|-----------|-------------|------|
| `insurance_total_providers` | Total Insurance Providers | count |
| `insurance_active_plans` | Active Insurance Plans | count |
| `insurance_credentialing_pending` | Credentialing Pending | count |
| `insurance_verifications_pending` | Verifications Pending | count |
| `insurance_total_portals` | Total Insurance Portals | count |
| `insurance_eft_enrolled` | EFT Enrolled | count |
| `insurance_connection_network` | Connection Network Contracts | count |
| `insurance_direct_contracts` | Direct Contracts | count |

---

## Data Entry Best Practices

### Daily Entry Checklist
Every day, you should enter values for these core metrics:

```sql
-- EOD Report (Required Daily)
eod_daily_production
eod_payments_collected
eod_patients_seen
eod_new_patients
eod_payment_visa, eod_payment_mastercard, eod_payment_amex, eod_payment_discover
eod_payment_cherry, eod_payment_carecredit
eod_payment_cash, eod_payment_eft
eod_payment_insurance_check, eod_payment_other_check

-- Provider Production (Required Daily)
provider_dr_gajjar
provider_dr_judge
provider_dr_strachan
provider_farah
provider_olga
provider_jissel
```

### Weekly Entry Checklist
```sql
-- Update these weekly
scorecard_show_rate_dr
scorecard_show_rate_hyg
new_pts_per_week
scorecard_five_star_reviews
```

### Monthly Entry Checklist
```sql
-- Update these at month end
patient_ar_0_30, patient_ar_31_60, patient_ar_61_90, patient_ar_90_plus
insurance_ar_0_30_amount, insurance_ar_31_60_amount, etc.
adv_cogs_dental_supplies, adv_cogs_lab_fees, etc.
scorecard_production_actual
scorecard_collection_actual
```

---

## Common Queries

### Get All Metrics for a Specific Date
```sql
SELECT
  mc.section,
  mc.field_name,
  mv.value,
  mc.data_type
FROM csd_metric_values mv
JOIN csd_metric_catalog mc ON mv.field_key = mc.field_key
WHERE mv.as_of_date = '2025-11-30'
ORDER BY mc.section, mc.field_name;
```

### Check Data Completeness
```sql
SELECT
  as_of_date,
  COUNT(*) as fields_filled,
  (SELECT COUNT(*) FROM csd_metric_catalog WHERE is_calculated = FALSE) as total_manual_fields,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM csd_metric_catalog WHERE is_calculated = FALSE), 2) as completion_percentage
FROM csd_metric_values
WHERE as_of_date = '2025-11-30'
GROUP BY as_of_date;
```

### List All Calculated Fields
```sql
SELECT field_key, field_name, section, description_notes
FROM csd_metric_catalog
WHERE is_calculated = TRUE
ORDER BY section;
```

### Find Missing Daily Fields
```sql
SELECT
  mc.field_key,
  mc.field_name,
  mc.section
FROM csd_metric_catalog mc
LEFT JOIN csd_metric_values mv ON mc.field_key = mv.field_key
  AND mv.as_of_date = '2025-11-30'
WHERE mv.id IS NULL
  AND mc.is_calculated = FALSE
  AND mc.section LIKE 'EOD%'
ORDER BY mc.section, mc.field_name;
```

---

## Troubleshooting

### Issue: Data not showing in dashboard
**Solution:**
1. Verify field_key uses snake_case: `SELECT field_key FROM csd_metric_catalog WHERE field_key ~ '[A-Z]';`
2. Check data exists for date: `SELECT COUNT(*) FROM csd_metric_values WHERE as_of_date = '2025-11-30';`
3. Verify foreign key constraint: `SELECT * FROM csd_metric_values WHERE field_key NOT IN (SELECT field_key FROM csd_metric_catalog);`

### Issue: Calculated fields showing 0
**Solution:**
Calculated fields are marked with `is_calculated = TRUE` and should be computed by the application, not stored in Supabase.

### Issue: Duplicate entry errors
**Solution:**
The table has a UNIQUE constraint on (as_of_date, field_key). Use ON CONFLICT to update:
```sql
INSERT INTO csd_metric_values (as_of_date, field_key, value)
VALUES ('2025-11-30', 'eod_daily_production', 15000)
ON CONFLICT (as_of_date, field_key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

---

## Summary

- **Total Fields:** 184+
- **Sections:** 23
- **Naming Convention:** snake_case (all lowercase with underscores)
- **Data Types:** number, currency, percentage, text, date, count
- **Calculated Fields:** Marked with `is_calculated = TRUE` (computed by app, not stored)
- **Manual Entry Fields:** `is_calculated = FALSE` (must be entered/imported)

All fields are now properly structured and ready for data entry!
