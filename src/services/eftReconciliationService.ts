// =====================================================
// EFT Reconciliation - Service Layer
// CRUD operations for EFT reconciliation periods and entries
// =====================================================

import { supabase } from '../lib/supabaseClient';
import type { EFTReconciliationPeriod, EFTReconciliationEntry } from '../types/database.types';
import { isStaticDataMode } from '../config/dataMode';

// =====================================================
// PERIOD OPERATIONS
// =====================================================

export async function getEFTPeriods(): Promise<EFTReconciliationPeriod[]> {
  if (isStaticDataMode()) return [];

  const { data, error } = await supabase
    .from('eft_reconciliation_periods')
    .select('*')
    .order('period_start', { ascending: false });

  if (error) {
    console.error('Error fetching EFT periods:', error);
    throw error;
  }

  return data || [];
}

export async function insertEFTPeriod(
  record: Omit<EFTReconciliationPeriod, 'id' | 'created_at' | 'updated_at' | 'total_amount' | 'entry_count'>
): Promise<EFTReconciliationPeriod> {
  const { data, error } = await supabase
    .from('eft_reconciliation_periods')
    .insert({ ...record, total_amount: 0, entry_count: 0 })
    .select()
    .single();

  if (error) {
    console.error('Error inserting EFT period:', error);
    throw error;
  }

  return data;
}

export async function updateEFTPeriod(
  id: string,
  updates: Partial<Omit<EFTReconciliationPeriod, 'id' | 'created_at' | 'updated_at'>>
): Promise<EFTReconciliationPeriod> {
  const { data, error } = await supabase
    .from('eft_reconciliation_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating EFT period:', error);
    throw error;
  }

  return data;
}

export async function deleteEFTPeriod(id: string): Promise<void> {
  const { error } = await supabase
    .from('eft_reconciliation_periods')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting EFT period:', error);
    throw error;
  }
}

// =====================================================
// ENTRY OPERATIONS
// =====================================================

export async function getEFTEntries(periodId?: string): Promise<EFTReconciliationEntry[]> {
  if (isStaticDataMode()) return [];

  let query = supabase
    .from('eft_reconciliation_entries')
    .select('*')
    .order('payment_date', { ascending: true });

  if (periodId) {
    query = query.eq('period_id', periodId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching EFT entries:', error);
    throw error;
  }

  return (data || []).map((record: EFTReconciliationEntry) => ({
    ...record,
    structured_notes: record.structured_notes || [],
    audit_trail: record.audit_trail || [],
  }));
}

export async function getAllEFTEntries(): Promise<EFTReconciliationEntry[]> {
  if (isStaticDataMode()) return [];

  const { data, error } = await supabase
    .from('eft_reconciliation_entries')
    .select('*')
    .order('payment_date', { ascending: true });

  if (error) {
    console.error('Error fetching all EFT entries:', error);
    throw error;
  }

  return (data || []).map((record: EFTReconciliationEntry) => ({
    ...record,
    structured_notes: record.structured_notes || [],
    audit_trail: record.audit_trail || [],
  }));
}

export async function insertEFTEntry(
  record: Omit<EFTReconciliationEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<EFTReconciliationEntry> {
  const sanitizedRecord = {
    ...record,
    structured_notes: record.structured_notes || [],
    audit_trail: record.audit_trail || [],
  };

  const { data, error } = await supabase
    .from('eft_reconciliation_entries')
    .insert(sanitizedRecord)
    .select()
    .single();

  if (error) {
    console.error('Error inserting EFT entry:', error);
    throw error;
  }

  return data;
}

export async function updateEFTEntry(
  id: string,
  updates: Partial<Omit<EFTReconciliationEntry, 'id' | 'created_at' | 'updated_at'>>
): Promise<EFTReconciliationEntry> {
  const sanitizedUpdates = { ...updates };
  if ('structured_notes' in sanitizedUpdates && sanitizedUpdates.structured_notes === null) {
    (sanitizedUpdates as Record<string, unknown>).structured_notes = [];
  }
  if ('audit_trail' in sanitizedUpdates && sanitizedUpdates.audit_trail === null) {
    (sanitizedUpdates as Record<string, unknown>).audit_trail = [];
  }

  const { data, error } = await supabase
    .from('eft_reconciliation_entries')
    .update(sanitizedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating EFT entry:', error);
    throw error;
  }

  return data;
}

export async function deleteEFTEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('eft_reconciliation_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting EFT entry:', error);
    throw error;
  }
}

// =====================================================
// HELPER: Format period label
// =====================================================

export function formatPeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  return `EFT (${fmt(start)} - ${fmt(end)})`;
}
