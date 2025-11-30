import { useState, useEffect } from 'react';
import { getMetricsForDate } from '../services/metrics';

interface DashboardMetrics {
  bamCurrentRevenue: number;
  bamTargetGoal: number;
  practiceGoal: number;
  collectionRate: number;
  activePatients: number;
  activeClaims: number;
  pendingPayments: number;
  outstandingAR: number;
}

interface PaymentsMetrics {
  todaysPayments: number;
  weeklyPayments: number;
  monthlyPayments: number;
  pendingDeposits: number;
  insurancePayments: number;
  patientPayments: number;
  unappliedCredits: number;
  refundsPending: number;
}

interface PatientsMetrics {
  totalPatients: number;
  activePatients: number;
  patientsWithBalance: number;
  totalPatientAR: number;
  patientARAging: {
    zeroToThirty: number;
    thirtyOneToSixty: number;
    sixtyOneToNinety: number;
    ninetyPlus: number;
  };
  paymentPlans: number;
  pastDueAccounts: number;
}

interface PreAuthsMetrics {
  totalPreAuths: number;
  pending: number;
  approved: number;
  denied: number;
  expiringSoon: number;
  expiringThisMonth: number;
}

export interface MetricsData {
  dashboard: DashboardMetrics;
  payments: PaymentsMetrics;
  patients: PatientsMetrics;
  preAuths: PreAuthsMetrics;
}

export const useMetrics = (date: string) => {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const metrics = await getMetricsForDate(date);

      // Helper function to find metric value by field_key
      const getMetricValue = (fieldKey: string, defaultValue: number = 0): number => {
        const metric = metrics.find(m => m.field_key === fieldKey);
        return metric ? metric.value : defaultValue;
      };

      // Map the flat metrics array to structured dashboard data
      const mappedData: MetricsData = {
        dashboard: {
          bamCurrentRevenue: getMetricValue('bam_current_revenue'),
          bamTargetGoal: getMetricValue('bam_target_goal'),
          practiceGoal: getMetricValue('practice_goal'),
          collectionRate: getMetricValue('collection_rate'),
          activePatients: getMetricValue('active_patients'),
          activeClaims: getMetricValue('active_claims'),
          pendingPayments: getMetricValue('pending_payments'),
          outstandingAR: getMetricValue('outstanding_ar'),
        },
        payments: {
          todaysPayments: getMetricValue('todays_payments'),
          weeklyPayments: getMetricValue('weekly_payments'),
          monthlyPayments: getMetricValue('monthly_payments'),
          pendingDeposits: getMetricValue('pending_deposits'),
          insurancePayments: getMetricValue('insurance_payments'),
          patientPayments: getMetricValue('patient_payments'),
          unappliedCredits: getMetricValue('unapplied_credits'),
          refundsPending: getMetricValue('refunds_pending'),
        },
        patients: {
          totalPatients: getMetricValue('total_patients'),
          activePatients: getMetricValue('active_patients'),
          patientsWithBalance: getMetricValue('patients_with_balance'),
          totalPatientAR: getMetricValue('total_patient_ar'),
          patientARAging: {
            zeroToThirty: getMetricValue('patient_ar_0_30'),
            thirtyOneToSixty: getMetricValue('patient_ar_31_60'),
            sixtyOneToNinety: getMetricValue('patient_ar_61_90'),
            ninetyPlus: getMetricValue('patient_ar_90_plus'),
          },
          paymentPlans: getMetricValue('payment_plans'),
          pastDueAccounts: getMetricValue('past_due_accounts'),
        },
        preAuths: {
          totalPreAuths: getMetricValue('total_pre_auths'),
          pending: getMetricValue('pre_auths_pending'),
          approved: getMetricValue('pre_auths_approved'),
          denied: getMetricValue('pre_auths_denied'),
          expiringSoon: getMetricValue('pre_auths_expiring_soon'),
          expiringThisMonth: getMetricValue('pre_auths_expiring_this_month'),
        },
      };

      setData(mappedData);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [date]);

  const refresh = () => {
    fetchMetrics();
  };

  return { data, loading, error, refresh };
};
