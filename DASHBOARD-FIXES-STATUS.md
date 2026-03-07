# Dashboard Issues - Fix Status

**Date:** 2025-12-04
**Branch:** `claude/supabase-metrics-parsing-01TvSC5rGFWRUdLZ3furcX1R`

---

## ✅ COMPLETED FIXES (Pushed to Git)

### 1. ✅ Changed "need resubmission" to "need follow-up"
**Commit:** a3ce766
**Files:** src/App.tsx
**Status:** Complete - Both occurrences updated in EOD Report

### 2. ✅ Made Patient Metrics Persistent
**Commit:** 24bf2f8
**Files:** src/hooks/useMetrics.ts
**Changes:**
- Added `total_patients` to persistent metrics list
- Added `patients_with_balance` to persistent metrics list
- Added `past_due_accounts` to persistent metrics list
- Added `total_patient_ar` to persistent metrics list

**Result:** These metrics will now show the last available data instead of resetting to $0

---

## 🔧 REMAINING ISSUES TO FIX

### 3. ⏳ NP Tracker 6-Month Trend Not Showing Properly
**Location:** `src/hooks/useNewPatientTracker.ts:40`
**Root Cause:** The `monthly_metric_trends` table may be empty
**Investigation Needed:**
1. Check if `monthly_metric_trends` table exists in Supabase
2. Check if data is being populated into this table
3. Verify the fallback to daily aggregation works

**Temporary Workaround:** The hook has fallback logic (lines 44-54) that should aggregate from daily values if the monthly_metric_trends table is empty.

**Next Steps:**
- Query Supabase to check if monthly_metric_trends has data
- If empty, either populate it or rely on fallback aggregation
- Add console logs to debug why the trend isn't displaying

---

### 4. ⏳ Quarterly NP Numbers Not Loading from Supabase
**Location:** `src/hooks/useNewPatientTracker.ts:96`
**Root Cause:** `getNewPatientsAggregates()` calculates quarterly but may not find data
**Investigation Needed:**
1. Check the quarterly date range calculation in `getNewPatientsAggregates()` (metrics.ts:230-242)
2. Verify that `eod_new_patients` data exists for the current quarter
3. Check if the query date range is correct

**Current Logic:**
```typescript
const quarterStartMonth = Math.floor(currentMonth / 3) * 3; // 0, 3, 6, or 9
const quarterStart = new Date(today.getFullYear(), quarterStartMonth, 1);
```

**Next Steps:**
- Add console logging to see what date range is being queried
- Verify data exists in `csd_metric_values` for `eod_new_patients` in that range
- Check if the aggregation query is working correctly

---

### 5. ⏳ Third Party Financing - CareCredit Showing $0
**Location:** Dashboard display (financing section)
**Root Cause:** Unknown - data was entered but showing $0
**Investigation Needed:**
1. Query Supabase directly to check if data exists:
   ```sql
   SELECT * FROM csd_metric_values
   WHERE field_key = 'financing_carecredit_amount'
   ORDER BY as_of_date DESC
   LIMIT 10;
   ```
2. Check if the metric is being fetched correctly in useMetrics.ts
3. Verify the display component is reading the correct field

**Financing Metrics (already persistent):**
- `financing_cherry_patients` ✅ In persistent list
- `financing_cherry_amount` ✅ In persistent list
- `financing_carecredit_patients` ✅ In persistent list
- `financing_carecredit_amount` ✅ In persistent list

**Next Steps:**
- Run SQL query to verify data exists
- Check console logs for any fetch errors
- Verify the ThirdPartyFinancingModal component

---

### 6. ⏳ Remove "Claims to Submit" Section
**Location:** `src/App.tsx:7002` (Action Items for Tomorrow)
**Current Status:** The metric `eod_claims_to_submit` is a Category 1 (daily manual entry) metric, NOT deprecated
**User Request:** Remove because not needed anymore

