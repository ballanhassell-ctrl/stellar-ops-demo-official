// src/services/metrics.ts
import { supabase } from '../lib/supabaseClient';

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
 */
export async function getLatestMetricValue(fieldKey: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('value, as_of_date')
      .eq('field_key', fieldKey)
      .order('as_of_date', { ascending: false })
      .limit(1)
      .single();

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
 */
export async function getLatestMetricValues(fieldKeys: string[]): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  try {
    // Fetch all the latest values in parallel
    const promises = fieldKeys.map(async (fieldKey) => {
      const { data, error } = await supabase
        .from('csd_metric_values')
        .select('value, as_of_date')
        .eq('field_key', fieldKey)
        .order('as_of_date', { ascending: false })
        .limit(1)
        .maybeSingle();

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
  try {
    const { data, error } = await supabase
      .from('monthly_metric_trends')
      .select('year, month, month_name, value, goal_value')
      .eq('field_key', fieldKey)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(numMonths);

    if (error) {
      console.warn('Error fetching monthly trends, falling back to daily aggregation:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No monthly trend data found, falling back to daily aggregation');
      return [];
    }

    // Reverse to get chronological order (oldest to newest)
    return data.reverse().map((record: any) => ({
      month: record.month_name,
      year: record.year,
      count: record.value || 0,
      goal: record.goal_value || 0
    }));
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
 */
export async function getNewPatientsAggregates() {
  try {
    console.log('[getNewPatientsAggregates] Fetching pre-calculated aggregate values...');

    // Fetch the latest pre-calculated aggregate values from Supabase
    // These are already calculated and stored as: new_pts_per_week, new_pts_per_month, new_pts_quarterly
    const [weekData, monthData, quarterData] = await Promise.all([
      supabase
        .from('csd_metric_values')
        .select('value, as_of_date')
        .eq('field_key', 'new_pts_per_week')
        .order('as_of_date', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('csd_metric_values')
        .select('value, as_of_date')
        .eq('field_key', 'new_pts_per_month')
        .order('as_of_date', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('csd_metric_values')
        .select('value, as_of_date')
        .eq('field_key', 'new_pts_quarterly')
        .order('as_of_date', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    const perWeek = weekData?.data?.value || 0;
    const perMonth = monthData?.data?.value || 0;
    const quarterly = quarterData?.data?.value || 0;

    console.log('[getNewPatientsAggregates] Retrieved values:', {
      perWeek,
      perMonth,
      quarterly,
      weekDate: weekData?.data?.as_of_date,
      monthDate: monthData?.data?.as_of_date,
      quarterDate: quarterData?.data?.as_of_date
    });

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

export async function getMetricsForDate(date: string) {
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
    // Week starts on Sunday
    const weeklyData: Map<string, any> = new Map();

    data.forEach((record) => {
      const date = new Date(record.as_of_date);

      // Get the Sunday of the week this date belongs to
      const dayOfWeek = date.getDay();
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - dayOfWeek);
      const weekKey = sunday.toISOString().split('T')[0];

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
