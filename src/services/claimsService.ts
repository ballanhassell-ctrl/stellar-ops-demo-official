// src/services/claimsService.ts
import { supabase } from '../lib/supabaseClient';
import type { Claim, PreAuth } from '../types/database.types';

// =====================================================
// CLAIMS CRUD OPERATIONS
// =====================================================

export async function getClaims() {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('date_submitted', { ascending: false });

  if (error) {
    console.error('Error fetching claims:', error);
    throw error;
  }

  return data as Claim[];
}

export async function getClaimById(id: string) {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching claim:', error);
    throw error;
  }

  return data as Claim;
}

export async function insertClaim(claim: Omit<Claim, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('claims')
    .insert(claim)
    .select()
    .single();

  if (error) {
    console.error('Error inserting claim:', error);
    throw error;
  }

  return data as Claim;
}

export async function updateClaim(id: string, updates: Partial<Omit<Claim, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating claim:', error);
    throw error;
  }

  return data as Claim;
}

export async function deleteClaim(id: string) {
  const { error } = await supabase
    .from('claims')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting claim:', error);
    throw error;
  }

  return true;
}

export async function getClaimsByStatus(status: Claim['status']) {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('status', status)
    .order('date_submitted', { ascending: false });

  if (error) {
    console.error('Error fetching claims by status:', error);
    throw error;
  }

  return data as Claim[];
}

export async function getClaimsByPatient(patientId: string) {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('patient_id', patientId)
    .order('date_submitted', { ascending: false });

  if (error) {
    console.error('Error fetching claims by patient:', error);
    throw error;
  }

  return data as Claim[];
}

// =====================================================
// PRE-AUTHS CRUD OPERATIONS
// =====================================================

export async function getPreAuths() {
  const { data, error } = await supabase
    .from('pre_auths')
    .select('*')
    .order('date_requested', { ascending: false });

  if (error) {
    console.error('Error fetching pre-auths:', error);
    throw error;
  }

  return data as PreAuth[];
}

export async function getPreAuthById(id: string) {
  const { data, error } = await supabase
    .from('pre_auths')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching pre-auth:', error);
    throw error;
  }

  return data as PreAuth;
}

export async function insertPreAuth(preAuth: Omit<PreAuth, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('pre_auths')
    .insert(preAuth)
    .select()
    .single();

  if (error) {
    console.error('Error inserting pre-auth:', error);
    throw error;
  }

  return data as PreAuth;
}

export async function updatePreAuth(id: string, updates: Partial<Omit<PreAuth, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('pre_auths')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating pre-auth:', error);
    throw error;
  }

  return data as PreAuth;
}

export async function deletePreAuth(id: string) {
  const { error } = await supabase
    .from('pre_auths')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting pre-auth:', error);
    throw error;
  }

  return true;
}

export async function getPreAuthsByStatus(status: PreAuth['status']) {
  const { data, error } = await supabase
    .from('pre_auths')
    .select('*')
    .eq('status', status)
    .order('date_requested', { ascending: false });

  if (error) {
    console.error('Error fetching pre-auths by status:', error);
    throw error;
  }

  return data as PreAuth[];
}

export async function getPreAuthsByPatient(patientId: string) {
  const { data, error } = await supabase
    .from('pre_auths')
    .select('*')
    .eq('patient_id', patientId)
    .order('date_requested', { ascending: false });

  if (error) {
    console.error('Error fetching pre-auths by patient:', error);
    throw error;
  }

  return data as PreAuth[];
}
