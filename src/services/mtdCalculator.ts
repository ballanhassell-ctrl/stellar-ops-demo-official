// src/services/mtdCalculator.ts
/**
 * MTD (Month-to-Date) Calculator Service
 * Ensures MTD Production and MTD Collected are consistent with BAM revenue and other data points
 */

import { supabase } from '../lib/supabaseClient';
import { toLocalDateString } from '../utils/dateUtils';

/**
 * Calculate MTD Production by reading the most recent eod_mtd_production value for the month.
 * Falls back to summing daily eod_daily_production if no stored MTD value exists.
 * The stored eod_mtd_production is the authoritative source (uploaded via CSV).
 */
export async function calculateMTDProduction(date: string): Promise<number> {
  try {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // First day of current month
    const monthStart = new Date(year, month, 1);
    const monthStartStr = toLocalDateString(monthStart);

    // Last day of current month or current date, whichever is earlier
    const monthEnd = new Date(year, month + 1, 0);
    const currentDate = new Date(date);
    const endDate = currentDate < monthEnd ? currentDate : monthEnd;
    const endDateStr = toLocalDateString(endDate);

    console.log(`Calculating MTD Production from ${monthStartStr} to ${endDateStr}`);

    // First, try to get the most recent stored eod_mtd_production for this month
    const { data: mtdData, error: mtdError } = await supabase
      .from('csd_metric_values')
      .select('value, as_of_date')
      .eq('field_key', 'eod_mtd_production')
      .gte('as_of_date', monthStartStr)
      .lte('as_of_date', endDateStr)
      .order('as_of_date', { ascending: false })
      .limit(1);

    if (!mtdError && mtdData && mtdData.length > 0 && mtdData[0].value > 0) {
      console.log(`MTD Production from stored value (${mtdData[0].as_of_date}): ${mtdData[0].value}`);
      return mtdData[0].value;
    }

    // Fallback: Sum all daily production for the month
    console.log('No stored MTD production found, falling back to daily sum');
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('value')
      .eq('field_key', 'eod_daily_production')
      .gte('as_of_date', monthStartStr)
      .lte('as_of_date', endDateStr);

    if (error) {
      console.error('Error fetching daily production:', error);
      return 0;
    }

    const total = data?.reduce((sum, record) => sum + (record.value || 0), 0) || 0;
    console.log(`MTD Production total (from daily sum): ${total}`);

    return total;
  } catch (err) {
    console.error('Error calculating MTD production:', err);
    return 0;
  }
}

/**
 * Calculate MTD Collected by reading the most recent eod_mtd_collected value for the month.
 * Falls back to summing daily eod_payments_collected if no stored MTD value exists.
 * The stored eod_mtd_collected is the authoritative source (uploaded via CSV).
 */
export async function calculateMTDCollected(date: string): Promise<number> {
  try {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // First day of current month
    const monthStart = new Date(year, month, 1);
    const monthStartStr = toLocalDateString(monthStart);

    // Last day of current month or current date, whichever is earlier
    const monthEnd = new Date(year, month + 1, 0);
    const currentDate = new Date(date);
    const endDate = currentDate < monthEnd ? currentDate : monthEnd;
    const endDateStr = toLocalDateString(endDate);

    console.log(`Calculating MTD Collected from ${monthStartStr} to ${endDateStr}`);

    // First, try to get the most recent stored eod_mtd_collected for this month
    const { data: mtdData, error: mtdError } = await supabase
      .from('csd_metric_values')
      .select('value, as_of_date')
      .eq('field_key', 'eod_mtd_collected')
      .gte('as_of_date', monthStartStr)
      .lte('as_of_date', endDateStr)
      .order('as_of_date', { ascending: false })
      .limit(1);

    if (!mtdError && mtdData && mtdData.length > 0 && mtdData[0].value > 0) {
      console.log(`MTD Collected from stored value (${mtdData[0].as_of_date}): ${mtdData[0].value}`);
      return mtdData[0].value;
    }

    // Fallback: Sum all daily payments for the month
    console.log('No stored MTD collected found, falling back to daily sum');
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('value')
      .eq('field_key', 'eod_payments_collected')
      .gte('as_of_date', monthStartStr)
      .lte('as_of_date', endDateStr);

    if (error) {
      console.error('Error fetching daily payments:', error);
      return 0;
    }

    const total = data?.reduce((sum, record) => sum + (record.value || 0), 0) || 0;
    console.log(`MTD Collected total (from daily sum): ${total}`);

    return total;
  } catch (err) {
    console.error('Error calculating MTD collected:', err);
    return 0;
  }
}

