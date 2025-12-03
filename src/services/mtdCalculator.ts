// src/services/mtdCalculator.ts
/**
 * MTD (Month-to-Date) Calculator Service
 * Ensures MTD Production and MTD Collected are consistent with BAM revenue and other data points
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Calculate MTD Production based on BAM Current Revenue
 * MTD Production should equal BAM Current Revenue for the current billing cycle
 */
export async function calculateMTDProduction(_date: string): Promise<number> {
  try {
    // Fetch BAM Current Revenue (this is the authoritative source for monthly production)
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select('value')
      .eq('field_key', 'bam_current_revenue')
      .order('as_of_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching BAM revenue:', error);
      return 0;
    }

    return data?.value || 0;
  } catch (err) {
    console.error('Error calculating MTD production:', err);
    return 0;
  }
}

/**
 * Calculate MTD Collected by summing daily payments for the current month
 */
export async function calculateMTDCollected(date: string): Promise<number> {
  try {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // First day of current month
    const monthStart = new Date(year, month, 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Last day of current month or current date, whichever is earlier
    const monthEnd = new Date(year, month + 1, 0);
    const currentDate = new Date(date);
    const endDate = currentDate < monthEnd ? currentDate : monthEnd;
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`Calculating MTD Collected from ${monthStartStr} to ${endDateStr}`);

    // Sum all daily payments for the month
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
    console.log(`MTD Collected total: ${total}`);

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
 * Calculate MTD New Patients by summing daily new patients for the current month
 */
export async function calculateMTDNewPatients(date: string): Promise<number> {
  try {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const endDateStr = date;

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
