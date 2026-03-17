# Codebase Task Proposals

## 1) Typo Fix Task
**Issue found:** `parseDate` contains a special-case parser for `MM/DD//YYYY` and labels it as a typo format (`double slash`). This suggests typo-ridden date input is already known and should be handled consistently at ingestion boundaries.

**Proposed task:**
- Normalize/repair obvious date typos at import time and show a warning count in the upload result (e.g., "2 malformed dates auto-corrected").
- Keep parser support, but also add explicit telemetry/logging so bad source data can be fixed upstream.

**Where seen:** `src/components/InsuranceIssuesCSVUpload.tsx`.

---

## 2) Bug Fix Task
**Issue found:** EFT payment date fallback uses `new Date().toISOString().split('T')[0]`.
This can shift dates by timezone (UTC day vs local day), causing off-by-one-day records for users late in the evening.

**Proposed task:**
- Replace UTC-splitting fallback with `getLocalDateString()` from `src/utils/dateUtils.ts`.
- Add a regression test around timezone-sensitive date fallback behavior.

**Where seen:** `src/components/EFTReconciliation.tsx` and `src/utils/dateUtils.ts`.

---

## 3) Documentation Discrepancy Task
**Issue found:** Root `README.md` is still the default Vite template and does not describe this dental operations dashboard, setup requirements (Supabase), or available workflows.

**Proposed task:**
- Rewrite README to reflect the actual product: purpose, main modules, required env vars, local run steps, data mode behavior, and deployment notes.
- Add a "Known limitations" section and links to migration docs.

**Where seen:** `README.md` vs implemented application scope in `src/App.tsx`.

---

## 4) Test Improvement Task
**Issue found:** Project scripts include build/lint/dev/preview only; there is no `test` script or baseline test suite.

**Proposed task:**
- Add a unit test setup (Vitest + Testing Library).
- Start with tests for deterministic utilities (`src/utils/dateUtils.ts`, `src/utils/sanitizePatientName.ts`) and one critical data-normalization path in CSV upload.

**Where seen:** `package.json`.
