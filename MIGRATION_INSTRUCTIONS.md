# Database Migration Instructions - Make Claim Number Nullable

## Issue
Claims with 'Pending' or 'Sent' status were failing to save with a 400 error because the `claim_number` field was required (NOT NULL) in the database, but these statuses don't have a claim number assigned yet.

## Solution
This migration makes the `claim_number` field nullable and updates the unique constraint to only apply to non-null, non-empty values.

## How to Apply the Migration

1. **Open your Supabase Dashboard**
   - Navigate to your project at https://supabase.com
   - Go to the SQL Editor

2. **Run the Migration**
   - Open the file: `supabase/migrations/make_claim_number_nullable.sql`
   - Copy the entire contents
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

3. **Verify the Migration**
   - After running, you should see success messages
   - The `claims` table should now allow NULL values for `claim_number`
   - Multiple claims can have NULL claim numbers, but non-null values must still be unique

## What Changed

### Database Changes
- `claim_number` column now allows NULL values
- UNIQUE constraint updated to only enforce uniqueness on non-null, non-empty values
- Multiple claims can now have NULL claim numbers (for Pending/Sent status)

### Code Changes
- TypeScript type updated to `claim_number: string | null`
- Form submission now sends `null` instead of empty string when claim number is not provided
- Both insert and update operations properly handle null claim numbers

## Testing
After applying the migration, test by:
1. Creating a new claim with "Pending" status (leave claim number empty)
2. Creating a new claim with "Sent" status (leave claim number empty)
3. Verifying both save successfully
4. Creating a claim with "Entered" or other status with a claim number
5. Verifying the claim number is still required for non-Pending/Sent claims

## Rollback
If you need to rollback this migration:
```sql
-- Warning: This will fail if you have NULL claim_numbers in the database
ALTER TABLE claims
  ALTER COLUMN claim_number SET NOT NULL;

DROP INDEX IF EXISTS claims_claim_number_unique_idx;

ALTER TABLE claims
  ADD CONSTRAINT claims_claim_number_key UNIQUE (claim_number);
```
