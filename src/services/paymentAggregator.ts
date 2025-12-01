// src/services/paymentAggregator.ts
/**
 * Payment Aggregation Service
 * Calculates insurance and patient payment totals from daily EOD payment method data
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Calculate total insurance payments from daily data
 * Insurance payments come from: insurance checks and EFT payments
 */
export async function calculateInsurancePayments(startDate: string, endDate: string): Promise<number> {
  try {
    // Insurance payment field keys
    const insuranceFields = [
      'eod_payment_insurance_check',
      'eod_payment_eft'
    ];

    let total = 0;

    for (const fieldKey of insuranceFields) {
      const { data, error } = await supabase
        .from('csd_metric_values')
        .select('value')
        .eq('field_key', fieldKey)
        .gte('as_of_date', startDate)
        .lte('as_of_date', endDate);

      if (error) {
        console.error(`Error fetching ${fieldKey}:`, error);
        continue;
      }

      const fieldTotal = data?.reduce((sum, record) => sum + (record.value || 0), 0) || 0;
      total += fieldTotal;
    }

    return total;
  } catch (err) {
    console.error('Error calculating insurance payments:', err);
    return 0;
  }
}

/**
 * Calculate total patient payments from daily data
 * Patient payments come from: credit cards (Visa, MC, Amex, Discover), cash, and other checks
 */
export async function calculatePatientPayments(startDate: string, endDate: string): Promise<number> {
  try {
    // Patient payment field keys
    const patientFields = [
      'eod_payment_visa',
      'eod_payment_mastercard',
      'eod_payment_amex',
      'eod_payment_discover',
      'eod_payment_cash',
      'eod_payment_other_check'
    ];

    let total = 0;

    for (const fieldKey of patientFields) {
      const { data, error } = await supabase
        .from('csd_metric_values')
        .select('value')
        .eq('field_key', fieldKey)
        .gte('as_of_date', startDate)
        .lte('as_of_date', endDate);

      if (error) {
        console.error(`Error fetching ${fieldKey}:`, error);
        continue;
      }

      const fieldTotal = data?.reduce((sum, record) => sum + (record.value || 0), 0) || 0;
      total += fieldTotal;
    }

    return total;
  } catch (err) {
    console.error('Error calculating patient payments:', err);
    return 0;
  }
}

/**
 * Calculate MTD (Month-to-Date) insurance and patient payments
 */
export async function calculateMTDPayments(date: string) {
  try {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // First day of current month
    const monthStart = new Date(year, month, 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Current date or end of month, whichever is earlier
    const endDateStr = date;

    const [insurancePayments, patientPayments] = await Promise.all([
      calculateInsurancePayments(monthStartStr, endDateStr),
      calculatePatientPayments(monthStartStr, endDateStr)
    ]);

    console.log('MTD Payments calculated:', { insurancePayments, patientPayments });

    return {
      insurancePayments,
      patientPayments,
      totalPayments: insurancePayments + patientPayments
    };
  } catch (err) {
    console.error('Error calculating MTD payments:', err);
    return {
      insurancePayments: 0,
      patientPayments: 0,
      totalPayments: 0
    };
  }
}

/**
 * Sync payment aggregates to Supabase
 * Updates the insurance_payments and patient_payments fields with calculated values
 */
export async function syncPaymentAggregates(date: string): Promise<boolean> {
  try {
    const payments = await calculateMTDPayments(date);

    const metricsToUpdate = [
      { field_key: 'insurance_payments', value: payments.insurancePayments },
      { field_key: 'patient_payments', value: payments.patientPayments },
    ];

    for (const metric of metricsToUpdate) {
      await supabase
        .from('csd_metric_values')
        .upsert({
          as_of_date: date,
          field_key: metric.field_key,
          value: metric.value,
          source: 'auto_calculated',
          notes: 'Auto-calculated from daily payment method totals',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'as_of_date,field_key'
        });
    }

    console.log('Payment aggregates synced successfully');
    return true;
  } catch (err) {
    console.error('Error syncing payment aggregates:', err);
    return false;
  }
}
