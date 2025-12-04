# Metric Deletion Impact Analysis
**Date:** 2025-12-04

## ⚠️ CRITICAL: Active Dependencies Found

Several "D" metrics marked for deletion are **actively used** in the codebase. These cannot be deleted without code changes.

---

## Metrics with Active Code Dependencies

### 🔴 HIGH IMPACT - Cannot Delete Without Code Changes

#### 1. `pending_payments`
**Files Using:**
- `src/App.tsx:1036` - Expected field in DASHBOARD section
- `src/hooks/useMetrics.ts:227` - Used in dashboard KPI calculations

**Recommendation:**
- **Option A:** Remove from dashboard entirely if not needed
- **Option B:** Keep as automated metric (calculate from pending deposits + unapplied credits)

---

#### 2. `outstanding_ar`
**Files Using:**
- `src/App.tsx:1036` - Expected field in DASHBOARD section
- `src/services/aiInsights.ts:273, 285` - Used for AI insights generation
- `src/hooks/useMetrics.ts:136, 229` - Calculated from Insurance + Patient A/R totals

**Recommendation:**
- **KEEP as CALCULATED metric** - This is already auto-calculated in useMetrics.ts:
  ```typescript
  // Outstanding A/R is auto-calculated from Insurance + Patient A/R aging totals
  outstandingAR: 0, // Will be calculated below after aging data is loaded
  ```
- **Action:** Move to Category A (automated) instead of D (delete)

---

#### 3. `eod_unbilled_procedures`
**Files Using:**
- `src/services/actionItems.ts:125` - Fetched for action items
- `src/hooks/useEODMetrics.ts:160` - Displayed in EOD report

**Recommendation:**
- **Option A:** Remove from UI if team doesn't track this
- **Option B:** Automate from Open Dental API if available

---

#### 4. `eod_unapplied_payments`
**Files Using:**
- `src/hooks/useEODMetrics.ts:161` - Displayed in EOD report

**Recommendation:**
- **DELETE and use `unapplied_credits` instead** - These are duplicates
- Update useEODMetrics.ts to reference `unapplied_credits`

---

#### 5. `eod_failed_transactions`
**Files Using:**
- `src/hooks/useEODMetrics.ts:162` - Displayed in EOD report

**Recommendation:**
- If not actively monitored, remove from EOD display
- Or keep as manual entry if team wants to track it

---

#### 6. `eod_missed_appointments`
**Files Using:**
- `src/services/actionItems.ts:113` - Fetched for action items list

**Recommendation:**
- **Option A:** Remove if not needed
- **Option B:** Automate from appointments table (status='no_show')

---

#### 7. `pre_auths_expiring_soon` & `pre_auths_expiring_this_month`
**Files Using:**
- `src/App.tsx:1039` - Expected fields in PRE_AUTHS section
- `src/hooks/useMetrics.ts:261, 262` - Displayed in dashboard

**Recommendation:**
- **MERGE into `eod_preauths_expiring`** - All serve same purpose
- Keep only `eod_preauths_expiring` as the single source
- Remove these two and update code to use `eod_preauths_expiring`

---

### ✅ SAFE TO DELETE - No Code Dependencies

These metrics are NOT referenced in the codebase and can be safely deleted:

| field_key | Notes |
|-----------|-------|
| `adv_lifecycle_months` | Not calculated, not used |
| `adv_active_pts_prior_month` | Not tracked, not used |
| `adv_avg_retention_period` | Not calculated, not used |
| `adv_arpc` | Not calculated, not used |

---

## Required Code Changes Before Deletion

### File: `src/App.tsx`

**Line 1036:** Remove `pending_payments` and `outstanding_ar` from expected DASHBOARD fields
```typescript
// BEFORE
DASHBOARD: ['bam_current_revenue', 'bam_target_goal', 'practice_goal', 'collection_rate', 'active_patients', 'active_claims', 'pending_payments', 'outstanding_ar'],

// AFTER
DASHBOARD: ['bam_current_revenue', 'bam_target_goal', 'practice_goal', 'collection_rate', 'active_patients', 'active_claims'],
```

**Line 1039:** Remove `pre_auths_expiring_soon` and `pre_auths_expiring_this_month`
```typescript
// BEFORE
PRE_AUTHS: ['total_pre_auths', 'pre_auths_pending', 'pre_auths_approved', 'pre_auths_denied', 'pre_auths_expiring_soon', 'pre_auths_expiring_this_month'],

// AFTER
PRE_AUTHS: ['total_pre_auths', 'pre_auths_pending', 'pre_auths_approved', 'pre_auths_denied', 'eod_preauths_expiring'],
```

### File: `src/hooks/useMetrics.ts`

**Line 136:** Remove `outstanding_ar` from expected fields (it's auto-calculated)

**Line 227:** Remove `pendingPayments` or calculate it

**Lines 261-262:** Update to use `eod_preauths_expiring`:
```typescript
// BEFORE
expiringSoon: getMetricValue('pre_auths_expiring_soon'),
expiringThisMonth: getMetricValue('pre_auths_expiring_this_month'),

// AFTER
expiringSoon: getMetricValue('eod_preauths_expiring'),
```

### File: `src/hooks/useEODMetrics.ts`

**Lines 160-162:** Remove or update:
```typescript
// REMOVE these if not needed:
unbilledProcedures: getMetricValue('eod_unbilled_procedures'),
unappliedPayments: getMetricValue('eod_unapplied_payments'), // Use unapplied_credits instead
failedTransactions: getMetricValue('eod_failed_transactions'),
```

### File: `src/services/actionItems.ts`

**Lines 113, 125:** Remove queries for deleted metrics or update logic

### File: `src/services/aiInsights.ts`

**Lines 273, 285:** Replace `outstanding_ar` references with calculated value or remove insights

---

## Revised Deletion Strategy

### Phase 1: Code Cleanup (Do First)
1. Update all code references listed above
2. Test dashboard to ensure no broken UI
3. Commit changes

### Phase 2: Database Migration (Do Second)
1. Run SQL migration to remove deleted metrics from catalog
2. Archive old metric_values data (don't delete, just in case)
3. Verify dashboard still works

### Phase 3: Documentation
1. Update team procedures
2. Document which metrics are automated vs manual

---

## Summary

**Original "D" count:** 12 metrics
**Actually safe to delete:** 4 metrics
**Need code changes first:** 8 metrics
**Should be reclassified:** 1 metric (`outstanding_ar` → move to automated/calculated)