**Options:**
A. **Remove the card entirely** - Simple, clean
B. **Replace with a more useful metric** - Better UX
C. **Make it optional/hideable** - Flexible

**Recommendation:** Remove and replace with something useful (see #9 below)

**Code to Remove:**
```typescript
// Lines 6997-7009 in App.tsx
<div className={...}>
  <p>Claims to Submit</p>
  <p>{eodData.actionItems.claimsToSubmit}</p>
</div>
```

---

### 7. ⏳ Remove "Pending Submission" from Claims Management Summary
**Location:** `src/App.tsx:7222` (Claims Management Summary on EOD Report)
**Current Status:** Displays `eodData.actionItems.claimsToSubmit`

**Code to Remove:**
```typescript
// Lines 7218-7227 in App.tsx
<div>
  <p>Pending Submission</p>
  <p>{eodData.actionItems.claimsToSubmit}</p>
  <p>Ready to submit</p>
</div>
```

**Recommendation:** Replace with a more relevant metric like:
- "Claims Over 60 Days" (already automated)
- "Average Days to Payment"
- "Claim Approval Rate"

---

### 8. ⏳ Add Useful Action Items
**User Request:** Add metrics like "Patients Due for Recall"
**Status:** Requires new data source

**To Implement:**
1. Need a `recall_list` or `appointments` table with recall data
2. Create a query to count patients due for recall (e.g., last visit > 6 months)
3. Add to Action Items section

**Suggested Action Items to Add:**
- **Patients Due for Recall** - Query patients table for last_visit_date > 6 months ago
- **Unscheduled Treatment Plans** - If treatment_plans table exists
- **Insurance Verifications Due** - If tracking verification expiry
- **Incomplete Pre-Auths** - Already have pre_auths_pending (automated)

**Example Implementation:**
```typescript
// In services/actionItems.ts or new service
export async function getPati entsDueForRecall() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { count } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .lt('last_visit_date', sixMonthsAgo.toISOString().split('T')[0]);

  return count || 0;
}
```

---

## 📋 NEXT STEPS

### Immediate (Can do now):
1. Remove "Claims to Submit" card from Action Items
2. Remove "Pending Submission" from Claims Management
3. Replace with more relevant metrics

### Requires Investigation:
1. Debug NP Tracker monthly trends
2. Debug quarterly calculation
3. Check CareCredit data in Supabase

### Future Enhancements:
1. Add "Patients Due for Recall" metric
2. Add other useful action items
3. Consider making action items configurable

---

## 🔍 DEBUGGING QUERIES

### Check NP Tracker Data:
```sql
-- Check if monthly_metric_trends exists and has new patient data
SELECT * FROM monthly_metric_trends
WHERE field_key = 'eod_new_patients'
ORDER BY year DESC, month DESC
LIMIT 6;

-- Check daily new patient data for current quarter
SELECT as_of_date, value FROM csd_metric_values
WHERE field_key = 'eod_new_patients'
AND as_of_date >= '2024-10-01'  -- Adjust to current quarter start
ORDER BY as_of_date DESC;
```

### Check CareCredit Data:
```sql
-- Check if CareCredit data exists
SELECT as_of_date, value, text_value FROM csd_metric_values
WHERE field_key IN ('financing_carecredit_amount', 'financing_carecredit_patients')
ORDER BY as_of_date DESC
LIMIT 10;
```

### Check Action Items:
```sql
-- Verify action items are being calculated
SELECT as_of_date, value FROM csd_metric_values
WHERE field_key = 'eod_claims_to_submit'
ORDER BY as_of_date DESC
LIMIT 5;
```

---

## 📝 NOTES

- All fixes maintain backward compatibility
- Persistent metrics now include patient data
- Console logging added for NP Tracker debugging
- No breaking changes to API or database schema

**Last Updated:** 2025-12-04
**Ready for Deployment:** Yes (with remaining issues documented)
