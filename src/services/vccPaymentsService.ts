// =====================================================
// VCC Payments Tracker - Service Layer
// Tracks VCC standard payments, opt-out statuses, and
// posting/terminal processing workflow
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
  status: 'Needs OD Posting & Payment Deposit' | 'Needs to be Posted to OD' | 'Pending Payment Deposit' | 'Closed';
  opt_out_requested: boolean;
  opted_out: boolean;
  opt_out_notes: OptOutNote[];
  structured_notes: NoteEntry[];
  audit_trail: AuditTrailEntry[];
  created_at: string;
  updated_at: string;
}

export type NewVCCPayment = Omit<VCCPayment, 'id' | 'created_at' | 'updated_at'>;

export interface VCCPaymentsSummary {
  totalPayments: number;
  totalAmount: number;
  pendingAmount: number;
  pendingCount: number;
  closedAmount: number;
  closedCount: number;
  closedCheckAmount: number;
  closedCheckCount: number;
  closedTerminalAmount: number;
  closedTerminalCount: number;
  postedCount: number;
  notPostedCount: number;
  notPostedAmount: number;
  processedViaTerminalCount: number;
  depositedViaCheckCount: number;
  notProcessedCount: number;
  optOutRequestedCount: number;
  optedOutCount: number;
}

// =====================================================
// SAMPLE DATA (for static / table-not-found fallback)
// =====================================================

export const sampleVCCPayments: VCCPayment[] = [
  // MG patients
  { id: 'vcc-seed-001', patient_name: 'Jerome Ware', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 434.27, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  // DM patients
  { id: 'vcc-seed-002', patient_name: 'Victor Guadagnino', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 260.50, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-003', patient_name: 'John Figura', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 379.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-004', patient_name: 'Danielle Williams', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 283.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-005', patient_name: 'Omar Turk', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 307.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-006', patient_name: 'Jennifer Dawson', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-007', patient_name: 'Terriyonne Green', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 768.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-008', patient_name: 'Deniya Pheix', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 347.20, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-009', patient_name: 'Joseph Williams', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 99.40, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-010', patient_name: 'Terriyonne Green', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 368.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-011', patient_name: 'Warren Faulkner', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 328.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-012', patient_name: 'Alexander Peters', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 839.20, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-013', patient_name: 'Raquel Balsam', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 309.60, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-014', patient_name: 'Sean Dawson', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 215.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-015', patient_name: 'Terriyonne Green', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 1496.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-016', patient_name: 'Sylvia Williams', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 1760.87, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-017', patient_name: 'Hazel Ann Forde', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 5000.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-018', patient_name: 'Tamika Merise', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 307.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-019', patient_name: 'William Johnston', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 328.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-020', patient_name: 'Frederick Fernandes', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 108.50, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-021', patient_name: 'Rachel Manes', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 933.60, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-022', patient_name: 'Esra Shahein', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-023', patient_name: 'James Block', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 328.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-024', patient_name: 'Ishan Banerjee', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 215.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-025', patient_name: 'Takara Estes', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 621.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-026', patient_name: 'Jamie McBeth', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 688.50, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-027', patient_name: 'Rachel Manes', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 307.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-028', patient_name: 'Rachel Pace', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 285.60, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-029', patient_name: 'Jennifer Poole', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 215.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-030', patient_name: 'Abdulrahan Alkhudhari', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 897.46, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-031', patient_name: 'Myriam Bucatinsky', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 76.09, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-032', patient_name: 'Nethra Rajendran', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 531.20, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-033', patient_name: 'Gloria Benjamin', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 215.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-034', patient_name: 'Victor Guadagnino', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 432.50, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-035', patient_name: 'Alec Mitchel', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 121.60, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-036', patient_name: 'Swazi Tshbalala', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 275.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-037', patient_name: 'Bennett Cohen', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-038', patient_name: 'Devonte Rondon', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 497.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-039', patient_name: 'Robert Ham', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 284.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-040', patient_name: 'Andrew Wetzel', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 629.60, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-041', patient_name: 'Maria Bernas', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 167.50, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-042', patient_name: 'Frederick Fernandes', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 549.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-043', patient_name: 'Johnathan Fox', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 557.40, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-044', patient_name: 'Julia Gharachourlou', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 686.40, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-045', patient_name: 'Jason Karolak', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-046', patient_name: 'Nicole Vaughan', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 304.20, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-047', patient_name: 'Abdulrahan Alkhudhari', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 214.74, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-048', patient_name: 'Sherri Ehrlich', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 870.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-049', patient_name: 'Delia McDermott', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 851.25, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-050', patient_name: 'Kathyann Alleyne', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 225.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-051', patient_name: 'Philip Rosenthal', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 266.00, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'vcc-seed-052', patient_name: 'Delia McDermott', date_of_service: '2026-01-01', multiple_dos: false, claim_type: 'VCC Standard', payment_amount: 152.80, posted_to_open_dental: false, posted_by_initials: '', processed_via_terminal: true, processed_by_initials: '', deposited_via_check: false, deposited_via_check_by_initials: '', status: 'Needs to be Posted to OD', opt_out_requested: false, opted_out: false, opt_out_notes: [], structured_notes: [], audit_trail: [], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
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

// =====================================================
// SUMMARY METRICS
// =====================================================

export function calculateVCCSummary(payments: VCCPayment[]): VCCPaymentsSummary {
  const pending = payments.filter(p => !p.processed_via_terminal && !p.deposited_via_check);
  const closed = payments.filter(p => p.status === 'Closed');
  const closedChecks = closed.filter(p => p.deposited_via_check);
  const closedTerminal = closed.filter(p => p.processed_via_terminal);
  const notPosted = payments.filter(p => !p.posted_to_open_dental);

  return {
    totalPayments: payments.length,
    totalAmount: payments.reduce((s, p) => s + p.payment_amount, 0),
    pendingAmount: pending.reduce((s, p) => s + p.payment_amount, 0),
    pendingCount: pending.length,
    closedAmount: closed.reduce((s, p) => s + p.payment_amount, 0),
    closedCount: closed.length,
    closedCheckAmount: closedChecks.reduce((s, p) => s + p.payment_amount, 0),
    closedCheckCount: closedChecks.length,
    closedTerminalAmount: closedTerminal.reduce((s, p) => s + p.payment_amount, 0),
    closedTerminalCount: closedTerminal.length,
    postedCount: payments.filter(p => p.posted_to_open_dental).length,
    notPostedCount: notPosted.length,
    notPostedAmount: notPosted.reduce((s, p) => s + p.payment_amount, 0),
    processedViaTerminalCount: payments.filter(p => p.processed_via_terminal).length,
    depositedViaCheckCount: payments.filter(p => p.deposited_via_check).length,
    notProcessedCount: payments.filter(p => !p.processed_via_terminal && !p.deposited_via_check).length,
    optOutRequestedCount: payments.filter(p => p.opt_out_requested).length,
    optedOutCount: payments.filter(p => p.opted_out).length,
  };
}
