// src/services/claimsService.ts
import { supabase } from '../lib/supabaseClient';
import type { Claim, PreAuth, ClaimAuditHistory, PreAuthAuditHistory, ClaimUpdate, PreAuthUpdate, InsuranceCheck, InsuranceCheckAuditHistory, InsuranceCheckUpdate } from '../types/database.types';

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
    .order('date_requested', { ascending: false});

  if (error) {
    console.error('Error fetching pre-auths by patient:', error);
    throw error;
  }

  return data as PreAuth[];
}

// =====================================================
// CLAIMS ARCHIVE OPERATIONS
// =====================================================

export async function archiveClaim(id: string, archivedBy: string = 'system') {
  const { data, error} = await supabase
    .from('claims')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: archivedBy
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error archiving claim:', error);
    throw error;
  }

  return data as Claim;
}

export async function unarchiveClaim(id: string) {
  const { data, error } = await supabase
    .from('claims')
    .update({
      archived: false,
      archived_at: null,
      archived_by: null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error unarchiving claim:', error);
    throw error;
  }

  return data as Claim;
}

export async function getArchivedClaims() {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('archived', true)
    .order('archived_at', { ascending: false });

  if (error) {
    console.error('Error fetching archived claims:', error);
    throw error;
  }

  return data as Claim[];
}

export async function getActiveClaims() {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('archived', false)
    .order('date_submitted', { ascending: false });

  if (error) {
    console.error('Error fetching active claims:', error);
    throw error;
  }

  return data as Claim[];
}

// =====================================================
// PRE-AUTHS ARCHIVE OPERATIONS
// =====================================================

export async function archivePreAuth(id: string, archivedBy: string = 'system') {
  const { data, error } = await supabase
    .from('pre_auths')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: archivedBy
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error archiving pre-auth:', error);
    throw error;
  }

  return data as PreAuth;
}

export async function unarchivePreAuth(id: string) {
  const { data, error } = await supabase
    .from('pre_auths')
    .update({
      archived: false,
      archived_at: null,
      archived_by: null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error unarchiving pre-auth:', error);
    throw error;
  }

  return data as PreAuth;
}

export async function getArchivedPreAuths() {
  const { data, error } = await supabase
    .from('pre_auths')
    .select('*')
    .eq('archived', true)
    .order('archived_at', { ascending: false });

  if (error) {
    console.error('Error fetching archived pre-auths:', error);
    throw error;
  }

  return data as PreAuth[];
}

export async function getActivePreAuths() {
  const { data, error } = await supabase
    .from('pre_auths')
    .select('*')
    .eq('archived', false)
    .order('date_requested', { ascending: false });

  if (error) {
    console.error('Error fetching active pre-auths:', error);
    throw error;
  }

  return data as PreAuth[];
}

// =====================================================
// AUDIT HISTORY OPERATIONS
// =====================================================

export async function getClaimAuditHistory(claimId: string) {
  const { data, error } = await supabase
    .from('claims_audit_history')
    .select('*')
    .eq('claim_id', claimId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching claim audit history:', error);
    throw error;
  }

  return data as ClaimAuditHistory[];
}

export async function getPreAuthAuditHistory(preAuthId: string) {
  const { data, error } = await supabase
    .from('pre_auths_audit_history')
    .select('*')
    .eq('pre_auth_id', preAuthId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching pre-auth audit history:', error);
    throw error;
  }

  return data as PreAuthAuditHistory[];
}

// =====================================================
// BATCH OPERATIONS
// =====================================================

export async function batchUpdateClaims(ids: string[], updates: Partial<Omit<Claim, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .in('id', ids)
    .select();

  if (error) {
    console.error('Error batch updating claims:', error);
    throw error;
  }

  return data as Claim[];
}

export async function batchArchiveClaims(ids: string[], archivedBy: string = 'system') {
  return batchUpdateClaims(ids, {
    archived: true,
    archived_at: new Date().toISOString(),
    archived_by: archivedBy
  });
}

export async function batchDeleteClaims(ids: string[]) {
  const { error } = await supabase
    .from('claims')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error batch deleting claims:', error);
    throw error;
  }

  return true;
}

export async function batchUpdatePreAuths(ids: string[], updates: Partial<Omit<PreAuth, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('pre_auths')
    .update(updates)
    .in('id', ids)
    .select();

  if (error) {
    console.error('Error batch updating pre-auths:', error);
    throw error;
  }

  return data as PreAuth[];
}

export async function batchArchivePreAuths(ids: string[], archivedBy: string = 'system') {
  return batchUpdatePreAuths(ids, {
    archived: true,
    archived_at: new Date().toISOString(),
    archived_by: archivedBy
  });
}

export async function batchDeletePreAuths(ids: string[]) {
  const { error } = await supabase
    .from('pre_auths')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error batch deleting pre-auths:', error);
    throw error;
  }

  return true;
}

// =====================================================
// REAL-TIME SUBSCRIPTIONS
// =====================================================

