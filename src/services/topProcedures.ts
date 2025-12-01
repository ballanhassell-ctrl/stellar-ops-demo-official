// src/services/topProcedures.ts
/**
 * Service for fetching and managing top procedures data
 */

import { supabase } from '../lib/supabaseClient';

export interface TopProcedure {
  id: string;
  procedure_name: string;
  procedure_code: string;
  count: number;
  revenue: number;
}

/**
 * Fetch top procedures for a specific date
 * Returns procedures sorted by revenue (highest first)
 */
export async function getTopProceduresForDate(date: string): Promise<TopProcedure[]> {
  try {
    const { data, error } = await supabase
      .from('top_procedures_daily')
      .select('*')
      .eq('procedure_date', date)
      .order('revenue', { ascending: false })
      .limit(10); // Limit to top 10 procedures

    if (error) {
      console.error('Error fetching top procedures:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getTopProceduresForDate:', err);
    return [];
  }
}

/**
 * Fetch top procedures for a date range
 * Aggregates procedures across multiple days
 */
export async function getTopProceduresForDateRange(
  startDate: string,
  endDate: string
): Promise<Array<{ procedure_name: string; procedure_code: string; count: number; revenue: number }>> {
  try {
    const { data, error } = await supabase
      .from('top_procedures_daily')
      .select('procedure_name, procedure_code, count, revenue')
      .gte('procedure_date', startDate)
      .lte('procedure_date', endDate);

    if (error) {
      console.error('Error fetching top procedures for range:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Aggregate by procedure name and code
    const aggregated = new Map<string, { procedure_name: string; procedure_code: string; count: number; revenue: number }>();

    data.forEach(proc => {
      const key = `${proc.procedure_name}|${proc.procedure_code}`;
      const existing = aggregated.get(key);

      if (existing) {
        existing.count += proc.count || 0;
        existing.revenue += proc.revenue || 0;
      } else {
        aggregated.set(key, {
          procedure_name: proc.procedure_name,
          procedure_code: proc.procedure_code,
          count: proc.count || 0,
          revenue: proc.revenue || 0
        });
      }
    });

    // Convert to array and sort by revenue
    return Array.from(aggregated.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10
  } catch (err) {
    console.error('Error in getTopProceduresForDateRange:', err);
    return [];
  }
}
