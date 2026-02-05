// src/services/metrics.ts
import { supabase } from '../lib/supabaseClient';
import { isStaticDataMode } from '../config/dataMode';
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

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

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

/**
 * Aggregates new patient counts for various time periods
 * AUTO-CALCULATED from daily eod_new_patients values (Phase 2)
 * Quarterly calculation uses monthly_metric_trends for consistency with monthly display
 */
export async function getNewPatientsAggregates() {
  // Return static sample data if in static mode
  if (isStaticDataMode()) {
    return sampleNewPatientAggregates;
  }

  try {
    console.log('[getNewPatientsAggregates] Auto-calculating from daily eod_new_patients values...');

    const today = new Date();

    // Calculate date ranges
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate current calendar quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
    const currentMonth = today.getMonth(); // 0-11
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3; // 0, 3, 6, or 9
    const quarterStart = new Date(today.getFullYear(), quarterStartMonth, 1);
    const quarterEnd = new Date(today.getFullYear(), quarterStartMonth + 3, 0); // Last day of quarter

    // Get the months in the current quarter (0-indexed)
    const quarterMonths = [quarterStartMonth, quarterStartMonth + 1, quarterStartMonth + 2];

    console.log('[getNewPatientsAggregates] Calendar quarter:', {
      start: quarterStart.toISOString().split('T')[0],
      end: quarterEnd.toISOString().split('T')[0],
      quarter: `Q${Math.floor(currentMonth / 3) + 1}`,
      months: quarterMonths.map(m => m + 1) // 1-indexed for display
    });

    // Fetch daily new patient data for different time ranges
    const [weekData, monthData, quarterMonthlyData, quarterDailyFallback] = await Promise.all([
      // Last 7 days
      supabase
        .from('csd_metric_values')
        .select('value')
        .eq('field_key', 'eod_new_patients')
        .gte('as_of_date', sevenDaysAgo.toISOString().split('T')[0])
        .lte('as_of_date', today.toISOString().split('T')[0]),

      // Current month (from start of month to today)
      supabase
        .from('csd_metric_values')
        .select('value')
        .eq('field_key', 'eod_new_patients')
        .gte('as_of_date', monthStart.toISOString().split('T')[0])
        .lte('as_of_date', today.toISOString().split('T')[0]),

      // Current quarter from monthly_metric_trends (preferred method for consistency)
      supabase
        .from('monthly_metric_trends')
        .select('value, month, year, month_name')
        .eq('field_key', 'eod_new_patients')
        .eq('year', today.getFullYear())
        .in('month', quarterMonths.map(m => m + 1)), // monthly_metric_trends uses 1-indexed months

      // Fallback: Current quarter from daily values (in case monthly trends are not populated)
      supabase
        .from('csd_metric_values')
        .select('value, as_of_date')
        .eq('field_key', 'eod_new_patients')
        .gte('as_of_date', quarterStart.toISOString().split('T')[0])
        .lte('as_of_date', today.toISOString().split('T')[0]),
    ]);

    // Sum up the values
    const sumValues = (data: any) => {
      return data?.data?.reduce((sum: number, record: any) => sum + (record.value || 0), 0) || 0;
    };

    const perWeek = sumValues(weekData);
    const perMonth = sumValues(monthData);

    // Calculate quarterly: prefer monthly_metric_trends, fallback to daily aggregation
    let quarterly = 0;
    let quarterlySource = 'unknown';

    if (quarterMonthlyData?.data && quarterMonthlyData.data.length > 0) {
      // Use monthly aggregates (preferred - consistent with monthly display)
      quarterly = sumValues(quarterMonthlyData);
      quarterlySource = 'monthly_metric_trends';

      console.log('[getNewPatientsAggregates] Using monthly_metric_trends for quarterly:', {
        monthsFound: quarterMonthlyData.data.length,
        monthDetails: quarterMonthlyData.data.map((m: any) => ({
          month: m.month_name,
          value: m.value
        })),
        quarterlyTotal: quarterly
      });
    } else {
      // Fallback to daily aggregation
      quarterly = sumValues(quarterDailyFallback);
      quarterlySource = 'daily_aggregation';

      console.log('[getNewPatientsAggregates] Falling back to daily aggregation for quarterly:', {
        dailyRecords: quarterDailyFallback?.data?.length || 0,
        quarterlyTotal: quarterly
      });
    }

    console.log('[getNewPatientsAggregates] Auto-calculated aggregates:', {
      perWeek,
      perMonth,
      quarterly,
      quarterlySource,
      weekRecords: weekData?.data?.length || 0,
      monthRecords: monthData?.data?.length || 0
    });

    // Detailed breakdown for debugging
    if (quarterlySource === 'daily_aggregation' && quarterDailyFallback?.data) {
      const dateValuePairs = quarterDailyFallback.data.map((r: any) => ({
        date: r.as_of_date,
        value: r.value
      }));
      console.log('[getNewPatientsAggregates] Daily breakdown for quarter:', dateValuePairs);
    }

    return {
      perWeek,
      perMonth,
      quarterly
    };
  } catch (err) {
    console.error('Error in getNewPatientsAggregates:', err);
    return {
      perWeek: 0,
      perMonth: 0,
      quarterly: 0
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
        .gte('as_of_date', sevenDaysAgo.toISOString().split('T')[0])
        .lte('as_of_date', today.toISOString().split('T')[0]),

      // Current month
      supabase
        .from('csd_metric_values')
        .select('value')
        .eq('field_key', 'todays_payments')
        .gte('as_of_date', monthStart.toISOString().split('T')[0])
        .lte('as_of_date', today.toISOString().split('T')[0]),
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
 * Filters revenue entries by as_of_date within the cycle and sums them
 * Returns 0 if no data exists for the cycle (new cycle with no data entered yet)
 */
export async function getBAMCycleRevenue(cycleStartDate: Date | null, cycleEndDate: Date | null): Promise<number> {
  try {
    // If no cycle dates provided, return 0
    if (!cycleStartDate || !cycleEndDate) {
      console.log('[getBAMCycleRevenue] No cycle dates provided, returning 0');
      return 0;
    }

    const startDateStr = cycleStartDate.toISOString().split('T')[0];
    const endDateStr = cycleEndDate.toISOString().split('T')[0];

    console.log('[getBAMCycleRevenue] Fetching BAM revenue for cycle:', startDateStr, 'to', endDateStr);

    // Fetch all bam_current_revenue entries within the cycle date range
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('value, as_of_date')
      .eq('field_key', 'bam_current_revenue')
      .gte('as_of_date', startDateStr)
      .lte('as_of_date', endDateStr);

    if (error) {
      console.error('[getBAMCycleRevenue] Error fetching BAM cycle revenue:', error);
      return 0;
    }

    // Sum up all revenue entries for this cycle
    const totalRevenue = data?.reduce((sum: number, record: any) => sum + (record.value || 0), 0) || 0;

    console.log('[getBAMCycleRevenue] Found', data?.length || 0, 'entries, total revenue:', totalRevenue);

    return totalRevenue;
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
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

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
    startDate.setDate(today.getDate() - (numWeeks * 7));

    const startDateStr = startDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

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

    // Group data by week
    // Week starts on Monday
    const weeklyData: Map<string, any> = new Map();

    data.forEach((record) => {
      const date = new Date(record.as_of_date);

      // Get the Monday of the week this date belongs to
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = (dayOfWeek + 6) % 7; // Monday = 0, Tuesday = 1, ..., Sunday = 6
      const monday = new Date(date);
      monday.setDate(date.getDate() - daysFromMonday);
      const weekKey = monday.toISOString().split('T')[0];

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

    // Calculate weekly averages/sums and format output
    const result = Array.from(weeklyData.entries())
      .map(([weekStart, data], index) => {
        const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

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
      })
      .sort((a, b) => a.week - b.week);

    console.log('[getWeeklyScorecardData] Aggregated', result.length, 'weeks of data');
    return result;
  } catch (err) {
    console.error('[getWeeklyScorecardData] Unexpected error:', err);
    return [];
  }
}
