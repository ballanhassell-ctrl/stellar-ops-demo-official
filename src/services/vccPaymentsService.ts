// =====================================================
// VCC Payments Tracker - Service Layer
// Tracks VCC standard payments through the workflow:
// Collection -> Posting -> Complete
// =====================================================

import { supabase } from '../lib/supabaseClient';
import { isStaticDataMode } from '../config/dataMode';
import type { NoteEntry, AuditTrailEntry } from '../types/database.types';

// =====================================================
// TYPES
// =====================================================

export interface OptOutNote {
  id: string;
  initials: string;
  note: string;
  created_at: string;
}

export type PaymentMethod = 'card' | 'check' | 'pending';
export type WorkflowStatus = 'needs_posting' | 'awaiting_deposit' | 'complete' | 'declined' | 'opted_out';

export interface VCCPayment {
  id: string;
  patient_name: string;
  date_of_service: string;
  multiple_dos: boolean;
  claim_type: string;
  payment_amount: number;
  posted_to_open_dental: boolean;
  posted_by_initials: string;
  processed_via_terminal: boolean;
  processed_by_initials: string;
  deposited_via_check: boolean;
  deposited_via_check_by_initials: string;
  deposit_confirmed: boolean;
  status: 'Needs OD Posting & Payment Deposit' | 'Needs to be Posted to OD' | 'Pending Payment Deposit' | 'Closed';
  declined: boolean;
  declined_reason: string;
  opt_out_requested: boolean;
  opted_out: boolean;
  opt_out_notes: OptOutNote[];
  structured_notes: NoteEntry[];
  audit_trail: AuditTrailEntry[];
  created_at: string;
  updated_at: string;
}

export type NewVCCPayment = Omit<VCCPayment, 'id' | 'created_at' | 'updated_at'>;

// =====================================================
// COMPUTED HELPERS
// =====================================================

export function getPaymentMethod(payment: VCCPayment): PaymentMethod {
  if (payment.processed_via_terminal) return 'card';
  if (payment.deposited_via_check) return 'check';
  return 'pending';
}

export function getWorkflowStatus(payment: VCCPayment): WorkflowStatus {
  if (payment.declined) return 'declined';
  if (payment.opted_out) return 'opted_out';
  const method = getPaymentMethod(payment);
  const collected = method !== 'pending';
  if (payment.posted_to_open_dental && collected) return 'complete';
  if (method === 'pending') return 'awaiting_deposit';
  return 'needs_posting';
}

export function getWorkflowStatusLabel(status: WorkflowStatus): string {
  switch (status) {
    case 'needs_posting': return 'Needs Posting';
    case 'awaiting_deposit': return 'Awaiting Deposit';
    case 'complete': return 'Complete';
    case 'declined': return 'Declined';
    case 'opted_out': return 'Opted Out';
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'card': return 'Card';
    case 'check': return 'Check';
    case 'pending': return 'Pending';
  }
}

// =====================================================
// SUMMARY (redesigned for 4-card layout)
// =====================================================

export interface VCCPaymentsSummary {
  // Overview
  totalClaims: number;
  totalValue: number;

  // Collection Status
  collection: {
    card: { amount: number; count: number };
    check: { amount: number; count: number };
    awaitingDeposit: { amount: number; count: number };
  };

  // Posting Status
  posting: {
    posted: number;
    needsPosting: number;
  };

  // Exceptions
  exceptions: {
    declined: { amount: number; count: number };
    optedOut: number;
  };

  // Filter counts
  filterCounts: {
    all: number;
    needs_posting: number;
    awaiting_deposit: number;
    complete: number;
    exceptions: number;
  };
}

