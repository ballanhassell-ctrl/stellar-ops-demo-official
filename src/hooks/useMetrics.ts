import { useState, useEffect } from 'react';
import { getMetricsForDate, getLatestMetricValues, getPaymentAggregates } from '../services/metrics';

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

interface FinancingMetrics {
  cherryPatients: number;
  cherryAmount: number;
  careCreditPatients: number;
  careCreditAmount: number;
  totalPatients: number;
  totalAmount: number;
}

interface AdvancedMetrics {
  cac: number;
  cashFlow: number;
  churnedPatientsMonth: number;
  cogs: {
    assistantPayroll: number;
    associateDoctorExpense: number;
    dentalSupplies: number;
    hygienePayroll: number;
    labFees: number;
    totalCOGS: number;
  };
  grossProfitMargin: number;
  operatingCosts: number;
  operatingProfitMargin: number;
  revenueGrowthRate: number;
}

interface ScorecardMetrics {
  showRateDr: number;
  showRateDrTarget: number;
  showRateHyg: number;
  showRateHygTarget: number;
  txAcceptance: number;
  txAcceptanceTarget: number;
  totalTxPresented: number;
  totalTxAccepted: number;
  fiveStarReviews: number;
}

export interface MetricsData {
  dashboard: DashboardMetrics;
  payments: PaymentsMetrics;
  patients: PatientsMetrics;
  preAuths: PreAuthsMetrics;
  claims: ClaimsMetrics;
  financing: FinancingMetrics;
  advanced: AdvancedMetrics;
  scorecard: ScorecardMetrics;
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
        'bam_target_goal',
        'practice_goal',
        'active_patients',
        'collection_rate',
        'outstanding_ar',
        // Claims metrics
        'active_claims',
        'claims_pending',
        'claims_denied',
        'claims_over_sixty_days',
        'insurance_ar_0_30_amount',
        'insurance_ar_31_60_amount',
        'insurance_ar_61_90_amount',
        'insurance_ar_90_plus_amount',
        'insurance_ar_0_30_count',
        'insurance_ar_31_60_count',
        'insurance_ar_61_90_count',
        'insurance_ar_90_plus_count',
        // Payment metrics (persistent ones - not daily/weekly/monthly aggregates)
        'pending_deposits',
        'insurance_payments',
        'patient_payments',
        'unapplied_credits',
        'refunds_pending',
        // Third party financing metrics
        'financing_cherry_patients',
        'financing_cherry_amount',
        'financing_carecredit_patients',
        'financing_carecredit_amount',
        // Advanced Business Metrics
        'adv_cac',
        'adv_cash_flow',
        'adv_churned_patients_month',
        'adv_cogs_assistant_payroll',
        'adv_cogs_associate_doctor',
        'adv_cogs_dental_supplies',
        'adv_cogs_hygiene_payroll',
        'adv_cogs_lab_fees',
        'adv_gross_profit_margin',
        'adv_operating_costs',
        'adv_operating_profit_margin',
        'adv_revenue_growth_rate',
        // Scorecard Metrics
        'scorecard_show_rate_dr',
        'scorecard_show_rate_dr_target',
        'scorecard_show_rate_hyg',
        'scorecard_show_rate_hyg_target',
        'scorecard_tx_acceptance',
        'scorecard_tx_acceptance_target',
        'scorecard_total_tx_presented',
        'scorecard_total_tx_accepted',
        'scorecard_five_star_reviews',
      ];

      // Fetch latest values for persistent metrics if they're not in the current date's data
      const latestValues = await getLatestMetricValues(persistentMetrics);

      // Fetch aggregated payment data for weekly/monthly totals
      const paymentAggregates = await getPaymentAggregates();

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
          bamTargetGoal: getMetricValue('bam_target_goal', 224548, true),
          practiceGoal: getMetricValue('practice_goal', 300000, true),
          collectionRate: getMetricValue('collection_rate', 0, true),
          activePatients: getMetricValue('active_patients', 0, true),
          activeClaims: getMetricValue('active_claims'),
          pendingPayments: getMetricValue('pending_payments'),
          // Outstanding A/R is auto-calculated from Insurance + Patient A/R aging totals
          outstandingAR: 0, // Will be calculated below after aging data is loaded
        },
        payments: {
          todaysPayments: getMetricValue('todays_payments'),
          weeklyPayments: paymentAggregates.perWeek,
          monthlyPayments: paymentAggregates.perMonth,
          pendingDeposits: getMetricValue('pending_deposits', 0, true),
          insurancePayments: getMetricValue('insurance_payments', 0, true),
          patientPayments: getMetricValue('patient_payments', 0, true),
          unappliedCredits: getMetricValue('unapplied_credits', 0, true),
          refundsPending: getMetricValue('refunds_pending', 0, true),
        },
        patients: {
          totalPatients: getMetricValue('total_patients'),
          activePatients: getMetricValue('active_patients', 0, true),
          patientsWithBalance: getMetricValue('patients_with_balance'),
          // Total Patient A/R is auto-calculated from Patient A/R aging buckets
          totalPatientAR: 0, // Will be calculated below
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
          totalActive: getMetricValue('active_claims', 0, true),
          pending: getMetricValue('claims_pending', 0, true),
          denied: getMetricValue('claims_denied', 0, true),
          overSixtyDays: getMetricValue('claims_over_sixty_days', 0, true),
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
        financing: {
          cherryPatients: getMetricValue('financing_cherry_patients', 0, true),
          cherryAmount: getMetricValue('financing_cherry_amount', 0, true),
          careCreditPatients: getMetricValue('financing_carecredit_patients', 0, true),
          careCreditAmount: getMetricValue('financing_carecredit_amount', 0, true),
          totalPatients: getMetricValue('financing_cherry_patients', 0, true) + getMetricValue('financing_carecredit_patients', 0, true),
          totalAmount: getMetricValue('financing_cherry_amount', 0, true) + getMetricValue('financing_carecredit_amount', 0, true),
        },
        advanced: {
          cac: getMetricValue('adv_cac', 0, true),
          cashFlow: getMetricValue('adv_cash_flow', 0, true),
          churnedPatientsMonth: getMetricValue('adv_churned_patients_month', 0, true),
          cogs: {
            assistantPayroll: getMetricValue('adv_cogs_assistant_payroll', 0, true),
            associateDoctorExpense: getMetricValue('adv_cogs_associate_doctor', 0, true),
            dentalSupplies: getMetricValue('adv_cogs_dental_supplies', 0, true),
            hygienePayroll: getMetricValue('adv_cogs_hygiene_payroll', 0, true),
            labFees: getMetricValue('adv_cogs_lab_fees', 0, true),
            totalCOGS:
              getMetricValue('adv_cogs_assistant_payroll', 0, true) +
              getMetricValue('adv_cogs_associate_doctor', 0, true) +
              getMetricValue('adv_cogs_dental_supplies', 0, true) +
              getMetricValue('adv_cogs_hygiene_payroll', 0, true) +
              getMetricValue('adv_cogs_lab_fees', 0, true),
          },
          grossProfitMargin: getMetricValue('adv_gross_profit_margin', 0, true),
          operatingCosts: getMetricValue('adv_operating_costs', 0, true),
          operatingProfitMargin: getMetricValue('adv_operating_profit_margin', 0, true),
          revenueGrowthRate: getMetricValue('adv_revenue_growth_rate', 0, true),
        },
        scorecard: {
          showRateDr: getMetricValue('scorecard_show_rate_dr', 0, true),
          showRateDrTarget: getMetricValue('scorecard_show_rate_dr_target', 90, true),
          showRateHyg: getMetricValue('scorecard_show_rate_hyg', 0, true),
          showRateHygTarget: getMetricValue('scorecard_show_rate_hyg_target', 85, true),
          txAcceptance: getMetricValue('scorecard_tx_acceptance', 0, true),
          txAcceptanceTarget: getMetricValue('scorecard_tx_acceptance_target', 50, true),
          totalTxPresented: getMetricValue('scorecard_total_tx_presented', 0, true),
          totalTxAccepted: getMetricValue('scorecard_total_tx_accepted', 0, true),
          fiveStarReviews: getMetricValue('scorecard_five_star_reviews', 0, true),
        },
      };

      // Auto-calculate Total Patient A/R from aging buckets
      mappedData.patients.totalPatientAR =
        mappedData.patients.patientARAging.zeroToThirty +
        mappedData.patients.patientARAging.thirtyOneToSixty +
        mappedData.patients.patientARAging.sixtyOneToNinety +
        mappedData.patients.patientARAging.ninetyPlus;

      // Auto-calculate Total Insurance A/R from aging buckets
      const totalInsuranceAR =
        mappedData.claims.arAging.zeroToThirty.amount +
        mappedData.claims.arAging.thirtyOneToSixty.amount +
        mappedData.claims.arAging.sixtyOneToNinety.amount +
        mappedData.claims.arAging.ninetyPlus.amount;

      // Auto-calculate Outstanding A/R as sum of Insurance A/R + Patient A/R
      mappedData.dashboard.outstandingAR = totalInsuranceAR + mappedData.patients.totalPatientAR;

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
