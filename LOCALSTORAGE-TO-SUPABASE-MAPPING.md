# localStorage to Supabase Field Mapping

## Overview
This document maps all localStorage fields to their corresponding Supabase field_keys in `csd_metric_catalog`.

---

## EOD Report Data (`eodData`)

### Daily Summary Fields
| localStorage Field | Supabase field_key | Data Type |
|-------------------|-------------------|-----------|
| `dailyProduction` | `eod_daily_production` | currency |
| `dailyProductionGoal` | `eod_daily_production_goal` | currency |
| `paymentsCollected` | `eod_payments_collected` | currency |
| `collectionRate` | `eod_collection_rate` | percentage |
| `insurancePayments` | `eod_insurance_payments` | currency |
| `patientPayments` | `eod_patient_payments` | currency |
| `patientsSeenToday` | `eod_patients_seen` | count |
| `newPatients` | `eod_new_patients` | count |
| `proceduresCompleted` | `eod_procedures_completed` | count |
| `unbilledProcedures` | `eod_unbilled_procedures` | count |
| `unappliedPayments` | `eod_unapplied_payments` | currency |
| `failedTransactions` | `eod_failed_transactions` | count |

### Payment Methods (`paymentMethods`)
| localStorage Field | Supabase field_key | Data Type |
|-------------------|-------------------|-----------|
| `paymentMethods.visa` | `eod_payment_visa` | currency |
| `paymentMethods.mastercard` | `eod_payment_mastercard` | currency |
| `paymentMethods.americanExpress` | `eod_payment_amex` | currency |
| `paymentMethods.discover` | `eod_payment_discover` | currency |
| `paymentMethods.cherry` | `eod_payment_cherry` | currency |
| `paymentMethods.careCredit` | `eod_payment_carecredit` | currency |
| `paymentMethods.insuranceCheck` | `eod_payment_insurance_check` | currency |
| `paymentMethods.otherCheck` | `eod_payment_other_check` | currency |
| `paymentMethods.cash` | `eod_payment_cash` | currency |
| `paymentMethods.eft` | `eod_payment_eft` | currency |

### Action Items (`actionItems`)
| localStorage Field | Supabase field_key | Data Type |
|-------------------|-------------------|-----------|
| `actionItems.claimsToSubmit` | `eod_claims_to_submit` | count |
| `actionItems.deniedClaimsToResubmit` | `eod_denied_claims_resubmit` | count |
| `actionItems.preAuthsExpiring` | `eod_preauths_expiring` | count |
| `actionItems.accountsNeedingFollowUp` | `eod_accounts_followup` | count |
| `actionItems.missedAppointments` | `eod_missed_appointments` | count |

### Month-to-Date Summary (`monthToDateSummary`)
| localStorage Field | Supabase field_key | Data Type |
|-------------------|-------------------|-----------|
| `monthToDateSummary.production` | `eod_mtd_production` | currency |
| `monthToDateSummary.productionGoal` | `eod_mtd_production_goal` | currency |
| `monthToDateSummary.collected` | `eod_mtd_collected` | currency |
| `monthToDateSummary.collectionRate` | `eod_mtd_collection_rate` | percentage |
| `monthToDateSummary.newPatients` | `eod_mtd_new_patients` | count |

---

## Provider Production Data (`dailyProductionByProvider`)

| localStorage Field | Supabase field_key | Data Type |
|-------------------|-------------------|-----------|
| `drGajjar` | `provider_dr_gajjar` | currency |
| `drJudge` | `provider_dr_judge` | currency |
| `drStrachan` | `provider_dr_strachan` | currency |
| `doctorTotal` | `provider_doctor_total` | currency (calculated) |
| `farah` | `provider_farah` | currency |
| `olga` | `provider_olga` | currency |
| `jissel` | `provider_jissel` | currency |
| `tempHyg` | `provider_temp_hyg` | currency |
| `hygienistTotal` | `provider_hygienist_total` | currency (calculated) |
| `combinedTotal` | `provider_combined_total` | currency (calculated) |

---

## Dashboard/Scorecard Data (Already using Supabase via `metricsData`)

These are already integrated and working:

| Dashboard Field | Supabase field_key | Status |
|----------------|-------------------|--------|
| BAM Current Revenue | `bam_current_revenue` | ✅ Working |
| BAM Target Goal | `bam_target_goal` | ✅ Working |
| Practice Goal | `practice_goal` | ✅ Working |
| Collection Rate | `collection_rate` | ✅ Working |
| Active Patients | `active_patients` | ✅ Working |
| Active Claims | `active_claims` | ✅ Working |
| Pending Payments | `pending_payments` | ✅ Working |
| Outstanding A/R | `outstanding_ar` | ✅ Working |

---

## Migration Strategy

### Phase 1: Create Helper Hooks
1. Create `useEODMetrics(date)` hook
2. Create `useProviderMetrics(date)` hook

### Phase 2: Transform Data
These hooks will:
- Fetch data from Supabase using the field_keys above
- Transform flat Supabase data into nested structure (e.g., `paymentMethods` object)
- Return data in the same shape as localStorage (minimal code changes needed)

### Phase 3: Update Components
- Replace `eodData` state with `useEODMetrics(dashboardDate)`
- Replace `dailyProductionByProvider` state with `useProviderMetrics(dashboardDate)`
- Remove all localStorage save/load logic

### Phase 4: Remove localStorage
- Delete `STORAGE_KEYS` constants
- Delete `saveDailyData()`, `getDailyData()`, etc.
- Remove daily reset logic

---

## Calculated Fields (Not Stored in Supabase)

These should be computed by the application:

| Field | Calculation |
|-------|-------------|
| `productionCollectedDifference` | `dailyProduction - paymentsCollected` |
| `collectionRate` | `(paymentsCollected / dailyProduction) * 100` |
| `doctorTotal` | `drGajjar + drJudge + drStrachan` |
| `hygienistTotal` | `farah + olga + jissel + tempHyg` |
| `combinedTotal` | `doctorTotal + hygienistTotal` |
| `eod_mtd_collection_rate` | `(mtd_collected / mtd_production) * 100` |

---

## Arrays/Complex Data (Not in Supabase Catalog)

These UI-specific data structures won't be migrated:

- `payments[]` - Individual payment transactions (consider separate table if needed)
- `topProcedures[]` - Top procedures list (consider separate table if needed)
- `reportDate` - Derived from date picker

---

## Summary

**Total Fields to Migrate:**
- EOD Report: 32 fields
- Provider Production: 10 fields
- **Total: 42 fields** moving from localStorage → Supabase

**Already in Supabase:**
- Dashboard/Scorecard: 8 fields ✅

**Next Step:** Create hooks to fetch and transform this data.
