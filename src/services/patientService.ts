// src/services/patientService.ts
import { supabase } from '../lib/supabaseClient';
import type { Patient, Appointment, PatientRevenue, LifecycleMetrics } from '../types/database.types';
import { isStaticDataMode } from '../config/dataMode';
import { samplePatients, sampleAppointments, samplePatientRevenue, sampleLifecycleMetrics } from '../data/sampleData';

// =====================================================
// PATIENT CRUD OPERATIONS
// =====================================================

export async function insertPatients(patients: Patient[]) {
  const { data, error } = await supabase
    .from('patients')
    .insert(patients)
    .select();

  if (error) {
    console.error('Error inserting patients:', error);
    throw error;
  }

  return data;
}

export async function getPatients() {
  if (isStaticDataMode()) {
    return [...samplePatients];
  }

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('first_visit_date', { ascending: false });

  if (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }

  return data as Patient[];
}

export async function getActivePatients() {
  if (isStaticDataMode()) {
    return samplePatients.filter(p => p.status === 'active');
  }

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('status', 'active')
    .order('last_visit_date', { ascending: false });

  if (error) {
    console.error('Error fetching active patients:', error);
    throw error;
  }

  return data as Patient[];
}

export async function updatePatient(patientId: string, updates: Partial<Patient>) {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('patient_id', patientId)
    .select();

  if (error) {
    console.error('Error updating patient:', error);
    throw error;
  }

  return data;
}

// =====================================================
// APPOINTMENT CRUD OPERATIONS
// =====================================================

export async function insertAppointments(appointments: Appointment[]) {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointments)
    .select();

  if (error) {
    console.error('Error inserting appointments:', error);
    throw error;
  }

  return data;
}

export async function getAppointmentsByPatient(patientId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .order('appointment_date', { ascending: false });

  if (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }

  return data as Appointment[];
}

// =====================================================
// REVENUE CRUD OPERATIONS
// =====================================================

export async function insertRevenue(revenue: PatientRevenue[]) {
  const { data, error } = await supabase
    .from('patient_revenue')
    .insert(revenue)
    .select();

  if (error) {
    console.error('Error inserting revenue:', error);
    throw error;
  }

  return data;
}

export async function getRevenueByPatient(patientId: string) {
  const { data, error } = await supabase
    .from('patient_revenue')
    .select('*')
    .eq('patient_id', patientId)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching revenue:', error);
    throw error;
  }

  return data as PatientRevenue[];
}

// =====================================================
// LIFECYCLE METRICS CALCULATIONS
// =====================================================