export function calculateVCCSummary(payments: VCCPayment[]): VCCPaymentsSummary {
  // Exclude opted-out from main counts (per spec)
  const active = payments.filter(p => !p.opted_out);

  const cardPayments = active.filter(p => p.processed_via_terminal && !p.declined);
  const checkPayments = active.filter(p => p.deposited_via_check && !p.declined);
  const awaitingDeposit = active.filter(p => !p.processed_via_terminal && !p.deposited_via_check && !p.declined);
  const declined = payments.filter(p => p.declined);
  const optedOut = payments.filter(p => p.opted_out);

  const posted = active.filter(p => p.posted_to_open_dental).length;
  const needsPosting = active.filter(p => !p.posted_to_open_dental && !p.declined).length;

  // Filter counts using workflow status
  const allStatuses = payments.map(p => getWorkflowStatus(p));
  const needsPostingCount = allStatuses.filter(s => s === 'needs_posting').length;
  const awaitingDepositCount = allStatuses.filter(s => s === 'awaiting_deposit').length;
  const completeCount = allStatuses.filter(s => s === 'complete').length;
  const exceptionsCount = allStatuses.filter(s => s === 'declined' || s === 'opted_out').length;

  return {
    totalClaims: payments.length,
    totalValue: payments.reduce((s, p) => s + p.payment_amount, 0),

    collection: {
      card: {
        amount: cardPayments.reduce((s, p) => s + p.payment_amount, 0),
        count: cardPayments.length,
      },
      check: {
        amount: checkPayments.reduce((s, p) => s + p.payment_amount, 0),
        count: checkPayments.length,
      },
      awaitingDeposit: {
        amount: awaitingDeposit.reduce((s, p) => s + p.payment_amount, 0),
        count: awaitingDeposit.length,
      },
    },

    posting: {
      posted,
      needsPosting,
    },

    exceptions: {
      declined: {
        amount: declined.reduce((s, p) => s + p.payment_amount, 0),
        count: declined.length,
      },
      optedOut: optedOut.length,
    },

    filterCounts: {
      all: payments.length,
      needs_posting: needsPostingCount,
      awaiting_deposit: awaitingDepositCount,
      complete: completeCount,
      exceptions: exceptionsCount,
    },
  };
}

// =====================================================
// SAMPLE DATA (for static / table-not-found fallback)
// =====================================================

