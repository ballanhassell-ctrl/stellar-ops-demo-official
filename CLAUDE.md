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

## Insurance Issues — Temporarily Hidden (Under Development)

**Status:** Insurance Issues tab is currently hidden from team users and only accessible via admin login. The EOD report shows "Coming back soon: under further development" in place of the insurance issues section.

**When the user says "development is finished"**, perform ALL of the following re-enablement steps:

### 1. Re-enable Insurance Issues Tab for Team Users
- **File:** `src/App.tsx`
- Remove the `{isAdmin && (` wrapper and closing `)}` around the Insurance Issues tab button (search for `TEMPORARILY HIDDEN FROM TEAM - Insurance Issues tab`)
- Remove the `isAdmin &&` guard from the Insurance Issues content rendering (search for `TEMPORARILY HIDDEN FROM TEAM - Insurance Issues content`)

### 2. Restore Insurance Issues in EOD Report
- **File:** `src/services/dailyARReportService.ts`
- Replace the "Coming back soon" placeholder HTML block in the detail sections with the original line:
  ```
  ${renderSection('New Insurance Issues', data.newInsuranceIssues, COLORS.orange, false)}
  ```
- Restore the summary snapshot card to show live data:
  ```html
  <p style="...">Open Insurance Issues</p>
  <p style="...">${data.summary.openInsuranceIssuesCount}</p>
  <p style="...">Still unresolved</p>
  ```

### 3. CRITICAL — First EOD Report After Re-enablement: Show ALL Active Issues
On the **first EOD report only** after re-enabling, the "New Insurance Issues" section must show **ALL insurance issues with status = 'Open'** (not just those created today). This is a one-time adjustment so the team is aware of everything on the active list.

To do this, **temporarily** modify the insurance issues query in `dailyARReportService.ts` (around line 106-112):
- Remove the `.gte('created_at', startOfDay)` and `.lte('created_at', endOfDay)` date filters so it fetches ALL open issues
- After the first EOD report has been sent, **restore** the date filters back to only show today's new issues

### 4. Clean Up CLAUDE.md
- Remove this entire "Insurance Issues — Temporarily Hidden" section from CLAUDE.md after all steps are complete

## Tech Stack
- React + Vite + TypeScript
- Supabase (PostgreSQL) for backend
- Tailwind CSS for styling
- Lucide React for icons
