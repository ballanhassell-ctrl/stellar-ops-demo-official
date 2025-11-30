// Database types for Supabase tables

export type Patient = {
  patient_id: string;
  first_visit_date: string; // ISO date string
  last_visit_date: string | null; // ISO date string
  status: 'active' | 'inactive' | 'churned';
  total_lifetime_revenue: number;
  total_visits: number;
  created_at?: string;
  updated_at?: string;
};

export type Appointment = {
  id?: number;
  patient_id: string;
  appointment_date: string; // ISO date string
  provider_name: string | null;
  production_amount: number;
  status: 'completed' | 'no_show' | 'cancelled' | 'scheduled';
  procedure_codes: string | null; // Comma-separated procedure codes
  created_at?: string;
};

export type PatientRevenue = {
  id?: number;
  patient_id: string;
  transaction_date: string; // ISO date string
  amount: number;
  transaction_type: 'payment' | 'adjustment' | 'writeoff' | 'production';
  payment_method: string | null; // 'insurance', 'cash', 'card', etc.
  notes: string | null;
  created_at?: string;
};

export type LifecycleMetrics = {
  id?: number;
  calculation_date: string; // ISO date string
  avg_patient_lifecycle_months: number;
  avg_patient_lifecycle_years: number;
  active_patients_prior_month: number;
  avg_retention_period_months: number;
  average_revenue_per_client: number;
  lifetime_value: number;
  total_active_patients: number;
  total_churned_patients: number;
  churn_rate: number;
  created_at?: string;
};

export type Database = {
  patients: Patient;
  appointments: Appointment;
  patient_revenue: PatientRevenue;
  lifecycle_metrics: LifecycleMetrics;
};
