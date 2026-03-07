# Patient A/R Implementation Plan
**Created**: December 16, 2024
**Status**: Phase 1 - Critical Features In Progress

---

## Implementation Status Overview

### ✅ COMPLETED (Foundation)
- [x] Database schema (6 tables + 1 view)
- [x] Database functions & triggers
- [x] RLS policies
- [x] Service layer (patientARService.new.ts)
- [x] TypeScript types
- [x] Basic UI structure (3 sub-tabs)
- [x] Data loading from Supabase
- [x] Add Patient A/R modal
- [x] Summary statistics cards
- [x] Basic approve/reject write-off workflow

### 🚧 PHASE 1 - CRITICAL (In Progress)
**Goal**: Make the system actually usable for day-to-day operations

#### 1. Add Contact Modal ⏳
**Priority**: CRITICAL
**Status**: Not Started
**Why**: Staff can't log patient contacts (core workflow)

**Requirements**:
- Contact type selection (1st, 2nd, Final, Collections, Manual)
- Auto-suggest next type based on history
- Contact date (defaults to today)
- Staff initials (auto-filled from logged-in user)
- Outcome dropdown (Promise to Pay, Payment Plan, Dispute, etc.)
- Notes field (required)
- Show calculated next contact date
- Validation: Can't add 2nd without 1st, etc.

**Database Integration**:
- INSERT into `patient_ar_contacts`
- Trigger auto-calculates `next_contact_due_date`
- Trigger updates `patient_ar.status` if final contact
- Trigger sets `moved_to_collections_date` if final contact

**Files to Modify**:
- `src/App.tsx` - Add modal component
- Need service function: Already exists `insertPatientARContact()`

---

#### 2. Record Payment Modal ⏳
**Priority**: CRITICAL
**Status**: Not Started
**Why**: Staff can't record payments (core workflow)

