# Project Memory & Guidelines

## SQL Constraint Rules
**IMPORTANT:** Whenever making changes that involve new status values, enum values, or any data that is validated by database CHECK constraints, **always check and update the corresponding SQL migration files** to include the new values. Failing to do so will cause `check constraint` violations at runtime.

Specifically for this project:
- `supabase/migrations/update_claims_status_constraint.sql` — Contains the `claims_status_check` constraint with all allowed claim statuses
- `supabase/migrations/rename_waiting_for_info_status.sql` — Contains updated constraints for both `claims` and `pre_auths` tables
- `src/types/database.types.ts` — Contains the `UnifiedClaimStatus` TypeScript type that must stay in sync with the DB constraints

When adding or renaming a status value:
1. Update the TypeScript type in `database.types.ts`
2. Update the SQL CHECK constraint in the relevant migration file(s)
3. Update any component-level status arrays (e.g., `ALL_STATUSES` in `InsuranceARReport.tsx`)
4. Verify the SQL migration runs successfully before deploying

## Tech Stack
- React + Vite + TypeScript
- Supabase (PostgreSQL) for backend
- Tailwind CSS for styling
- Lucide React for icons
