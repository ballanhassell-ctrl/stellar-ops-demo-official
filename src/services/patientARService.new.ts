// =====================================================
// Patient A/R Management - Service Layer
// Type-safe CRUD operations and business logic
// =====================================================

import { supabase } from '../lib/supabaseClient';
import type {
  PatientAR,
  PatientARContact,
  PatientARPayment,
  PatientPaymentPlan,
  WriteOffRule,
  WriteOffSuggestion
} from '../types/database.types';
import { isStaticDataMode } from '../config/dataMode';
import {
  samplePatientAR,
  sampleWriteOffRules,
  sampleWriteOffSuggestions
} from '../data/sampleData';

// =====================================================
// PATIENT A/R - CRUD OPERATIONS
// =====================================================

/**
 * Get all patient A/R records
 */
export async function getPatientARRecords(): Promise<PatientAR[]> {
  if (isStaticDataMode()) {
    return [...samplePatientAR];
  }

  const { data, error } = await supabase
    .from('patient_ar_with_aging')
    .select('*')
    .order('aging_days', { ascending: false });

  if (error) {
    console.error('Error fetching patient A/R records:', error);
    throw error;
  }

  // Coalesce null JSONB fields to empty arrays to prevent spread errors
  return (data || []).map((record: PatientAR) => ({
    ...record,
    structured_notes: record.structured_notes || [],
    audit_trail: record.audit_trail || [],
  }));
}

/**
 * Get active patient A/R records
 */
export async function getActivePatientAR(): Promise<PatientAR[]> {
  if (isStaticDataMode()) {
    return samplePatientAR.filter(ar => ar.is_collectible === true);
  }

  const { data, error } = await supabase
    .from('patient_ar_with_aging')
    .select('*')
    .eq('is_collectible', true)
    .order('aging_days', { ascending: false });

  if (error) {
    console.error('Error fetching active patient A/R:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get collections patient A/R records
 */
export async function getCollectionsPatientAR(): Promise<PatientAR[]> {
  if (isStaticDataMode()) {
    return samplePatientAR.filter(ar => ar.is_collectible === false);
  }

  const { data, error } = await supabase
    .from('patient_ar_with_aging')
    .select('*')
    .eq('is_collectible', false)
    .order('aging_days', { ascending: false });

  if (error) {
    console.error('Error fetching collections patient A/R:', error);
    throw error;
  }

  return data || [];
}

/**
 * Insert a new patient A/R record
 */
export async function insertPatientAR(
  record: Omit<PatientAR, 'id' | 'created_at' | 'updated_at' | 'aging_days' | 'aging_bucket'>
): Promise<PatientAR> {
  // Validate patient_id: if the DB column is still UUID-typed (pre-migration),
  // only send values that are valid UUIDs.  Otherwise set to null so the insert
  // doesn't fail with "invalid input syntax for type uuid".
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawPatientId = record.patient_id?.trim() || null;
  const safePatientId = rawPatientId && !UUID_RE.test(rawPatientId) ? null : rawPatientId;

  // Build a clean record with only the columns that exist in the patient_ar table.
  // This prevents 400 errors if certain migrations haven't been applied yet.
  const insertRecord: Record<string, unknown> = {
    patient_id: safePatientId,
    patient_name: record.patient_name,
    dos: record.dos,
    original_balance: record.original_balance ?? record.current_balance,
    current_balance: record.current_balance,
    status: record.status,
    created_by: record.created_by,
    updated_by: record.updated_by,
    // Columns from revamp migration
    related_family: record.related_family ?? null,
    is_collectible: record.is_collectible ?? true,
    background_notes: record.background_notes ?? null,
    team_discussion_notes: record.team_discussion_notes ?? null,
    action_needed: record.action_needed ?? null,
    dr_decision: record.dr_decision ?? null,
    first_contact_date: record.first_contact_date ?? null,
    first_contact_initials: record.first_contact_initials ?? null,
    second_contact_date: record.second_contact_date ?? null,
    second_contact_initials: record.second_contact_initials ?? null,
    final_contact_date: record.final_contact_date ?? null,
    final_contact_initials: record.final_contact_initials ?? null,
    write_off_suggested_date: record.write_off_suggested_date ?? null,
    write_off_reason: record.write_off_reason ?? null,
    collected_amount: record.collected_amount ?? 0,
    // JSONB columns from structured notes migration
    structured_notes: record.structured_notes || [],
    audit_trail: record.audit_trail || [],
  };

  // Remove any undefined values to avoid sending them to Supabase
  Object.keys(insertRecord).forEach((key) => {
    if (insertRecord[key] === undefined) {
      delete insertRecord[key];
    }
  });

  // First attempt: insert with all columns (post-revamp schema)
  let { data, error } = await supabase
    .from('patient_ar')
    .insert(insertRecord)
    .select()
    .single();

  // If the insert fails (e.g. columns don't exist yet), try a minimal insert
  // compatible with the original schema (pre-revamp)
  if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.code === '42703')) {
    console.warn('Full insert failed, retrying with minimal columns:', error.message);
    const minimalRecord: Record<string, unknown> = {
      patient_id: safePatientId,
      patient_name: record.patient_name,
      dos: record.dos,
      original_balance: record.original_balance ?? record.current_balance,
      current_balance: record.current_balance,
      balance_created_date: record.dos, // legacy required field
      status: record.status || 'active', // use provided status, fall back to legacy value
      created_by: record.created_by,
      updated_by: record.updated_by,
    };
    const retryResult = await supabase
      .from('patient_ar')
      .insert(minimalRecord)
      .select()
      .single();
    data = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    console.error('Error inserting patient A/R:', error.message, error.details, error.hint, error.code);
    throw error;
  }

  return data;
}

/**
 * Update a patient A/R record
 */
export async function updatePatientAR(
  id: string,
  updates: Partial<Omit<PatientAR, 'id' | 'created_at' | 'updated_at' | 'aging_days' | 'aging_bucket'>>
): Promise<PatientAR> {
  // Ensure JSONB fields are proper arrays, not null
  const sanitizedUpdates = { ...updates };
  if ('structured_notes' in sanitizedUpdates && sanitizedUpdates.structured_notes === null) {
    sanitizedUpdates.structured_notes = [];
  }
  if ('audit_trail' in sanitizedUpdates && sanitizedUpdates.audit_trail === null) {
    sanitizedUpdates.audit_trail = [];
  }

  // Sanitize patient_id for UUID-typed columns (pre-migration compatibility)
  if ('patient_id' in sanitizedUpdates && sanitizedUpdates.patient_id != null) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pid = String(sanitizedUpdates.patient_id).trim();
    if (pid && !UUID_RE.test(pid)) {
      sanitizedUpdates.patient_id = null;
    }
  }

  const { data, error } = await supabase
    .from('patient_ar')
    .update(sanitizedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient A/R:', error.message, error.details, error.hint, error.code);
    throw error;
  }

  return data;
}

