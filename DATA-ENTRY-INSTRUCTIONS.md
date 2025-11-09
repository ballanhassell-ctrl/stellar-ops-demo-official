# Court Street Dental RCM Dashboard - Data Entry Guide

## Overview
This guide explains how to use the data entry spreadsheets to populate your RCM Dashboard with real data.

## 📊 Spreadsheet Files

### 1. **Court-Street-Dental-Data-Entry.csv** (Main Data File)
This is the primary spreadsheet containing all simple data points organized by section.

**Columns:**
- **Section**: The dashboard section (DASHBOARD, PAYMENTS, PATIENTS, etc.)
- **Field Name**: Human-readable name of the data field
- **Field Key**: Technical key used in the code
- **Data Type**: Type of data (number, text, etc.)
- **Current Value**: The placeholder value currently in the app
- **Description/Notes**: What this field represents

**How to use:**
1. Open the CSV in Excel, Google Sheets, or any spreadsheet application
2. Focus on the **Current Value** column - this is where you enter your actual data
3. Make sure to enter the correct data type (numbers as numbers, not text)
4. Save the file when done

**Example:**
```
Section    | Field Name       | Current Value → Your Value
DASHBOARD  | Monthly Revenue  | 0 → 125000
DASHBOARD  | Active Patients  | 0 → 450
```

---

### 2. **EOD-Daily-Payments.csv** (Daily Payment Transactions)
Individual payment transactions for the EOD (End of Day) Report.

**Columns:**
- **Time**: Time of payment (e.g., 09:15 AM)
- **Patient/Payer Name**: Name of patient or insurance company
- **Amount**: Payment amount
- **Type**: Either "Patient" or "Insurance"
- **Payment Method**: Credit Card, Cash, Check, or EFT
- **Procedure/Notes**: What the payment was for

**How to use:**
1. Add a new row for each payment received
2. Keep entries in chronological order by time
3. Make sure Type is exactly "Patient" or "Insurance"
4. Make sure Payment Method is exactly one of: Credit Card, Cash, Check, or EFT

**Example:**
```
Time      | Patient/Payer Name | Amount | Type      | Payment Method | Procedure/Notes
09:15 AM  | John Smith         | 250    | Patient   | Credit Card    | Cleaning & Exam
10:30 AM  | Delta Dental       | 1200   | Insurance | EFT            | Crown - Claim #12345
```

---

### 3. **EOD-Top-Procedures.csv** (Top Procedures by Volume)
The most frequently performed procedures for the EOD Report.

**Columns:**
- **Procedure Name**: Name of the procedure
- **Count**: How many times performed
- **Revenue**: Total revenue from this procedure

**How to use:**
1. List your top 5-10 procedures
2. Enter the count of how many times each was performed
3. Enter the total revenue generated from each procedure type

**Example:**
```
Procedure Name | Count | Revenue
Cleanings      | 12    | 1800
Fillings       | 8     | 2400
Crowns         | 3     | 3600
```

---

### 4. **Scorecard-Weekly-Data.csv** (Weekly Performance Metrics)
Weekly performance data for the Doctor Scorecard.

**Columns:**
- **Week Number**: Sequential week number (1, 2, 3, etc.)
- **Date**: Date for that week (e.g., 12/31/2024)
- **Show Rate Dr %**: Doctor appointment show rate percentage
- **Show Rate Hyg %**: Hygienist appointment show rate percentage
- **New Patients**: Number of new patients that week
- **Tx Presented**: Total treatment value presented
- **Tx Accept %**: Treatment acceptance percentage
- **Tx Accepted Amount**: Dollar amount of accepted treatment
- **Collection %**: Collection rate percentage
- **Five Star Reviews**: Number of 5-star reviews received

**How to use:**
1. Each row represents one week of data
2. Start with Week 1 and add subsequent weeks
3. All percentages should be entered as numbers (e.g., 75 for 75%)
4. Dates should be in MM/DD/YYYY format

**Example:**
```
Week | Date       | Show Rate Dr % | Show Rate Hyg % | New Patients | Tx Presented
1    | 12/31/2024 | 80            | 53             | 6            | 18470
2    | 1/5/2025   | 75            | 46             | 7            | 38955
```

---

