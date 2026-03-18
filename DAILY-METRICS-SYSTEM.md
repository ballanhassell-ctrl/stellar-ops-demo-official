# Daily Metrics Reset System

## Overview

The Stellar Dental Spa RCM Dashboard now includes an **automated daily metrics reset system** that ensures all "Today" metrics reset to $0 at the beginning of each day, while preserving historical EOD (End of Day) report data.

## How It Works

### Automatic Daily Reset
1. **Date Tracking**: The system checks the current date every minute
2. **Midnight Reset**: When a new day is detected:
   - Yesterday's EOD data is automatically saved to the history database (localStorage)
   - All daily metrics reset to 0 or empty arrays
   - The system continues tracking the new day's data
3. **Data Persistence**: All changes are auto-saved to localStorage in real-time

### What Gets Reset Daily

#### EOD Report Metrics:
- Daily Production (`dailyProduction`)
- Payments Collected (`paymentsCollected`)
- Patients Seen Today (`patientsSeenToday`)
- New Patients (`newPatients`)
- Procedures Completed (`proceduresCompleted`)
- Unbilled Procedures (`unbilledProcedures`)
- Unapplied Payments (`unappliedPayments`)
- Failed Transactions (`failedTransactions`)
- Payment Methods breakdown (Visa, MasterCard, AmEx, Discover, Checks, Cash, EFT)
- Payment transactions list (`payments` array)
- Top Procedures list (`topProcedures` array)
- Action Items (claims to submit, denied claims, etc.)

#### Daily Production by Provider:
- Dr. Gajjar (`drGajjar`)
- Dr. Judge (`drJudge`)
- Dr. Strachan (`drStrachan`)
- Farah (`farah`)
- Olga (`olga`)
- Jissel (`jissel`)
- Temp Hygienist (`tempHyg`)
- All totals (doctor, hygienist, combined)

#### New Patient Tracker:
- Per Day count (synced with `newPatients` from EOD data)

### What DOES NOT Reset

The following metrics are **cumulative** or **historical** and do NOT reset daily:
- BAM Cycle metrics
- Monthly/Quarterly totals
- Month-to-date summaries
- Claims data
- Insurance provider information
- Weekly scorecard data
- 6-month historical averages

## Manual Data Entry

### Using Browser Console

The system exposes helper functions via `window.csdHelpers` that you can use in the browser console:

```javascript
// Update EOD data
window.csdHelpers.updateEODData({
  dailyProduction: 22330.27,
  paymentsCollected: 13741.66,
  patientsSeenToday: 26,
  newPatients: 4
})

// Update production by provider
window.csdHelpers.updateDailyProduction({
  drGajjar: 7690,
  drJudge: 11795,
  drStrachan: 1150
})

// View current data
window.csdHelpers.getCurrentEODData()
window.csdHelpers.getCurrentProductionData()

// Manually save current day to history
window.csdHelpers.saveCurrentEODToHistory()

// Load historical data from a specific date
window.csdHelpers.loadHistoricalEOD('2025-11-12')

// View storage information
window.csdHelpers.getStorageInfo()

// Clear all stored data (WARNING: Cannot be undone!)
window.csdHelpers.clearAllData()
```

### Data Structure Example

```javascript
// Example: Adding a payment transaction
window.csdHelpers.updateEODData({
  payments: [
    ...window.csdHelpers.getCurrentEODData().payments,
    {
      time: '02:30 PM',
      patient: 'J. D.',
      amount: 500.00,
      type: 'Patient',
      method: 'Visa',
      procedure: 'Crown'
    }
  ]
})
```

## Historical EOD Data

### Storage Location
All historical EOD data is stored in **localStorage** under the key `csd_eod_history`. Each day's data is stored with its date as the key:

```json
{
  "2025-11-12": {
    "dailyProduction": 22330.27,
    "paymentsCollected": 13741.66,
    "patientsSeenToday": 26,
    "newPatients": 4,
    "dailyProductionByProvider": {
      "drGajjar": 7690,
      "drJudge": 11795,
      ...
    },
    "savedAt": "2025-11-13T00:00:15.234Z"
  },
  "2025-11-13": { ... }
}
```

### Accessing Historical Data

#### From Browser Console:
```javascript
// Load a specific day's data
window.csdHelpers.loadHistoricalEOD('2025-11-12')

// View all historical data
window.csdHelpers.getStorageInfo()
```

#### From Code:
Historical data can be retrieved using the `getEODData(date)` function defined in the codebase.

## Important Notes

### Data Retention
- **localStorage** has a typical limit of 5-10 MB depending on the browser
- The system can store approximately **several months to a year** of daily EOD data
- For long-term storage, consider implementing a backend database

### Browser Compatibility
- The system uses **localStorage** which is supported in all modern browsers
- Data persists even after closing the browser
- Clearing browser data will delete all stored EOD history

### Testing Daily Reset
To test the daily reset functionality without waiting for midnight:

```javascript
// 1. Save current data
window.csdHelpers.saveCurrentEODToHistory()

// 2. Manually change the stored date to yesterday
localStorage.setItem('csd_current_date', '2025-11-12')

// 3. Refresh the page - the system will detect the date change and reset
```

## Troubleshooting

### Data Not Resetting
1. Check if localStorage is enabled in your browser
2. Open browser console and look for error messages
3. Run `window.csdHelpers.getStorageInfo()` to see current state
4. The system checks every minute - wait 60 seconds after midnight

### Lost Data
1. Check if data was saved to history: `window.csdHelpers.getStorageInfo()`
2. Load the specific date: `window.csdHelpers.loadHistoricalEOD('2025-11-12')`
3. If data is truly lost, you may need to re-enter it manually

### Clearing Stuck Data
```javascript
// Reset everything and start fresh
window.csdHelpers.clearAllData()
```

## Future Enhancements

Potential improvements for this system:
1. **Backend Database**: Move from localStorage to a proper database (MongoDB, PostgreSQL)
2. **Data Export**: Add CSV/Excel export for historical EOD data
3. **Data Import**: Allow bulk import of historical data
4. **API Integration**: Connect to practice management software
5. **Automated Backups**: Periodically backup data to external storage
6. **Multi-location Support**: Handle data for multiple office locations
7. **User Authentication**: Add user accounts and permissions

## Support

For questions or issues with the daily metrics system, contact your development team or refer to the code comments in `src/App.tsx`.

---

*Last Updated: November 13, 2025*
*Version: 1.0*
