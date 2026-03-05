// src/services/metrics.ts
import { supabase } from '../lib/supabaseClient';
import { isStaticDataMode } from '../config/dataMode';
import { getLocalDateString, toLocalDateString } from '../utils/dateUtils';
import {
  sampleWeeklyScorecardData,
  sampleMonthlyNewPatients,
  sampleNewPatientAggregates
} from '../data/sampleData';

// Cache for getMetricsForDate to prevent redundant fetches within the same session
const metricsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

export type MetricWithValue = {
  field_key: string;
  as_of_date: string;
  value: number;
  source: string | null;
  notes: string | null;
  csd_metric_catalog: {
    section: string;
    field_name: string;
    data_type: string;
    description_notes: string | null;
  } | null;
};

/**
 * Fetches the most recent value for a specific metric field_key
 * This is used for persistent metrics that should not reset on a new day
 * For financing metrics, gets the last non-zero value
 */
export async function getLatestMetricValue(fieldKey: string, skipZeros: boolean = false): Promise<number | null> {
  try {
    const query = supabase
      .from('csd_metric_values')
      .select('value, as_of_date')
      .eq('field_key', fieldKey)
      .order('as_of_date', { ascending: false });

    // For financing amounts, skip zero values to get last meaningful amount
    if (skipZeros) {
      query.gt('value', 0).limit(1);
    } else {
      query.limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.warn(`No data found for ${fieldKey}:`, error.message);
      return null;
    }

    return data?.value || null;
  } catch (err) {
    console.warn(`Error fetching latest value for ${fieldKey}:`, err);
    return null;
  }
}

/**
 * Fetches the latest values for multiple metric field_keys
 * Returns a map of field_key -> value
 * For financing amount metrics, skips zero values to get last meaningful amount
 */
