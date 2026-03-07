// src/services/patientARService.ts
import { supabase } from '../lib/supabaseClient';
import { getLocalDateString } from '../utils/dateUtils';

export interface PatientARRecord {
  id: string;
  patientId: string;
  patientName: string;
  balanceDue: number;
  notes: string | null;

  // First statement tracking
  firstStatementSentDate: string | null;
  firstStatementContactDate: string | null;
  firstStatementContactMethod: string | null;
  firstStatementContactedBy: string | null;
  firstStatementNotes: string | null;

  // Second statement tracking
  secondStatementSentDate: string | null;
  secondStatementContactDate: string | null;
  secondStatementContactMethod: string | null;
  secondStatementContactedBy: string | null;
  secondStatementNotes: string | null;

  // Third statement tracking
  thirdStatementSentDate: string | null;
  thirdStatementContactDate: string | null;
  thirdStatementContactMethod: string | null;
  thirdStatementContactedBy: string | null;
  thirdStatementNotes: string | null;

  // Collections
  sentToCollections: boolean;
  collectionsDate: string | null;
  collectionsAgency: string | null;

  // Assignment and follow-up
  handledByInitials: string;
  nextContactDate: string | null;
  status: 'active' | 'pending_payment' | 'payment_plan' | 'sent_to_collections' | 'resolved' | 'write_off';

  createdAt: string;
  updatedAt: string;
}

// Database schema to app model conversion
function dbToRecord(dbRecord: any): PatientARRecord {
  return {
    id: dbRecord.id,
    patientId: dbRecord.patient_id,
    patientName: dbRecord.patient_name,
    balanceDue: parseFloat(dbRecord.balance_due),
    notes: dbRecord.notes,

    firstStatementSentDate: dbRecord.first_statement_sent_date,
    firstStatementContactDate: dbRecord.first_statement_contact_date,
    firstStatementContactMethod: dbRecord.first_statement_contact_method,
    firstStatementContactedBy: dbRecord.first_statement_contacted_by,
    firstStatementNotes: dbRecord.first_statement_notes,

    secondStatementSentDate: dbRecord.second_statement_sent_date,
    secondStatementContactDate: dbRecord.second_statement_contact_date,
    secondStatementContactMethod: dbRecord.second_statement_contact_method,
    secondStatementContactedBy: dbRecord.second_statement_contacted_by,
    secondStatementNotes: dbRecord.second_statement_notes,

    thirdStatementSentDate: dbRecord.third_statement_sent_date,
    thirdStatementContactDate: dbRecord.third_statement_contact_date,
    thirdStatementContactMethod: dbRecord.third_statement_contact_method,
    thirdStatementContactedBy: dbRecord.third_statement_contacted_by,
    thirdStatementNotes: dbRecord.third_statement_notes,

    sentToCollections: dbRecord.sent_to_collections || false,
    collectionsDate: dbRecord.collections_date,
    collectionsAgency: dbRecord.collections_agency,

    handledByInitials: dbRecord.handled_by_initials,
    nextContactDate: dbRecord.next_contact_date,
    status: dbRecord.status,

    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at
  };
}

// App model to database schema conversion
function recordToDb(record: Partial<PatientARRecord>): any {
  return {
    id: record.id,
    patient_id: record.patientId,
    patient_name: record.patientName,
    balance_due: record.balanceDue,
    notes: record.notes,

    first_statement_sent_date: record.firstStatementSentDate,
    first_statement_contact_date: record.firstStatementContactDate,
    first_statement_contact_method: record.firstStatementContactMethod,
    first_statement_contacted_by: record.firstStatementContactedBy,
    first_statement_notes: record.firstStatementNotes,

    second_statement_sent_date: record.secondStatementSentDate,
    second_statement_contact_date: record.secondStatementContactDate,
    second_statement_contact_method: record.secondStatementContactMethod,
    second_statement_contacted_by: record.secondStatementContactedBy,
    second_statement_notes: record.secondStatementNotes,

    third_statement_sent_date: record.thirdStatementSentDate,
    third_statement_contact_date: record.thirdStatementContactDate,
    third_statement_contact_method: record.thirdStatementContactMethod,
    third_statement_contacted_by: record.thirdStatementContactedBy,
    third_statement_notes: record.thirdStatementNotes,

    sent_to_collections: record.sentToCollections,
    collections_date: record.collectionsDate,
    collections_agency: record.collectionsAgency,

    handled_by_initials: record.handledByInitials,
    next_contact_date: record.nextContactDate,
    status: record.status
  };
}