### 5. **Insurance-Providers.csv** (Insurance Provider Details)
Information about insurance providers and network status.

**Columns:**
- **Provider Name**: Name of the insurance company
- **Fee Schedule**: Type (Direct, Connection, Decare, etc.)
- **Portal Status**: Portal access status (e.g., "All Set!")
- **EFT Status**: EFT enrollment status (e.g., "Enrolled")
- **Dr. Gajjar Network**: "In" or "Out" of network
- **Dr. Judge Network**: "In" or "Out" of network
- **Dr. Strachan Network**: "In" or "Out" of network

**How to use:**
1. Each row represents one insurance provider
2. Update provider information as needed
3. Network status must be exactly "In" or "Out"
4. Add or remove rows as providers change

**Example:**
```
Provider Name | Fee Schedule | Portal Status | EFT Status | Dr. Gajjar Network
Aetna         | Direct       | All Set!      | Enrolled   | In
Cigna         | Connection   | All Set!      | Enrolled   | In
```

---

## 🔄 Workflow: From Spreadsheets to Dashboard

### Step 1: Fill Out Your Data
1. Open each CSV file
2. Replace placeholder values with your actual data
3. For list-based files (payments, procedures, etc.), add/remove rows as needed
4. Save all files

### Step 2: Send Back to Developer
1. Gather all 5 CSV files
2. Send them back in a single message
3. Specify if this is:
   - **Initial data load**: First time populating the dashboard
   - **Update**: Updating specific sections
   - **Full refresh**: Replacing all data

### Step 3: Data Integration
The developer will:
1. Parse the CSV data
2. Update the appropriate data structures in the code
3. Test that all values display correctly
4. Commit and push the changes

### Step 4: Verify
1. Check the live dashboard
2. Verify all sections display correctly
3. Report any discrepancies

---

## 📝 Data Entry Tips

### Numbers
- Enter numbers without $ signs or commas: `1000` not `$1,000`
- Percentages as numbers: `75` not `75%`
- Decimals are OK: `123.45`

### Text
- Keep consistent naming (e.g., don't mix "Delta Dental" and "Delta")
- Avoid special characters that might break CSV format
- Use quotes if text contains commas: `"Smith, John"`

### Dates
- Use consistent format: MM/DD/YYYY
- Example: `01/15/2025` not `1/15/25`

### Empty Values
- If a field has no data, you can:
  - Leave it as 0 (for numbers)
  - Leave it blank (but keep the commas)
  - Use "N/A" for text fields if appropriate

### Required vs Optional
- All fields in the main data entry file should have values
- For list files (payments, procedures), only include rows with actual data

---

## ⚠️ Common Mistakes to Avoid

1. **Mixing data types**: Don't put text in number fields
2. **Breaking CSV format**: Be careful with commas inside text fields
3. **Inconsistent values**: Use exact same spelling/format throughout
4. **Wrong date formats**: Stick to MM/DD/YYYY
5. **Forgetting to save**: Save all files before sending

---

## 🎯 Quick Reference: Which Spreadsheet for What?

| What You Want to Update | Use This File |
|------------------------|---------------|
| Dashboard metrics (revenue, patients, etc.) | Court-Street-Dental-Data-Entry.csv |
| Payment totals and summaries | Court-Street-Dental-Data-Entry.csv |
| Individual payment transactions | EOD-Daily-Payments.csv |
| Most popular procedures | EOD-Top-Procedures.csv |
| Weekly performance trends | Scorecard-Weekly-Data.csv |
| Insurance provider info | Insurance-Providers.csv |
| Claims and AR data | Court-Street-Dental-Data-Entry.csv |

---

## 📧 Questions?

If you're unsure about:
- What a field means → Check the Description/Notes column
- What format to use → See the current placeholder values as examples
- Whether to include something → When in doubt, include it!

---

## 🔄 Regular Updates

For ongoing dashboard maintenance:

**Daily**: Update EOD-Daily-Payments.csv with new transactions
**Weekly**: Add new row to Scorecard-Weekly-Data.csv
**Monthly**: Update all main metrics in Court-Street-Dental-Data-Entry.csv
**As Needed**: Update Insurance-Providers.csv when providers change

---

*Generated for Court Street Dental RCM Dashboard*
*Powered by Stellar Consults*
