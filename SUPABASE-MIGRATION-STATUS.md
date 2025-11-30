# Supabase Migration Status

## 🎯 Goal
Migrate ALL dashboard sections from localStorage to Supabase for centralized data management.

---

## ✅ Completed (Phase 1)

### 1. Created Mapping Documentation
- **File:** `LOCALSTORAGE-TO-SUPABASE-MAPPING.md`
- Maps all 42 localStorage fields to Supabase field_keys
- Documents calculated vs stored fields

### 2. Created Custom Hooks
- **File:** `src/hooks/useEODMetrics.ts` ✅
  - Fetches EOD Report data from Supabase
  - Transforms flat Supabase data into nested structure
  - Returns data in same shape as localStorage (minimal code changes)

- **File:** `src/hooks/useProviderMetrics.ts` ✅
  - Fetches Provider Production data from Supabase
  - Calculates totals (doctorTotal, hygienistTotal, combinedTotal)
  - Returns data in expected format

### 3. Integrated Hooks into App.tsx
- Added imports for useEODMetrics and useProviderMetrics
- Replaced localStorage state with Supabase hooks:
  ```typescript
  // OLD:
  const [eodData, setEodData] = useState(() => getDailyData() || getInitialEODData());

  // NEW:
  const { data: eodData, loading: eodLoading, error: eodError } = useEODMetrics(dashboardDate);
  ```

### 4. Disabled localStorage Logic
- Commented out daily reset useEffect
- Commented out auto-save useEffect

---

## ⚠️ Current Issues (Phase 2 - In Progress)

### Build Errors Found:
1. **Null Safety Issues** - `eodData` and `dailyProductionByProvider` can be null
   - Need to add null checks or default values throughout JSX

2. **Unused Setter Functions** - `setEodData` and `setDailyProductionByProvider` don't exist
   - Functions that update state need to be replaced with Supabase mutations
   - Affected functions:
     - `updateEODData()` - Used by form inputs
     - `updateDailyProduction()` - Used by provider inputs
     - `saveCurrentEODToHistory()` - No longer needed
     - `loadHistoricalEOD()` - No longer needed

3. **Unused Helper Functions** - Still declared but never called
   - `saveDailyData()`
   - `getDailyData()`
   - `getInitialEODData()`
   - `getInitialDailyProductionByProvider()`

---

## 🔧 Required Fixes (Phase 2)

### Fix 1: Add Null Checks
Replace all instances of:
```typescript
{eodData.dailyProduction}
```

With:
```typescript
{eodData?.dailyProduction ?? 0}
```

**Estimated locations:** ~70 places in App.tsx

### Fix 2: Comment Out/Remove Update Functions
These functions try to use `setEodData` which doesn't exist:
- Line 410: `updateEODData()`
- Line 418: `updateDailyProduction()`
- Line 426: `saveCurrentEODToHistory()`
- Line 437: `loadHistoricalEOD()`

**Solution:** Comment them out for now. Forms will be read-only until we implement Supabase mutations.

### Fix 3: Remove Unused Functions
Delete or comment out:
- Lines 249-276: `saveDailyData()`, `getDailyData()`
- Lines 279-322: `getInitialEODData()`
- Lines 324-335: `getInitialDailyProductionByProvider()`

---

## 📋 Next Steps (Phase 3)

### 1. Make Dashboard Read-Only (Quick Win)
- Apply null checks throughout
- Comment out update functions
- Dashboard displays Supabase data correctly
- **Result:** Can VIEW all data from Supabase, but can't EDIT yet

### 2. Implement Data Entry via CSV Upload
- Create CSV template with all manual-entry fields
- User fills out CSV daily
- Upload CSV to Supabase directly (or via import tool)
- **Result:** Easy bulk data entry

### 3. (Optional) Add Form Editing
- Create Supabase mutation functions
- Replace `updateEODData()` with `updateMetricInSupabase()`
- Allow inline editing in dashboard
- **Result:** Can edit individual fields in UI

---

## 🎯 Immediate Action Plan

### Option A: Quick Fix (Recommended)
1. Add `??` null coalescing to all `eodData` and `dailyProductionByProvider` references
2. Comment out the 4 update functions
3. Build and test
4. Dashboard becomes READ-ONLY but fully functional
5. Move to CSV upload for data entry

### Option B: Full Fix
1. Do Option A first
2. Create Supabase mutation service
3. Replace update functions with Supabase calls
4. Re-enable form editing
5. Remove all localStorage code completely

---

## 📊 Current State

```
✅ Hooks created and working
✅ Data fetches from Supabase
⚠️  Build errors due to null checks needed
⚠️  Update functions broken (use non-existent setters)
❌ Forms can't save changes yet
❌ localStorage still present (commented out)
```

---

## 🚀 Quick Start to Fix

Run this to see all errors:
```bash
npm run build
```

To fix the "possibly null" errors, you can either:

1. **Add nullish coalescing everywhere** (tedious but safe):
   ```typescript
   // Before
   <span>{eodData.dailyProduction}</span>

   // After
   <span>{eodData?.dailyProduction ?? 0}</span>
   ```

2. **Add a loading state guard** (cleaner):
   ```typescript
   if (!eodData || !dailyProductionByProvider) {
     return <div>Loading...</div>;
   }

   // Now TypeScript knows they're not null
   return <div>{eodData.dailyProduction}</div>;
   ```

---

## 📁 Files Modified

- ✅ `src/hooks/useEODMetrics.ts` (created)
- ✅ `src/hooks/useProviderMetrics.ts` (created)
- ⚠️  `src/App.tsx` (partially migrated, has errors)
- ✅ `LOCALSTORAGE-TO-SUPABASE-MAPPING.md` (created)
- ⏳ CSV template (not yet created)

---

## 💡 Recommendation

I recommend **Option A (Quick Fix)** to get the dashboard working first, then create the CSV upload system for data entry. This gives you:
1. Working dashboard displaying Supabase data
2. Easy daily data entry via CSV
3. No complex form mutation logic needed immediately

Would you like me to:
1. **Apply the quick fixes** to get the dashboard working (Option A)?
2. **Create the CSV template** for data entry?
3. **Both**?