export function subscribeToClaimsChanges(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('claims_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'claims'
    }, callback)
    .subscribe();

  return subscription;
}

export function subscribeToPreAuthsChanges(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('pre_auths_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pre_auths'
    }, callback)
    .subscribe();

  return subscription;
}

// =====================================================
// ADVANCED FILTERING
// =====================================================

export interface ClaimFilters {
  status?: Claim['status'][];
  insuranceCompany?: string[];
  handler?: string[];
  dateSubmittedFrom?: string;
  dateSubmittedTo?: string;
  amountMin?: number;
  amountMax?: number;
  agingDaysMin?: number;
  agingDaysMax?: number;
  archived?: boolean;
  searchQuery?: string;
}

export async function getFilteredClaims(filters: ClaimFilters, sortBy: string = 'date_submitted', sortAsc: boolean = false) {
  let query = supabase.from('claims').select('*');

  // Apply filters
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.insuranceCompany && filters.insuranceCompany.length > 0) {
    query = query.in('insurance_company', filters.insuranceCompany);
  }

  if (filters.handler && filters.handler.length > 0) {
    query = query.in('handler', filters.handler);
  }

  if (filters.dateSubmittedFrom) {
    query = query.gte('date_submitted', filters.dateSubmittedFrom);
  }

  if (filters.dateSubmittedTo) {
    query = query.lte('date_submitted', filters.dateSubmittedTo);
  }

  if (filters.amountMin !== undefined) {
    query = query.gte('claim_amount', filters.amountMin);
  }

  if (filters.amountMax !== undefined) {
    query = query.lte('claim_amount', filters.amountMax);
  }

  if (filters.agingDaysMin !== undefined) {
    query = query.gte('aging_days', filters.agingDaysMin);
  }

  if (filters.agingDaysMax !== undefined) {
    query = query.lte('aging_days', filters.agingDaysMax);
  }

  if (filters.archived !== undefined) {
    query = query.eq('archived', filters.archived);
  }

  if (filters.searchQuery) {
    query = query.or(`patient_name.ilike.%${filters.searchQuery}%,patient_id.ilike.%${filters.searchQuery}%,claim_number.ilike.%${filters.searchQuery}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortAsc });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching filtered claims:', error);
    throw error;
  }

  return data as Claim[];
}

export interface PreAuthFilters {
  status?: PreAuth['status'][];
  insuranceCompany?: string[];
  handler?: string[];
  dateRequestedFrom?: string;
  dateRequestedTo?: string;
  requestedAmountMin?: number;
  requestedAmountMax?: number;
  archived?: boolean;
  searchQuery?: string;
}

export async function getFilteredPreAuths(filters: PreAuthFilters, sortBy: string = 'date_requested', sortAsc: boolean = false) {
  let query = supabase.from('pre_auths').select('*');

  // Apply filters
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.insuranceCompany && filters.insuranceCompany.length > 0) {
    query = query.in('insurance_company', filters.insuranceCompany);
  }

  if (filters.handler && filters.handler.length > 0) {
    query = query.in('handler', filters.handler);
  }

  if (filters.dateRequestedFrom) {
    query = query.gte('date_requested', filters.dateRequestedFrom);
  }

  if (filters.dateRequestedTo) {
    query = query.lte('date_requested', filters.dateRequestedTo);
  }

  if (filters.requestedAmountMin !== undefined) {
    query = query.gte('requested_amount', filters.requestedAmountMin);
  }

  if (filters.requestedAmountMax !== undefined) {
    query = query.lte('requested_amount', filters.requestedAmountMax);
  }

  if (filters.archived !== undefined) {
    query = query.eq('archived', filters.archived);
  }

  if (filters.searchQuery) {
    query = query.or(`patient_name.ilike.%${filters.searchQuery}%,patient_id.ilike.%${filters.searchQuery}%,pre_auth_number.ilike.%${filters.searchQuery}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortAsc });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching filtered pre-auths:', error);
    throw error;
  }

  return data as PreAuth[];
}

// =====================================================
// CLAIM UPDATES OPERATIONS
// =====================================================

export async function getClaimUpdates(claimId: string) {
  const { data, error } = await supabase
    .from('claim_updates')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching claim updates:', error);
    throw error;
  }

  return data as ClaimUpdate[];
}

export async function addClaimUpdate(update: Omit<ClaimUpdate, 'update_id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('claim_updates')
    .insert(update)
    .select()
    .single();

  if (error) {
    console.error('Error adding claim update:', error);
    throw error;
  }

  return data as ClaimUpdate;
}

export async function getPreAuthUpdates(preAuthId: string) {
  const { data, error } = await supabase
    .from('pre_auth_updates')
    .select('*')
    .eq('pre_auth_id', preAuthId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pre-auth updates:', error);
    throw error;
  }

  return data as PreAuthUpdate[];
}

export async function addPreAuthUpdate(update: Omit<PreAuthUpdate, 'update_id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('pre_auth_updates')
    .insert(update)
    .select()
    .single();

  if (error) {
    console.error('Error adding pre-auth update:', error);
    throw error;
  }

  return data as PreAuthUpdate;
}