/**
 * Delete a patient A/R record
 */
export async function deletePatientAR(id: string): Promise<void> {
  const { error } = await supabase
    .from('patient_ar')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting patient A/R:', error);
    throw error;
  }
}

// =====================================================
// PATIENT A/R CONTACTS - OPERATIONS
// =====================================================

/**
 * Get all contacts for a patient A/R record
 */
export async function getPatientARContacts(patientARId: string): Promise<PatientARContact[]> {
  const { data, error } = await supabase
    .from('patient_ar_contacts')
    .select('*')
    .eq('patient_ar_id', patientARId)
    .order('contact_date', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Insert a new contact record
 */
export async function insertPatientARContact(
  contact: Omit<PatientARContact, 'id' | 'created_at' | 'next_action_date'>
): Promise<PatientARContact> {
  const { data, error } = await supabase
    .from('patient_ar_contacts')
    .insert(contact)
    .select()
    .single();

  if (error) {
    console.error('Error inserting contact:', error);
    throw error;
  }

  return data;
}

// =====================================================
// PATIENT A/R PAYMENTS - OPERATIONS
// =====================================================

/**
 * Get all payments for a patient A/R record
 */
export async function getPatientARPayments(patientARId: string): Promise<PatientARPayment[]> {
  const { data, error } = await supabase
    .from('patient_ar_payments')
    .select('*')
    .eq('patient_ar_id', patientARId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Insert a new payment record
 */
export async function insertPatientARPayment(
  payment: Omit<PatientARPayment, 'id' | 'created_at'>
): Promise<PatientARPayment> {
  const { data, error } = await supabase
    .from('patient_ar_payments')
    .insert(payment)
    .select()
    .single();

  if (error) {
    console.error('Error inserting payment:', error);
    throw error;
  }

  return data;
}

// =====================================================
// PAYMENT PLANS - OPERATIONS
// =====================================================

/**
 * Get all payment plans for a patient A/R record
 */
export async function getPaymentPlans(patientARId: string): Promise<PatientPaymentPlan[]> {
  const { data, error } = await supabase
    .from('patient_payment_plans')
    .select('*')
    .eq('patient_ar_id', patientARId)
    .order('setup_date', { ascending: false });

  if (error) {
    console.error('Error fetching payment plans:', error);
    throw error;
  }

  return data || [];
}

/**
 * Insert a new payment plan
 */
export async function insertPaymentPlan(
  plan: Omit<PatientPaymentPlan, 'id' | 'created_at' | 'updated_at'>
): Promise<PatientPaymentPlan> {
  const { data, error } = await supabase
    .from('patient_payment_plans')
    .insert(plan)
    .select()
    .single();

  if (error) {
    console.error('Error inserting payment plan:', error);
    throw error;
  }

  return data;
}

// =====================================================
// WRITE-OFF RULES - OPERATIONS
// =====================================================

/**
 * Get all write-off rules
 */
export async function getWriteOffRules(): Promise<WriteOffRule[]> {
  if (isStaticDataMode()) {
    return [...sampleWriteOffRules];
  }

  const { data, error } = await supabase
    .from('write_off_rules')
    .select('*')
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching write-off rules:', error);
    throw error;
  }

  return data || [];
}

/**
 * Insert a new write-off rule
 */
export async function insertWriteOffRule(
  rule: Omit<WriteOffRule, 'id' | 'created_at' | 'updated_at'>
): Promise<WriteOffRule> {
  const { data, error } = await supabase
    .from('write_off_rules')
    .insert(rule)
    .select()
    .single();

  if (error) {
    console.error('Error inserting write-off rule:', error);
    throw error;
  }

  return data;
}

/**
 * Update a write-off rule
 */
export async function updateWriteOffRule(
  id: string,
  updates: Partial<Omit<WriteOffRule, 'id' | 'created_at' | 'updated_at'>>
): Promise<WriteOffRule> {
  const { data, error } = await supabase
    .from('write_off_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating write-off rule:', error);
    throw error;
  }

  return data;
}

// =====================================================
// WRITE-OFF SUGGESTIONS - OPERATIONS
// =====================================================

/**
 * Get pending write-off suggestions with related data
 */
export async function getPendingWriteOffSuggestions(): Promise<WriteOffSuggestion[]> {
  if (isStaticDataMode()) {
    return sampleWriteOffSuggestions.filter(s => s.status === 'pending');
  }

  const { data, error } = await supabase
    .from('write_off_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('suggested_date', { ascending: false });

  if (error) {
    console.error('Error fetching pending write-off suggestions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Approve a write-off suggestion
 */
export async function approveWriteOffSuggestion(
  suggestionId: string,
  reviewedBy: string,
  reviewNotes: string
): Promise<void> {
  // Get the suggestion first
  const { data: suggestion, error: fetchError } = await supabase
    .from('write_off_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  if (fetchError || !suggestion) {
    console.error('Error fetching suggestion:', fetchError);
    throw fetchError;
  }

  // Update the suggestion status
  const { error: updateSuggestionError } = await supabase
    .from('write_off_suggestions')
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_date: new Date().toISOString().split('T')[0],
      review_notes: reviewNotes
    })
    .eq('id', suggestionId);

  if (updateSuggestionError) {
    console.error('Error updating suggestion:', updateSuggestionError);
    throw updateSuggestionError;
  }

  // Update the patient_ar record to completed
  const { error: updateARError } = await supabase
    .from('patient_ar')
    .update({
      status: 'completed',
      updated_by: reviewedBy
    })
    .eq('id', suggestion.patient_ar_id);

  if (updateARError) {
    console.error('Error updating patient A/R:', updateARError);
    throw updateARError;
  }
}

/**
 * Reject a write-off suggestion
 */
export async function rejectWriteOffSuggestion(
  suggestionId: string,
  reviewedBy: string,
  reviewNotes: string
): Promise<void> {
  // Get the suggestion first
  const { data: suggestion, error: fetchError } = await supabase
    .from('write_off_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  if (fetchError || !suggestion) {
    console.error('Error fetching suggestion:', fetchError);
    throw fetchError;
  }

  // Update the suggestion status
  const { error: updateSuggestionError } = await supabase
    .from('write_off_suggestions')
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_date: new Date().toISOString().split('T')[0],
      review_notes: reviewNotes
    })
    .eq('id', suggestionId);

  if (updateSuggestionError) {
    console.error('Error updating suggestion:', updateSuggestionError);
    throw updateSuggestionError;
  }

  // Return patient_ar to collectible status
  const { error: updateARError } = await supabase
    .from('patient_ar')
    .update({
      status: 'not_started',
      is_collectible: true,
      write_off_suggested_date: null,
      write_off_reason: null,
      updated_by: reviewedBy
    })
    .eq('id', suggestion.patient_ar_id);

  if (updateARError) {
    console.error('Error updating patient A/R:', updateARError);
    throw updateARError;
  }
}

/**
 * Generate write-off suggestions using database function
 */
export async function generateWriteOffSuggestions(): Promise<number> {
  const { data, error } = await supabase.rpc('generate_write_off_suggestions');

  if (error) {
    console.error('Error generating write-off suggestions:', error);
    throw error;
  }

  return data || 0;
}

// =====================================================
// BATCH OPERATIONS
// =====================================================

/**
 * Batch move records to collections
 */
export async function batchMoveToCollections(
  ids: string[],
  movedBy: string
): Promise<PatientAR[]> {
  const { data, error } = await supabase
    .from('patient_ar')
    .update({
      status: 'pending_writeoff',
      is_collectible: false,
      updated_by: movedBy
    })
    .in('id', ids)
    .select();

  if (error) {
    console.error('Error batch moving to collections:', error);
    throw error;
  }

  return data || [];
}

/**
 * Batch archive records
 */
export async function batchArchivePatientAR(
  ids: string[],
  archivedBy: string
): Promise<PatientAR[]> {
  const { data, error } = await supabase
    .from('patient_ar')
    .update({
      status: 'completed',
      updated_by: archivedBy
    })
    .in('id', ids)
    .select();

  if (error) {
    console.error('Error batch archiving:', error);
    throw error;
  }

  return data || [];
}

// =====================================================
// METRICS AND ANALYTICS
// =====================================================

export interface PatientARMetrics {
  totalActive: number;
  totalActiveBalance: number;
  totalCollections: number;
  totalCollectionsBalance: number;
  totalWriteOffSuggested: number;
  totalWriteOffSuggestedBalance: number;
  pendingSuggestionsCount: number;
  agingBuckets: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
}

/**
 * Get comprehensive Patient A/R metrics
 */
export async function getPatientARMetrics(): Promise<PatientARMetrics> {
  try {
    const [allRecords, pendingSuggestions] = await Promise.all([
      getPatientARRecords(),
      getPendingWriteOffSuggestions()
    ]);

    const activeRecords = allRecords.filter(
      (r: PatientAR) => r.is_collectible === true && r.status !== 'paid' && r.status !== 'completed'
    );
    const collectionsRecords = allRecords.filter(
      (r: PatientAR) => r.is_collectible === false && r.status !== 'completed'
    );
    const writeOffSuggestedRecords = allRecords.filter(
      (r: PatientAR) => r.status === 'pending_writeoff'
    );

    const totalActiveBalance = activeRecords.reduce(
      (sum: number, r: PatientAR) => sum + r.current_balance,
      0
    );
    const totalCollectionsBalance = collectionsRecords.reduce(
      (sum: number, r: PatientAR) => sum + r.current_balance,
      0
    );
    const totalWriteOffSuggestedBalance = writeOffSuggestedRecords.reduce(
      (sum: number, r: PatientAR) => sum + r.current_balance,
      0
    );

    // Aging buckets (exclude paid and completed records)
    const agingBuckets = {
      '0-30': allRecords.filter(
        (r: PatientAR) =>
          r.aging_bucket === '0-30' && r.status !== 'paid' && r.status !== 'completed'
      ).length,
      '31-60': allRecords.filter(
        (r: PatientAR) =>
          r.aging_bucket === '31-60' && r.status !== 'paid' && r.status !== 'completed'
      ).length,
      '61-90': allRecords.filter(
        (r: PatientAR) =>
          r.aging_bucket === '61-90' && r.status !== 'paid' && r.status !== 'completed'
      ).length,
      '90+': allRecords.filter(
        (r: PatientAR) =>
          r.aging_bucket === '90+' && r.status !== 'paid' && r.status !== 'completed'
      ).length
    };

    return {
      totalActive: activeRecords.length,
      totalActiveBalance,
      totalCollections: collectionsRecords.length,
      totalCollectionsBalance,
      totalWriteOffSuggested: writeOffSuggestedRecords.length,
      totalWriteOffSuggestedBalance,
      pendingSuggestionsCount: pendingSuggestions.length,
      agingBuckets
    };
  } catch (err) {
    console.error('Error in getPatientARMetrics:', err);
    return {
      totalActive: 0,
      totalActiveBalance: 0,
      totalCollections: 0,
      totalCollectionsBalance: 0,
      totalWriteOffSuggested: 0,
      totalWriteOffSuggestedBalance: 0,
      pendingSuggestionsCount: 0,
      agingBuckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    };
  }
}

// =====================================================
// REALTIME SUBSCRIPTIONS
// =====================================================

/**
 * Subscribe to patient A/R changes
 */
export function subscribeToPatientARChanges(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('patient_ar_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patient_ar'
      },
      callback
    )
    .subscribe();

  return subscription;
}

/**
 * Subscribe to write-off suggestions changes
 */
export function subscribeToWriteOffSuggestionsChanges(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('write_off_suggestions_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'write_off_suggestions'
      },
      callback
    )
    .subscribe();

  return subscription;
}