/**
 * Calculate MTD Collection Rate
 */
export function calculateCollectionRate(production: number, collected: number): number {
  if (production === 0) return 0;
  return Math.round((collected / production) * 100);
}

/**
 * Calculate MTD New Patients by reading the most recent eod_mtd_new_patients value for the month.
 * Falls back to summing daily eod_new_patients if no stored MTD value exists.
 */
export async function calculateMTDNewPatients(date: string): Promise<number> {
  try {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthStartStr = toLocalDateString(monthStart);

    const endDateStr = date;

    // First, try to get the most recent stored eod_mtd_new_patients for this month
    const { data: mtdData, error: mtdError } = await supabase
      .from('csd_metric_values')
      .select('value, as_of_date')
      .eq('field_key', 'eod_mtd_new_patients')
      .gte('as_of_date', monthStartStr)
      .lte('as_of_date', endDateStr)
      .order('as_of_date', { ascending: false })
      .limit(1);

    if (!mtdError && mtdData && mtdData.length > 0 && mtdData[0].value > 0) {
      console.log(`MTD New Patients from stored value (${mtdData[0].as_of_date}): ${mtdData[0].value}`);
      return mtdData[0].value;
    }

    // Fallback: Sum all daily new patients for the month
    console.log('No stored MTD new patients found, falling back to daily sum');
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('value')
      .eq('field_key', 'eod_new_patients')
      .gte('as_of_date', monthStartStr)
      .lte('as_of_date', endDateStr);

    if (error) {
      console.error('Error fetching daily new patients:', error);
      return 0;
    }

    return data?.reduce((sum, record) => sum + (record.value || 0), 0) || 0;
  } catch (err) {
    console.error('Error calculating MTD new patients:', err);
    return 0;
  }
}

/**
 * Sync MTD metrics to Supabase
 * This ensures MTD Production matches BAM Revenue and MTD Collected is calculated from daily totals
 */
export async function syncMTDMetrics(date: string): Promise<boolean> {
  try {
    const production = await calculateMTDProduction(date);
    const collected = await calculateMTDCollected(date);
    const collectionRate = calculateCollectionRate(production, collected);
    const newPatients = await calculateMTDNewPatients(date);

    // MTD Production Goal is $300,000 for the full month (30 days)
    // This is different from BAM cycle goal which is typically for ~19 business days
    const productionGoal = 300000;

    // Upsert all MTD metrics
    const metricsToUpdate = [
      { field_key: 'eod_mtd_production', value: production },
      { field_key: 'eod_mtd_production_goal', value: productionGoal },
      { field_key: 'eod_mtd_collected', value: collected },
      { field_key: 'eod_mtd_collection_rate', value: collectionRate },
      { field_key: 'eod_mtd_new_patients', value: newPatients },
    ];

    for (const metric of metricsToUpdate) {
      await supabase
        .from('csd_metric_values')
        .upsert({
          as_of_date: date,
          field_key: metric.field_key,
          value: metric.value,
          source: 'auto_calculated',
          notes: 'Auto-calculated from BAM revenue and daily totals',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'as_of_date,field_key'
        });
    }

    console.log('MTD metrics synced successfully:', {
      production,
      productionGoal,
      collected,
      collectionRate,
      newPatients
    });

    return true;
  } catch (err) {
    console.error('Error syncing MTD metrics:', err);
    return false;
  }
}

/**
 * Get MTD metrics (calculates if not in DB)
 */
export async function getMTDMetrics(date: string) {
  const production = await calculateMTDProduction(date);
  const collected = await calculateMTDCollected(date);
  const collectionRate = calculateCollectionRate(production, collected);
  const newPatients = await calculateMTDNewPatients(date);

  // MTD Production Goal is $300,000 for the full month (30 days)
  // This is different from BAM cycle goal which is typically for ~19 business days
  const productionGoal = 300000;

  return {
    production,
    productionGoal,
    collected,
    collectionRate,
    newPatients
  };
}
