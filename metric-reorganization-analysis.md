# Metric Reorganization Analysis
**Date:** 2025-12-04
**Purpose:** Reorganize csd_metric_catalog and csd_metric_values for improved data entry workflow

---

## Data Organization Summary

### Metrics by org_key Classification

#### **Category 1 - Manual Daily Entry (46 metrics)**
*These require daily manual entry from Open Dental*

| field_key | text_value | Section |
|-----------|------------|---------|
| bam_current_revenue | Current BAM cycle revenue | BAM_CYCLE |
| collection_rate | Collection rate percentage | DASHBOARD_KPI |
| active_patients | Active patient count | DASHBOARD_KPI |
| active_claims | Active claims count | DASHBOARD_KPI |
| eod_daily_production | Daily production amount | EOD_REPORT |
| eod_payments_collected | Total payments collected | EOD_REPORT |
| eod_insurance_payments | Insurance payments | EOD_REPORT |
| eod_patient_payments | Patient payments | EOD_REPORT |
| eod_patients_seen | Patients seen today | EOD_REPORT |
| eod_new_patients | New patients today | EOD_REPORT |
| eod_procedures_completed | Procedures completed | EOD_REPORT |
| eod_payment_visa | Visa payments | EOD_PAYMENT_METHODS |
| eod_payment_mastercard | Mastercard payments | EOD_PAYMENT_METHODS |
| eod_payment_amex | American Express payments | EOD_PAYMENT_METHODS |
| eod_payment_discover | Discover payments | EOD_PAYMENT_METHODS |
| eod_payment_cherry | Cherry financing | EOD_PAYMENT_METHODS |
| eod_payment_carecredit | CareCredit financing | EOD_PAYMENT_METHODS |
| eod_payment_insurance_check | Insurance check payments | EOD_PAYMENT_METHODS |
| eod_payment_other_check | Other check payments | EOD_PAYMENT_METHODS |
| eod_payment_cash | Cash payments | EOD_PAYMENT_METHODS |
| eod_payment_eft | EFT payments | EOD_PAYMENT_METHODS |
| eod_claims_to_submit | Claims ready to submit | EOD_ACTION_ITEMS |
| eod_mtd_production | Month-to-date production | EOD_MTD |
| eod_mtd_collected | MTD collected | EOD_MTD |
| eod_mtd_new_patients | MTD new patients | EOD_MTD |
| provider_dr_gajjar | Dr. Gajjar production | PROVIDER_PRODUCTION |
| provider_dr_judge | Dr. Judge production | PROVIDER_PRODUCTION |
| provider_dr_strachan | Dr. Strachan production | PROVIDER_PRODUCTION |
| provider_farah | Farah (hygienist) production | PROVIDER_PRODUCTION |
| provider_olga | Olga (hygienist) production | PROVIDER_PRODUCTION |
| provider_jissel | Jissel (hygienist) production | PROVIDER_PRODUCTION |
| provider_temp_hyg | Temp hygienist production | PROVIDER_PRODUCTION |
| todays_payments | Today's payments total | PAYMENTS |
| insurance_payments | Insurance payments | PAYMENTS |
| patient_payments | Patient payments | PAYMENTS |
| unapplied_credits | Unapplied credits | PAYMENTS |
| patients_with_balance | Patients with balance | PATIENTS |
| total_patient_ar | Total patient A/R | PATIENTS |
| past_due_accounts | Past due accounts | PATIENTS |
| patient_ar_0_30 | Patient A/R 0-30 days | PATIENT_AR_AGING |
| patient_ar_31_60 | Patient A/R 31-60 days | PATIENT_AR_AGING |
| patient_ar_61_90 | Patient A/R 61-90 days | PATIENT_AR_AGING |
| patient_ar_90_plus | Patient A/R 90+ days | PATIENT_AR_AGING |
| total_pre_auths | Total pre-authorizations | PRE_AUTH |
| insurance_ar_0_30_amount | Insurance A/R 0-30 days | INSURANCE_AR_AGING |
| insurance_ar_31_60_amount | Insurance A/R 31-60 days | INSURANCE_AR_AGING |
| insurance_ar_61_90_amount | Insurance A/R 61-90 days | INSURANCE_AR_AGING |
| insurance_ar_90_plus_amount | Insurance A/R 90+ days | INSURANCE_AR_AGING |
| insurance_ar_0_30_count | Claims 0-30 days count | INSURANCE_AR_AGING |
| insurance_ar_31_60_count | Claims 31-60 days count | INSURANCE_AR_AGING |
| insurance_ar_61_90_count | Claims 61-90 days count | INSURANCE_AR_AGING |
| insurance_ar_90_plus_count | Claims 90+ days count | INSURANCE_AR_AGING |
| scorecard_production_actual | Actual production | SCORECARD |
| scorecard_collection_actual | Actual collection rate | SCORECARD |
| scorecard_new_patients_actual | Actual new patients | SCORECARD |
| scorecard_show_rate_dr | Doctor show rate | SCORECARD |
| scorecard_show_rate_hyg | Hygienist show rate | SCORECARD |
| new_pts_per_day | New patients per day | NEW_PATIENT_TRACKER |
| new_pts_per_week | New patients per week | NEW_PATIENT_TRACKER |
| new_pts_per_month | New patients per month | NEW_PATIENT_TRACKER |
| new_pts_quarterly | New patients quarterly | NEW_PATIENT_TRACKER |

