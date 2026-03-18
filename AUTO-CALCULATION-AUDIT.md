# Auto-Calculation & Duplicate Data Entry Audit
## Stellar Dental Spa Dashboard - Complete Analysis

**Date:** December 3, 2025
**Purpose:** Identify all auto-calculable metrics to reduce manual data entry and eliminate duplicate work

---

## 📊 CURRENTLY AUTO-CALCULATED (Already Implemented)

### ✅ **Working Auto-Calculations:**

| Field | Calculated From | Location | Status |
|-------|----------------|----------|--------|
| **Financing Total Patients** | cherry_patients + carecredit_patients | useMetrics.ts:277 | ✅ Working |
| **Financing Total Amount** | cherry_amount + carecredit_amount | useMetrics.ts:278 | ✅ Working |
| **Total COGS** | Sum of 5 COGS components | useMetrics.ts:290-295 | ✅ Working |
| **Total Patient A/R** | Sum of 4 aging buckets (0-30, 31-60, 61-90, 90+) | useMetrics.ts:316-320 | ✅ Working |
| **Total Insurance A/R** | Sum of 4 aging buckets (0-30, 31-60, 61-90, 90+) | useMetrics.ts:323-327 | ✅ Working |
| **Outstanding A/R** | Total Insurance A/R + Total Patient A/R | useMetrics.ts:330 | ✅ Working |
| **MTD Production** | Sum of daily production for month | mtdCalculator.ts:14-53 | ✅ Working |
| **MTD Collected** | Sum of daily payments for month | mtdCalculator.ts:58-102 | ✅ Working |
| **MTD Collection Rate** | (MTD Collected / MTD Production) * 100 | mtdCalculator.ts:107-122 | ✅ Working |
| **MTD New Patients** | Sum of daily new patients for month | mtdCalculator.ts:127-162 | ✅ Working |
| **Weekly Payments** | Sum of last 7 days of payments | paymentAggregator.ts | ✅ Working |
| **Monthly Payments** | Sum of current month payments | paymentAggregator.ts | ✅ Working |

**Total Currently Auto-Calculated:** 12 fields

---

## 🎯 HIGH-PRIORITY AUTO-CALCULATION OPPORTUNITIES

### Category 1: Provider Production Totals

**Problem:** Manual entry of totals when individual providers are already tracked

| Field | Should Calculate From | Impact | Complexity |
|-------|----------------------|---------|------------|
| `provider_doctor_total` | Sum of all doctor production | HIGH | LOW |
| `provider_hygienist_total` | Sum of all hygienist production | HIGH | LOW |
| `provider_combined_total` | doctor_total + hygienist_total | HIGH | LOW |

**Recommendation:**
```javascript
// In useProviderMetrics or similar
providerTotals: {
  doctorTotal: doctorProduction.reduce((sum, p) => sum + p.production, 0),
  hygienistTotal: hygienistProduction.reduce((sum, p) => sum + p.production, 0),
  combinedTotal: doctorTotal + hygienistTotal
}
```

---

### Category 2: EOD Collection Rate

**Problem:** Collection rate is being manually entered when it's a simple calculation

| Field | Should Calculate From | Impact | Complexity |
|-------|----------------------|---------|------------|
| `eod_collection_rate` | (payments_collected / daily_production) * 100 | MEDIUM | LOW |

**Current Status:** Marked as `is_calculated: true` in catalog but NOT actually calculated in code

**Recommendation:**
```javascript
// In useEODMetrics.ts
collectionRate: dailyProduction > 0
  ? Math.round((paymentsCollected / dailyProduction) * 100)
  : 0
```

---

### Category 3: Payment Method Totals

**Problem:** Multiple payment methods tracked but totals not validated

| Field | Should Calculate From | Impact | Complexity |
|-------|----------------------|---------|------------|
| `eod_payments_collected` | Sum of all payment methods | HIGH | MEDIUM |
| Validation Check | Compare calculated total vs entered total | HIGH | LOW |

**Recommendation:**
```javascript
// Validation in EOD entry
const calculatedTotal =
  visa + mastercard + amex + discover +
  cherry + carecredit +
  insuranceCheck + otherCheck +
  cash + weave + ach + paypal;

if (Math.abs(calculatedTotal - enteredTotal) > 0.01) {
  console.warn('Payment total mismatch!', {
    calculated: calculatedTotal,
    entered: enteredTotal,
    difference: Math.abs(calculatedTotal - enteredTotal)
  });
}
```

---

### Category 4: Claims Totals

**Problem:** Active claims count should equal sum of statuses

| Field | Should Calculate From | Impact | Complexity |
|-------|----------------------|---------|------------|
| `active_claims` | pending + processing + waiting_for_info counts | MEDIUM | LOW |
| `claims_total_ar` | Sum of all claim amounts | MEDIUM | LOW |

**Recommendation:**
```javascript
// Auto-calculate from claims table records
activeClaims: claims.filter(c => !c.archived).length,
totalAR: claims.reduce((sum, c) => sum + c.amount, 0)
```

---

### Category 5: Patient Metrics

**Problem:** Duplicate tracking of patient counts

| Field | Should Calculate From | Impact | Complexity |
|-------|----------------------|---------|------------|
| `total_patients` | Count from patient records | LOW | MEDIUM |
| `patients_with_balance` | Count of patients where balance > 0 | MEDIUM | MEDIUM |
| `past_due_accounts` | Count of patients with past due > 0 | MEDIUM | MEDIUM |

**Recommendation:** These should query the patient management system directly rather than manual entry

---

## 🔄 DUPLICATE DATA ENTRY ELIMINATION

