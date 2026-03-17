# Dashboard Issues - Analysis & Fixes

**Date:** 2025-12-04
**Status:** In Progress

---

## Issues Identified

### 1. NP Tracker 6-Month Trend Not Displaying
**Location:** `src/hooks/useNewPatientTracker.ts:40`
**Problem:** Hook tries to fetch from `monthly_metric_trends` table but may not have data
**Root Cause:** The `monthly_metric_trends` table may be empty or the new patient data isn't being aggregated
**Fix:** Ensure fallback to daily aggregation works correctly and check if table needs population

###2. Quarterly NP Numbers Not Loading
**Location:** `src/hooks/useNewPatientTracker.ts:96`
**Problem:** Uses `aggregates.quarterly` which may be 0
**Root Cause:** `getNewPatientsAggregates()` calculates based on calendar quarter but may not be finding data
**Fix:** Debug the quarterly calculation in `getNewPatientsAggregates()`

### 3. total_patients & patients_with_balance Should Be Persistent
**Location:** `src/hooks/useMetrics.ts`
**Problem:** These metrics aren't in the persistent metrics list, so they reset to 0
**Fix:** Add to persistentMetrics array

### 4. Action Items Should Be Persistent (Payment Processing)
**Location:** Various components
**Problem:** Action items reset to $0 instead of showing last available data
**Fix:** Make action item metrics persistent

### 5. Third Party Financing - CareCredit Showing $0
**Location:** Data entry or calculation issue
**Problem:** Data was entered but showing as $0
**Fix:** Check if `financing_carecredit_amount` is being queried correctly

### 6. Change "need resubmission" to "need follow-up"
**Location:** EOD Report component
**Fix:** Simple wording change

### 7. Remove "claims to submit"
**Location:** EOD Action Items
**Status:** CONFIRMED - This is `eod_claims_to_submit` which is a Category 1 (daily entry) metric
**Decision:** Keep it for now, but can make it optional if not needed

### 8. Remove "pending submission" from Claims Management
**Location:** EOD Report
**Fix:** Find and remove this metric

### 9. Add Useful Action Items (Patients Due for Recall)
**Location:** EOD Action Items
**Fix:** Add new calculated metrics based on recall_list table

---

## Implementation Plan

### Phase 1: Quick Fixes (Wording & Removals)
1. Change wording in EOD report
2. Remove pending submission from claims management

### Phase 2: Persistent Metrics
1. Add total_patients to persistent list
2. Add patients_with_balance to persistent list
3. Review action items persistence

### Phase 3: NP Tracker Fixes
1. Debug monthly trends query
2. Fix quarterly calculation
3. Ensure fallback data works

### Phase 4: New Features
1. Add patients due for recall metric
2. Enhance action items section
