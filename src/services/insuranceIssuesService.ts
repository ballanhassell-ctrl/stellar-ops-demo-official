// =====================================================
// Insurance Issues Tracker - Service Layer
// Mirrors the "Insurance Issues Report" spreadsheet
// =====================================================

import { supabase } from '../lib/supabaseClient';
import type { InsuranceIssue } from '../types/database.types';
import { isStaticDataMode } from '../config/dataMode';
import { sampleInsuranceIssues } from '../data/sampleData';

/** Check if error indicates the table doesn't exist in Supabase */
function isTableNotFoundError(error: any): boolean {
  return (
    error?.code === '42P01' ||        // PostgreSQL: undefined_table
    error?.code === 'PGRST204' ||     // PostgREST: relation not found
    error?.message?.includes('404') ||
    error?.message?.includes('relation') ||
    error?.status === 404
  );
}

/** Normalize rows coming from Supabase to ensure structured_notes is always an array */
function normalizeIssue(row: any): InsuranceIssue {
  return {
    ...row,
    status: row.status || 'Open',
    structured_notes: Array.isArray(row.structured_notes) ? row.structured_notes : [],
  };
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

export async function getInsuranceIssues(): Promise<InsuranceIssue[]> {
  if (isStaticDataMode()) {
    return [...sampleInsuranceIssues];
  }

  const { data, error } = await supabase
    .from('insurance_issues')
    .select('*')
    .order('date_of_service', { ascending: false });

  if (error) {
    console.error('Error fetching insurance issues:', error);
    // Table may not exist yet in Supabase - fall back to sample data
    if (isTableNotFoundError(error)) {
      console.warn('insurance_issues table not found in Supabase. Using sample data. Create the table in Supabase to use live data.');
      return [...sampleInsuranceIssues];
    }
    throw error;
  }

  return (data || []).map(normalizeIssue);
}

export async function insertInsuranceIssue(
  issue: Omit<InsuranceIssue, 'id' | 'created_at' | 'updated_at'>
): Promise<InsuranceIssue> {
  const { data, error } = await supabase
    .from('insurance_issues')
    .insert(issue)
    .select()
    .single();

  if (error) {
    console.error('Error inserting insurance issue:', error);
    throw error;
  }

  return normalizeIssue(data);
}

export async function updateInsuranceIssue(
  id: string,
  updates: Partial<Omit<InsuranceIssue, 'id' | 'created_at' | 'updated_at'>>
): Promise<InsuranceIssue> {
  const { data, error } = await supabase
    .from('insurance_issues')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating insurance issue:', error);
    throw error;
  }

  return normalizeIssue(data);
}

export async function bulkInsertInsuranceIssues(
  issues: Omit<InsuranceIssue, 'id' | 'created_at' | 'updated_at'>[]
): Promise<InsuranceIssue[]> {
  if (issues.length === 0) return [];

  // Supabase has a row limit per request; batch in chunks of 100
  const BATCH_SIZE = 100;
  const allInserted: InsuranceIssue[] = [];

  for (let i = 0; i < issues.length; i += BATCH_SIZE) {
    const batch = issues.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('insurance_issues')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
      throw error;
    }
    if (data) allInserted.push(...data.map(normalizeIssue));
  }

  return allInserted;
}

export async function deleteInsuranceIssue(id: string): Promise<void> {
  const { error } = await supabase
    .from('insurance_issues')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting insurance issue:', error);
    throw error;
  }
}

// =====================================================
// FILTERING & METRICS
// =====================================================

export async function getIssuesByProvider(inCharge: string): Promise<InsuranceIssue[]> {
  if (isStaticDataMode()) {
    return sampleInsuranceIssues.filter(i => i.in_charge === inCharge);
  }

  const { data, error } = await supabase
    .from('insurance_issues')
    .select('*')
    .eq('in_charge', inCharge)
    .order('date_of_service', { ascending: false });

  if (error) {
    console.error('Error fetching issues by provider:', error);
    if (isTableNotFoundError(error)) {
      return sampleInsuranceIssues.filter(i => i.in_charge === inCharge);
    }
    throw error;
  }

  return (data || []).map(normalizeIssue);
}

export async function getOpenIssues(): Promise<InsuranceIssue[]> {
  if (isStaticDataMode()) {
    return sampleInsuranceIssues.filter(i => i.status === 'Open');
  }

  const { data, error } = await supabase
    .from('insurance_issues')
    .select('*')
    .eq('status', 'Open')
    .order('date_of_service', { ascending: false });

  if (error) {
    console.error('Error fetching open issues:', error);
    if (isTableNotFoundError(error)) {
      return sampleInsuranceIssues.filter(i => i.status === 'Open');
    }
    throw error;
  }

  return (data || []).map(normalizeIssue);
}

// =====================================================
// SUMMARY & RESOLUTION TIME METRICS
// =====================================================

export interface InsuranceIssuesSummary {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  preAuthIssues: number;
  byIssueType: Record<string, number>;
  byProvider: Record<string, number>;
  inVyneCount: number;
  notInVyneCount: number;
  avgResolutionDays: number | null; // average days from created_at → resolved_at
}

export function calculateIssuesSummary(issues: InsuranceIssue[]): InsuranceIssuesSummary {
  const resolved = issues.filter(i => i.status === 'Corrected');

  const byIssueType: Record<string, number> = {};
  const byProvider: Record<string, number> = {};

  issues.forEach(i => {
    byIssueType[i.issue_type] = (byIssueType[i.issue_type] || 0) + 1;
    byProvider[i.in_charge] = (byProvider[i.in_charge] || 0) + 1;
  });

  // Calculate average resolution time in days
  let avgResolutionDays: number | null = null;
  const resolutionTimes = resolved
    .filter(i => i.resolved_at && i.created_at)
    .map(i => {
      const created = new Date(i.created_at!).getTime();
      const resolvedAt = new Date(i.resolved_at!).getTime();
      return (resolvedAt - created) / (1000 * 60 * 60 * 24); // days
    })
    .filter(d => d >= 0);

  if (resolutionTimes.length > 0) {
    avgResolutionDays = Math.round(
      (resolutionTimes.reduce((sum, d) => sum + d, 0) / resolutionTimes.length) * 10
    ) / 10;
  }

  return {
    totalIssues: issues.length,
    openIssues: issues.length - resolved.length,
    resolvedIssues: resolved.length,
    preAuthIssues: issues.filter(i => i.is_pre_auth).length,
    byIssueType,
    byProvider,
    inVyneCount: issues.filter(i => i.in_vyne).length,
    notInVyneCount: issues.filter(i => !i.in_vyne).length,
    avgResolutionDays,
  };
}
