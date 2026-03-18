// src/services/topProcedures.ts
/**
 * Service for fetching and managing top procedures data
 */

import { supabase } from '../lib/supabaseClient';
import { isStaticDataMode } from '../config/dataMode';

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
const SAMPLE_TOP_PROCEDURES: Array<{ procedure_name: string; procedure_code: string; count: number; revenue: number }> = [
  { procedure_name: 'Prophylaxis - Adult', procedure_code: 'D1110', count: 42, revenue: 5460 },
  { procedure_name: 'Periodic Oral Evaluation', procedure_code: 'D0120', count: 38, revenue: 2280 },
  { procedure_name: 'Bitewing X-rays (4 films)', procedure_code: 'D0274', count: 30, revenue: 2100 },
  { procedure_name: 'Crown - Porcelain/Ceramic', procedure_code: 'D2740', count: 8, revenue: 9600 },
  { procedure_name: 'Composite Filling (2 surfaces)', procedure_code: 'D2392', count: 15, revenue: 3750 },
  { procedure_name: 'Root Canal - Molar', procedure_code: 'D3330', count: 4, revenue: 4800 },
  { procedure_name: 'Scaling and Root Planing (per quadrant)', procedure_code: 'D4341', count: 12, revenue: 3600 },
  { procedure_name: 'Extraction - Surgical', procedure_code: 'D7210', count: 3, revenue: 1350 },
  { procedure_name: 'Panoramic X-ray', procedure_code: 'D0330', count: 10, revenue: 1500 },
  { procedure_name: 'Fluoride Treatment - Adult', procedure_code: 'D1208', count: 25, revenue: 1250 },
];

export async function getTopProceduresForDate(date: string): Promise<TopProcedure[]> {
  if (isStaticDataMode()) {
    return SAMPLE_TOP_PROCEDURES.map((p, i) => ({ id: `sample-${i}`, ...p }));
  }

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
  if (isStaticDataMode()) {
    return [...SAMPLE_TOP_PROCEDURES];
  }

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

    // Aggregate by procedure code only (codes are unique identifiers)
    // This fixes issues where the same code might have slightly different names
    const aggregated = new Map<string, { procedure_name: string; procedure_code: string; count: number; revenue: number }>();

    data.forEach(proc => {
      // Use procedure code as the key since that's the unique identifier
      const key = proc.procedure_code;
      const existing = aggregated.get(key);

      if (existing) {
        existing.count += proc.count || 0;
        existing.revenue += proc.revenue || 0;
        // Keep the first procedure name encountered for this code
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
    // Return more than 10 to allow frontend categorization into hygiene/operative
    return Array.from(aggregated.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50); // Top 50 to ensure enough for both categories
  } catch (err) {
    console.error('Error in getTopProceduresForDateRange:', err);
    return [];
  }
}
