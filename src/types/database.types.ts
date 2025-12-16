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

export type Claim = {
  id: string;
  patient_id: string;
  patient_name: string;
  insurance_company: string;
  claim_number: string | null; // Optional for Pending/Sent status claims
  procedure_code: string;
  claim_detail: string;
  claim_amount: number;
  status: 'Pending' | 'Sent' | 'Entered' | 'Approved/Awaiting Payment' | 'Denied' | 'In Review/2nd Appeal' | 'Resubmitted with Attachments' | 'Resubmitted/1st Appeal' | 'Denied/2nd Appeal';
  date_submitted: string; // ISO date string
  date_of_service: string; // ISO date string
  date_created?: string; // ISO date string
  follow_up_date: string; // ISO date string
  created_by: string;
  completed_by: string;
  notes: string | null;
  aging_days: number;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PreAuth = {
  id: string;
  patient_id: string;
  patient_name: string;
  insurance_company: string;
  pre_auth_number: string | null; // Optional for Pending status pre-auths
  procedure_code: string;
  treatment_detail: string;
  requested_amount: number;
  status: 'Pending' | 'Approved' | 'Denied' | 'Expired' | 'In Review' | 'Scheduled';
  date_requested: string; // ISO date string
  date_created?: string; // ISO date string
  follow_up_date: string; // ISO date string
  expiration_date: string; // ISO date string
  approved_amount: number;
  created_by: string;
  completed_by: string;
  notes: string | null;
  aging_days: number;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ClaimAuditHistory = {
  audit_id: number;
  claim_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'UNARCHIVE';
  changed_by: string | null;
  changed_at: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
};

export type PreAuthAuditHistory = {
  audit_id: number;
  pre_auth_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'UNARCHIVE';
  changed_by: string | null;
  changed_at: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
};

export type ClaimUpdate = {
  update_id: number;
  claim_id: string;
  handler: string;
  update_type: 'status_change' | 'note' | 'follow_up' | 'amount_change' | 'general';
  old_status: string | null;
  new_status: string | null;
  old_amount: number | null;
  new_amount: number | null;
  notes: string | null;
  created_at: string;
};

export type PreAuthUpdate = {
  update_id: number;
  pre_auth_id: string;
  handler: string;
  update_type: 'status_change' | 'note' | 'follow_up' | 'amount_change' | 'general';
  old_status: string | null;
  new_status: string | null;
  old_amount: number | null;
  new_amount: number | null;
  notes: string | null;
  created_at: string;
};

export type InsuranceCheck = {
  id: string;
  check_eft_number: string;
  payment_type: 'Check' | 'EFT';
  insurance_company: string;
  distribution_type: 'Bulk' | 'Individual';
  total_amount: number;
  aging: number;
  entered_by: string;
  handler: string;
  status: 'Created' | 'Entered' | 'Pending Review';
  date_of_service?: string; // ISO date string
  date_entered?: string; // ISO date string
  is_archived?: boolean;
  archived_at?: string;
  archived_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type InsuranceCheckAuditHistory = {
  audit_id: number;
  check_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  changed_at: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changes: Record<string, any> | null;
};

export type InsuranceCheckUpdate = {
  update_id: number;
  check_id: string;
  handler: string;
  update_type: 'status_change' | 'note' | 'follow_up' | 'amount_change' | 'general';
  old_status: string | null;
  new_status: string | null;
  old_amount: number | null;
  new_amount: number | null;
  notes: string | null;
  created_at: string;
};

// Scheduling Lists Types
export type SchedulingListItem = {
  id: string;
  list_type: 'vip' | 'recare' | 'treatment';
  patient_id: string;
  patient_initials: string;
  treatment_needed: string;
  last_visit_date: string | null; // ISO date string
  first_contact_date: string | null; // ISO date string
  second_contact_date: string | null; // ISO date string
  third_contact_date: string | null; // ISO date string
  total_tx_value: number;
  follow_up_date: string; // ISO date string
  employee_initials: string;
  status: 'unscheduled' | 'scheduled';
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

// =====================================================
// Patient A/R Management Types
// =====================================================

export type PatientAR = {
  id: string;
  patient_id: string | null;
  patient_name: string;
  patient_contact: string | null;
  dos: string; // ISO date string
  original_balance: number;
  current_balance: number;
  balance_created_date: string; // ISO date string
  aging_days: number; // Generated column
  aging_bucket: '0-30' | '31-60' | '61-90' | '90+'; // Generated column
  status: 'active' | 'collections' | 'paid' | 'written_off' | 'uncollectible' | 'write_off_suggested' | 'archived';
  moved_to_collections_date: string | null; // ISO date string
  next_contact_due_date: string | null; // ISO date string
  assigned_to_staff_id: string | null;
  write_off_suggested_date: string | null; // ISO date string
  write_off_suggestion_reason: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  updated_by: string;
};

export type PatientARContact = {
  id: string;
  patient_ar_id: string;
  contact_type: '1st_contact' | '2nd_contact' | 'final_contact' | 'collections_activity' | 'manual';
  contact_date: string; // ISO date string
  staff_initials: string;
  notes: string | null;
  outcome: 'promise_to_pay' | 'payment_plan_setup' | 'dispute' | 'no_answer' | 'no_response' | 'other' | null;
  next_action_date: string | null; // ISO date string
  created_at?: string;
  created_by: string;
};

export type PatientARPayment = {
  id: string;
  patient_ar_id: string;
  payment_date: string; // ISO date string
  payment_amount: number;
  payment_method: 'cash' | 'check' | 'credit_card' | 'debit_card' | 'ach' | 'online_portal' | 'other';
  reference_number: string | null;
  notes: string | null;
  recorded_by: string;
  created_at?: string;
};

export type PatientPaymentPlan = {
  id: string;
  patient_ar_id: string;
  setup_date: string; // ISO date string
  total_amount: number;
  monthly_payment: number;
  number_of_payments: number;
  payments_made: number;
  next_payment_due: string; // ISO date string
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  setup_by: string;
  created_at?: string;
  updated_at?: string;
};

export type WriteOffRule = {
  id: string;
  rule_name: string;
  rule_type: 'small_balance' | 'aged_out' | 'collections_exhausted' | 'cost_to_collect';
  is_active: boolean;
  priority: number;
  balance_threshold: number | null;
  aging_days_threshold: number | null;
  contacts_minimum: number | null;
  collections_days_threshold: number | null;
  auto_suggest: boolean;
  require_manual_approval: boolean;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
};

export type WriteOffSuggestion = {
  id: string;
  patient_ar_id: string;
  rule_id: string | null;
  suggested_date: string; // ISO date string
  suggestion_reason: string;
  balance_at_suggestion: number;
  aging_days_at_suggestion: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewed_by: string | null;
  reviewed_date: string | null; // ISO date string
  review_notes: string | null;
  created_at?: string;
};

export type Database = {
  patients: Patient;
  appointments: Appointment;
  patient_revenue: PatientRevenue;
  lifecycle_metrics: LifecycleMetrics;
  claims: Claim;
  pre_auths: PreAuth;
  claims_audit_history: ClaimAuditHistory;
  pre_auths_audit_history: PreAuthAuditHistory;
  claim_updates: ClaimUpdate;
  pre_auth_updates: PreAuthUpdate;
  insurance_checks: InsuranceCheck;
  insurance_checks_audit_history: InsuranceCheckAuditHistory;
  insurance_check_updates: InsuranceCheckUpdate;
  scheduling_list_items: SchedulingListItem;
  patient_ar: PatientAR;
  patient_ar_contacts: PatientARContact;
  patient_ar_payments: PatientARPayment;
  patient_payment_plans: PatientPaymentPlan;
  write_off_rules: WriteOffRule;
  write_off_suggestions: WriteOffSuggestion;
};
