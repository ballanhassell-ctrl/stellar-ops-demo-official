-- Fix Field Names: Convert from camelCase to snake_case
-- Run this in Supabase SQL Editor to rename all your fields correctly

-- Update csd_metric_values table (actual data)
UPDATE csd_metric_values SET field_key = 'active_claims' WHERE field_key = 'activeClaims';
UPDATE csd_metric_values SET field_key = 'active_patients' WHERE field_key = 'activePatients';
UPDATE csd_metric_values SET field_key = 'bam_current_revenue' WHERE field_key = 'bamCurrentRevenue';
UPDATE csd_metric_values SET field_key = 'bam_target_goal' WHERE field_key = 'bamTargetGoal';
UPDATE csd_metric_values SET field_key = 'collection_rate' WHERE field_key = 'collectionRate';
UPDATE csd_metric_values SET field_key = 'outstanding_ar' WHERE field_key = 'outstandingAR';
UPDATE csd_metric_values SET field_key = 'pending_payments' WHERE field_key = 'pendingPayments';
UPDATE csd_metric_values SET field_key = 'practice_goal' WHERE field_key = 'practiceGoal';

UPDATE csd_metric_values SET field_key = 'todays_payments' WHERE field_key = 'todaysPayments';
UPDATE csd_metric_values SET field_key = 'weekly_payments' WHERE field_key = 'weeklyPayments';
UPDATE csd_metric_values SET field_key = 'monthly_payments' WHERE field_key = 'monthlyPayments';
UPDATE csd_metric_values SET field_key = 'pending_deposits' WHERE field_key = 'pendingDeposits';
UPDATE csd_metric_values SET field_key = 'insurance_payments' WHERE field_key = 'insurancePayments';
UPDATE csd_metric_values SET field_key = 'patient_payments' WHERE field_key = 'patientPayments';
UPDATE csd_metric_values SET field_key = 'unapplied_credits' WHERE field_key = 'unappliedCredits';
UPDATE csd_metric_values SET field_key = 'refunds_pending' WHERE field_key = 'refundsPending';

UPDATE csd_metric_values SET field_key = 'total_patients' WHERE field_key = 'totalPatients';
UPDATE csd_metric_values SET field_key = 'patients_with_balance' WHERE field_key = 'patientsWithBalance';
UPDATE csd_metric_values SET field_key = 'total_patient_ar' WHERE field_key = 'totalPatientAR';
UPDATE csd_metric_values SET field_key = 'patient_ar_0_30' WHERE field_key = 'patientAR0_30';
UPDATE csd_metric_values SET field_key = 'patient_ar_31_60' WHERE field_key = 'patientAR31_60';
UPDATE csd_metric_values SET field_key = 'patient_ar_61_90' WHERE field_key = 'patientAR61_90';
UPDATE csd_metric_values SET field_key = 'patient_ar_90_plus' WHERE field_key = 'patientAR90_plus';
UPDATE csd_metric_values SET field_key = 'payment_plans' WHERE field_key = 'paymentPlans';
UPDATE csd_metric_values SET field_key = 'past_due_accounts' WHERE field_key = 'pastDueAccounts';

UPDATE csd_metric_values SET field_key = 'total_pre_auths' WHERE field_key = 'totalPreAuths';
UPDATE csd_metric_values SET field_key = 'pre_auths_pending' WHERE field_key = 'preAuthsPending';
UPDATE csd_metric_values SET field_key = 'pre_auths_approved' WHERE field_key = 'preAuthsApproved';
UPDATE csd_metric_values SET field_key = 'pre_auths_denied' WHERE field_key = 'preAuthsDenied';
UPDATE csd_metric_values SET field_key = 'pre_auths_expiring_soon' WHERE field_key = 'preAuthsExpiringSoon';
UPDATE csd_metric_values SET field_key = 'pre_auths_expiring_this_month' WHERE field_key = 'preAuthsExpiringThisMonth';

