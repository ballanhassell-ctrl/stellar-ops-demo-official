// src/services/schedulingService.ts
import { supabase } from '../lib/supabaseClient';
import type { SchedulingListItem } from '../types/database.types';

// =====================================================
// SCHEDULING LIST CRUD OPERATIONS
// =====================================================

export async function getSchedulingListItems(listType?: 'vip' | 'recare' | 'treatment') {
  let query = supabase
    .from('scheduling_list_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (listType) {
    query = query.eq('list_type', listType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching scheduling list items:', error);
    throw error;
  }

  return data as SchedulingListItem[];
}

export async function getSchedulingListItemById(id: string) {
  const { data, error } = await supabase
    .from('scheduling_list_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching scheduling list item:', error);
    throw error;
  }

  return data as SchedulingListItem;
}

export async function insertSchedulingListItem(item: Omit<SchedulingListItem, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('scheduling_list_items')
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error('Error inserting scheduling list item:', error);
    throw error;
  }

  return data as SchedulingListItem;
}

export async function updateSchedulingListItem(id: string, updates: Partial<Omit<SchedulingListItem, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('scheduling_list_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating scheduling list item:', error);
    throw error;
  }

  return data as SchedulingListItem;
}

export async function deleteSchedulingListItem(id: string) {
  const { error } = await supabase
    .from('scheduling_list_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting scheduling list item:', error);
    throw error;
  }

  return true;
}

export async function getSchedulingListItemsByStatus(listType: 'vip' | 'recare' | 'treatment', status: 'scheduled' | 'unscheduled') {
  const { data, error } = await supabase
    .from('scheduling_list_items')
    .select('*')
    .eq('list_type', listType)
    .eq('status', status)
    .order('follow_up_date', { ascending: true });

  if (error) {
    console.error('Error fetching scheduling list items by status:', error);
    throw error;
  }

  return data as SchedulingListItem[];
}

export async function getSchedulingListItemsDueForFollowUp(listType?: 'vip' | 'recare' | 'treatment') {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('scheduling_list_items')
    .select('*')
    .lte('follow_up_date', today)
    .order('follow_up_date', { ascending: true });

  if (listType) {
    query = query.eq('list_type', listType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching scheduling list items due for follow-up:', error);
    throw error;
  }

  return data as SchedulingListItem[];
}

// =====================================================
// METRICS CALCULATIONS
// =====================================================

export async function calculateSchedulingMetrics(listType: 'vip' | 'recare' | 'treatment') {
  const { data, error } = await supabase
    .from('scheduling_list_items')
    .select('status, total_tx_value')
    .eq('list_type', listType);

  if (error) {
    console.error('Error calculating scheduling metrics:', error);
    throw error;
  }

  const items = data as SchedulingListItem[];

  const unscheduledItems = items.filter(item => item.status === 'unscheduled');
  const scheduledItems = items.filter(item => item.status === 'scheduled');

  const potentialProductionUnscheduled = unscheduledItems.reduce((sum, item) => sum + item.total_tx_value, 0);
  const productionScheduled = scheduledItems.reduce((sum, item) => sum + item.total_tx_value, 0);
  const totalPatients = items.length;
  const unscheduledPatients = unscheduledItems.length;
  const scheduledPatients = scheduledItems.length;

  return {
    potentialProductionUnscheduled,
    productionScheduled,
    totalPatients,
    unscheduledPatients,
    scheduledPatients
  };
}
