# Supabase Field Mapping Reference

This document shows the exact `field_key` values your Supabase data must have for the dashboard to display correctly.

## Required Field Keys by Section

### DASHBOARD Section
| Field Key | Field Name | Description |
|-----------|------------|-------------|
| `bam_current_revenue` | BAM Current Revenue | Current BAM cycle revenue |
| `bam_target_goal` | BAM Target Goal | Target goal for current BAM cycle |
| `practice_goal` | Practice Goal | Overall practice goal |
| `collection_rate` | Collection Rate | Collection rate percentage |
| `active_patients` | Active Patients | Number of active patients |
| `active_claims` | Active Claims | Number of active claims |
| `pending_payments` | Pending Payments | Pending payment amount |
| `outstanding_ar` | Outstanding A/R | Outstanding accounts receivable |

### PAYMENTS Section
| Field Key | Field Name | Description |
|-----------|------------|-------------|
| `todays_payments` | Today's Payments | Total payments for today |
| `weekly_payments` | Weekly Payments | Total payments this week |
| `monthly_payments` | Monthly Payments | Total payments this month |
| `pending_deposits` | Pending Deposits | Deposits pending |
| `insurance_payments` | Insurance Payments | Insurance payments total |
| `patient_payments` | Patient Payments | Patient payments total |
| `unapplied_credits` | Unapplied Credits | Credits not yet applied |
| `refunds_pending` | Refunds Pending | Pending refund amount |

### PATIENTS Section
| Field Key | Field Name | Description |
|-----------|------------|-------------|
| `total_patients` | Total Patients | Total number of patients |
| `active_patients` | Active Patients | Active patients count |
| `patients_with_balance` | Patients with Balance | Patients with outstanding balance |
| `total_patient_ar` | Total Patient A/R | Total patient accounts receivable |
| `patient_ar_0_30` | Patient A/R 0-30 | A/R aged 0-30 days |
| `patient_ar_31_60` | Patient A/R 31-60 | A/R aged 31-60 days |
| `patient_ar_61_90` | Patient A/R 61-90 | A/R aged 61-90 days |
| `patient_ar_90_plus` | Patient A/R 90+ | A/R aged 90+ days |
| `payment_plans` | Payment Plans | Number of payment plans |
| `past_due_accounts` | Past Due Accounts | Accounts past due |

### PRE_AUTHS Section
| Field Key | Field Name | Description |
|-----------|------------|-------------|
| `total_pre_auths` | Total Pre-Auths | Total pre-authorizations |
| `pre_auths_pending` | Pending Pre-Auths | Pre-auths pending approval |
| `pre_auths_approved` | Approved Pre-Auths | Pre-auths approved |
| `pre_auths_denied` | Denied Pre-Auths | Pre-auths denied |
| `pre_auths_expiring_soon` | Expiring Soon | Pre-auths expiring soon |
| `pre_auths_expiring_this_month` | Expiring This Month | Pre-auths expiring this month |

### EOD_REPORT Section
| Field Key | Field Name | Description |
|-----------|------------|-------------|
| `eod_payment_cherry` | Cherry Payments | Payments via Cherry financing |
| `eod_payment_carecredit` | CareCredit Payments | Payments via CareCredit financing |

---

## How to Verify Your Data

### Step 1: Run Diagnostic in Browser Console

After deploying, open browser console (F12) and run:

```javascript
await window.csdHelpers.checkDateData('2025-11-24')
```

This will show you exactly what metrics were found for that date.

### Step 2: Check for Missing Fields

The helper will show which fields exist. Compare against the tables above to see what's missing.

### Step 3: SQL Query to Check Your Data

Run this in Supabase SQL Editor:

```sql
-- See what field_keys you have for a specific date
SELECT field_key, value
FROM csd_metric_values
WHERE as_of_date = '2025-11-24'
ORDER BY field_key;

-- Compare with what's in the catalog
SELECT field_key, field_name, section
FROM csd_metric_catalog
ORDER BY section, field_key;
```

---

## Common Issues

### Issue 1: Field Keys Don't Match
**Problem:** Your field_keys in Supabase don't match the exact names above.

**Solution:** Update your field_keys to match exactly (case-sensitive, use underscores).

**Example:**
```sql
-- Wrong
INSERT INTO csd_metric_values (field_key, as_of_date, value)
VALUES ('bamCurrentRevenue', '2025-11-24', 50000);

-- Correct
INSERT INTO csd_metric_values (field_key, as_of_date, value)
VALUES ('bam_current_revenue', '2025-11-24', 50000);
```

### Issue 2: Wrong Date Format
**Problem:** Date is not in YYYY-MM-DD format.

**Solution:** Use proper date format:
```sql
-- Wrong
'11/24/2025'  or  '2025-24-11'

-- Correct
'2025-11-24'
```

### Issue 3: Missing Catalog Entries
**Problem:** `csd_metric_catalog` doesn't have entries for your field_keys.

**Solution:** Add them to the catalog:
```sql
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type)
VALUES
  ('bam_current_revenue', 'DASHBOARD', 'BAM Current Revenue', 'currency');
```

### Issue 4: Dashboard Shows Default Values Instead
**Problem:** Dashboard shows zeros or default values instead of your data.

**Cause:** The useMetrics hook is getting an empty array from Supabase.

**Check:**
1. Date picker is set to the correct date
2. Field keys match exactly
3. Connection is working (run `window.csdHelpers.checkSupabaseConnection()`)

---

## Quick Fix Template

If you need to add all fields at once for a specific date:

```sql
-- Add to csd_metric_catalog (do this once)
INSERT INTO csd_metric_catalog (field_key, section, field_name, data_type, description_notes)
VALUES
  ('bam_current_revenue', 'DASHBOARD', 'BAM Current Revenue', 'currency', 'Current BAM cycle revenue'),
  ('bam_target_goal', 'DASHBOARD', 'BAM Target Goal', 'currency', 'BAM cycle target'),
  ('active_patients', 'DASHBOARD', 'Active Patients', 'number', 'Number of active patients'),
  ('collection_rate', 'DASHBOARD', 'Collection Rate', 'percentage', 'Collection rate percentage')
  -- ... add all fields you need
ON CONFLICT (field_key) DO NOTHING;

-- Add values for a specific date
INSERT INTO csd_metric_values (field_key, as_of_date, value)
VALUES
  ('bam_current_revenue', '2025-11-24', 50000),
  ('bam_target_goal', '2025-11-24', 60000),
  ('active_patients', '2025-11-24', 1935),
  ('collection_rate', '2025-11-24', 75.5)
  -- ... add all your values
ON CONFLICT (field_key, as_of_date) DO UPDATE
  SET value = EXCLUDED.value;
```

---

## Need Help?

Run the diagnostic helper to see exactly what you have vs what's expected:

```javascript
// Check connection
await window.csdHelpers.checkSupabaseConnection()

// Check specific date
await window.csdHelpers.checkDateData('2025-11-24')
```