### Issue 1: Daily Production Entered Multiple Times

**Current State:**
- Entered in EOD Report as `eod_daily_production`
- Also tracked per provider
- Also summed for MTD

**Solution:**
1. ✅ **MTD Production** - Already auto-calculated from daily
2. ❌ **Daily Production** - Should auto-calculate from provider totals
3. ❌ **Provider Daily** - Should be only manual entry point

**Recommendation:**
```javascript
// Only enter provider production, auto-calc the rest
dailyProduction = sum(allProviderProduction);
mtdProduction = sum(dailyProduction for month);
```

---

### Issue 2: New Patients Tracked Redundantly

**Current State:**
- `eod_new_patients` - Daily count
- `new_pts_per_week` - Weekly aggregate
- `new_pts_per_month` - Monthly aggregate
- `new_pts_quarterly` - Quarterly aggregate

**Solution:**
1. ✅ **Weekly/Monthly/Quarterly** - Should be auto-aggregated from daily
2. ❌ **Current Implementation** - Manual entry for all 4

**Recommendation:**
```javascript
// Only enter daily, auto-aggregate the rest
newPatientsWeek = sum(last 7 days of eod_new_patients);
newPatientsMonth = sum(this month of eod_new_patients);
newPatientsQuarter = sum(last 3 months of eod_new_patients);
```

**Status:** Partially implemented in `getNewPatientsAggregates()` but NOT being called properly

---

### Issue 3: AR Aging Buckets vs Totals

**Current State:**
- Patient AR aging buckets entered manually (0-30, 31-60, 61-90, 90+)
- Total Patient AR entered manually
- Same for Insurance AR

**Solution:**
1. ✅ **Totals Already Auto-Calculated** from buckets (useMetrics.ts:316-330)
2. ✅ **No duplicate entry needed**

**Status:** **WORKING CORRECTLY** - Keep as is!

---

## 🚨 CRITICAL ISSUES FOUND

### Issue A: Scorecard Metrics Not Auto-Calculating

**Fields that SHOULD be calculated:**
- `scorecard_tx_acceptance` = (total_tx_accepted / total_tx_presented) * 100
- `financing_total_patients` ✅ Already done
- `financing_total_amount` ✅ Already done

### Issue B: Advanced Metrics Formulas Missing

**Fields marked as `is_calculated: true` but NO calculation logic:**
- `adv_churn_rate` - Should be: (churned_patients / active_patients) * 100
- `adv_lifecycle_years` - Should be: (1 / churn_rate)
- `adv_ltv` - Should be: (average_patient_value * lifecycle_years)

**Status:** ❌ **NOT IMPLEMENTED** - Needs formulas added

---

## 📋 IMPLEMENTATION PRIORITY LIST

### PHASE 1: Quick Wins (1-2 hours)
1. ✅ **Collection Rate Auto-Calc** - Add to useEODMetrics
2. ✅ **Provider Totals** - Sum doctor & hygienist production
3. ✅ **Payment Validation** - Add warning if totals don't match
4. ✅ **TX Acceptance Rate** - Calculate from presented/accepted

### PHASE 2: Aggregation Fixes (2-3 hours)
1. ✅ **New Patient Aggregates** - Fix weekly/monthly/quarterly auto-calc
2. ✅ **Weekly Scorecard Data** - Already done! ✅
3. ✅ **Claims Totals** - Auto-count from database

### PHASE 3: Advanced Calculations (3-4 hours)
1. ❌ **Churn Rate Formula** - Implement calculation
2. ❌ **Lifecycle Years** - Implement calculation
3. ❌ **LTV Formula** - Implement calculation
4. ❌ **Provider Production from Daily** - Reverse dependency

---

## 💡 RECOMMENDATIONS

### For Maximum Efficiency:

1. **Single Source of Truth Rule:**
   - Provider production = ONLY manual entry
   - Daily production = Auto-sum from providers
   - MTD production = Auto-sum from daily

2. **Aggregate from Daily:**
   - New patients: Daily → Weekly → Monthly → Quarterly
   - Payments: Daily → Weekly → Monthly
   - Production: Daily → MTD → Cycle

3. **Validation, Not Duplication:**
   - Don't ask for total if you have components
   - Calculate and compare, warn on mismatch
   - Show calculated vs entered for verification

4. **Smart Defaults:**
   - If only 1 provider worked, default their production to daily total
   - If payment methods sum to X, pre-fill total as X
   - Copy yesterday's values as starting point

---

## 📊 IMPACT ANALYSIS

### Fields That Can Be ELIMINATED from Manual Entry:

| Category | Count | Time Saved/Day |
|----------|-------|----------------|
| Totals & Sums | 8 fields | ~5 minutes |
| Aggregates (week/month) | 6 fields | ~3 minutes |
| Rates & Percentages | 5 fields | ~2 minutes |
| Validations | N/A | ~10 minutes (error prevention) |
| **TOTAL** | **19 fields** | **~20 minutes/day** |

**Annual Impact:** ~120 hours/year saved in data entry

---

## 🔧 NEXT STEPS

1. **Review this audit** with team
2. **Prioritize** which Phase to implement first
3. **Test** calculations with historical data
4. **Document** formulas for transparency
5. **Train** staff on new auto-calculation features

---

## ✅ APPROVAL CHECKLIST

- [ ] Reviewed by: ________________
- [ ] Phase 1 approved for implementation
- [ ] Phase 2 approved for implementation
- [ ] Phase 3 approved for implementation
- [ ] Formula accuracy verified
- [ ] Testing plan approved

---

**Document Version:** 1.0
**Last Updated:** December 3, 2025
**Next Review:** After Phase 1 implementation
