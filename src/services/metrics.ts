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
    console.error('Error fetching metrics for date', error);
    throw error;
  }

  return data as MetricWithValue[];
}