/**
 * Fetches all patient AR records
 */
export async function getAllPatientARRecords(): Promise<PatientARRecord[]> {
  try {
    const { data, error } = await supabase
      .from('patient_ar_tracker')
      .select('*')
      .order('next_contact_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching patient AR records:', error);
      throw error;
    }

    return (data || []).map(dbToRecord);
  } catch (err) {
    console.error('Error in getAllPatientARRecords:', err);
    return [];
  }
}

/**
 * Fetches patient AR records by status
 */
export async function getPatientARByStatus(status: string): Promise<PatientARRecord[]> {
  try {
    const { data, error } = await supabase
      .from('patient_ar_tracker')
      .select('*')
      .eq('status', status)
      .order('balance_due', { ascending: false });

    if (error) {
      console.error('Error fetching patient AR by status:', error);
      throw error;
    }

    return (data || []).map(dbToRecord);
  } catch (err) {
    console.error('Error in getPatientARByStatus:', err);
    return [];
  }
}

/**
 * Fetches patient AR records that need follow-up today
 */
export async function getPatientARAlerts(): Promise<PatientARRecord[]> {
  try {
    const today = getLocalDateString();

    const { data, error } = await supabase
      .from('patient_ar_tracker')
      .select('*')
      .lte('next_contact_date', today)
      .eq('sent_to_collections', false)
      .not('status', 'in', '(resolved,write_off)')
      .order('next_contact_date', { ascending: true });

    if (error) {
      console.error('Error fetching patient AR alerts:', error);
      throw error;
    }

    return (data || []).map(dbToRecord);
  } catch (err) {
    console.error('Error in getPatientARAlerts:', err);
    return [];
  }
}

/**
 * Gets count of patients sent to collections
 */
export async function getCollectionsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('patient_ar_tracker')
      .select('*', { count: 'exact', head: true })
      .eq('sent_to_collections', true)
      .not('status', 'in', '(resolved,write_off)');

    if (error) {
      console.error('Error fetching collections count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error in getCollectionsCount:', err);
    return 0;
  }
}

/**
 * Inserts a new patient AR record
 */
export async function insertPatientARRecord(record: Partial<PatientARRecord>): Promise<PatientARRecord> {
  try {
    const dbRecord = recordToDb(record);

    const { data, error } = await supabase
      .from('patient_ar_tracker')
      .insert(dbRecord)
      .select()
      .single();

    if (error) {
      console.error('Error inserting patient AR record:', error);
      throw error;
    }

    return dbToRecord(data);
  } catch (err) {
    console.error('Error in insertPatientARRecord:', err);
    throw err;
  }
}

/**
 * Updates an existing patient AR record
 */
export async function updatePatientARRecord(id: string, updates: Partial<PatientARRecord>): Promise<PatientARRecord> {
  try {
    const dbUpdates = recordToDb(updates);
    delete dbUpdates.id; // Don't update the ID

    const { data, error } = await supabase
      .from('patient_ar_tracker')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient AR record:', error);
      throw error;
    }

    return dbToRecord(data);
  } catch (err) {
    console.error('Error in updatePatientARRecord:', err);
    throw err;
  }
}

/**
 * Deletes a patient AR record
 */
export async function deletePatientARRecord(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('patient_ar_tracker')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting patient AR record:', error);
      throw error;
    }
  } catch (err) {
    console.error('Error in deletePatientARRecord:', err);
    throw err;
  }
}

/**
 * Gets AR metrics for dashboard display
 */
export async function getPatientARMetrics() {
  try {
    const [allRecords, alertsCount, collectionsCount] = await Promise.all([
      getAllPatientARRecords(),
      getPatientARAlerts(),
      getCollectionsCount()
    ]);

    const totalBalance = allRecords
      .filter(r => !r.sentToCollections && r.status !== 'resolved' && r.status !== 'write_off')
      .reduce((sum, r) => sum + r.balanceDue, 0);

    const activeAccounts = allRecords.filter(
      r => !r.sentToCollections && r.status !== 'resolved' && r.status !== 'write_off'
    ).length;

    return {
      totalActiveAccounts: activeAccounts,
      totalBalanceDue: totalBalance,
      alertsToday: alertsCount.length,
      inCollections: collectionsCount
    };
  } catch (err) {
    console.error('Error in getPatientARMetrics:', err);
    return {
      totalActiveAccounts: 0,
      totalBalanceDue: 0,
      alertsToday: 0,
      inCollections: 0
    };
  }
}
