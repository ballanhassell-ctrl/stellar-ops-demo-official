// =====================================================
// Insurance A/R Report - Service Layer
// Mirrors the "Stellar X Court Street Dental - Insurance A/R Report" spreadsheet
// =====================================================

import { supabase } from '../lib/supabaseClient';
import type { InsuranceARClaim, InsuranceARClaimStatus, InsuranceARAgingStatus } from '../types/database.types';
import { isStaticDataMode } from '../config/dataMode';
import { sampleInsuranceARClaims } from '../data/sampleData';

// =====================================================
// CRUD OPERATIONS
// =====================================================

export async function getInsuranceARClaims(): Promise<InsuranceARClaim[]> {
  if (isStaticDataMode()) {
    return [...sampleInsuranceARClaims];
  }

  const { data, error } = await supabase
    .from('insurance_ar_claims')
    .select('*')
    .order('date_of_service', { ascending: false });

  if (error) {
    console.error('Error fetching insurance A/R claims:', error);
    throw error;
  }

  return data || [];
}

export async function insertInsuranceARClaim(
  claim: Omit<InsuranceARClaim, 'id' | 'created_at' | 'updated_at'>
): Promise<InsuranceARClaim> {
  const { data, error } = await supabase
    .from('insurance_ar_claims')
    .insert(claim)
    .select()
    .single();

  if (error) {
    console.error('Error inserting insurance A/R claim:', error);
    throw error;
  }

  return data;
}

export async function updateInsuranceARClaim(
  id: string,
  updates: Partial<Omit<InsuranceARClaim, 'id' | 'created_at' | 'updated_at'>>
): Promise<InsuranceARClaim> {
  const { data, error } = await supabase
    .from('insurance_ar_claims')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating insurance A/R claim:', error);
    throw error;
  }

  return data;
}

export async function deleteInsuranceARClaim(id: string): Promise<void> {
  const { error } = await supabase
    .from('insurance_ar_claims')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting insurance A/R claim:', error);
    throw error;
  }
}

// =====================================================
// FILTERING
// =====================================================

export async function getInsuranceARByStatus(status: InsuranceARClaimStatus): Promise<InsuranceARClaim[]> {
  if (isStaticDataMode()) {
    return sampleInsuranceARClaims.filter(c => c.claim_status === status);
  }

  const { data, error } = await supabase
    .from('insurance_ar_claims')
    .select('*')
    .eq('claim_status', status)
    .order('date_of_service', { ascending: false });

  if (error) {
    console.error('Error fetching insurance A/R by status:', error);
    throw error;
  }

  return data || [];
}

export async function getInsuranceARByAging(aging: InsuranceARAgingStatus): Promise<InsuranceARClaim[]> {
  if (isStaticDataMode()) {
    return sampleInsuranceARClaims.filter(c => c.aging_status === aging);
  }

  const { data, error } = await supabase
    .from('insurance_ar_claims')
    .select('*')
    .eq('aging_status', aging)
    .order('outstanding', { ascending: false });

  if (error) {
    console.error('Error fetching insurance A/R by aging:', error);
    throw error;
  }

  return data || [];
}

export async function getInsuranceARByAssignee(assignedTo: string): Promise<InsuranceARClaim[]> {
  if (isStaticDataMode()) {
    return sampleInsuranceARClaims.filter(c => c.assigned_to === assignedTo);
  }

  const { data, error } = await supabase
    .from('insurance_ar_claims')
    .select('*')
    .eq('assigned_to', assignedTo)
    .order('outstanding', { ascending: false });

  if (error) {
    console.error('Error fetching insurance A/R by assignee:', error);
    throw error;
  }

  return data || [];
}

// =====================================================
// METRICS & SUMMARY DASHBOARD
// =====================================================

export interface InsuranceARSummary {
  totalClaims: number;
  totalClaimValue: number;
  totalCollected: number;
  totalOutstanding: number;

  statusBreakdown: {
    pendingReview: number;
    resubmitted: number;
    finalReview: number;
    consultantReview: number;
    closedPaid: number;
    closedUnpaid: number;
    appealFiled: number;
    denied: number;
  };

  agingBreakdown: {
    '0-30': { count: number; outstanding: number };
    '31-60': { count: number; outstanding: number };
    '61-90': { count: number; outstanding: number };
    '91-120': { count: number; outstanding: number };
    '121+': { count: number; outstanding: number };
  };

  teamWorkload: Record<string, { count: number; outstanding: number }>;
}

export function calculateInsuranceARSummary(claims: InsuranceARClaim[]): InsuranceARSummary {
  const totalClaims = claims.length;
  const totalClaimValue = claims.reduce((sum, c) => sum + c.total_claim, 0);
  const totalCollected = claims.reduce((sum, c) => sum + c.collected, 0);
  const totalOutstanding = claims.reduce((sum, c) => sum + c.outstanding, 0);

  // Status breakdown
  const statusCounts = (status: InsuranceARClaimStatus) =>
    claims.filter(c => c.claim_status === status).length;

  const statusBreakdown = {
    pendingReview: statusCounts('Pending Review'),
    resubmitted: claims.filter(c =>
      c.claim_status === 'Resubmitted - 1st' || c.claim_status === 'Resubmitted - 2nd'
    ).length,
    finalReview: statusCounts('Final Review'),
    consultantReview: statusCounts('Consultant Review'),
    closedPaid: statusCounts('Closed/Paid'),
    closedUnpaid: statusCounts('Closed/Unpaid'),
    appealFiled: statusCounts('Appeal Filed'),
    denied: statusCounts('Denied'),
  };

  // Aging breakdown
  const agingGroup = (aging: InsuranceARAgingStatus) => {
    const filtered = claims.filter(c => c.aging_status === aging);
    return {
      count: filtered.length,
      outstanding: filtered.reduce((sum, c) => sum + c.outstanding, 0),
    };
  };

  const agingBreakdown = {
    '0-30': agingGroup('0-30 Days'),
    '31-60': agingGroup('31-60 Days'),
    '61-90': agingGroup('61-90 Days'),
    '91-120': agingGroup('91-120 Days'),
    '121+': agingGroup('121+ Days'),
  };

  // Team workload
  const teamWorkload: Record<string, { count: number; outstanding: number }> = {};
  claims.forEach(c => {
    if (!teamWorkload[c.assigned_to]) {
      teamWorkload[c.assigned_to] = { count: 0, outstanding: 0 };
    }
    teamWorkload[c.assigned_to].count++;
    teamWorkload[c.assigned_to].outstanding += c.outstanding;
  });

  return {
    totalClaims,
    totalClaimValue,
    totalCollected,
    totalOutstanding,
    statusBreakdown,
    agingBreakdown,
    teamWorkload,
  };
}

export async function getInsuranceARSummary(): Promise<InsuranceARSummary> {
  const claims = await getInsuranceARClaims();
  return calculateInsuranceARSummary(claims);
}
