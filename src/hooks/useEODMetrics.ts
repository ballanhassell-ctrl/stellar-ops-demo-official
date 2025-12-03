import { useState, useEffect } from 'react';
import { getMetricsForDate, getLatestMetricValues } from '../services/metrics';
import { getMTDMetrics } from '../services/mtdCalculator';

export interface EODData {
  reportDate: string;
  dailyProduction: number;
  dailyProductionGoal: number;
  paymentsCollected: number;
  collectionRate: number;
  insurancePayments: number;
  patientPayments: number;
  productionCollectedDifference: number;
  paymentMethods: {
    visa: number;
    mastercard: number;
    americanExpress: number;
    discover: number;
    cherry: number;
    careCredit: number;
    weave: number;
    insuranceCheck: number;
    otherCheck: number;
    cash: number;
    eft: number;
  };
  patientsSeenToday: number;
  newPatients: number;
  proceduresCompleted: number;
  unbilledProcedures: number;
  unappliedPayments: number;
  failedTransactions: number;
  actionItems: {
    claimsToSubmit: number;
    deniedClaimsToResubmit: number;
    preAuthsApproved: number;
    accountsNeedingFollowUp: number;
    missedAppointments: number;
  };
  payments: any[]; // Keep as array for now (not stored in Supabase)
  topProcedures: any[]; // Keep as array for now (not stored in Supabase)
  monthToDateSummary: {
    production: number;
    productionGoal: number;
    collected: number;
    collectionRate: number;
    newPatients: number;
  };
}

export const useEODMetrics = (date: string) => {
  const [data, setData] = useState<EODData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEODMetrics = async (targetDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const metrics = await getMetricsForDate(targetDate);

      // Define persistent metrics for EOD data (metrics that should show latest value)
      const persistentMetrics = ['eod_new_patients'];

      // Fetch latest values for persistent metrics
      const latestValues = await getLatestMetricValues(persistentMetrics);

      // Calculate MTD metrics from authoritative sources
      const mtdMetrics = await getMTDMetrics(targetDate);

      // Helper function to find metric value by field_key
      const getMetricValue = (fieldKey: string, defaultValue: number = 0, usePersistent: boolean = false): number => {
        const metric = metrics.find(m => m.field_key === fieldKey);
        const currentValue = metric ? metric.value : 0;

        // If this is a persistent metric and we don't have data for the current date, use latest
        if (usePersistent && currentValue === 0 && latestValues.has(fieldKey)) {
          return latestValues.get(fieldKey) || defaultValue;
        }

        return currentValue || defaultValue;
      };

      // Map the flat metrics array to EOD data structure
      const dailyProduction = getMetricValue('eod_daily_production');
      const paymentsCollected = getMetricValue('eod_payments_collected');

      const mappedData: EODData = {
        reportDate: new Date(targetDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),

        // Daily Summary
        dailyProduction,
        dailyProductionGoal: getMetricValue('eod_daily_production_goal', 19991),
        paymentsCollected,
        collectionRate: dailyProduction > 0
          ? Math.round((paymentsCollected / dailyProduction) * 100)
          : 0,
        insurancePayments: getMetricValue('eod_insurance_payments'),
        patientPayments: getMetricValue('eod_patient_payments'),
        productionCollectedDifference: dailyProduction - paymentsCollected,

        // Payment Methods
        paymentMethods: {
          visa: getMetricValue('eod_payment_visa'),
          mastercard: getMetricValue('eod_payment_mastercard'),
          americanExpress: getMetricValue('eod_payment_amex'),
          discover: getMetricValue('eod_payment_discover'),
          cherry: getMetricValue('eod_payment_cherry'),
          careCredit: getMetricValue('eod_payment_carecredit'),
          weave: getMetricValue('eod_payment_weave'),
          insuranceCheck: getMetricValue('eod_payment_insurance_check'),
          otherCheck: getMetricValue('eod_payment_other_check'),
          cash: getMetricValue('eod_payment_cash'),
          eft: getMetricValue('eod_payment_eft'),
        },

        // Daily Metrics
        patientsSeenToday: getMetricValue('eod_patients_seen'),
        newPatients: getMetricValue('eod_new_patients', 0, true), // Use persistent data
        proceduresCompleted: getMetricValue('eod_procedures_completed'),
        unbilledProcedures: getMetricValue('eod_unbilled_procedures'),
        unappliedPayments: getMetricValue('eod_unapplied_payments'),
        failedTransactions: getMetricValue('eod_failed_transactions'),

        // Action Items
        actionItems: {
          claimsToSubmit: getMetricValue('eod_claims_to_submit'),
          deniedClaimsToResubmit: getMetricValue('eod_denied_claims_resubmit'),
          preAuthsApproved: getMetricValue('eod_preauths_approved'),
          accountsNeedingFollowUp: getMetricValue('eod_accounts_followup'),
          missedAppointments: getMetricValue('eod_missed_appointments'),
        },

        // Arrays (not stored in Supabase for now)
        payments: [],
        topProcedures: [],

        // Month-to-Date Summary - now calculated from BAM revenue and daily totals
        monthToDateSummary: {
          production: mtdMetrics.production,
          productionGoal: mtdMetrics.productionGoal,
          collected: mtdMetrics.collected,
          collectionRate: mtdMetrics.collectionRate,
          newPatients: mtdMetrics.newPatients,
        },
      };

      setData(mappedData);
    } catch (err) {
      console.error('Error fetching EOD metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch EOD metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEODMetrics(date);
  }, [date]);

  const refresh = () => {
    fetchEODMetrics(date);
  };

  return { data, loading, error, refresh };
};
