# Static Data Mode - Presentation Mode

This application includes a **Static Data Mode** feature that lets you demo with realistic sample data and no live Supabase dependency.

## How to Enable Static Data Mode

### Option A (Recommended): Demo Environment File

1. Copy the demo env template:

```bash
cp .env.demo.example .env.local
```

2. Start the app:

```bash
npm run dev
```

### Option B: One-off Environment Variable

```bash
VITE_APP_MODE=demo npm run dev
```

## How to Switch Back to Live Data

1. Copy the live env template:

```bash
cp .env.example .env.local
```

2. Fill in real Supabase values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Restart your dev server.

## Environment Variables

- `VITE_APP_MODE=demo` → static sample data mode
- `VITE_APP_MODE=live` → live Supabase mode
- `VITE_USE_STATIC_DATA=true` → legacy fallback to force static mode

> `VITE_APP_MODE=demo` is preferred for repeatable demo builds.

## What Data is Available in Static Mode?

When static data mode is enabled, the application displays sample data across all major areas:

### Dashboard
- BAM Cycle Revenue: $185,400 (current) / $172,300 (previous)
- Collection Rate: 94.5%
- Active Patients: 148
- Outstanding A/R: $52,750
- Active Claims: 12

### RCM Management
- **Claims**: 12 sample claims across various statuses
- **Pre-Authorizations**: 6 sample pre-auths
- **Insurance Checks**: 6 sample checks/EFTs
- **Patient A/R**: 10 sample accounts across aging buckets

### Scorecard
- Show rates (Doctor & Hygienist)
- Treatment acceptance rates
- Production vs. goals
- Collection metrics
- New patient goals
- 5-star reviews

### EOD Report
- Daily production and payments
- Payment method breakdown
- Patients seen / new patients / procedures completed
- Action items summary
- Month-to-date summary

## Important Notes

### What Works in Static Mode
✅ Viewing all data across the app
✅ Navigation, filtering, searching, sorting
✅ Detail views and most read-only workflows

### What Doesn't Work in Static Mode
❌ Creating/updating/deleting records
❌ Real-time subscriptions
❌ CSV imports that require DB writes
❌ Some date queries that require server-side fetches

## Sample Data Location

All demo data lives in `src/data/sampleData.ts`.

If you want to customize demo values:

1. Edit exported sample arrays in `src/data/sampleData.ts`
2. Keep types aligned with `src/types/database.types.ts`
3. Restart the dev server

## Technical Details

Static data mode is enforced at the service/hook layer:
- Services and hooks call `isStaticDataMode()`
- In demo mode, they return `sampleData.ts` values
- In live mode, they query Supabase

---

**Safety tip:** Always use `VITE_APP_MODE=demo` for presentation deployments.
