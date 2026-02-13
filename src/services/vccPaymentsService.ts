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

export const sampleVCCPayments: VCCPayment[] = [];

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
  // Breakdowns count ALL payments with that processing method checked off (not just closed)
  const allChecks = payments.filter(p => p.deposited_via_check);
  const allTerminal = payments.filter(p => p.processed_via_terminal);
  const notPosted = payments.filter(p => !p.posted_to_open_dental);

  return {
    totalPayments: payments.length,
    totalAmount: payments.reduce((s, p) => s + p.payment_amount, 0),
    pendingAmount: pending.reduce((s, p) => s + p.payment_amount, 0),
    pendingCount: pending.length,
    closedAmount: closed.reduce((s, p) => s + p.payment_amount, 0),
    closedCount: closed.length,
    closedCheckAmount: allChecks.reduce((s, p) => s + p.payment_amount, 0),
    closedCheckCount: allChecks.length,
    closedTerminalAmount: allTerminal.reduce((s, p) => s + p.payment_amount, 0),
    closedTerminalCount: allTerminal.length,
    postedCount: payments.filter(p => p.posted_to_open_dental).length,
    notPostedCount: notPosted.length,
    notPostedAmount: notPosted.reduce((s, p) => s + p.payment_amount, 0),
    processedViaTerminalCount: allTerminal.length,
    depositedViaCheckCount: allChecks.length,
    notProcessedCount: payments.filter(p => !p.processed_via_terminal && !p.deposited_via_check).length,
    optOutRequestedCount: payments.filter(p => p.opt_out_requested).length,
    optedOutCount: payments.filter(p => p.opted_out).length,
  };
}