#### **Category 2 - Monthly Static Updates (38 metrics)**
*These stay static unless updated monthly*

| field_key | text_value | Section |
|-----------|------------|---------|
| bam_target_goal | BAM cycle target | BAM_CYCLE |
| practice_goal | Monthly practice goal | BAM_CYCLE |
| eod_daily_production_goal | Daily production goal | EOD_REPORT |
| eod_mtd_production_goal | MTD production goal | EOD_MTD |
| scorecard_production_goal | Monthly production goal | SCORECARD |
| scorecard_collection_goal | Collection goal percentage | SCORECARD |
| scorecard_new_patients_goal | New patients goal | SCORECARD |
| scorecard_show_rate_dr_target | Doctor show rate target | SCORECARD |
| scorecard_show_rate_hyg_target | Hygienist show rate target | SCORECARD |
| scorecard_tx_acceptance_target | Treatment acceptance target | SCORECARD |
| scorecard_avg_collection_target | Average collection target | SCORECARD |
| adv_cac | Customer acquisition cost | ADVANCED_METRICS |
| adv_gross_profit_margin | Gross profit margin % | ADVANCED_METRICS |
| adv_operating_profit_margin | Operating profit margin % | ADVANCED_METRICS |
| adv_cash_flow | Cash flow | ADVANCED_METRICS |
| adv_revenue_growth_rate | Revenue growth rate % | ADVANCED_METRICS |
| adv_cogs_dental_supplies | Dental supplies cost | ADVANCED_METRICS_COGS |
| adv_cogs_lab_fees | Lab fees | ADVANCED_METRICS_COGS |
| adv_cogs_associate_doctor | Associate doctor expense | ADVANCED_METRICS_COGS |
| adv_cogs_hygiene_payroll | Hygiene payroll | ADVANCED_METRICS_COGS |
| adv_cogs_assistant_payroll | Assistant payroll | ADVANCED_METRICS_COGS |
| adv_operating_costs | Operating costs | ADVANCED_METRICS_COGS |
| adv_churned_patients_month | Churned patients per month | ADVANCED_METRICS_LIFECYCLE |
| adv_nps | Net Promoter Score | ADVANCED_METRICS_SATISFACTION |
| adv_enps | Employee NPS | ADVANCED_METRICS_SATISFACTION |
| adv_employee_utilization | Employee utilization rate % | ADVANCED_METRICS_SATISFACTION |
| new_pts_per_day_goal | Daily new patient goal | NEW_PATIENT_TRACKER |
| new_pts_per_week_goal | Weekly new patient goal | NEW_PATIENT_TRACKER |
| new_pts_per_month_goal | Monthly new patient goal | NEW_PATIENT_TRACKER |
| new_pts_quarterly_goal | Quarterly new patient goal | NEW_PATIENT_TRACKER |
| insurance_total_providers | Total insurance providers | INSURANCE |
| insurance_active_plans | Active insurance plans | INSURANCE |
| insurance_total_portals | Total insurance portals | INSURANCE |
| insurance_eft_enrolled | EFT enrollments | INSURANCE |
| insurance_connection_network | Connection network contracts | INSURANCE |
| insurance_direct_contracts | Direct contracts | INSURANCE |

