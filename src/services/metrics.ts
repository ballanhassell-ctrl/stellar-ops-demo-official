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
