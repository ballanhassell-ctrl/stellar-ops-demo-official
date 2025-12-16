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

// =====================================================
// PATIENT A/R - CRUD OPERATIONS
// =====================================================

/**
 * Get all patient A/R records
 */
export async function getPatientARRecords(): Promise<PatientAR[]> {
  const { data, error } = await supabase
    .from('patient_ar')
    .select('*')
    .order('next_contact_due_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching patient A/R records:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active patient A/R records
 */
export async function getActivePatientAR(): Promise<PatientAR[]> {
  const { data, error } = await supabase
    .from('patient_ar')
    .select('*')
    .eq('status', 'active')
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
  const { data, error } = await supabase
    .from('patient_ar')
    .select('*')
    .eq('status', 'collections')
    .order('moved_to_collections_date', { ascending: true });

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
  const { data, error } = await supabase
    .from('patient_ar')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Error inserting patient A/R:', error);
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
  const { data, error } = await supabase
    .from('patient_ar')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient A/R:', error);
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

  // Update the patient_ar record to written_off
  const { error: updateARError } = await supabase
    .from('patient_ar')
    .update({
      status: 'written_off',
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

  // Return patient_ar to collections status
  const { error: updateARError } = await supabase
    .from('patient_ar')
    .update({
      status: 'collections',
      write_off_suggested_date: null,
      write_off_suggestion_reason: null,
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
      status: 'collections',
      moved_to_collections_date: new Date().toISOString().split('T')[0],
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
      status: 'archived',
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
  overdueContacts: number;
  contactsDueSoon: number;
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

    const activeRecords = allRecords.filter((r: PatientAR) => r.status === 'active');
    const collectionsRecords = allRecords.filter((r: PatientAR) => r.status === 'collections');
    const writeOffSuggestedRecords = allRecords.filter(
      (r: PatientAR) => r.status === 'write_off_suggested'
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

    // Count overdue contacts
    const today = new Date().toISOString().split('T')[0];
    const overdueContacts = allRecords.filter(
      (r: PatientAR) =>
        r.next_contact_due_date &&
        r.next_contact_due_date < today &&
        r.status !== 'paid' &&
        r.status !== 'written_off'
    ).length;

    // Count contacts due soon
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const contactsDueSoon = allRecords.filter(
      (r: PatientAR) =>
        r.next_contact_due_date &&
        r.next_contact_due_date >= today &&
        r.next_contact_due_date <= tomorrowStr
    ).length;

    // Aging buckets
    const agingBuckets = {
      '0-30': allRecords.filter(
        (r: PatientAR) =>
          r.aging_bucket === '0-30' && r.status !== 'paid' && r.status !== 'written_off'
      ).length,
      '31-60': allRecords.filter(
        (r: PatientAR) =>
          r.aging_bucket === '31-60' && r.status !== 'paid' && r.status !== 'written_off'
      ).length,
      '61-90': allRecords.filter(
        (r: PatientAR) =>
          r.aging_bucket === '61-90' && r.status !== 'paid' && r.status !== 'written_off'
      ).length,
      '90+': allRecords.filter(
        (r: PatientAR) =>
          r.aging_bucket === '90+' && r.status !== 'paid' && r.status !== 'written_off'
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
      overdueContacts,
      contactsDueSoon,
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
      overdueContacts: 0,
      contactsDueSoon: 0,
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
