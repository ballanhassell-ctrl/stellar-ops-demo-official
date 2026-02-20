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

// Unified claim status - covers both submission pipeline and A/R follow-up
export type UnifiedClaimStatus =
  // Phase 1: Submission pipeline
  | 'Pending' | 'Sent' | 'Entered'
  | 'Approved/Awaiting Payment' | 'Denied'
  | 'In Review/2nd Appeal' | 'Resubmitted with Attachments'
  | 'Resubmitted/1st Appeal' | 'Denied/2nd Appeal'
  // Phase 2: A/R follow-up pipeline
  | 'Pending Review' | 'Resubmitted - 1st' | 'Resubmitted - 2nd'
  | 'Final Review' | 'Consultant Review'
  | 'Closed/Paid' | 'Closed/Unpaid'
  | 'Appeal Filed' | 'Waiting for CSD/Moved to IIR'
  | 'Lori Review' | 'Paid/Check or EFT Pending' | 'SEE NOTES';

export type Claim = {
  id: string;
  patient_id: string;
  patient_name: string;
  insurance_company: string;
  claim_number: string | null; // Optional for Pending/Sent status claims
  procedure_code: string;
  claim_detail: string;
  claim_amount: number;
  status: UnifiedClaimStatus;
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
  // A/R financial tracking fields
  collected: number;
  outstanding: number;
  pri_sec: 'Primary' | 'Secondary' | null;
  procedure_types: string | null;
  assigned_to: string | null;
  rep_name: string | null;
  reference_number: string | null;
  aging_status: '0-30 Days' | '31-60 Days' | '61-90 Days' | '91-120 Days' | '121+ Days' | null;
  carrier_phone: string | null;
  date_sent_orig: string | null;
  structured_notes: NoteEntry[];
  audit_trail: AuditTrailEntry[];
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
  structured_notes: NoteEntry[];
  audit_trail: AuditTrailEntry[];
  created_at?: string;
  updated_at?: string;
};

// =====================================================
// Patient A/R Management Types
// Matches the Weekly A/R Review spreadsheet layout
// =====================================================

export type PatientARStatus =
  | 'not_started'
  | '1st_contact_made'
  | '2nd_contact_made'
  | 'final_contact_made'
  | 'paid'
  | 'pending_writeoff'
  | 'high_balance_alert'
  | 'completed';

export type PatientAR = {
  id: string;
  patient_id: string | null;
  patient_name: string;
  related_family: string | null;
  dos: string; // ISO date string
  original_balance: number | null; // Optional starting balance
  current_balance: number;
  aging_days: number; // Generated column
  aging_bucket: '0-30' | '31-60' | '61-90' | '90+'; // Generated column
  is_collectible: boolean; // true = Collectible, false = Non-Collectible (Write-Off)
  status: PatientARStatus;
  background_notes: string | null;
  team_discussion_notes: string | null;
  action_needed: string | null;
  dr_decision: string | null; // Only used for non-collectible accounts

  // Contact tracking - inline date + initials
  first_contact_date: string | null; // ISO date string
  first_contact_initials: string | null;
  second_contact_date: string | null; // ISO date string
  second_contact_initials: string | null;
  final_contact_date: string | null; // ISO date string
  final_contact_initials: string | null;

  // Write-off fields
  write_off_suggested_date: string | null; // ISO date string
  write_off_reason: string | null;

  // Collected amount (when marked as paid)
  collected_amount: number;

  // Structured team notes + audit trail
  structured_notes: NoteEntry[];
  audit_trail: AuditTrailEntry[];

  created_by: string;
  created_at?: string;
  updated_at?: string;
  updated_by: string;
};

// Legacy types kept for backwards compatibility with existing service layer
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

// =====================================================
// Insurance A/R Report Types
// @deprecated - These types are kept for backwards compatibility.
// The Insurance A/R tab now reads from the unified `claims` table.
// Use `Claim` type with A/R fields (collected, outstanding, etc.) instead.
// =====================================================

/** @deprecated Use UnifiedClaimStatus instead */
export type InsuranceARClaimStatus =
  | 'Pending Review'
  | 'Resubmitted - 1st'
  | 'Resubmitted - 2nd'
  | 'Final Review'
  | 'Consultant Review'
  | 'Closed/Paid'
  | 'Closed/Unpaid'
  | 'Appeal Filed'
  | 'Denied'
  | 'Waiting for CSD/Moved to IIR'
  | 'Lori Review'
  | 'Paid/Check or EFT Pending'
  | 'SEE NOTES';

export type InsuranceARAgingStatus =
  | '0-30 Days'
  | '31-60 Days'
  | '61-90 Days'
  | '91-120 Days'
  | '121+ Days';

