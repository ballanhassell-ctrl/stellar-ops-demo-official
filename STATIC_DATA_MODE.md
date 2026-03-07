# Static Data Mode - Presentation Mode

This application now includes a **Static Data Mode** feature that allows you to display sample data for presentations and demos without connecting to the live Supabase database.

## How to Enable Static Data Mode

### Step 1: Open the Configuration File
Navigate to: `src/config/dataMode.ts`

### Step 2: Toggle the Flag
Change the `USE_STATIC_DATA` constant:

```typescript
// Enable static data mode (for presentations)
export const USE_STATIC_DATA = true;

// Disable static data mode (for live Supabase data)
export const USE_STATIC_DATA = false;
```

### Step 3: Restart the Development Server
After changing the flag, restart your development server for the changes to take effect:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## What Data is Available in Static Mode?

When static data mode is enabled, the application will display comprehensive sample data across all areas:

### Dashboard
- BAM Cycle Revenue: $185,400 (current) / $172,300 (previous)
- Collection Rate: 94.5%
- Active Patients: 148
- Outstanding A/R: $52,750
- Active Claims: 12

### RCM Management
- **Claims**: 12 sample claims across various statuses (Pending, Sent, Approved, Denied, etc.)
- **Pre-Authorizations**: 6 sample pre-auths with different approval statuses
- **Insurance Checks**: 6 sample checks/EFTs with various amounts
- **Patient A/R**: 10 sample patient accounts across different aging buckets

### Scorecard
- Show rates (Doctor & Hygienist)
- Treatment acceptance rates
- Production vs. goals
- Collection metrics
- New patient goals
- 5-star reviews: 42

### EOD Report
- Daily production: $12,700
- Payments collected: $12,650
- Payment method breakdown (Visa, Mastercard, Amex, etc.)
- Patients seen: 28
- New patients: 3
- Procedures completed: 42
- Action items summary
- Month-to-date summary

### Administration
- **VIP List**: 4 high-value patients with treatment needs
- **Recare List**: 3 patients due for recall appointments
- **Treatment List**: 3 patients with unscheduled treatment

## Important Notes

### What Works in Static Mode
✅ Viewing all data across the application
✅ Navigating between different sections
✅ Filtering and searching data (client-side only)
✅ Sorting data (client-side only)
✅ Viewing details and modals

### What Doesn't Work in Static Mode
❌ Creating new records (insert operations)
❌ Editing existing records (update operations)
❌ Deleting records (delete operations)
❌ Real-time subscriptions and updates
❌ CSV imports (since they require database writes)
❌ Date-based filtering that requires server-side queries

### Limitations
- Static data is fixed and will not change based on date selections
- Any create/edit/delete operations will either fail silently or show errors
- The data is stored in memory and will reset when you refresh the page

## Switching Back to Live Data

To return to live Supabase data:

1. Open `src/config/dataMode.ts`
2. Set `USE_STATIC_DATA = false`
3. Restart your development server

## Sample Data Details

All sample data is located in `src/data/sampleData.ts` and includes:

- **Patients**: 25 sample patient records with varying lifetime values
- **Appointments**: 24 sample appointments across different providers
- **Claims**: 12 sample insurance claims
- **Pre-Authorizations**: 6 sample pre-auth requests
- **Insurance Checks**: 6 sample check/EFT records
- **Patient A/R**: 10 sample patient accounts receivable records
- **Scheduling Lists**: 10 sample items across VIP, Recare, and Treatment lists
- **Metrics**: Comprehensive dashboard and scorecard metrics
- **EOD Data**: Complete end-of-day report with production and payment details

## Customizing Sample Data

If you need to customize the sample data for your presentations:

1. Open `src/data/sampleData.ts`
2. Modify the exported arrays (e.g., `sampleClaims`, `samplePatients`, etc.)
3. Make sure to follow the TypeScript types defined in `src/types/database.types.ts`
4. Save the file and restart the development server

## Use Cases

This feature is perfect for:
- **Presentations to other offices**: Show the application with realistic data
- **Demos**: Demonstrate features without live data
- **Screenshots**: Capture screens with consistent, professional-looking data
- **Training**: Walk through the application without affecting real data
- **Testing UI**: Test interface behavior with known data sets

## Technical Details

The static data mode is implemented at the service layer:
- Services check `isStaticDataMode()` before making database queries
- If enabled, services return static data from `sampleData.ts`
- If disabled, services query Supabase normally
- Hooks like `useMetrics` and `useEODMetrics` also check the flag and return sample data directly

## Questions or Issues?

If you encounter any issues with static data mode or need to add more sample data, please contact your development team.

---

**Remember**: Always set `USE_STATIC_DATA = false` before deploying to production!
