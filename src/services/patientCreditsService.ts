// =====================================================
// Patient Credits - Service Layer
// CRUD operations for patient credit tracking
// =====================================================

import { supabase } from '../lib/supabaseClient';
import type { PatientCredit } from '../types/database.types';
import { isStaticDataMode } from '../config/dataMode';

// =====================================================
// CRUD OPERATIONS
// =====================================================

export async function getPatientCredits(): Promise<PatientCredit[]> {
  if (isStaticDataMode()) {
    return [];
  }

  const { data, error } = await supabase
    .from('patient_credits')
    .select('*')
    .order('credit_date', { ascending: false });

  if (error) {
    console.error('Error fetching patient credits:', error);
    throw error;
  }

  return (data || []).map((record: PatientCredit) => ({
    ...record,
    structured_notes: record.structured_notes || [],
    audit_trail: record.audit_trail || [],
  }));
}

export async function insertPatientCredit(
  record: Omit<PatientCredit, 'id' | 'created_at' | 'updated_at'>
): Promise<PatientCredit> {
  const sanitizedRecord = {
    ...record,
    structured_notes: record.structured_notes || [],
    audit_trail: record.audit_trail || [],
  };

  const { data, error } = await supabase
    .from('patient_credits')
    .insert(sanitizedRecord)
    .select()
    .single();

  if (error) {
    console.error('Error inserting patient credit:', error);
    throw error;
  }

  return data;
}

export async function updatePatientCredit(
  id: string,
  updates: Partial<Omit<PatientCredit, 'id' | 'created_at' | 'updated_at'>>
): Promise<PatientCredit> {
  const sanitizedUpdates = { ...updates };
  if ('structured_notes' in sanitizedUpdates && sanitizedUpdates.structured_notes === null) {
    (sanitizedUpdates as Record<string, unknown>).structured_notes = [];
  }
  if ('audit_trail' in sanitizedUpdates && sanitizedUpdates.audit_trail === null) {
    (sanitizedUpdates as Record<string, unknown>).audit_trail = [];
  }

  const { data, error } = await supabase
    .from('patient_credits')
    .update(sanitizedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient credit:', error);
    throw error;
  }

  return data;
}

export async function deletePatientCredit(id: string): Promise<void> {
  const { error } = await supabase
    .from('patient_credits')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting patient credit:', error);
    throw error;
  }
}
