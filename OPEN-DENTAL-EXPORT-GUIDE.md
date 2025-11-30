# Open Dental Data Export Guide

## Overview
This guide will help you export patient data from Open Dental to CSV files that can be uploaded to the Court Street Dental RCM Dashboard for automatic patient lifecycle metrics calculation.

## Required Data Exports

You'll need to export three types of data:
1. **Patient Master List** - Basic patient information
2. **Appointment History** - Patient visit records
3. **Patient Revenue** - Payment and production data

---

## 1. Exporting Patient Master List

### Steps:
1. Open Open Dental
2. Go to **Reports** → **Standard Reports** → **Lists**
3. Select **Patient List** or **Patient Information**
4. Configure the following columns:
   - `PatNum` (Patient Number - this will be your patient_id)
   - `DateFirstVisit` (First Visit Date)
   - `DateLastVisit` (Last Visit Date)
   - `PatStatus` (Patient Status: Active, Inactive, Archived, etc.)

5. Set filters:
   - **All Patients** or filter by date range if needed
   - Include all statuses initially

6. Run the report
7. Click **Export** → **Export to File**
8. Choose **CSV format**
9. Save as `patients.csv`

### Manual Data Preparation:
After exporting, you may need to prepare the CSV file:

#### Required CSV Format:
```csv
patient_id,first_visit_date,last_visit_date,status,total_lifetime_revenue,total_visits
P001,2023-01-15,2025-11-25,active,3500.00,12
P002,2023-03-20,2024-06-10,inactive,1200.00,4
```

#### Column Mapping:
- `patient_id` = PatNum from Open Dental
- `first_visit_date` = DateFirstVisit (format: YYYY-MM-DD)
- `last_visit_date` = DateLastVisit (format: YYYY-MM-DD)
- `status` = Convert PatStatus:
  - "Active" → "active"
  - "Inactive" / "Prospective" → "inactive"
  - "Archived" / "Deceased" → "churned"
- `total_lifetime_revenue` = Leave as 0 initially (will be calculated from revenue data)
- `total_visits` = Leave as 0 initially (will be calculated from appointments)

---

## 2. Exporting Appointment History

### Option A: Using Standard Reports

1. Go to **Reports** → **Standard Reports** → **Appointments**
2. Select **Appointment List** or **Production and Income**
3. Configure columns:
   - `PatNum` (Patient Number)
   - `AptDateTime` (Appointment Date)
   - `ProvName` (Provider Name)
   - `ProdInc` or `Production` (Production Amount)
   - `AptStatus` (Appointment Status)
   - `ProcCode` (Procedure Codes)

4. Set date range:
   - **Start Date**: Beginning of your data (e.g., 2020-01-01)
   - **End Date**: Current date

5. Export to CSV as `appointments.csv`

### Option B: Using Query

If you have access to the MySQL database:

```sql
SELECT
  PatNum as patient_id,
  DATE(AptDateTime) as appointment_date,
  ProvName as provider_name,
  COALESCE(ProdInc, 0) as production_amount,
  CASE
    WHEN AptStatus = 1 THEN 'scheduled'
    WHEN AptStatus = 2 THEN 'completed'
    WHEN AptStatus = 3 THEN 'cancelled'
    WHEN AptStatus = 5 THEN 'no_show'
    ELSE 'completed'
  END as status,
  GROUP_CONCAT(ProcCode SEPARATOR ',') as procedure_codes
FROM appointment
LEFT JOIN patient ON appointment.PatNum = patient.PatNum
LEFT JOIN provider ON appointment.ProvNum = provider.ProvNum
WHERE AptDateTime >= '2020-01-01'
GROUP BY PatNum, AptDateTime, ProvName, ProdInc, AptStatus
ORDER BY AptDateTime DESC;
```

### Required CSV Format:
```csv
patient_id,appointment_date,provider_name,production_amount,status,procedure_codes
P001,2025-11-25,Dr. Smith,250.00,completed,"D0120,D0274"
P001,2025-10-15,Dr. Jones,180.00,completed,"D1110"
```

#### Status Mapping:
- 1 = scheduled
- 2 = completed
- 3 = cancelled
- 4 = unscheduled
- 5 = no_show

---

## 3. Exporting Patient Revenue

### Option A: Using Standard Reports

1. Go to **Reports** → **Standard Reports** → **Payments**
2. Select **Daily Payments** or **Payment List**
3. Configure columns:
   - `PatNum` (Patient Number)
   - `PayDate` (Payment Date)
   - `PayAmt` (Payment Amount)
   - `PayType` (Payment Type)
   - `PayNote` (Payment Note)

4. Set date range covering all historical data
5. Export to CSV as `revenue.csv`

