# CRITICAL: Required Database Migrations

## Overview
You're getting 400 errors when saving claims because your database schema is missing required columns and constraints. You need to run these migrations in your Supabase SQL Editor.

## ⚠️ IMPORTANT: Run Migrations in Order

These migrations must be run in the exact order listed below. Do not skip any steps.

---

## Migration 1: Add Missing Claims Columns
**File:** `supabase/migrations/add_missing_claims_columns.sql`

**What it does:**
- Adds `date_of_service` column (required by the app)
- Adds `date_created` column (required by the app)
- Adds `created_by` column (required by the app)
- Adds `completed_by` column (required by the app)
- Updates status check constraints to match the app's status values
- Makes `handler` column nullable for backwards compatibility

**Why you need this:** The original schema was missing these columns, causing 400 errors when trying to insert claims.

**How to run:**
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Copy the entire contents of `supabase/migrations/add_missing_claims_columns.sql`
3. Paste into SQL Editor
4. Click **RUN**
5. Verify you see success messages

---

## Migration 2: Make Claim Number Nullable
**File:** `supabase/migrations/make_claim_number_nullable.sql`

**What it does:**
- Makes `claim_number` column nullable
- Removes NOT NULL constraint
- Adds partial unique index (only enforces uniqueness on non-null values)
- Allows multiple claims with NULL claim numbers (for Pending/Sent status)

**Why you need this:** Claims with "Pending" or "Sent" status don't have a claim number yet, but the database was requiring one.

**How to run:**
1. In Supabase SQL Editor
2. Copy the entire contents of `supabase/migrations/make_claim_number_nullable.sql`
3. Paste into SQL Editor
4. Click **RUN**
5. Verify you see success messages

---

## Migration 3 (Optional): Add Archive and Audit Features
**File:** `supabase/migrations/add_archive_and_audit_features.sql`

**What it does:**
- Adds archive functionality (if not already present)
- Creates audit history tables
- Sets up triggers to track all changes

**How to run:**
1. In Supabase SQL Editor
2. Copy the entire contents of `supabase/migrations/add_archive_and_audit_features.sql`
3. Paste into SQL Editor
4. Click **RUN**
5. Verify you see success messages (or "already exists" messages if you've run this before)

---

## Verification Steps

After running all migrations, verify the changes:

### 1. Check Claims Table Structure
Run this query to see all columns:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'claims'
ORDER BY ordinal_position;
```

**You should see these columns:**
- `id` (text, NOT NULL)
- `patient_id` (text, NOT NULL)
- `patient_name` (text, NOT NULL)
- `insurance_company` (text, NOT NULL)
- `claim_number` (text, **NULLABLE**) ✅
- `procedure_code` (text, NOT NULL)
- `claim_detail` (text, NOT NULL)
- `claim_amount` (numeric, NOT NULL)
- `status` (text, NOT NULL)
- `date_submitted` (date, NOT NULL)
- `date_of_service` (date, **NULLABLE**) ✅
- `date_created` (date, **NULLABLE**) ✅
- `follow_up_date` (date, NOT NULL)
- `handler` (text, **NULLABLE**) ✅
- `created_by` (text, **NULLABLE**) ✅
- `completed_by` (text, **NULLABLE**) ✅
- `notes` (text, NULLABLE)
- `aging_days` (integer, NOT NULL, default 0)
- `archived` (boolean, default false)
- `archived_at` (timestamp with time zone, NULLABLE)
- `archived_by` (text, NULLABLE)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### 2. Check Status Constraint
Run this query:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'claims'::regclass
AND conname LIKE '%status%';
```

**You should see:** Status values including 'Pending', 'Sent', 'Entered', 'Approved/Awaiting Payment', etc.

### 3. Test Inserting a Claim
Try inserting a test claim with NULL claim_number:
```sql
INSERT INTO claims (
  id, patient_id, patient_name, insurance_company, claim_number,
  procedure_code, claim_detail, claim_amount, status,
  date_submitted, date_of_service, date_created, follow_up_date,
  created_by, completed_by, notes, aging_days, archived
) VALUES (
  'TEST-001',
  'PT-001',
  'Test Patient',
  'Delta Dental',
  NULL,  -- This should work now!
  'D1234',
  'Test procedure',
  100.00,
  'Pending',
  '2025-12-04',
  '2025-12-04',
  '2025-12-04',
  '2025-12-11',
  'test_user',
  'test_user',
  'Test notes',
  0,
  false
);
```

If this succeeds, your migrations are complete! Then delete the test record:
```sql
DELETE FROM claims WHERE id = 'TEST-001';
```

---

## Troubleshooting

### Error: "column already exists"
This is OK - it means you've already run part of this migration. Continue with the next migration.

### Error: "constraint does not exist"
This is OK when dropping constraints - it means it wasn't there to begin with.

### Error: "violates check constraint"
This means you have existing data that doesn't match the new constraints. You may need to update existing data first.

### Still getting 400 errors after migrations?
1. Clear your browser cache
2. Do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for the actual error message
4. Look at the Network tab to see what data is being sent

---

## After Running Migrations

1. **Deploy the updated code:** The code changes are already in the branch `claude/fix-claims-saving-01F9i3ZaavDDqVdznfbhfKno`
2. **Test creating a claim:** Try creating a claim with "Pending" status and no claim number
3. **Verify it saves:** You should see the claim appear in the list without errors

---

## Summary

**Run these in order:**
1. ✅ `add_missing_claims_columns.sql` (REQUIRED - fixes missing columns)
2. ✅ `make_claim_number_nullable.sql` (REQUIRED - allows NULL claim numbers)
3. ✅ `add_archive_and_audit_features.sql` (OPTIONAL - if you want audit trails)

**After running migrations:**
- Clear browser cache
- Hard refresh your app
- Try creating a new claim with Pending status