**Requirements**:
- Payment date (defaults to today)
- Payment amount (max = current_balance)
- Payment method dropdown (Cash, Check, CC, etc.)
- Reference number field (check #, transaction ID)
- Notes field (optional)
- Recorded by (auto-filled)
- Display: Current balance & after-payment balance (live calculation)
- Validation: Amount > 0 and <= current_balance

**Database Integration**:
- INSERT into `patient_ar_payments`
- Trigger auto-updates `patient_ar.current_balance`
- Trigger auto-sets `status='paid'` if balance reaches $0

**Files to Modify**:
- `src/App.tsx` - Add modal component
- Need service function: Already exists `insertPatientARPayment()`

---

#### 3. Filter Panel ⏳
**Priority**: HIGH
**Status**: Not Started
**Why**: Can't find specific records in large lists

**Requirements**:
- **Search**: Patient name/ID (text input with live filter)
- **Aging Bucket**: Dropdown [All, 0-30, 31-60, 61-90, 90+]
- **Status**: Dropdown [All, Active, Collections, Write-Off Suggested]
- **Next Contact**: Dropdown [All, Overdue, Due This Week]
- **Balance Range**: Min/Max inputs
- Clear all filters button

**Implementation**:
- Client-side filtering of loaded data
- OR server-side filtering with query params (better for large datasets)

**Files to Modify**:
- `src/App.tsx` - Add filter state and UI
- Add filtered data computation

---

#### 4. Bulk Actions ⏳
**Priority**: HIGH
**Status**: Not Started
**Why**: Staff need to process multiple records at once

**Requirements**:
- **Checkboxes**: First column in all tables
- **Select All**: Header checkbox
- **Selection Counter**: "X items selected"
- **Bulk Actions Dropdown** (enabled when 1+ selected):
  - Move to Collections (Active tab only)
  - Archive (all tabs)
  - Export to CSV (all tabs)
- **Confirmation modals** for destructive actions
- **Error handling** for partial failures

**Database Integration**:
- Bulk UPDATE for move to collections
- Bulk UPDATE for archive
- Service function: Already exists `batchMoveToCollections()`
- Service function: Already exists `batchArchivePatientAR()`

**Files to Modify**:
- `src/App.tsx` - Add selection state
- `src/App.tsx` - Add bulk action handlers
- Add CSV export utility function

---

## 📦 PHASE 2 - FULL FUNCTIONALITY (Planned)

### 5. Edit A/R Record
**Priority**: MEDIUM
**Files**: `src/App.tsx`
**Service**: `updatePatientAR()` - Already exists

### 6. View Details Modal
**Priority**: MEDIUM
**Show**: Full record + contact history + payment history
**Files**: `src/App.tsx`
**Service**: `getPatientARContacts()`, `getPatientARPayments()` - Already exist

### 7. Manual Write-Off Modal
**Priority**: MEDIUM
**For**: Collections tab manual write-offs
**Files**: `src/App.tsx`
**Database**: Direct UPDATE to `patient_ar` with admin check

### 8. Payment Plan Setup
**Priority**: LOW
**Files**: `src/App.tsx`
**Service**: `insertPaymentPlan()` - Already exists

---

## 🎨 PHASE 3 - POLISH (Future)

### 9. Dashboard Widgets
- Patient A/R Summary
- Aging Breakdown Chart
- Write-Off Suggestions Alert
- Contacts Due Today

### 10. Configure Rules Interface
- Admin modal to edit write-off rules
- Priority management
- Enable/disable rules

### 11. Export & Reporting
- CSV export with custom columns
- PDF reports
- Email reports

---

## 🤖 AUTOMATION SETUP (Future)

### Daily Write-Off Evaluation
**Method**: Supabase Edge Function or Cron Job
**Schedule**: Midnight daily
**Function**: Call `generate_write_off_suggestions()`
**Notifications**: Email admins if new suggestions

### Suggestion Expiration
**Schedule**: Daily
**Function**: Expire suggestions older than 30 days

---

## 📋 Implementation Order (Phase 1)

### Step 1: Add Contact Modal (60 min)
1. Create modal state (`showAddContactModal`, `selectedPatientARForContact`)
2. Import service function `insertPatientARContact`
3. Build modal form with all fields
4. Add validation logic
5. Handle form submission
6. Refresh data after success
7. Test contact type automation (1st → 2nd → Final → Collections)

### Step 2: Record Payment Modal (45 min)
1. Create modal state (`showRecordPaymentModal`, `selectedPatientARForPayment`)
2. Import service function `insertPatientARPayment`
3. Build modal form with all fields
4. Add live balance calculation
5. Add validation logic
6. Handle form submission
7. Refresh data after success
8. Test balance auto-update and paid status

### Step 3: Filter Panel (30 min)
1. Add filter state variables
2. Create filter UI component
3. Implement filter logic for each field
4. Add "Clear Filters" button
5. Apply filters to displayed data
6. Test all filter combinations

### Step 4: Bulk Actions (60 min)
1. Add selection state (`selectedRows: string[]`)
2. Add checkbox column to tables
3. Add "Select All" checkbox to headers
4. Add selection counter UI
5. Create bulk action dropdown
6. Implement `bulkMoveToCollections()`
7. Implement `bulkArchive()`
8. Implement `exportToCSV()`
9. Test with multiple selections

**Total Estimated Time**: ~3 hours

---

## 🔍 Testing Checklist (Phase 1)

### Add Contact Modal
- [ ] Can select contact type
- [ ] Next contact date calculates correctly (14/21/30 days)
- [ ] Can't add 2nd without 1st
- [ ] Final contact moves to collections
- [ ] Status updates correctly
- [ ] Data refreshes after save

### Record Payment Modal
- [ ] Can't enter amount > balance
- [ ] Balance preview calculates live
- [ ] Payment records successfully
- [ ] Balance auto-updates in list
- [ ] Status changes to "paid" when balance = $0
- [ ] Data refreshes after save

### Filter Panel
- [ ] Search filters by name/ID
- [ ] Aging bucket filter works
- [ ] Status filter works
- [ ] Multiple filters work together
- [ ] Clear filters resets all

### Bulk Actions
- [ ] Can select/deselect individual rows
- [ ] Select all works
- [ ] Bulk move to collections works
- [ ] Bulk archive works
- [ ] CSV export downloads correctly
- [ ] Partial failures handled gracefully

---

## 📦 Service Layer Functions (Already Available)

All service functions are already implemented in `patientARService.new.ts`:

✅ `insertPatientARContact()` - For Add Contact
✅ `insertPatientARPayment()` - For Record Payment
✅ `batchMoveToCollections()` - For bulk move
✅ `batchArchivePatientAR()` - For bulk archive
✅ `getPatientARContacts()` - For view history
✅ `getPatientARPayments()` - For view history
✅ `updatePatientAR()` - For edit record
✅ `insertPaymentPlan()` - For payment plans

**No new service functions needed for Phase 1!**

---

## 🚀 Ready to Implement

All prerequisites are in place:
- ✅ Database ready
- ✅ Service layer ready
- ✅ Types defined
- ✅ UI framework established

**Next**: Start implementing Phase 1 features in order.

---

## Notes

- All modals should match existing Claims/Pre-auths design
- All forms need employee initials capture
- All actions need confirmation dialogs
- All operations need error handling
- All changes need data refresh
