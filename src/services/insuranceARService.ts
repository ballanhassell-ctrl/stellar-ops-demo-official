// =====================================================
// Insurance A/R Report - Service Layer (Wrapper)
// @deprecated - This service now delegates to claimsService.
// The Insurance A/R tab reads from the unified `claims` table.
// These wrapper functions are kept for backwards compatibility
// with arSnapshotService.ts and other consumers.
// =====================================================

import type { Claim, InsuranceARClaim } from '../types/database.types';
import {
  getClaims,
  calculateInsuranceARSummaryFromClaims,
  type InsuranceARSummary,
} from './claimsService';

// Re-export the summary type for consumers
export type { InsuranceARSummary };

// =====================================================
// WRAPPER FUNCTIONS - delegate to claimsService
// =====================================================

/**
 * @deprecated Use getClaims() from claimsService instead.
 * Returns claims data mapped to the legacy InsuranceARClaim shape
 * for backwards compatibility with arSnapshotService.
 */
export async function getInsuranceARClaims(): Promise<InsuranceARClaim[]> {
  const claims = await getClaims();
  return claims.map(claimToInsuranceARClaim);
}

/**
 * @deprecated Use calculateInsuranceARSummaryFromClaims() from claimsService instead.
 */
export function calculateInsuranceARSummary(claims: InsuranceARClaim[]): InsuranceARSummary {
  // Convert InsuranceARClaim[] back to Claim-compatible shape for the new function
  const asClaims: Claim[] = claims.map(c => ({
    id: c.id,
    patient_id: c.patient_id || '',
    patient_name: c.patient_name,
    insurance_company: c.insurance_company,
    claim_number: null,
    procedure_code: c.procedure_types || '',
    claim_detail: '',
    claim_amount: c.total_claim,
    status: c.claim_status,
    date_submitted: c.date_of_service,
    date_of_service: c.date_of_service,
    follow_up_date: c.date_of_service,
    created_by: '',
    completed_by: c.assigned_to || '',
    notes: c.notes,
    aging_days: 0,
    archived: false,
    archived_at: null,
    archived_by: null,
    collected: c.collected,
    outstanding: c.outstanding,
    pri_sec: c.pri_sec || null,
    procedure_types: c.procedure_types,
    assigned_to: c.assigned_to,
    rep_name: c.rep_name,
    reference_number: c.reference_number,
    aging_status: c.aging_status,
    carrier_phone: null,
    date_sent_orig: null,
  }));
  return calculateInsuranceARSummaryFromClaims(asClaims);
}

// =====================================================
// HELPER: Convert Claim to legacy InsuranceARClaim shape
// =====================================================

function claimToInsuranceARClaim(claim: Claim): InsuranceARClaim {
  // Map aging_days to aging_status if not already set
  let agingStatus = claim.aging_status;
  if (!agingStatus && claim.aging_days != null) {
    if (claim.aging_days <= 30) agingStatus = '0-30 Days';
    else if (claim.aging_days <= 60) agingStatus = '31-60 Days';
    else if (claim.aging_days <= 90) agingStatus = '61-90 Days';
    else if (claim.aging_days <= 120) agingStatus = '91-120 Days';
    else agingStatus = '121+ Days';
  }

  return {
    id: claim.id,
    patient_name: claim.patient_name,
    patient_id: claim.patient_id || null,
    date_of_service: claim.date_of_service,
    insurance_company: claim.insurance_company,
    pri_sec: (claim.pri_sec as 'Primary' | 'Secondary') || 'Primary',
    total_claim: claim.claim_amount,
    collected: claim.collected || 0,
    outstanding: claim.outstanding || 0,
    claim_status: (claim.status as InsuranceARClaim['claim_status']) || 'Pending Review',
    aging_status: (agingStatus as InsuranceARClaim['aging_status']) || '0-30 Days',
    assigned_to: claim.assigned_to || '',
    procedure_types: claim.procedure_types || claim.procedure_code || '',
    rep_name: claim.rep_name || null,
    reference_number: claim.reference_number || null,
    notes: claim.notes,
    created_at: claim.created_at,
    updated_at: claim.updated_at,
  };
}