// =====================================================
// INSURANCE CHECKS CRUD OPERATIONS
// =====================================================

export async function getInsuranceChecks() {
  const { data, error } = await supabase
    .from('insurance_checks')
    .select('*')
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching insurance checks:', error);
    throw error;
  }

  return data as InsuranceCheck[];
}

export async function getInsuranceCheckById(id: string) {
  const { data, error } = await supabase
    .from('insurance_checks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching insurance check:', error);
    throw error;
  }

  return data as InsuranceCheck;
}

export async function insertInsuranceCheck(check: Omit<InsuranceCheck, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('insurance_checks')
    .insert(check)
    .select()
    .single();

  if (error) {
    console.error('Error inserting insurance check:', error);
    throw error;
  }

  return data as InsuranceCheck;
}

export async function updateInsuranceCheck(id: string, updates: Partial<Omit<InsuranceCheck, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('insurance_checks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating insurance check:', error);
    throw error;
  }

  return data as InsuranceCheck;
}

export async function deleteInsuranceCheck(id: string) {
  const { error } = await supabase
    .from('insurance_checks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting insurance check:', error);
    throw error;
  }

  return true;
}

export async function archiveInsuranceCheck(id: string, archivedBy: string) {
  const { error } = await supabase
    .from('insurance_checks')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: archivedBy
    })
    .eq('id', id);

  if (error) {
    console.error('Error archiving insurance check:', error);
    throw error;
  }

  return true;
}

export async function unarchiveInsuranceCheck(id: string) {
  const { error } = await supabase
    .from('insurance_checks')
    .update({
      is_archived: false,
      archived_at: null,
      archived_by: null
    })
    .eq('id', id);

  if (error) {
    console.error('Error unarchiving insurance check:', error);
    throw error;
  }

  return true;
}

export async function getActiveInsuranceChecks() {
  const { data, error } = await supabase
    .from('insurance_checks')
    .select('*')
    .eq('is_archived', false)
    .order('date_entered', { ascending: false });

  if (error) {
    console.error('Error fetching active insurance checks:', error);
    throw error;
  }

  return data as InsuranceCheck[];
}

export async function getArchivedInsuranceChecks() {
  const { data, error } = await supabase
    .from('insurance_checks')
    .select('*')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });

  if (error) {
    console.error('Error fetching archived insurance checks:', error);
    throw error;
  }

  return data as InsuranceCheck[];
}

export async function getInsuranceChecksByStatus(status: InsuranceCheck['status']) {
  const { data, error } = await supabase
    .from('insurance_checks')
    .select('*')
    .eq('status', status)
    .order('date_entered', { ascending: false });

  if (error) {
    console.error('Error fetching insurance checks by status:', error);
    throw error;
  }

  return data as InsuranceCheck[];
}

export async function getInsuranceChecksByPaymentType(paymentType: InsuranceCheck['payment_type']) {
  const { data, error} = await supabase
    .from('insurance_checks')
    .select('*')
    .eq('payment_type', paymentType)
    .order('date_entered', { ascending: false });

  if (error) {
    console.error('Error fetching insurance checks by payment type:', error);
    throw error;
  }

  return data as InsuranceCheck[];
}

export async function getInsuranceChecksByDate(date: string) {
  const { data, error } = await supabase
    .from('insurance_checks')
    .select('*')
    .eq('payment_date', date)
    .order('check_eft_number', { ascending: true });

  if (error) {
    console.error('Error fetching insurance checks by date:', error);
    throw error;
  }

  return data as InsuranceCheck[];
}

// =====================================================
// INSURANCE CHECKS AUDIT HISTORY
// =====================================================

export async function getInsuranceCheckAuditHistory(checkId: string) {
  const { data, error } = await supabase
    .from('insurance_checks_audit_history')
    .select('*')
    .eq('check_id', checkId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching insurance check audit history:', error);
    throw error;
  }

  return data as InsuranceCheckAuditHistory[];
}

// =====================================================
// INSURANCE CHECKS REAL-TIME SUBSCRIPTIONS
// =====================================================

export function subscribeToInsuranceChecksChanges(callback: (payload: any) => void) {
  return supabase
    .channel('insurance_checks_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'insurance_checks' }, callback)
    .subscribe();
}

// =====================================================
// INSURANCE CHECK UPDATES (MANUAL PROGRESSION NOTES)
// =====================================================

export async function getInsuranceCheckUpdates(checkId: string) {
  const { data, error } = await supabase
    .from('insurance_check_updates')
    .select('*')
    .eq('check_id', checkId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching insurance check updates:', error);
    throw error;
  }

  return data as InsuranceCheckUpdate[];
}

export async function addInsuranceCheckUpdate(update: Omit<InsuranceCheckUpdate, 'update_id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('insurance_check_updates')
    .insert(update)
    .select()
    .single();

  if (error) {
    console.error('Error adding insurance check update:', error);
    throw error;
  }

  return data as InsuranceCheckUpdate;
}
