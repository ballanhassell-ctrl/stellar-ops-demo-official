import { useState, useEffect } from 'react';
import { getMetricsForDate, getLatestMetricValues } from '../services/metrics';

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

interface ClaimsMetrics {
  totalActive: number;
  pending: number;
  denied: number;
  overSixtyDays: number;
  arAging: {
    zeroToThirty: { amount: number; count: number };
    thirtyOneToSixty: { amount: number; count: number };
    sixtyOneToNinety: { amount: number; count: number };
    ninetyPlus: { amount: number; count: number };
  };
}

export interface MetricsData {
  dashboard: DashboardMetrics;
  payments: PaymentsMetrics;
  patients: PatientsMetrics;
  preAuths: PreAuthsMetrics;
  claims: ClaimsMetrics;
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

      // Define persistent metrics that should use latest values if not found for current date
      const persistentMetrics = [
        'bam_current_revenue',
        'active_patients',
        'collection_rate',
        'outstanding_ar',
        'insurance_ar_0_30_amount',
        'insurance_ar_31_60_amount',
        'insurance_ar_61_90_amount',
        'insurance_ar_90_plus_amount',
        'insurance_ar_0_30_count',
        'insurance_ar_31_60_count',
        'insurance_ar_61_90_count',
        'insurance_ar_90_plus_count',
      ];

      // Fetch latest values for persistent metrics if they're not in the current date's data
      const latestValues = await getLatestMetricValues(persistentMetrics);

      // Helper function to find metric value by field_key
      // For persistent metrics, use latest value if current date doesn't have data
      const getMetricValue = (fieldKey: string, defaultValue: number = 0, usePersistent: boolean = false): number => {
        const metric = metrics.find(m => m.field_key === fieldKey);
        const currentValue = metric ? metric.value : 0;

        // If this is a persistent metric and we don't have data for the current date, use latest
        if (usePersistent && currentValue === 0 && latestValues.has(fieldKey)) {
          return latestValues.get(fieldKey) || defaultValue;
        }

        return currentValue || defaultValue;
      };

      // Map the flat metrics array to structured dashboard data
      const mappedData: MetricsData = {
        dashboard: {
          bamCurrentRevenue: getMetricValue('bam_current_revenue', 0, true),
          bamTargetGoal: getMetricValue('bam_target_goal'),
          practiceGoal: getMetricValue('practice_goal'),
          collectionRate: getMetricValue('collection_rate', 0, true),
          activePatients: getMetricValue('active_patients', 0, true),
          activeClaims: getMetricValue('active_claims'),
          pendingPayments: getMetricValue('pending_payments'),
          outstandingAR: getMetricValue('outstanding_ar', 0, true),
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
          activePatients: getMetricValue('active_patients', 0, true),
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
        claims: {
          totalActive: getMetricValue('active_claims'),
          pending: getMetricValue('claims_pending'),
          denied: getMetricValue('claims_denied'),
          overSixtyDays: getMetricValue('claims_over_sixty_days'),
          arAging: {
            zeroToThirty: {
              amount: getMetricValue('insurance_ar_0_30_amount', 0, true),
              count: getMetricValue('insurance_ar_0_30_count', 0, true),
            },
            thirtyOneToSixty: {
              amount: getMetricValue('insurance_ar_31_60_amount', 0, true),
              count: getMetricValue('insurance_ar_31_60_count', 0, true),
            },
            sixtyOneToNinety: {
              amount: getMetricValue('insurance_ar_61_90_amount', 0, true),
              count: getMetricValue('insurance_ar_61_90_count', 0, true),
            },
            ninetyPlus: {
              amount: getMetricValue('insurance_ar_90_plus_amount', 0, true),
              count: getMetricValue('insurance_ar_90_plus_count', 0, true),
            },
          },
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