export async function getLatestMetricValues(fieldKeys: string[]): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  // Financing amount metrics should skip zero values
  const financingAmountKeys = ['financing_cherry_amount', 'financing_carecredit_amount'];

  try {
    // Fetch all the latest values in parallel
    const promises = fieldKeys.map(async (fieldKey) => {
      const skipZeros = financingAmountKeys.includes(fieldKey);

      const query = supabase
        .from('csd_metric_values')
        .select('value, as_of_date')
        .eq('field_key', fieldKey)
        .order('as_of_date', { ascending: false });

      // For financing amounts, skip zero values to get last meaningful amount
      if (skipZeros) {
        query.gt('value', 0);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (!error && data) {
        results.set(fieldKey, data.value || 0);
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('Error fetching latest metric values:', err);
  }

  return results;
}

/**
 * Fetches monthly trend data from the monthly_metric_trends table
 * This is faster than aggregating from daily values
 */
export async function getMonthlyTrends(fieldKey: string, numMonths: number = 6): Promise<Array<{ month: string; year: number; count: number; goal: number }>> {
  // Return static sample data if in static mode
  if (isStaticDataMode()) {
    // For new patients, return the sample monthly data
    if (fieldKey === 'eod_new_patients') {
      return sampleMonthlyNewPatients.slice(-numMonths);
    }
    // For other fields, return empty array (can be extended later if needed)
    return [];
  }

  try {
    console.log(`[getMonthlyTrends] Fetching ${numMonths} months of data for ${fieldKey}`);

    const { data, error } = await supabase
      .from('monthly_metric_trends')
      .select('year, month, month_name, value, goal_value')
      .eq('field_key', fieldKey)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(numMonths);

    console.log('[getMonthlyTrends] Raw data from database:', data);
    console.log('[getMonthlyTrends] Data length:', data?.length);

    if (error) {
      console.warn('Error fetching monthly trends, falling back to daily aggregation:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No monthly trend data found, falling back to daily aggregation');
      return [];
    }

    // Reverse to get chronological order (oldest to newest)
    const result = data.reverse().map((record: any) => ({
      month: record.month_name,
      year: record.year,
      count: record.value || 0,
      goal: record.goal_value || 0
    }));

    console.log('[getMonthlyTrends] Formatted result:', result);
    return result;
  } catch (err) {
    console.error('Error in getMonthlyTrends:', err);
    return [];
  }
}

/**
 * Gets monthly new-patient totals for the last N months using eod_mtd_new_patients
 * as the authoritative source. For each month, fetches the latest MTD value
 * recorded within that month (the highest as_of_date entry).
 * Falls back to monthly_metric_trends if no MTD data exists for a month.
 */
export async function getMonthlyNewPatientMTD(numMonths: number = 6): Promise<Array<{ month: string; year: number; count: number; goal: number }>> {
  // Return static sample data if in static mode
  if (isStaticDataMode()) {
    return sampleMonthlyNewPatients.slice(-numMonths);
  }

  try {
    const now = new Date();
    const results: Array<{ month: string; year: number; count: number; goal: number }> = [];

    // Build month ranges (oldest to newest)
    const monthRanges: Array<{ year: number; month: number; monthStart: string; monthEnd: string; monthName: string }> = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed
      const monthStart = toLocalDateString(date);
      const lastDay = new Date(year, month + 1, 0);
      // For current month, cap at today
      const effectiveEnd = (year === now.getFullYear() && month === now.getMonth())
        ? now
        : lastDay;
      const monthEnd = toLocalDateString(effectiveEnd);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthRanges.push({ year, month: month + 1, monthStart, monthEnd, monthName });
    }

    console.log('[getMonthlyNewPatientMTD] Fetching MTD values for months:', monthRanges.map(m => m.monthName));

    // Fetch the latest eod_mtd_new_patients for each month in parallel
    const mtdQueries = monthRanges.map(range =>
      supabase
        .from('csd_metric_values')
        .select('value, as_of_date')
        .eq('field_key', 'eod_mtd_new_patients')
        .gte('as_of_date', range.monthStart)
        .lte('as_of_date', range.monthEnd)
        .order('as_of_date', { ascending: false })
        .limit(1)
    );

    // Also fetch monthly_metric_trends as fallback source
    const trendsFallback = supabase
      .from('monthly_metric_trends')
      .select('year, month, month_name, value, goal_value')
      .eq('field_key', 'eod_new_patients')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(numMonths);

    const [trendsResult, ...mtdResults] = await Promise.all([trendsFallback, ...mtdQueries]);

    // Build a lookup from monthly_metric_trends for fallback
    const trendsMap = new Map<string, number>();
    if (trendsResult?.data) {
      trendsResult.data.forEach((record: any) => {
        trendsMap.set(`${record.year}-${record.month}`, record.value || 0);
      });
    }

    // For each month, prefer the MTD value, then fall back to monthly_metric_trends
    monthRanges.forEach((range, index) => {
      const mtdResult = mtdResults[index];
      const mtdValue = mtdResult?.data?.[0]?.value;
      const hasMTD = mtdValue != null && mtdValue > 0;
      const trendValue = trendsMap.get(`${range.year}-${range.month}`) ?? 0;

      const count = hasMTD ? mtdValue : trendValue;

      results.push({
        month: range.monthName,
        year: range.year,
        count,
        goal: 40
      });

      console.log(`[getMonthlyNewPatientMTD] ${range.monthName}: MTD=${mtdValue ?? 'none'}, trend=${trendValue}, using=${count}`);
    });

    return results;
  } catch (err) {
    console.error('Error in getMonthlyNewPatientMTD:', err);
    return [];
  }
}

/**
 * Updates or inserts a monthly trend record
 */
export async function upsertMonthlyTrend(
  fieldKey: string,
  year: number,
  month: number,
  value: number,
  goalValue: number = 0
): Promise<boolean> {
  try {
    const monthDate = new Date(year, month - 1, 1);
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const { error } = await supabase
      .from('monthly_metric_trends')
      .upsert({
        field_key: fieldKey,
        year,
        month,
        month_name: monthName,
        value,
        goal_value: goalValue,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'field_key,year,month'
      });

    if (error) {
      console.error('Error upserting monthly trend:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in upsertMonthlyTrend:', err);
    return false;
  }
}

/**
 * Aggregates new patient counts by month for the last N months
 * Returns an array of {month, year, count} objects
 */
export async function getNewPatientsByMonth(numMonths: number = 6): Promise<Array<{ month: string; year: number; count: number }>> {
  try {
    // Calculate the date range (last N months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (numMonths - 1));
    startDate.setDate(1); // First day of the start month

    const startDateStr = toLocalDateString(startDate);
    const endDateStr = toLocalDateString(endDate);

    // Fetch all new patient data for the date range
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('as_of_date, value')
      .eq('field_key', 'eod_new_patients')
      .gte('as_of_date', startDateStr)
      .lte('as_of_date', endDateStr)
      .order('as_of_date', { ascending: true });

    if (error) {
      console.error('Error fetching new patient data:', error);
      return [];
    }

    // Aggregate by month
    const monthlyTotals = new Map<string, number>();

    data?.forEach((record: any) => {
      const date = new Date(record.as_of_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const currentTotal = monthlyTotals.get(monthKey) || 0;
      monthlyTotals.set(monthKey, currentTotal + (record.value || 0));
    });

    // Build result array for last N months (even if no data)
    const results: Array<{ month: string; year: number; count: number }> = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      results.push({
        month: monthName,
        year: year,
        count: monthlyTotals.get(monthKey) || 0
      });
    }

    return results;
  } catch (err) {
    console.error('Error in getNewPatientsByMonth:', err);
    return [];
  }
}

// Quarter helper: returns label, date range, and 1-indexed month numbers
function getQuarterInfo(year: number, quarterNum: number) {
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
  const quarterStartMonths = [0, 3, 6, 9]; // 0-indexed
  const startMonth = quarterStartMonths[quarterNum - 1];
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0); // last day of quarter
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return {
    label: `${quarterNames[quarterNum - 1]} ${year}`,
    dateRange: `${startStr} - ${endStr}`,
    months: [startMonth + 1, startMonth + 2, startMonth + 3], // 1-indexed for DB
    quarterNum,
    year
  };
}

export interface NPAggregateResult {
  perMonth: number | null;
  perMonthStatus: string; // '' | 'Not calculated'
  perWeek: number | null;
  perWeekStatus: string;  // '' | 'Calculated at end of week' | 'Not calculated'
  quarterly: number | null;
  quarterlyStatus: string; // '' | 'Not calculated'
  quarterlyLabel: string;        // e.g. "Q1 2026"
  quarterlyDateRange: string;    // e.g. "Jan 1 - Mar 31"
  priorQuarterly: number | null;
  priorQuarterlyLabel: string;   // e.g. "Q4 2025"
  priorQuarterlyDateRange: string;
}

/**
 * Aggregates new patient counts for various time periods.
 *
 * Per Month:  Always uses eod_mtd_new_patients. No daily-sum fallback.
 *             Shows "Not calculated" if no MTD data exists.
 *
 * Per Week:   Mon-Thu → status "Calculated at end of week" (no value).
 *             Fri-Sun → sums eod_new_patients for Mon-Fri of current business week.
 *             If no daily entries exist by Friday → "Not calculated".
 *
 * Quarterly:  Current quarter running total = prior completed months (eod_mtd_new_patients)
 *             + current month (eod_mtd_new_patients). All months use MTD as source.
 *             Also returns the prior completed quarter total with clear label.
 */
export async function getNewPatientsAggregates(): Promise<NPAggregateResult> {
  // Return static sample data if in static mode
  if (isStaticDataMode()) {
    const today = new Date();
    const currentQuarterNum = Math.floor(today.getMonth() / 3) + 1;
    const currentQ = getQuarterInfo(today.getFullYear(), currentQuarterNum);
    const priorQNum = currentQuarterNum === 1 ? 4 : currentQuarterNum - 1;
    const priorQYear = currentQuarterNum === 1 ? today.getFullYear() - 1 : today.getFullYear();
    const priorQ = getQuarterInfo(priorQYear, priorQNum);
    return {
      ...sampleNewPatientAggregates,
      perMonthStatus: '',
      perWeekStatus: '',
      quarterlyStatus: '',
      quarterlyLabel: currentQ.label,
      quarterlyDateRange: currentQ.dateRange,
      priorQuarterly: sampleNewPatientAggregates.quarterly,
      priorQuarterlyLabel: priorQ.label,
      priorQuarterlyDateRange: priorQ.dateRange,
    };
  }

  try {
    console.log('[getNewPatientsAggregates] Calculating from eod_mtd_new_patients and daily values...');

    const today = new Date();
    const todayStr = toLocalDateString(today);
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon ... 5=Fri, 6=Sat

    // --- Date ranges ---
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = toLocalDateString(monthStart);

    // Current business week (Mon-Fri)
    // getDay(): 0=Sun,1=Mon..6=Sat  →  daysFromMonday: Mon=0..Sun=6
    const daysFromMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    const mondayStr = toLocalDateString(monday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const fridayStr = toLocalDateString(friday);

    // --- Quarter info ---
    const currentMonth = today.getMonth(); // 0-11
    const currentQuarterNum = Math.floor(currentMonth / 3) + 1;
    const currentQ = getQuarterInfo(today.getFullYear(), currentQuarterNum);

    // Prior quarter
    const priorQNum = currentQuarterNum === 1 ? 4 : currentQuarterNum - 1;
    const priorQYear = currentQuarterNum === 1 ? today.getFullYear() - 1 : today.getFullYear();
    const priorQ = getQuarterInfo(priorQYear, priorQNum);

    // Prior months in the CURRENT quarter (excluding current month, 1-indexed)
    const priorMonthsInCurrentQuarter = currentQ.months.filter(m => m < currentMonth + 1);

    console.log('[getNewPatientsAggregates] Quarter info:', {
      current: currentQ.label, currentMonths: currentQ.months,
      prior: priorQ.label, priorMonths: priorQ.months,
      priorMonthsInCurrentQuarter,
      dayOfWeek, daysFromMonday, mondayStr, fridayStr
    });

    // --- Fetch all data in parallel ---
    const isFriOrLater = dayOfWeek >= 5 || dayOfWeek === 0; // Fri=5, Sat=6, Sun=0

    // Helper: build queries to get latest eod_mtd_new_patients for a list of months
    // Each month gets its own query fetching the latest MTD entry within that month
    const buildMTDQueriesForMonths = (months: number[], year: number) =>
      months.map(m => {
        const mStart = new Date(year, m - 1, 1); // m is 1-indexed
        const mEnd = new Date(year, m, 0); // last day of month
        return supabase
          .from('csd_metric_values')
          .select('value, as_of_date')
          .eq('field_key', 'eod_mtd_new_patients')
          .gte('as_of_date', toLocalDateString(mStart))
          .lte('as_of_date', toLocalDateString(mEnd))
          .order('as_of_date', { ascending: false })
          .limit(1);
      });

    // All months we need for quarterly calculations (for fallback lookup)
    const allQuarterMonths = [
      ...priorMonthsInCurrentQuarter.map(m => ({ month: m, year: today.getFullYear() })),
      ...priorQ.months.map(m => ({ month: m, year: priorQ.year })),
    ];

    // Build MTD queries for prior months in current quarter
    const priorMonthMTDQueries = buildMTDQueriesForMonths(priorMonthsInCurrentQuarter, today.getFullYear());
    // Build MTD queries for all 3 months of the prior quarter
    const priorQuarterMTDQueries = buildMTDQueriesForMonths(priorQ.months, priorQ.year);

    const [
      mtdCurrentMonth,
      weekDailyData,
      trendsFallback,
      ...quarterMTDResults
    ] = await Promise.all([
      // Latest eod_mtd_new_patients for the current month (authoritative MTD total)
      supabase
        .from('csd_metric_values')
        .select('value, as_of_date')
        .eq('field_key', 'eod_mtd_new_patients')
        .gte('as_of_date', monthStartStr)
        .lte('as_of_date', todayStr)
        .order('as_of_date', { ascending: false })
        .limit(1),

      // Daily eod_new_patients for Mon-Fri of this business week (only needed Fri-Sun)
      isFriOrLater
        ? supabase
            .from('csd_metric_values')
            .select('value, as_of_date')
            .eq('field_key', 'eod_new_patients')
            .gte('as_of_date', mondayStr)
            .lte('as_of_date', fridayStr)
        : Promise.resolve({ data: [], error: null }),

      // Fallback: monthly_metric_trends for all quarterly months (used when eod_mtd_new_patients is missing)
      allQuarterMonths.length > 0
        ? supabase
            .from('monthly_metric_trends')
            .select('value, month, year, month_name')
            .eq('field_key', 'eod_new_patients')
            .or(allQuarterMonths.map(m => `and(year.eq.${m.year},month.eq.${m.month})`).join(','))
        : Promise.resolve({ data: [], error: null }),

      // Prior months in current quarter (eod_mtd_new_patients per month)
      ...priorMonthMTDQueries,

      // All 3 months of the prior quarter (eod_mtd_new_patients per month)
      ...priorQuarterMTDQueries,
    ]);

    // Split the quarterMTDResults back into current-quarter-prior-months and prior-quarter
    const priorMonthMTDResults = quarterMTDResults.slice(0, priorMonthMTDQueries.length);
    const priorQuarterMTDResults = quarterMTDResults.slice(priorMonthMTDQueries.length);

    // Build fallback lookup from monthly_metric_trends
    const trendsMap = new Map<string, number>();
    if (trendsFallback?.data) {
      trendsFallback.data.forEach((record: any) => {
        trendsMap.set(`${record.year}-${record.month}`, record.value || 0);
      });
    }

    const sumValues = (result: any) =>
      result?.data?.reduce((sum: number, record: any) => sum + (record.value || 0), 0) || 0;

    // Helper: for an array of MTD query results + corresponding month info,
    // use MTD value if available, otherwise fall back to monthly_metric_trends
    const sumWithFallback = (results: any[], months: number[], year: number) =>
      results.reduce((total, r, i) => {
        const mtdVal = r?.data?.[0]?.value;
        if (mtdVal != null && mtdVal > 0) return total + mtdVal;
        // Fallback to monthly_metric_trends
        const trendVal = trendsMap.get(`${year}-${months[i]}`) ?? 0;
        return total + trendVal;
      }, 0);

    // ========== PER MONTH ==========
    // ONLY use eod_mtd_new_patients. No daily-sum fallback.
    const latestMTDValue = mtdCurrentMonth?.data?.[0]?.value;
    const hasMTD = latestMTDValue != null && latestMTDValue > 0;
    const perMonth = hasMTD ? latestMTDValue : null;
    const perMonthStatus = hasMTD ? '' : 'Not calculated';

    console.log('[getNewPatientsAggregates] perMonth:', {
      mtdValue: latestMTDValue,
      mtdDate: mtdCurrentMonth?.data?.[0]?.as_of_date,
      final: perMonth, status: perMonthStatus
    });

    // ========== PER WEEK ==========
    // Mon-Thu: "Calculated at end of week"
    // Fri/Sat/Sun: sum daily eod_new_patients for Mon-Fri; if none → "Not calculated"
    let perWeek: number | null = null;
    let perWeekStatus = '';

    if (!isFriOrLater) {
      // Monday through Thursday
      perWeekStatus = 'Calculated at end of week';
    } else {
      // Friday, Saturday, or Sunday — calculate from this week's Mon-Fri dailies
      const weekSum = sumValues(weekDailyData);
      const hasWeekData = weekDailyData?.data && weekDailyData.data.length > 0;

      if (hasWeekData && weekSum > 0) {
        perWeek = weekSum;
        perWeekStatus = '';
      } else {
        perWeekStatus = 'Not calculated';
      }
    }

    console.log('[getNewPatientsAggregates] perWeek:', {
      dayOfWeek, isFriOrLater,
      weekDailyRecords: weekDailyData?.data?.length,
      final: perWeek, status: perWeekStatus
    });

    // ========== QUARTERLY ==========
    // Current quarter running total = prior completed months in quarter + current month MTD
    // Each month: try eod_mtd_new_patients first, fall back to monthly_metric_trends
    const priorMonthsTotal = sumWithFallback(priorMonthMTDResults, priorMonthsInCurrentQuarter, today.getFullYear());
    const currentMonthMTD = perMonth ?? 0;
    const quarterly = priorMonthsTotal + currentMonthMTD;
    const quarterlyStatus = (priorMonthsTotal === 0 && currentMonthMTD === 0) ? 'Not calculated' : '';

    // Prior quarter: same fallback logic
    const priorQuarterly = sumWithFallback(priorQuarterMTDResults, priorQ.months, priorQ.year);
    const hasPriorQuarterData = priorQuarterly > 0;

    console.log('[getNewPatientsAggregates] quarterly:', {
      priorMonthsInQuarter: priorMonthsTotal,
      priorMonthDetails: priorMonthsInCurrentQuarter.map((m, i) => {
        const mtdVal = priorMonthMTDResults[i]?.data?.[0]?.value;
        const trendVal = trendsMap.get(`${today.getFullYear()}-${m}`) ?? 0;
        return { month: m, mtd: mtdVal ?? 'none', trend: trendVal, used: (mtdVal != null && mtdVal > 0) ? mtdVal : trendVal };
      }),
      currentMonthMTD,
      currentQuarterTotal: quarterly,
      priorQuarterTotal: priorQuarterly,
      priorQuarterDetails: priorQ.months.map((m: number, i: number) => {
        const mtdVal = priorQuarterMTDResults[i]?.data?.[0]?.value;
        const trendVal = trendsMap.get(`${priorQ.year}-${m}`) ?? 0;
        return { month: m, mtd: mtdVal ?? 'none', trend: trendVal, used: (mtdVal != null && mtdVal > 0) ? mtdVal : trendVal };
      })
    });

    return {
      perMonth,
      perMonthStatus,
      perWeek,
      perWeekStatus,
      quarterly: quarterlyStatus === '' ? quarterly : null,
      quarterlyStatus,
      quarterlyLabel: currentQ.label,
      quarterlyDateRange: currentQ.dateRange,
      priorQuarterly: hasPriorQuarterData ? priorQuarterly : null,
      priorQuarterlyLabel: priorQ.label,
      priorQuarterlyDateRange: priorQ.dateRange,
    };
  } catch (err) {
    console.error('Error in getNewPatientsAggregates:', err);
    const today = new Date();
    const currentQuarterNum = Math.floor(today.getMonth() / 3) + 1;
    const currentQ = getQuarterInfo(today.getFullYear(), currentQuarterNum);
    const priorQNum = currentQuarterNum === 1 ? 4 : currentQuarterNum - 1;
    const priorQYear = currentQuarterNum === 1 ? today.getFullYear() - 1 : today.getFullYear();
    const priorQ = getQuarterInfo(priorQYear, priorQNum);
    return {
      perMonth: null,
      perMonthStatus: 'Not calculated',
      perWeek: null,
      perWeekStatus: 'Not calculated',
      quarterly: null,
      quarterlyStatus: 'Not calculated',
      quarterlyLabel: currentQ.label,
      quarterlyDateRange: currentQ.dateRange,
      priorQuarterly: null,
      priorQuarterlyLabel: priorQ.label,
      priorQuarterlyDateRange: priorQ.dateRange,
    };
  }
}

/**
 * Aggregates payment totals for various time periods
 */
export async function getPaymentAggregates() {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Calculate date ranges
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const monthStart = new Date(currentYear, currentMonth, 1);

    // Fetch data for each period
    const [weekData, monthData] = await Promise.all([
      // Last 7 days
      supabase
        .from('csd_metric_values')
        .select('value')
        .eq('field_key', 'todays_payments')
        .gte('as_of_date', toLocalDateString(sevenDaysAgo))
        .lte('as_of_date', toLocalDateString(today)),

      // Current month
      supabase
        .from('csd_metric_values')
        .select('value')
        .eq('field_key', 'todays_payments')
        .gte('as_of_date', toLocalDateString(monthStart))
        .lte('as_of_date', toLocalDateString(today)),
    ]);

    // Sum up the values
    const sumValues = (data: any) => {
      return data?.data?.reduce((sum: number, record: any) => sum + (record.value || 0), 0) || 0;
    };

    return {
      perWeek: sumValues(weekData),
      perMonth: sumValues(monthData),
    };
  } catch (err) {
    console.error('Error in getPaymentAggregates:', err);
    return {
      perWeek: 0,
      perMonth: 0,
    };
  }
}

/**
 * Gets BAM cycle revenue for a specific cycle date range
 * Returns the most recent bam_current_revenue entry within the cycle,
 * since each entry represents the cumulative running total for that cycle.
 * Returns 0 if no data exists for the cycle (new cycle with no data entered yet)
 */
export async function getBAMCycleRevenue(cycleStartDate: Date | null, cycleEndDate: Date | null): Promise<number> {
  try {
    // If no cycle dates provided, return 0
    if (!cycleStartDate || !cycleEndDate) {
      console.log('[getBAMCycleRevenue] No cycle dates provided, returning 0');
      return 0;
    }

    const startDateStr = toLocalDateString(cycleStartDate);
    const endDateStr = toLocalDateString(cycleEndDate);

    console.log('[getBAMCycleRevenue] Fetching BAM revenue for cycle:', startDateStr, 'to', endDateStr);

    // Fetch the most recent bam_current_revenue entry within the cycle date range.
    // Each entry is a cumulative running total, so we only need the latest one.
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('value, as_of_date')
      .eq('field_key', 'bam_current_revenue')
      .gte('as_of_date', startDateStr)
      .lte('as_of_date', endDateStr)
      .order('as_of_date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[getBAMCycleRevenue] Error fetching BAM cycle revenue:', error);
      return 0;
    }

    const latestRevenue = data?.[0]?.value || 0;

    console.log('[getBAMCycleRevenue] Latest entry:', data?.[0]?.as_of_date, 'revenue:', latestRevenue);

    return latestRevenue;
  } catch (err) {
    console.error('[getBAMCycleRevenue] Unexpected error:', err);
    return 0;
  }
}

/**
 * Gets claims totals by querying the claims table directly
 * AUTO-CALCULATED - Eliminates manual entry of claim counts (Phase 2)
 */
export async function getClaimsTotals() {
  try {
    console.log('[getClaimsTotals] Auto-calculating from claims table...');

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = toLocalDateString(sixtyDaysAgo);

    const [activeClaimsResult, pendingResult, deniedResult, oldClaimsResult] = await Promise.all([
      // Total active claims (not archived)
      supabase
        .from('claims')
        .select('id', { count: 'exact', head: true })
        .eq('archived', false),

      // Pending claims
      supabase
        .from('claims')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('archived', false),

      // Denied claims
      supabase
        .from('claims')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'denied')
        .eq('archived', false),

      // Claims over 60 days old
      supabase
        .from('claims')
        .select('id', { count: 'exact', head: true })
        .lt('date_submitted', sixtyDaysAgoStr)
        .eq('archived', false),
    ]);

    const result = {
      activeClaims: activeClaimsResult.count || 0,
      pending: pendingResult.count || 0,
      denied: deniedResult.count || 0,
      overSixtyDays: oldClaimsResult.count || 0,
    };

    console.log('[getClaimsTotals] Auto-calculated claim counts:', result);
    return result;
  } catch (err) {
    console.error('Error in getClaimsTotals:', err);
    return {
      activeClaims: 0,
      pending: 0,
      denied: 0,
      overSixtyDays: 0,
    };
  }
}