export const sampleVCCPayments: VCCPayment[] = [
  // Card-collected, not posted (Needs Posting)
  { id: 'vcc-seed-001', patient_name: 'Jerome Ware', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 434.27, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'KW', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-002', patient_name: 'Victor Guadagnino', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 260.50, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'MR', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-003', patient_name: 'John Figura', date_of_service: '2026-01-02', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 379.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'GL', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z' },
  { id: 'vcc-seed-004', patient_name: 'Danielle Williams', date_of_service: '2026-01-02', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 283.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'RH', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z' },
  { id: 'vcc-seed-005', patient_name: 'Omar Turk', date_of_service: '2026-01-03', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 307.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'KW', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-03T00:00:00.000Z', updated_at: '2026-01-03T00:00:00.000Z' },
  { id: 'vcc-seed-006', patient_name: 'Jennifer Dawson', date_of_service: '2026-01-03', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'MR', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-03T00:00:00.000Z', updated_at: '2026-01-03T00:00:00.000Z' },
  { id: 'vcc-seed-007', patient_name: 'Terriyonne Green', date_of_service: '2026-01-04', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 768.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'GL', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-04T00:00:00.000Z', updated_at: '2026-01-04T00:00:00.000Z' },
  { id: 'vcc-seed-008', patient_name: 'Deniya Pheix', date_of_service: '2026-01-04', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 347.20, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'RH', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-04T00:00:00.000Z', updated_at: '2026-01-04T00:00:00.000Z' },
  { id: 'vcc-seed-009', patient_name: 'Joseph Williams', date_of_service: '2026-01-05', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 99.40, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'JC', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-05T00:00:00.000Z', updated_at: '2026-01-05T00:00:00.000Z' },
  { id: 'vcc-seed-010', patient_name: 'Terriyonne Green', date_of_service: '2026-01-05', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 368.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'KW', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-05T00:00:00.000Z', updated_at: '2026-01-05T00:00:00.000Z' },

  // Check-collected, not posted (Needs Posting)
  { id: 'vcc-seed-011', patient_name: 'Warren Faulkner', date_of_service: '2026-01-06', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 328.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: true, deposited_via_check_by_initials: 'MR', deposit_confirmed: true, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-06T00:00:00.000Z', updated_at: '2026-01-06T00:00:00.000Z' },
  { id: 'vcc-seed-012', patient_name: 'Alexander Peters', date_of_service: '2026-01-06', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 839.20, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: true, deposited_via_check_by_initials: 'GL', deposit_confirmed: true, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-06T00:00:00.000Z', updated_at: '2026-01-06T00:00:00.000Z' },
  { id: 'vcc-seed-013', patient_name: 'Raquel Balsam', date_of_service: '2026-01-07', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 309.60, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: true, deposited_via_check_by_initials: 'RH', deposit_confirmed: true, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-07T00:00:00.000Z', updated_at: '2026-01-07T00:00:00.000Z' },

  // Awaiting deposit (pending payment method)
  { id: 'vcc-seed-014', patient_name: 'Sean Dawson', date_of_service: '2026-01-07', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 215.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-07T00:00:00.000Z', updated_at: '2026-01-07T00:00:00.000Z' },
  { id: 'vcc-seed-015', patient_name: 'Terriyonne Green', date_of_service: '2026-01-08', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 1496.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-08T00:00:00.000Z', updated_at: '2026-01-08T00:00:00.000Z' },
  { id: 'vcc-seed-016', patient_name: 'Sylvia Williams', date_of_service: '2026-01-08', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 1760.87, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-08T00:00:00.000Z', updated_at: '2026-01-08T00:00:00.000Z' },
  { id: 'vcc-seed-017', patient_name: 'Hazel Ann Forde', date_of_service: '2026-01-09', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 5000.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-09T00:00:00.000Z', updated_at: '2026-01-09T00:00:00.000Z' },
  { id: 'vcc-seed-018', patient_name: 'Tamika Merise', date_of_service: '2026-01-09', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 307.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-09T00:00:00.000Z', updated_at: '2026-01-09T00:00:00.000Z' },

  // Complete (posted + collected)
  { id: 'vcc-seed-019', patient_name: 'William Johnston', date_of_service: '2026-01-10', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 328.00, posted_to_open_dental: true, posted_by_initials: 'KW', processed_via_terminal: true, processed_by_initials: 'KW', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-10T00:00:00.000Z', updated_at: '2026-01-10T00:00:00.000Z' },
  { id: 'vcc-seed-020', patient_name: 'Frederick Fernandes', date_of_service: '2026-01-10', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 108.50, posted_to_open_dental: true, posted_by_initials: 'MR', processed_via_terminal: true, processed_by_initials: 'MR', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-10T00:00:00.000Z', updated_at: '2026-01-10T00:00:00.000Z' },
  { id: 'vcc-seed-021', patient_name: 'Rachel Manes', date_of_service: '2026-01-11', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 933.60, posted_to_open_dental: true, posted_by_initials: 'GL', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: true, deposited_via_check_by_initials: 'GL', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-11T00:00:00.000Z', updated_at: '2026-01-11T00:00:00.000Z' },
  { id: 'vcc-seed-022', patient_name: 'Esra Shahein', date_of_service: '2026-01-11', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.00, posted_to_open_dental: true, posted_by_initials: 'RH', processed_via_terminal: true, processed_by_initials: 'RH', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-11T00:00:00.000Z', updated_at: '2026-01-11T00:00:00.000Z' },
  { id: 'vcc-seed-023', patient_name: 'James Block', date_of_service: '2026-01-12', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 328.00, posted_to_open_dental: true, posted_by_initials: 'JC', processed_via_terminal: true, processed_by_initials: 'JC', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-12T00:00:00.000Z', updated_at: '2026-01-12T00:00:00.000Z' },
  { id: 'vcc-seed-024', patient_name: 'Ishan Banerjee', date_of_service: '2026-01-12', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 215.00, posted_to_open_dental: true, posted_by_initials: 'KW', processed_via_terminal: true, processed_by_initials: 'KW', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-12T00:00:00.000Z', updated_at: '2026-01-12T00:00:00.000Z' },
  { id: 'vcc-seed-025', patient_name: 'Takara Estes', date_of_service: '2026-01-13', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 621.00, posted_to_open_dental: true, posted_by_initials: 'MR', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: true, deposited_via_check_by_initials: 'MR', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-13T00:00:00.000Z', updated_at: '2026-01-13T00:00:00.000Z' },
  { id: 'vcc-seed-026', patient_name: 'Jamie McBeth', date_of_service: '2026-01-13', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 688.50, posted_to_open_dental: true, posted_by_initials: 'GL', processed_via_terminal: true, processed_by_initials: 'GL', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-13T00:00:00.000Z', updated_at: '2026-01-13T00:00:00.000Z' },
  { id: 'vcc-seed-027', patient_name: 'Rachel Manes', date_of_service: '2026-01-14', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 307.00, posted_to_open_dental: true, posted_by_initials: 'RH', processed_via_terminal: true, processed_by_initials: 'RH', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-14T00:00:00.000Z', updated_at: '2026-01-14T00:00:00.000Z' },
  { id: 'vcc-seed-028', patient_name: 'Rachel Pace', date_of_service: '2026-01-14', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 285.60, posted_to_open_dental: true, posted_by_initials: 'JC', processed_via_terminal: true, processed_by_initials: 'JC', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-14T00:00:00.000Z', updated_at: '2026-01-14T00:00:00.000Z' },

  // Declined
  { id: 'vcc-seed-029', patient_name: 'Jennifer Poole', date_of_service: '2026-01-15', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 215.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: true, declined_reason: 'Card declined - insufficient funds', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-01-15T00:00:00.000Z' },
  { id: 'vcc-seed-030', patient_name: 'Abdulrahan Alkhudhari', date_of_service: '2026-01-15', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 897.46, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: true, declined_reason: 'Card expired', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-01-15T00:00:00.000Z' },

  // Opted Out
  { id: 'vcc-seed-031', patient_name: 'Myriam Bucatinsky', date_of_service: '2026-01-16', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 76.09, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: true, opted_out: true, opt_out_notes: [{ id: 'note-1', initials: 'KW', note: 'Patient requested opt-out via phone', created_at: '2026-01-16T10:00:00.000Z' }], structured_notes: [], audit_trail: [], created_at: '2026-01-16T00:00:00.000Z', updated_at: '2026-01-16T00:00:00.000Z' },
  { id: 'vcc-seed-032', patient_name: 'Nethra Rajendran', date_of_service: '2026-01-16', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 531.20, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: true, opted_out: true, opt_out_notes: [{ id: 'note-2', initials: 'MR', note: 'Patient opted out in writing', created_at: '2026-01-16T11:00:00.000Z' }], structured_notes: [], audit_trail: [], created_at: '2026-01-16T00:00:00.000Z', updated_at: '2026-01-16T00:00:00.000Z' },

  // More card-collected, not posted
  { id: 'vcc-seed-033', patient_name: 'Gloria Benjamin', date_of_service: '2026-01-17', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 215.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'KW', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-17T00:00:00.000Z', updated_at: '2026-01-17T00:00:00.000Z' },
  { id: 'vcc-seed-034', patient_name: 'Victor Guadagnino', date_of_service: '2026-01-17', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 432.50, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'MR', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-17T00:00:00.000Z', updated_at: '2026-01-17T00:00:00.000Z' },
  { id: 'vcc-seed-035', patient_name: 'Alec Mitchel', date_of_service: '2026-01-18', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 121.60, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'GL', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-18T00:00:00.000Z', updated_at: '2026-01-18T00:00:00.000Z' },
  { id: 'vcc-seed-036', patient_name: 'Swazi Tshbalala', date_of_service: '2026-01-18', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 275.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'RH', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-18T00:00:00.000Z', updated_at: '2026-01-18T00:00:00.000Z' },
  { id: 'vcc-seed-037', patient_name: 'Bennett Cohen', date_of_service: '2026-01-19', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'JC', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-19T00:00:00.000Z', updated_at: '2026-01-19T00:00:00.000Z' },
  { id: 'vcc-seed-038', patient_name: 'Devonte Rondon', date_of_service: '2026-01-19', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 497.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'KW', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-19T00:00:00.000Z', updated_at: '2026-01-19T00:00:00.000Z' },
  { id: 'vcc-seed-039', patient_name: 'Robert Ham', date_of_service: '2026-01-20', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 284.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'MR', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-20T00:00:00.000Z', updated_at: '2026-01-20T00:00:00.000Z' },
  { id: 'vcc-seed-040', patient_name: 'Andrew Wetzel', date_of_service: '2026-01-20', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 629.60, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: 'GL', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs to be Posted to OD', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-20T00:00:00.000Z', updated_at: '2026-01-20T00:00:00.000Z' },

  // More complete
  { id: 'vcc-seed-041', patient_name: 'Maria Bernas', date_of_service: '2026-01-21', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 167.50, posted_to_open_dental: true, posted_by_initials: 'RH', processed_via_terminal: true, processed_by_initials: 'RH', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-21T00:00:00.000Z', updated_at: '2026-01-21T00:00:00.000Z' },
  { id: 'vcc-seed-042', patient_name: 'Frederick Fernandes', date_of_service: '2026-01-21', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 549.00, posted_to_open_dental: true, posted_by_initials: 'JC', processed_via_terminal: true, processed_by_initials: 'JC', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-21T00:00:00.000Z', updated_at: '2026-01-21T00:00:00.000Z' },
  { id: 'vcc-seed-043', patient_name: 'Johnathan Fox', date_of_service: '2026-01-22', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 557.40, posted_to_open_dental: true, posted_by_initials: 'KW', processed_via_terminal: true, processed_by_initials: 'KW', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-22T00:00:00.000Z', updated_at: '2026-01-22T00:00:00.000Z' },
  { id: 'vcc-seed-044', patient_name: 'Julia Gharachourlou', date_of_service: '2026-01-22', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 686.40, posted_to_open_dental: true, posted_by_initials: 'MR', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: true, deposited_via_check_by_initials: 'MR', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-22T00:00:00.000Z', updated_at: '2026-01-22T00:00:00.000Z' },
  { id: 'vcc-seed-045', patient_name: 'Jason Karolak', date_of_service: '2026-01-23', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.00, posted_to_open_dental: true, posted_by_initials: 'GL', processed_via_terminal: true, processed_by_initials: 'GL', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-23T00:00:00.000Z', updated_at: '2026-01-23T00:00:00.000Z' },
  { id: 'vcc-seed-046', patient_name: 'Nicole Vaughan', date_of_service: '2026-01-23', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 304.20, posted_to_open_dental: true, posted_by_initials: 'RH', processed_via_terminal: true, processed_by_initials: 'RH', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: true, status: 'Closed', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-23T00:00:00.000Z', updated_at: '2026-01-23T00:00:00.000Z' },

  // More awaiting deposit
  { id: 'vcc-seed-047', patient_name: 'Abdulrahan Alkhudhari', date_of_service: '2026-01-24', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 214.74, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-24T00:00:00.000Z', updated_at: '2026-01-24T00:00:00.000Z' },
  { id: 'vcc-seed-048', patient_name: 'Sherri Ehrlich', date_of_service: '2026-01-24', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 870.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-24T00:00:00.000Z', updated_at: '2026-01-24T00:00:00.000Z' },
  { id: 'vcc-seed-049', patient_name: 'Delia McDermott', date_of_service: '2026-01-25', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 851.25, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-25T00:00:00.000Z', updated_at: '2026-01-25T00:00:00.000Z' },
  { id: 'vcc-seed-050', patient_name: 'Kathyann Alleyne', date_of_service: '2026-01-25', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 225.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-25T00:00:00.000Z', updated_at: '2026-01-25T00:00:00.000Z' },
  { id: 'vcc-seed-051', patient_name: 'Philip Rosenthal', date_of_service: '2026-01-26', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 266.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-26T00:00:00.000Z', updated_at: '2026-01-26T00:00:00.000Z' },
  { id: 'vcc-seed-052', patient_name: 'Delia McDermott', date_of_service: '2026-01-26', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.80, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: false, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', deposit_confirmed: false, status: 'Needs OD Posting & Payment Deposit', declined: false, declined_reason: '', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-26T00:00:00.000Z', updated_at: '2026-01-26T00:00:00.000Z' },
];

// =====================================================
// HELPERS
// =====================================================

function isTableNotFoundError(error: any): boolean {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST204' ||
    error?.message?.includes('404') ||
    error?.message?.includes('relation') ||
    error?.status === 404
  );
}

function normalizePayment(row: any): VCCPayment {
  return {
    ...row,
    payment_amount: Number(row.payment_amount) || 0,
    posted_to_open_dental: !!row.posted_to_open_dental,
    processed_via_terminal: !!row.processed_via_terminal,
    multiple_dos: !!row.multiple_dos,
    deposited_via_check: !!row.deposited_via_check,
    deposit_confirmed: !!row.deposit_confirmed,
    declined: !!row.declined,
    declined_reason: row.declined_reason || '',
    opt_out_requested: !!row.opt_out_requested,
    opted_out: !!row.opted_out,
    opt_out_notes: Array.isArray(row.opt_out_notes) ? row.opt_out_notes : [],
  };
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

export async function getVCCPayments(): Promise<VCCPayment[]> {
  if (isStaticDataMode()) {
    return [...sampleVCCPayments];
  }

  const { data, error } = await supabase
    .from('vcc_payments')
    .select('*')
    .order('date_of_service', { ascending: false });

  if (error) {
    console.error('Error fetching VCC payments:', error);
    if (isTableNotFoundError(error)) {
      console.warn('vcc_payments table not found. Using local state. Create the table in Supabase to persist data.');
      return [...sampleVCCPayments];
    }
    throw error;
  }

  return (data || []).map(normalizePayment);
}

export async function insertVCCPayment(
  payment: NewVCCPayment
): Promise<VCCPayment> {
  const { data, error } = await supabase
    .from('vcc_payments')
    .insert({ ...payment, id: crypto.randomUUID() })
    .select()
    .single();

  if (error) {
    console.error('Error inserting VCC payment:', error);
    throw error;
  }

  return normalizePayment(data);
}

export async function updateVCCPayment(
  id: string,
  updates: Partial<NewVCCPayment>
): Promise<VCCPayment> {
  const { data, error } = await supabase
    .from('vcc_payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating VCC payment:', error);
    throw error;
  }

  return normalizePayment(data);
}

export async function deleteVCCPayment(id: string): Promise<void> {
  const { error } = await supabase
    .from('vcc_payments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting VCC payment:', error);
    throw error;
  }
}