### Option B: Using Query

```sql
SELECT
  p.PatNum as patient_id,
  DATE(ps.PayDate) as transaction_date,
  ps.SplitAmt as amount,
  'payment' as transaction_type,
  CASE
    WHEN d.DefName LIKE '%Insurance%' THEN 'insurance'
    WHEN d.DefName LIKE '%Cash%' THEN 'cash'
    WHEN d.DefName LIKE '%Card%' OR d.DefName LIKE '%Credit%' THEN 'card'
    WHEN d.DefName LIKE '%Check%' THEN 'check'
    ELSE 'other'
  END as payment_method,
  ps.Note as notes
FROM paysplit ps
JOIN patient p ON ps.PatNum = p.PatNum
JOIN payment pay ON ps.PayNum = pay.PayNum
LEFT JOIN definition d ON pay.PayType = d.DefNum
WHERE ps.PayDate >= '2020-01-01'
ORDER BY ps.PayDate DESC;
```

### Required CSV Format:
```csv
patient_id,transaction_date,amount,transaction_type,payment_method,notes
P001,2025-11-25,250.00,payment,insurance,Claim paid
P001,2025-11-20,50.00,payment,card,Copay
```

#### Transaction Types:
- `payment` - Patient or insurance payment received
- `adjustment` - Account adjustments
- `writeoff` - Write-offs or contractual adjustments
- `production` - Services rendered (production)

---

## 4. Data Quality Checklist

Before uploading your CSV files, verify:

### Patients CSV:
- [ ] All patient_id values are unique
- [ ] Dates are in YYYY-MM-DD format
- [ ] Status values are lowercase: active, inactive, or churned
- [ ] No missing required fields (patient_id, first_visit_date, status)

### Appointments CSV:
- [ ] All patient_id values exist in patients CSV
- [ ] Dates are in YYYY-MM-DD format
- [ ] Status values are: completed, scheduled, no_show, or cancelled
- [ ] Production amounts are numeric (use 0 for no production)

### Revenue CSV:
- [ ] All patient_id values exist in patients CSV
- [ ] Dates are in YYYY-MM-DD format
- [ ] Amounts are numeric (positive for payments, can be negative for adjustments)
- [ ] Transaction types are valid: payment, adjustment, writeoff, or production

---

## 5. Upload Process

Once you have your CSV files prepared:

1. Open the Court Street Dental RCM Dashboard
2. Navigate to **Patient Lifecycle** tab
3. Upload files in this order:
   - **Patients first** (establishes patient records)
   - **Appointments second** (links to patients)
   - **Revenue third** (links to patients)

4. After all uploads complete, click **Recalculate All Metrics**
5. Wait for the calculation to complete
6. Verify the metrics display correctly

---

## 6. Ongoing Updates

### Weekly/Monthly Updates:
You can export incremental data by setting date filters:
- Set "Start Date" to last upload date
- Set "End Date" to current date
- Upload the incremental CSV files

The system will:
- Add new patient records
- Update existing patient records
- Add new appointments and revenue
- Automatically recalculate metrics

### Best Practices:
- Schedule regular exports (weekly or monthly)
- Keep backup copies of all CSV files
- Document any manual adjustments made to the data
- Verify metrics after each upload

---

## 7. Common Issues & Solutions

### Issue: "Patient ID not found"
**Solution**: Ensure patients CSV is uploaded first before appointments or revenue

### Issue: "Invalid date format"
**Solution**: Dates must be YYYY-MM-DD format (e.g., 2025-11-30, not 11/30/2025)

### Issue: "Invalid status value"
**Solution**: Status must be lowercase: active, inactive, or churned

### Issue: "Metrics showing as $0"
**Solution**:
1. Verify revenue data was uploaded successfully
2. Check that patient_id values match across all CSV files
3. Click "Recalculate All Metrics" button

### Issue: "Duplicate patient_id"
**Solution**: Patient IDs must be unique. Check for duplicates in your patients.csv file

---

## 8. Alternative: Direct Database Connection (Advanced)

If you have IT support and want real-time syncing:

### Prerequisites:
- Access to Open Dental MySQL database
- Database credentials
- Network access from Supabase to your database

### Contact:
Reach out to your technical team to set up:
- Read-only database user
- Scheduled ETL jobs to sync data
- Automated metric calculations

---

## Support

If you encounter issues with data exports or uploads:
1. Check this guide's troubleshooting section
2. Verify CSV format matches examples
3. Test with a small sample file first
4. Contact your technical support team

---

## Sample Data Files

Sample CSV templates are provided in the upload interface for reference. You can download these to see the exact format expected.

---

**Last Updated**: November 30, 2025
**Version**: 1.0