-- Update csd_metric_catalog table (field definitions)
UPDATE csd_metric_catalog SET field_key = 'active_claims' WHERE field_key = 'activeClaims';
UPDATE csd_metric_catalog SET field_key = 'active_patients' WHERE field_key = 'activePatients';
UPDATE csd_metric_catalog SET field_key = 'bam_current_revenue' WHERE field_key = 'bamCurrentRevenue';
UPDATE csd_metric_catalog SET field_key = 'bam_target_goal' WHERE field_key = 'bamTargetGoal';
UPDATE csd_metric_catalog SET field_key = 'collection_rate' WHERE field_key = 'collectionRate';
UPDATE csd_metric_catalog SET field_key = 'outstanding_ar' WHERE field_key = 'outstandingAR';
UPDATE csd_metric_catalog SET field_key = 'pending_payments' WHERE field_key = 'pendingPayments';
UPDATE csd_metric_catalog SET field_key = 'practice_goal' WHERE field_key = 'practiceGoal';

UPDATE csd_metric_catalog SET field_key = 'todays_payments' WHERE field_key = 'todaysPayments';
UPDATE csd_metric_catalog SET field_key = 'weekly_payments' WHERE field_key = 'weeklyPayments';
UPDATE csd_metric_catalog SET field_key = 'monthly_payments' WHERE field_key = 'monthlyPayments';
UPDATE csd_metric_catalog SET field_key = 'pending_deposits' WHERE field_key = 'pendingDeposits';
UPDATE csd_metric_catalog SET field_key = 'insurance_payments' WHERE field_key = 'insurancePayments';
UPDATE csd_metric_catalog SET field_key = 'patient_payments' WHERE field_key = 'patientPayments';
UPDATE csd_metric_catalog SET field_key = 'unapplied_credits' WHERE field_key = 'unappliedCredits';
UPDATE csd_metric_catalog SET field_key = 'refunds_pending' WHERE field_key = 'refundsPending';

UPDATE csd_metric_catalog SET field_key = 'total_patients' WHERE field_key = 'totalPatients';
UPDATE csd_metric_catalog SET field_key = 'patients_with_balance' WHERE field_key = 'patientsWithBalance';
UPDATE csd_metric_catalog SET field_key = 'total_patient_ar' WHERE field_key = 'totalPatientAR';
UPDATE csd_metric_catalog SET field_key = 'patient_ar_0_30' WHERE field_key = 'patientAR0_30';
UPDATE csd_metric_catalog SET field_key = 'patient_ar_31_60' WHERE field_key = 'patientAR31_60';
UPDATE csd_metric_catalog SET field_key = 'patient_ar_61_90' WHERE field_key = 'patientAR61_90';
UPDATE csd_metric_catalog SET field_key = 'patient_ar_90_plus' WHERE field_key = 'patientAR90_plus';
UPDATE csd_metric_catalog SET field_key = 'payment_plans' WHERE field_key = 'paymentPlans';
UPDATE csd_metric_catalog SET field_key = 'past_due_accounts' WHERE field_key = 'pastDueAccounts';

UPDATE csd_metric_catalog SET field_key = 'total_pre_auths' WHERE field_key = 'totalPreAuths';
UPDATE csd_metric_catalog SET field_key = 'pre_auths_pending' WHERE field_key = 'preAuthsPending';
UPDATE csd_metric_catalog SET field_key = 'pre_auths_approved' WHERE field_key = 'preAuthsApproved';
UPDATE csd_metric_catalog SET field_key = 'pre_auths_denied' WHERE field_key = 'preAuthsDenied';
UPDATE csd_metric_catalog SET field_key = 'pre_auths_expiring_soon' WHERE field_key = 'preAuthsExpiringSoon';
UPDATE csd_metric_catalog SET field_key = 'pre_auths_expiring_this_month' WHERE field_key = 'preAuthsExpiringThisMonth';

-- Verify the changes
SELECT
  'Updated successfully!' as status,
  COUNT(*) as total_records
FROM csd_metric_values;

-- Show sample of updated field_keys
SELECT DISTINCT field_key
FROM csd_metric_values
ORDER BY field_key
LIMIT 20;