#### **Category A - Automated or Needs Automation (21 metrics)**
*These can/should be automated from existing data sources*

| field_key | text_value | Automation Status | Data Source |
|-----------|------------|-------------------|-------------|
| eod_denied_claims_resubmit | Denied claims to resubmit | **CAN AUTOMATE** | claims table (status='denied') |
| eod_preauths_expiring | Pre-auths expiring soon | **CAN AUTOMATE** | pre-auth table (expiration dates) |
| eod_accounts_followup | Accounts needing follow-up | **NEEDS AUTOMATION** | Custom business logic needed |
| pre_auths_pending | Pending pre-auths | **CAN AUTOMATE** | pre-auth table (status='pending') |
| pre_auths_approved | Approved pre-auths | **CAN AUTOMATE** | pre-auth table (status='approved') |
| pre_auths_denied | Denied pre-auths | **CAN AUTOMATE** | pre-auth table (status='denied') |
| claims_total_active | Total active claims | **ALREADY AUTOMATED** | ✅ getClaimsTotals() |
| claims_pending | Pending claims | **ALREADY AUTOMATED** | ✅ getClaimsTotals() |
| claims_denied | Denied claims | **ALREADY AUTOMATED** | ✅ getClaimsTotals() |
| claims_over_60_days | Claims over 60 days | **ALREADY AUTOMATED** | ✅ getClaimsTotals() |
| scorecard_claim_approval_rate | Claim approval rate | **CAN AUTOMATE** | Calculate from claims data |
| scorecard_avg_days_to_pay | Average days to pay | **CAN AUTOMATE** | Calculate from claims/payments |
| scorecard_new_pts_per_week | New patients per week | **ALREADY AUTOMATED** | ✅ getNewPatientsAggregates() |
| scorecard_tx_acceptance | Treatment acceptance rate | **NEEDS AUTOMATION** | Requires treatment plan tracking |
| scorecard_total_tx_presented | Total treatment presented | **NEEDS AUTOMATION** | Requires treatment plan tracking |
| scorecard_total_tx_accepted | Total treatment accepted | **NEEDS AUTOMATION** | Requires treatment plan tracking |
| scorecard_avg_collection_rate | Average collection rate | **CAN AUTOMATE** | Calculate from historical data |
| scorecard_total_new_patients | Total new patients | **ALREADY AUTOMATED** | ✅ getNewPatientsAggregates() |
| scorecard_five_star_reviews | Five star reviews | **NEEDS AUTOMATION** | Integrate with review platform API |
| financing_cherry_patients | Cherry financing patients | **CAN AUTOMATE** | Query payment records |
| financing_cherry_amount | Cherry financing amount | **CAN AUTOMATE** | Query payment records |
| financing_carecredit_patients | CareCredit patients | **CAN AUTOMATE** | Query payment records |
| financing_carecredit_amount | CareCredit amount | **CAN AUTOMATE** | Query payment records |
| insurance_credentialing_pending | Credentialing pending | **NEEDS AUTOMATION** | Requires credentialing system |
| insurance_verifications_pending | Verifications pending | **NEEDS AUTOMATION** | Requires verification tracking |

#### **Category D - Delete/Deprecated (10 metrics)**
*These should be removed from the system*