/** @deprecated Use Claim type instead - Insurance A/R now reads from claims table */
export type InsuranceARClaim = {
  id: string;
  patient_name: string;
  patient_id: string | null;
  date_of_service: string; // ISO date string
  insurance_company: string;
  pri_sec: 'Primary' | 'Secondary';
  total_claim: number;
  collected: number;
  outstanding: number;
  claim_status: InsuranceARClaimStatus;
  aging_status: InsuranceARAgingStatus;
  assigned_to: string; // team member initials
  procedure_types: string; // e.g. "Prophy: Adult", "Perio: SRP", "Veneers"
  rep_name: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

// =====================================================
// Insurance Issues Tracker Types (mirrors Issues Report spreadsheet)
// =====================================================

export type InsuranceIssueType =
  | 'Needs Perio Chart'
  | 'Invalid Tooth Code for Carrier'
  | 'Invalid Number of Surfaces'
  | 'Invalid Surface Code for Carrier'
  | 'Tooth Code Required by Carrier'
  | 'Oral Cavity Code Required by Carrier'
  | 'Needs Narrative'
  | 'Need Provider Change'
  | 'Invalid Tooth/Surface Code'
  | 'Pre-Auth Required'
  | 'Other';

export type InsuranceIssueStatus = 'Open' | 'Corrected' | 'Resolved';

export type NoteSource = 'office' | 'stellar';

export type NoteEntry = {
  text: string;
  source: NoteSource;
  author: string; // initials e.g. "BH", "LP"
  created_at: string; // ISO timestamp
};

// =====================================================
// Shared Audit Trail Entry (stored as JSON array on records)
// =====================================================

export type AuditTrailAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'note_added'
  | 'deleted'
  | 'archived'
  | 'unarchived'
  | 'moved';

export type AuditTrailEntry = {
  id: string;
  action: AuditTrailAction;
  field?: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by: string; // initials
  changed_at: string; // ISO timestamp
  notes?: string;
};

export type InsuranceIssue = {
  id: string;
  patient_id: string | null;
  patient_name: string;
  date_of_service: string; // ISO date string
  procedure_codes: string; // e.g. "D4342", "D2392, D2393"
  in_charge: string; // provider code e.g. "DDS1", "HYG2", "DMD1", "Daniely"
  issue_type: InsuranceIssueType;
  in_vyne: boolean;
  status: InsuranceIssueStatus; // "Open" → "Corrected" → "Resolved"
  corrected_at: string | null; // ISO timestamp - when in-charge marked correction done
  corrected_by: string | null; // initials of person who completed correction
  correction_note: string | null; // optional note from corrector
  submission_status: string | null; // "Submitted" or null
  submitted_by: string | null; // initials e.g. "BH", "LP", "BH/LP"
  submitted_at: string | null; // ISO timestamp - auto-logged when marked Submitted
  resolved_at: string | null; // ISO timestamp - auto-logged when status → Resolved
  notes: string | null; // legacy plain-text (kept for backward compat)
  structured_notes: NoteEntry[]; // structured notes with source tagging
  audit_trail: AuditTrailEntry[]; // audit trail entries
  is_pre_auth: boolean;
  created_at?: string;
  updated_at?: string;
};

// =====================================================
// A/R Snapshot Types (bi-monthly aggregates on 1st and 15th)
// =====================================================

export type ARSnapshotType = 'patient_ar' | 'insurance_ar' | 'combined';

export type ARSnapshot = {
  id: string;
  snapshot_date: string; // ISO date string (1st or 15th of month)
  snapshot_type: ARSnapshotType;

  // Patient A/R metrics
  patient_ar_total: number;
  patient_ar_collectible_count: number;
  patient_ar_collectible_balance: number;
  patient_ar_non_collectible_count: number;
  patient_ar_non_collectible_balance: number;
  patient_ar_collected_since_last: number;
  patient_ar_written_off_since_last: number;

  // Insurance A/R metrics
  insurance_ar_total: number;
  insurance_ar_total_claims: number;
  insurance_ar_total_collected: number;
  insurance_ar_total_outstanding: number;

  // Aging buckets (patient)
  patient_aging_0_30: number;
  patient_aging_31_60: number;
  patient_aging_61_90: number;
  patient_aging_91_plus: number;

  // Aging buckets (insurance)
  insurance_aging_0_30: number;
  insurance_aging_31_60: number;
  insurance_aging_61_90: number;
  insurance_aging_91_120: number;
  insurance_aging_121_plus: number;

  // Status breakdowns (insurance)
  insurance_pending_review: number;
  insurance_resubmitted: number;
  insurance_final_review: number;
  insurance_consultant_review: number;
  insurance_closed_paid: number;
  insurance_closed_unpaid: number;
  insurance_appeal_filed: number;
  insurance_denied: number;

  // Team workload (insurance)
  team_workload: Record<string, { count: number; outstanding: number }>;

  notes: string | null;
  created_at?: string;
};

// =====================================================
// Enhanced Patient A/R fields (additional columns from spreadsheet)
// =====================================================

export type PatientAREnhanced = PatientAR & {
  related_family: string | null;
  background_notes: string | null;
  team_discussion_notes: string | null;
  action_needed: string | null;
  is_collectible: boolean; // true = collectible, false = non-collectible (potential write-off)
  doctor_decision: string | null; // Dr. Gajjar's decision on non-collectible accounts
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
  insurance_ar_claims: InsuranceARClaim;
  insurance_issues: InsuranceIssue;
  ar_snapshots: ARSnapshot;
};
