// src/services/actionItems.ts
/**
 * Action Items Service
 * Queries real-time data from RCM Management tabs to populate EOD action items
 * Eliminates manual data entry by pulling from actual records
 */

import { supabase } from '../lib/supabaseClient';
import { getLocalDateString, toLocalDateString } from '../utils/dateUtils';
import { isStaticDataMode } from '../config/dataMode';

export interface ActionItemsData {
  claimsToSubmit: number;
  deniedClaimsToResubmit: number;
  preAuthsApproved: number;
  accountsNeedingFollowUp: number;
  missedAppointments: number;
  patientsDueForRecall: number;
}

/**
 * Get real-time action items from RCM Management data
 * This pulls from actual database records instead of manual entry
 */
export async function getRealTimeActionItems(): Promise<ActionItemsData> {
  if (isStaticDataMode()) {
    return {
      claimsToSubmit: 3,
      deniedClaimsToResubmit: 1,
      preAuthsApproved: 2,
      accountsNeedingFollowUp: 5,
      missedAppointments: 1,
      patientsDueForRecall: 4,
    };
  }

  try {
    console.log('[Action Items] Fetching real-time data from RCM Management...');

    // 1. Claims to Submit - Query claims table for pending/ready to submit
    const { count: claimsCount } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')
      .eq('archived', false);

    const claimsToSubmit = claimsCount || 0;
    console.log('[Action Items] Claims to submit:', claimsToSubmit);

    // 2. Denied Claims to Resubmit - Query claims with denied status
    const { count: deniedCount } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Denied', 'Denied/2nd Appeal'])
      .eq('archived', false);

    const deniedClaimsToResubmit = deniedCount || 0;
    console.log('[Action Items] Denied claims to resubmit:', deniedClaimsToResubmit);

    // 3. Pre-Auths Approved - Query pre-auths with approved status
    const { count: preAuthsCount } = await supabase
      .from('pre_auths')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')
      .eq('archived', false);

    const preAuthsApproved = preAuthsCount || 0;
    console.log('[Action Items] Pre-auths approved:', preAuthsApproved);

    // 4. Accounts Needing Follow-Up - Count from multiple sources
    // - Claims pending for > 30 days
    // - Pre-auths pending for > 14 days
    // - Patient AR past due
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = toLocalDateString(thirtyDaysAgo);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = toLocalDateString(fourteenDaysAgo);

    // Claims pending > 30 days
    const { count: oldClaimsCount } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Pending', 'In Review/2nd Appeal', 'Resubmitted with Attachments', 'Resubmitted/1st Appeal'])
      .lt('date_submitted', thirtyDaysAgoStr)
      .eq('archived', false);

    // Pre-auths pending > 14 days
    const { count: oldPreAuthsCount } = await supabase
      .from('pre_auths')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')
      .lt('date_requested', fourteenDaysAgoStr)
      .eq('archived', false);

    // Get patient AR 61-90 and 90+ days counts from latest metrics
    const { data: patientARData } = await supabase
      .from('csd_metric_values')
      .select('field_key, value')
      .in('field_key', ['patient_ar_61_90_count', 'patient_ar_90_plus_count'])
      .order('as_of_date', { ascending: false })
      .limit(2);

    const ar6190Count = patientARData?.find((r: any) => r.field_key === 'patient_ar_61_90_count')?.value || 0;
    const ar90PlusCount = patientARData?.find((r: any) => r.field_key === 'patient_ar_90_plus_count')?.value || 0;

    const accountsNeedingFollowUp =
      (oldClaimsCount || 0) +
      (oldPreAuthsCount || 0) +
      ar6190Count +
      ar90PlusCount;

    console.log('[Action Items] Accounts needing follow-up:', accountsNeedingFollowUp, {
      oldClaims: oldClaimsCount || 0,
      oldPreAuths: oldPreAuthsCount || 0,
      ar6190: ar6190Count,
      ar90Plus: ar90PlusCount
    });

    // 5. Missed Appointments - AUTO-CALCULATED from appointments table
    const today = getLocalDateString();
    const { count: missedAppointments } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'no_show')
      .eq('appointment_date', today);

    console.log('[Action Items] Missed appointments (automated):', missedAppointments || 0);

    // 6. Patients Due for Recall - AUTO-CALCULATED from patients table
    // Patients who haven't been seen in 6+ months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = toLocalDateString(sixMonthsAgo);

    const { count: recallCount } = await supabase
      .from('patients')
      .select('patient_id', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('last_visit_date', sixMonthsAgoStr);

    const patientsDueForRecall = recallCount || 0;
    console.log('[Action Items] Patients due for recall (automated):', patientsDueForRecall);

    const result = {
      claimsToSubmit,
      deniedClaimsToResubmit,
      preAuthsApproved,
      accountsNeedingFollowUp,
      missedAppointments: missedAppointments || 0,
      patientsDueForRecall,
    };

    console.log('[Action Items] Final real-time data:', result);
    return result;

  } catch (err) {
    console.error('[Action Items] Error fetching real-time data:', err);
    // Return zeros on error to prevent crashes
    return {
      claimsToSubmit: 0,
      deniedClaimsToResubmit: 0,
      preAuthsApproved: 0,
      accountsNeedingFollowUp: 0,
      missedAppointments: 0,
      patientsDueForRecall: 0,
    };
  }
}

/**
 * Get follow-up counts for specific categories
 * Used for badges/indicators throughout the app
 */
export async function getFollowUpCounts() {
  if (isStaticDataMode()) {
    return { claims: 3, preAuths: 1, total: 4 };
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = toLocalDateString(thirtyDaysAgo);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = toLocalDateString(fourteenDaysAgo);

    // Claims needing follow-up (pending > 30 days)
    const { count: claimsCount } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Pending', 'In Review/2nd Appeal', 'Resubmitted with Attachments', 'Resubmitted/1st Appeal'])
      .lt('date_submitted', thirtyDaysAgoStr)
      .eq('archived', false);

    // Pre-auths needing follow-up (pending > 14 days)
    const { count: preAuthsCount } = await supabase
      .from('pre_auths')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')
      .lt('date_requested', fourteenDaysAgoStr)
      .eq('archived', false);

    return {
      claims: claimsCount || 0,
      preAuths: preAuthsCount || 0,
      total: (claimsCount || 0) + (preAuthsCount || 0)
    };
  } catch (err) {
    console.error('Error getting follow-up counts:', err);
    return { claims: 0, preAuths: 0, total: 0 };
  }
}