| field_key | text_value | Reason for Deletion |
|-----------|------------|---------------------|
| pending_payments | Pending payments amount | Redundant/unused metric |
| outstanding_ar | Outstanding A/R | Redundant - covered by patient/insurance AR |
| eod_unbilled_procedures | Unbilled procedures | Not actively tracked |
| eod_unapplied_payments | Unapplied payments | Duplicate of unapplied_credits |
| eod_failed_transactions | Failed transactions | Not actively monitored |
| eod_missed_appointments | Missed appointments | Not actively tracked |
| pre_auths_expiring_soon | Pre-auths expiring soon (7 days) | Duplicate of eod_preauths_expiring |
| pre_auths_expiring_this_month | Pre-auths expiring this month | Not needed |
| adv_lifecycle_months | Patient lifecycle (months) | Not being calculated |
| adv_active_pts_prior_month | Active patients prior month | Not being tracked |
| adv_avg_retention_period | Average retention period (months) | Not being calculated |
| adv_arpc | Average revenue per client | Not being calculated |

#### **Unclassified (3 metrics)**
*No org_key assigned - needs clarification*

| field_key | text_value | Recommendation |
|-----------|------------|----------------|
| pending_deposits | Pending deposits | Should be Category 1 (daily) or automated |
| refunds_pending | Refunds pending | Should be Category 1 (daily) or automated |
| total_patients | Total patients in system | Should be automated from patients table |
| payment_plans | Active payment plans | Should be automated from payment_plans table |

---

## Automation Opportunities

### ✅ Already Automated (4 metrics)
These are already handled by existing functions in `src/services/metrics.ts`:
- `claims_total_active` via `getClaimsTotals()`
- `claims_pending` via `getClaimsTotals()`
- `claims_denied` via `getClaimsTotals()`
- `claims_over_60_days` via `getClaimsTotals()`
- `scorecard_new_pts_per_week` via `getNewPatientsAggregates()`
- `scorecard_total_new_patients` via `getNewPatientsAggregates()`

### 🟢 Easy to Automate (11 metrics)
Can be automated with simple database queries:
- **Pre-auth metrics**: Query pre_auth table by status
- **Claim metrics**: Calculate approval rates from claims table
- **Financing metrics**: Aggregate from payment records
- **Days to pay**: Calculate from claim submission to payment date

### 🟡 Medium Complexity (4 metrics)
Require business logic or external integrations:
- **Treatment acceptance tracking**: Needs treatment plan data structure
- **Accounts needing follow-up**: Needs business rules definition
- **Five star reviews**: Needs integration with Google/Yelp APIs

### 🔴 Not Feasible (2 metrics)
Require manual processes or external systems:
- **Credentialing pending**: External credentialing system needed
- **Verifications pending**: Manual verification tracking needed

---

## Impact Analysis - Deleting "D" Metrics

### Dashboard Dependencies Check

Before deleting, we need to verify these metrics aren't used in:
1. Dashboard component queries
2. Scorecard calculations
3. Report generation
4. Data visualizations

**Action Required**: Search codebase for references to each "D" metric before removal.

---

## Recommended Workflow Order

### For Daily Data Entry (Category 1 - Top of Form)

**Section 1: EOD Summary**
- Daily production
- Payments collected
- Patients seen
- New patients
- Procedures completed

**Section 2: Payment Methods**
- All credit card types
- Financing options
- Checks, cash, EFT

**Section 3: Provider Production**
- Doctor production (3)
- Hygienist production (4)

**Section 4: Financial Metrics**
- Collection rate
- MTD production
- MTD collected
- BAM current revenue

**Section 5: AR & Claims**
- Patient AR aging (4 buckets)
- Insurance AR aging (4 buckets + counts)
- Active patients/claims

### For Monthly Updates (Category 2 - Bottom of Form)

**Section 6: Goals & Targets**
- All production goals
- Collection targets
- Show rate targets
- New patient goals

**Section 7: Advanced Metrics**
- Financial metrics (CAC, margins, etc.)
- COGS breakdown
- Satisfaction scores
- Insurance contracts

---

## Next Steps

1. **Search codebase** for "D" metric references
2. **Create new SQL migration** to reorganize catalog
3. **Update data entry forms** to match new organization
4. **Implement automation** for "A" metrics (prioritize easy wins)
5. **Test dashboard** to ensure no broken dependencies
6. **Document** new data entry procedures for team