export async function getMetricsForDate(date: string) {
  // Include data mode in cache key to prevent stale data when switching modes
  const dataMode = isStaticDataMode() ? 'static' : 'live';
  const cacheKey = `${date}-${dataMode}`;

  // Check cache first
  const cached = metricsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached ${dataMode} metrics for date:`, date);
    return cached.data;
  }

  // Return static sample data if in static mode
  if (isStaticDataMode()) {
    const { sampleProviderMetrics } = await import('../data/sampleData');
    // Update the date to match the requested date
    const staticData = sampleProviderMetrics.map(metric => ({
      ...metric,
      as_of_date: date
    }));

    // Cache the static data
    metricsCache.set(cacheKey, { data: staticData, timestamp: Date.now() });
    return staticData;
  }

  console.log('Fetching metrics for date:', date);

  try {
    // Fallback: fetch data separately and join client-side
    // This approach is more reliable and doesn't depend on foreign key constraints
    const [valuesResult, catalogResult] = await Promise.all([
      supabase
        .from('csd_metric_values')
        .select('*')
        .eq('as_of_date', date)
        .order('field_key', { ascending: true }),
      supabase
        .from('csd_metric_catalog')
        .select('field_key, section, field_name, data_type, description_notes')
    ]);

    if (valuesResult.error) {
      console.error('Error fetching metric values:', valuesResult.error);
      throw new Error(`Failed to fetch metrics: ${valuesResult.error.message}`);
    }

    if (catalogResult.error) {
      console.error('Error fetching metric catalog:', catalogResult.error);
      throw new Error(`Failed to fetch metric catalog: ${catalogResult.error.message}`);
    }

    console.log('Fetched values:', valuesResult.data?.length, 'records');
    console.log('Fetched catalog:', catalogResult.data?.length, 'entries');

    if (valuesResult.data && valuesResult.data.length > 0) {
      console.log('Sample value record:', valuesResult.data[0]);
      console.log('Available columns:', Object.keys(valuesResult.data[0]));
    }

    // Create a lookup map for the catalog
    const catalogMap = new Map(
      catalogResult.data?.map(cat => [
        cat.field_key,
        {
          section: cat.section,
          field_name: cat.field_name,
          data_type: cat.data_type,
          description_notes: cat.description_notes
        }
      ]) || []
    );

    // Join the data client-side
    const joined: MetricWithValue[] = (valuesResult.data || []).map(item => ({
      field_key: item.field_key,
      as_of_date: item.as_of_date || date,
      value: item.value || 0,
      source: item.source || null,
      notes: item.notes || null,
      csd_metric_catalog: catalogMap.get(item.field_key) || null
    }));

    console.log('Client-side joined data:', joined.length, 'records');

    // Cache the result with data mode in key
    metricsCache.set(cacheKey, { data: joined, timestamp: Date.now() });

    return joined;
  } catch (err) {
    console.error('Unexpected error in getMetricsForDate:', err);
    throw err;
  }
}

/**
 * Gets weekly scorecard data for the last N weeks
 * Aggregates daily metrics into weekly summaries
 */
export async function getWeeklyScorecardData(numWeeks: number = 12) {
  // Return static sample data if in static mode
  if (isStaticDataMode()) {
    return sampleWeeklyScorecardData.slice(-numWeeks);
  }

  try {
    const today = new Date();
    const startDate = new Date(today);
    // Fetch an extra week of data to account for the prior-week attribution shift:
    // metrics entered during week N represent week N-1's performance
    startDate.setDate(today.getDate() - ((numWeeks + 1) * 7));

    const startDateStr = toLocalDateString(startDate);
    const todayStr = toLocalDateString(today);

    console.log('[getWeeklyScorecardData] Fetching data from', startDateStr, 'to', todayStr);

    // Fetch all relevant scorecard metrics for the date range
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('field_key, as_of_date, value')
      .in('field_key', [
        'scorecard_show_rate_dr',
        'scorecard_show_rate_hyg',
        'eod_new_patients',
        'scorecard_total_tx_presented',
        'scorecard_total_tx_accepted',
        'scorecard_tx_acceptance',
        'collection_rate',
        'scorecard_five_star_reviews'
      ])
      .gte('as_of_date', startDateStr)
      .lte('as_of_date', todayStr)
      .order('as_of_date', { ascending: true });

    if (error) {
      console.error('[getWeeklyScorecardData] Error fetching data:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[getWeeklyScorecardData] No data found');
      return [];
    }

    // Group data by week (weeks run Monday–Sunday).
    // Scorecard metrics are entered via the Monday metrics report (or anytime
    // during a calendar week) and represent the PRIOR week's performance.
    // Therefore we attribute each record to the previous week by subtracting
    // 7 days before computing the week's Monday.
    const weeklyData: Map<string, any> = new Map();

    data.forEach((record) => {
      const date = new Date(record.as_of_date);

      // Shift back 7 days so metrics entered during week N are
      // attributed to week N-1 (the week the data actually represents)
      const priorWeekDate = new Date(date);
      priorWeekDate.setDate(date.getDate() - 7);

      // Get the Monday of the prior week
      const dayOfWeek = priorWeekDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = (dayOfWeek + 6) % 7; // Monday = 0, Tuesday = 1, ..., Sunday = 6
      const monday = new Date(priorWeekDate);
      monday.setDate(priorWeekDate.getDate() - daysFromMonday);
      const weekKey = toLocalDateString(monday);

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          weekStartDate: weekKey,
          showRateDr: [],
          showRateHyg: [],
          newPts: [],
          txPresented: [],
          txAccepted: [],
          txAcceptance: [],
          collectionRate: [],
          fiveStars: []
        });
      }

      const weekData = weeklyData.get(weekKey);

      switch (record.field_key) {
        case 'scorecard_show_rate_dr':
          weekData.showRateDr.push(record.value);
          break;
        case 'scorecard_show_rate_hyg':
          weekData.showRateHyg.push(record.value);
          break;
        case 'eod_new_patients':
          weekData.newPts.push(record.value);
          break;
        case 'scorecard_total_tx_presented':
          weekData.txPresented.push(record.value);
          break;
        case 'scorecard_total_tx_accepted':
          weekData.txAccepted.push(record.value);
          break;
        case 'scorecard_tx_acceptance':
          weekData.txAcceptance.push(record.value);
          break;
        case 'collection_rate':
          weekData.collectionRate.push(record.value);
          break;
        case 'scorecard_five_star_reviews':
          weekData.fiveStars.push(record.value);
          break;
      }
    });

    // Calculate weekly averages/sums and format output.
    // Sort by week-start date chronologically, then limit to the requested
    // number of weeks (we fetched one extra week of raw data above).
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const result = Array.from(weeklyData.entries())
      .sort(([a], [b]) => a.localeCompare(b)) // sort by week-start ISO date
      .slice(-numWeeks) // keep only the most recent numWeeks
      .map(([weekStart, data], index) => {
        const weekDate = new Date(weekStart);
        const formattedDate = `${weekDate.getMonth() + 1}/${weekDate.getDate()}/${weekDate.getFullYear()}`;

        return {
          week: index + 1,
          date: formattedDate,
          showRateDr: avg(data.showRateDr),
          showRateHyg: avg(data.showRateHyg),
          newPts: sum(data.newPts),
          txPresented: Math.round(sum(data.txPresented)),
          txAcceptPct: avg(data.txAcceptance),
          txAccepted: Math.round(sum(data.txAccepted)),
          collectionPct: avg(data.collectionRate),
          fiveStars: sum(data.fiveStars)
        };
      });

    console.log('[getWeeklyScorecardData] Aggregated', result.length, 'weeks of data');
    return result;
  } catch (err) {
    console.error('[getWeeklyScorecardData] Unexpected error:', err);
    return [];
  }
}
