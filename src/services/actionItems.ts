// src/services/actionItems.ts
/**
 * Action Items Service
 * Queries real-time data from RCM Management tabs to populate EOD action items
 * Eliminates manual data entry by pulling from actual records
 */

import { supabase } from '../lib/supabaseClient';

export interface ActionItemsData {
  claimsToSubmit: number;
  deniedClaimsToResubmit: number;
  preAuthsApproved: number;
  accountsNeedingFollowUp: number;
  missedAppointments: number;
  unbilledProcedures: number;
}

/**
 * Get real-time action items from RCM Management data
 * This pulls from actual database records instead of manual entry
 */
export async function getRealTimeActionItems(): Promise<ActionItemsData> {
  try {
    console.log('[Action Items] Fetching real-time data from RCM Management...');

    // 1. Claims to Submit - Query claims table for pending/ready to submit
    const { data: claimsData } = await supabase
      .from('csd_claims')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('archived', false);

    const claimsToSubmit = claimsData?.length || 0;
    console.log('[Action Items] Claims to submit:', claimsToSubmit);

    // 2. Denied Claims to Resubmit - Query claims with denied status
    const { data: deniedData } = await supabase
      .from('csd_claims')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'denied')
      .eq('archived', false);

    const deniedClaimsToResubmit = deniedData?.length || 0;
    console.log('[Action Items] Denied claims to resubmit:', deniedClaimsToResubmit);

    // 3. Pre-Auths Approved - Query pre-auths with approved status
    const { data: preAuthsData } = await supabase
      .from('csd_preauths')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('archived', false);

    const preAuthsApproved = preAuthsData?.length || 0;
    console.log('[Action Items] Pre-auths approved:', preAuthsApproved);

    // 4. Accounts Needing Follow-Up - Count from multiple sources
    // - Claims pending for > 30 days
    // - Pre-auths pending for > 14 days
    // - Patient AR past due
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

    // Claims pending > 30 days
    const { data: oldClaimsData } = await supabase
      .from('csd_claims')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing', 'waiting_for_info'])
      .lt('date_submitted', thirtyDaysAgoStr)
      .eq('archived', false);

    // Pre-auths pending > 14 days
    const { data: oldPreAuthsData } = await supabase
      .from('csd_preauths')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('date_submitted', fourteenDaysAgoStr)
      .eq('archived', false);

    // Get patient AR 61-90 and 90+ days counts from latest metrics
    const { data: patientARData } = await supabase
      .from('csd_metric_values')
      .select('field_key, value')
      .in('field_key', ['patient_ar_61_90_count', 'patient_ar_90_plus_count'])
      .order('as_of_date', { ascending: false })
      .limit(2);

    const ar6190Count = patientARData?.find(r => r.field_key === 'patient_ar_61_90_count')?.value || 0;
    const ar90PlusCount = patientARData?.find(r => r.field_key === 'patient_ar_90_plus_count')?.value || 0;

    const accountsNeedingFollowUp =
      (oldClaimsData?.length || 0) +
      (oldPreAuthsData?.length || 0) +
      ar6190Count +
      ar90PlusCount;

    console.log('[Action Items] Accounts needing follow-up:', accountsNeedingFollowUp, {
      oldClaims: oldClaimsData?.length || 0,
      oldPreAuths: oldPreAuthsData?.length || 0,
      ar6190: ar6190Count,
      ar90Plus: ar90PlusCount
    });

    // 5. Missed Appointments - Get from EOD entry (still manual as it's scheduling system data)
    const { data: missedApptsData } = await supabase
      .from('csd_metric_values')
      .select('value')
      .eq('field_key', 'eod_missed_appointments')
      .order('as_of_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const missedAppointments = missedApptsData?.value || 0;
    console.log('[Action Items] Missed appointments:', missedAppointments);

    // 6. Unbilled Procedures - Get from EOD entry (still manual)
    const { data: unbilledData } = await supabase
      .from('csd_metric_values')
      .select('value')
      .eq('field_key', 'eod_unbilled_procedures')
      .order('as_of_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const unbilledProcedures = unbilledData?.value || 0;
    console.log('[Action Items] Unbilled procedures:', unbilledProcedures);

    const result = {
      claimsToSubmit,
      deniedClaimsToResubmit,
      preAuthsApproved,
      accountsNeedingFollowUp,
      missedAppointments,
      unbilledProcedures
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
      unbilledProcedures: 0
    };
  }
}

/**
 * Get follow-up counts for specific categories
 * Used for badges/indicators throughout the app
 */
export async function getFollowUpCounts() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

    // Claims needing follow-up (pending > 30 days)
    const { count: claimsCount } = await supabase
      .from('csd_claims')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing', 'waiting_for_info'])
      .lt('date_submitted', thirtyDaysAgoStr)
      .eq('archived', false);

    // Pre-auths needing follow-up (pending > 14 days)
    const { count: preAuthsCount } = await supabase
      .from('csd_preauths')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('date_submitted', fourteenDaysAgoStr)
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