export async function calculateLifecycleMetrics(): Promise<LifecycleMetrics> {
  const today = new Date().toISOString().split('T')[0];

  // Get all patients
  const patients = await getPatients();

  if (!patients || patients.length === 0) {
    return {
      calculation_date: today,
      avg_patient_lifecycle_months: 0,
      avg_patient_lifecycle_years: 0,
      active_patients_prior_month: 0,
      avg_retention_period_months: 0,
      average_revenue_per_client: 0,
      lifetime_value: 0,
      total_active_patients: 0,
      total_churned_patients: 0,
      churn_rate: 0,
    };
  }

  // Calculate total active and churned patients
  const activePatients = patients.filter(p => p.status === 'active');
  const churnedPatients = patients.filter(p => p.status === 'churned');

  // Calculate active patients at beginning of prior month
  const firstOfPriorMonth = new Date();
  firstOfPriorMonth.setMonth(firstOfPriorMonth.getMonth() - 1);
  firstOfPriorMonth.setDate(1);

  const activePatientsBeginningPriorMonth = patients.filter(p => {
    const firstVisit = new Date(p.first_visit_date);
    const lastVisit = p.last_visit_date ? new Date(p.last_visit_date) : new Date();
    return firstVisit <= firstOfPriorMonth && lastVisit >= firstOfPriorMonth;
  }).length;

  // Calculate average patient lifecycle (months and years)
  const lifecycleDurations = patients
    .filter(p => p.first_visit_date && p.last_visit_date)
    .map(p => {
      const firstVisit = new Date(p.first_visit_date);
      const lastVisit = new Date(p.last_visit_date!);
      const diffTime = Math.abs(lastVisit.getTime() - firstVisit.getTime());
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
      return diffMonths;
    });

  const avgLifecycleMonths = lifecycleDurations.length > 0
    ? lifecycleDurations.reduce((sum, val) => sum + val, 0) / lifecycleDurations.length
    : 0;

  const avgLifecycleYears = avgLifecycleMonths / 12;

  // Calculate average retention period (for active patients)
  const activeLifecycleDurations = activePatients
    .filter(p => p.first_visit_date)
    .map(p => {
      const firstVisit = new Date(p.first_visit_date);
      const lastVisit = p.last_visit_date ? new Date(p.last_visit_date) : new Date();
      const diffTime = Math.abs(lastVisit.getTime() - firstVisit.getTime());
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
      return diffMonths;
    });

  const avgRetentionPeriodMonths = activeLifecycleDurations.length > 0
    ? activeLifecycleDurations.reduce((sum, val) => sum + val, 0) / activeLifecycleDurations.length
    : 0;

  // Calculate average revenue per client (ARPC)
  const totalRevenue = patients.reduce((sum, p) => sum + (p.total_lifetime_revenue || 0), 0);
  const averageRevenuePerClient = patients.length > 0 ? totalRevenue / patients.length : 0;

  // Calculate lifetime value (LTV = ARPC × Avg Retention Period)
  const lifetimeValue = averageRevenuePerClient * (avgRetentionPeriodMonths / 12); // Convert months to years

  // Calculate churn rate
  const totalPatients = patients.length;
  const churnRate = totalPatients > 0 ? (churnedPatients.length / totalPatients) * 100 : 0;

  const metrics: LifecycleMetrics = {
    calculation_date: today,
    avg_patient_lifecycle_months: parseFloat(avgLifecycleMonths.toFixed(2)),
    avg_patient_lifecycle_years: parseFloat(avgLifecycleYears.toFixed(2)),
    active_patients_prior_month: activePatientsBeginningPriorMonth,
    avg_retention_period_months: parseFloat(avgRetentionPeriodMonths.toFixed(2)),
    average_revenue_per_client: parseFloat(averageRevenuePerClient.toFixed(2)),
    lifetime_value: parseFloat(lifetimeValue.toFixed(2)),
    total_active_patients: activePatients.length,
    total_churned_patients: churnedPatients.length,
    churn_rate: parseFloat(churnRate.toFixed(2)),
  };

  return metrics;
}

export async function saveLifecycleMetrics(metrics: LifecycleMetrics) {
  // First, try to update existing record for today
  const { data: existing } = await supabase
    .from('lifecycle_metrics')
    .select('id')
    .eq('calculation_date', metrics.calculation_date)
    .single();

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('lifecycle_metrics')
      .update(metrics)
      .eq('calculation_date', metrics.calculation_date)
      .select();

    if (error) {
      console.error('Error updating lifecycle metrics:', error);
      throw error;
    }

    return data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('lifecycle_metrics')
      .insert(metrics)
      .select();

    if (error) {
      console.error('Error inserting lifecycle metrics:', error);
      throw error;
    }

    return data;
  }
}

export async function getLatestLifecycleMetrics(): Promise<LifecycleMetrics | null> {
  const { data, error } = await supabase
    .from('lifecycle_metrics')
    .select('*')
    .order('calculation_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('Error fetching lifecycle metrics:', error);
    throw error;
  }

  return data as LifecycleMetrics;
}

export async function getLifecycleMetricsForDate(date: string): Promise<LifecycleMetrics | null> {
  const { data, error } = await supabase
    .from('lifecycle_metrics')
    .select('*')
    .eq('calculation_date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('Error fetching lifecycle metrics:', error);
    throw error;
  }

  return data as LifecycleMetrics;
}

// =====================================================
// BULK UPDATE OPERATIONS
// =====================================================

export async function recalculatePatientTotals() {
  // This function recalculates total_lifetime_revenue and total_visits for all patients
  const patients = await getPatients();

  for (const patient of patients) {
    // Get all revenue for this patient
    const revenue = await getRevenueByPatient(patient.patient_id);
    const totalRevenue = revenue
      .filter(r => r.transaction_type === 'payment')
      .reduce((sum, r) => sum + r.amount, 0);

    // Get all appointments for this patient
    const appointments = await getAppointmentsByPatient(patient.patient_id);
    const totalVisits = appointments.filter(a => a.status === 'completed').length;

    // Update patient record
    await updatePatient(patient.patient_id, {
      total_lifetime_revenue: totalRevenue,
      total_visits: totalVisits,
    });
  }
}
