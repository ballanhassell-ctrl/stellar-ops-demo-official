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

/** Normalize rows coming from Supabase to ensure correct types.
 *  Handles pre-migration data where status may still be free-text like "corrected & rebatched". */
function normalizeIssue(row: any): InsuranceIssue {
  // Normalize status: Open → Corrected → Submitted → Resolved
  let status: 'Open' | 'Corrected' | 'Submitted' | 'Resolved' = 'Open';
  if (row.status) {
    if (row.status === 'Resolved') {
      status = 'Resolved';
    } else if (row.status === 'Submitted') {
      status = 'Submitted';
    } else if (row.status === 'Corrected' || row.status.toLowerCase().includes('corrected')) {
      status = 'Corrected';
    } else if (row.status === 'Open') {
      status = 'Open';
    }
  }

  return {
    ...row,
    status,
    corrected_at: row.corrected_at ?? null,
    corrected_by: row.corrected_by ?? null,
    correction_note: row.correction_note ?? null,
    structured_notes: Array.isArray(row.structured_notes) ? row.structured_notes : [],
  };
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

export async function getInsuranceIssues(): Promise<InsuranceIssue[]> {
  if (isStaticDataMode()) {
    return [...sampleInsuranceIssues].sort((a, b) =>
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  }

  const { data, error } = await supabase
    .from('insurance_issues')
    .select('*')
    .order('created_at', { ascending: false });

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

/** Sanitize empty strings to null for nullable fields before Supabase insert/update */
function sanitizeForDb(
  issue: Partial<Omit<InsuranceIssue, 'id' | 'created_at' | 'updated_at'>>
): typeof issue {
  const nullableStringFields: (keyof typeof issue)[] = [
    'patient_id', 'submission_status', 'submitted_by', 'submitted_at',
    'resolved_at', 'corrected_at', 'corrected_by', 'correction_note', 'notes',
  ];
  const cleaned = { ...issue };
  for (const field of nullableStringFields) {
    if (typeof cleaned[field] === 'string' && (cleaned[field] as string).trim() === '') {
      (cleaned as any)[field] = null;
    }
  }
  return cleaned;
}

export async function insertInsuranceIssue(
  issue: Omit<InsuranceIssue, 'id' | 'created_at' | 'updated_at'>
): Promise<InsuranceIssue> {
  const sanitized = sanitizeForDb(issue);
  const { data, error } = await supabase
    .from('insurance_issues')
    .insert(sanitized)
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
  const sanitized = sanitizeForDb(updates);
  const { data, error } = await supabase
    .from('insurance_issues')
    .update(sanitized)
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
    const batch = issues.slice(i, i + BATCH_SIZE).map(sanitizeForDb);
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
    .order('created_at', { ascending: false });

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
    .order('created_at', { ascending: false });

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

export const RESOLUTION_TARGET_DAYS = 3;

export interface InsuranceIssuesSummary {
  totalIssues: number;
  openIssues: number;
  correctedIssues: number;
  submittedIssues: number;
  resolvedIssues: number;
  preAuthIssues: number;
  byIssueType: Record<string, number>;
  byProvider: Record<string, number>;
  inVyneCount: number;
  notInVyneCount: number;
  avgDaysOnList: number | null; // avg days from created_at → resolved_at (resolved) or → now (open/corrected/submitted)
}

export function calculateIssuesSummary(issues: InsuranceIssue[]): InsuranceIssuesSummary {
  const resolved = issues.filter(i => i.status === 'Resolved');
  const submitted = issues.filter(i => i.status === 'Submitted');
  const corrected = issues.filter(i => i.status === 'Corrected');
  const open = issues.filter(i => i.status === 'Open');

  const byIssueType: Record<string, number> = {};
  const byProvider: Record<string, number> = {};

  issues.forEach(i => {
    byIssueType[i.issue_type] = (byIssueType[i.issue_type] || 0) + 1;
    byProvider[i.in_charge] = (byProvider[i.in_charge] || 0) + 1;
  });

  // Calculate avg days on the list:
  //   Resolved items: created_at → resolved_at
  //   Open/Corrected/Submitted items: created_at → now (still in progress)
  const now = Date.now();
  const allDays: number[] = [];

  resolved
    .filter(i => i.created_at)
    .forEach(i => {
      const created = new Date(i.created_at!).getTime();
      const end = i.resolved_at ? new Date(i.resolved_at).getTime() : now;
      const days = (end - created) / (1000 * 60 * 60 * 24);
      if (days >= 0) allDays.push(days);
    });

  [...open, ...corrected, ...submitted]
    .filter(i => i.created_at)
    .forEach(i => {
      const created = new Date(i.created_at!).getTime();
      const days = (now - created) / (1000 * 60 * 60 * 24);
      if (days >= 0) allDays.push(days);
    });

  let avgDaysOnList: number | null = null;
  if (allDays.length > 0) {
    avgDaysOnList = Math.round(
      (allDays.reduce((sum, d) => sum + d, 0) / allDays.length) * 10
    ) / 10;
  }

  return {
    totalIssues: issues.length,
    openIssues: open.length,
    correctedIssues: corrected.length,
    submittedIssues: submitted.length,
    resolvedIssues: resolved.length,
    preAuthIssues: issues.filter(i => i.is_pre_auth).length,
    byIssueType,
    byProvider,
    inVyneCount: issues.filter(i => i.in_vyne).length,
    notInVyneCount: issues.filter(i => !i.in_vyne).length,
    avgDaysOnList,
  };
}

/** Number of days after which a Submitted item is considered overdue for follow-up */
export const SUBMITTED_FOLLOW_UP_DAYS = 15;

/**
 * After an insurance check/EFT is entered, scan all Submitted insurance issues
 * to see if the patient name and DOS match. If so, auto-resolve those issues.
 *
 * @param paymentPatientName - patient name from the check/EFT entry
 * @param paymentDos - date of service from the check/EFT entry
 * @returns Array of auto-resolved issue IDs
 */
export async function autoResolveSubmittedIssuesFromPayment(
  paymentPatientName: string,
  paymentDos?: string,
): Promise<string[]> {
  if (!paymentPatientName) return [];

  try {
    // Fetch all Submitted issues
    const allIssues = await getInsuranceIssues();
    const submittedIssues = allIssues.filter(i => i.status === 'Submitted');
    if (submittedIssues.length === 0) return [];

    const payName = paymentPatientName.toLowerCase().trim();
    const resolvedIds: string[] = [];

    for (const issue of submittedIssues) {
      const issueName = issue.patient_name.toLowerCase().trim();

      // Match on patient name (fuzzy: either contains the other)
      const nameMatch = issueName.includes(payName) || payName.includes(issueName);
      if (!nameMatch) continue;

      // If DOS is provided, also match on DOS; otherwise match on name alone
      if (paymentDos && issue.date_of_service !== paymentDos) continue;

      // Auto-resolve this issue
      const now = new Date().toISOString();
      const auditEntry: import('../types/database.types').AuditTrailEntry = {
        id: crypto.randomUUID(),
        action: 'status_changed',
        field: 'status',
        old_value: 'Submitted',
        new_value: 'Resolved',
        changed_by: 'system',
        changed_at: now,
        notes: `Auto-resolved: matching payment received for ${paymentPatientName}`,
      };

      await updateInsuranceIssue(issue.id, {
        status: 'Resolved',
        resolved_at: now,
        audit_trail: [...(issue.audit_trail || []), auditEntry],
      });

      resolvedIds.push(issue.id);
    }

    return resolvedIds;
  } catch (err) {
    console.error('Error auto-resolving submitted issues:', err);
    return [];
  }
}
