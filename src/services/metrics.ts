// src/services/metrics.ts
import { supabase } from '../lib/supabaseClient';

type SupabaseMetricResponse = {
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
  } | {
    section: string;
    field_name: string;
    data_type: string;
    description_notes: string | null;
  }[] | null;
};

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
    // Try the query with foreign key join first
    const { data, error } = await supabase
      .from('csd_metric_values')
      .select(
        `
        field_key,
        as_of_date,
        value,
        source,
        notes,
        csd_metric_catalog (
          section,
          field_name,
          data_type,
          description_notes
        )
      `
      )
      .eq('as_of_date', date)
      .order('field_key', { ascending: true });

    if (error) {
      console.warn('Foreign key join query failed, trying fallback approach:', error);

      // Fallback: fetch data separately and join client-side
      const [valuesResult, catalogResult] = await Promise.all([
        supabase
          .from('csd_metric_values')
          .select('field_key, as_of_date, value, source, notes')
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
        ...item,
        csd_metric_catalog: catalogMap.get(item.field_key) || null
      }));

      console.log('Client-side joined data:', joined.length, 'records');
      return joined;
    }

    console.log('Foreign key join succeeded. Received data:', data?.length, 'records');

    if (data && data.length > 0) {
      console.log('Sample record:', data[0]);
      console.log('csd_metric_catalog type:', typeof data[0]?.csd_metric_catalog);
      console.log('csd_metric_catalog isArray:', Array.isArray(data[0]?.csd_metric_catalog));
    }

    // Transform Supabase response to our expected format
    const transformedData: MetricWithValue[] = (data as SupabaseMetricResponse[] || []).map(item => ({
      ...item,
      csd_metric_catalog: item.csd_metric_catalog
        ? (Array.isArray(item.csd_metric_catalog) ? item.csd_metric_catalog[0] : item.csd_metric_catalog)
        : null
    }));

    console.log('Transformed data:', transformedData.length, 'records');
    return transformedData;
  } catch (err) {
    console.error('Unexpected error in getMetricsForDate:', err);
    throw err;
  }
}
