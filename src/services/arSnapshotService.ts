// =====================================================
// A/R Snapshot Service - Bi-monthly aggregates (1st & 15th)
// Captures point-in-time A/R state for trend analysis
// =====================================================

import { supabase } from '../lib/supabaseClient';
import type { ARSnapshot } from '../types/database.types';
import { isStaticDataMode } from '../config/dataMode';
import { sampleARSnapshots } from '../data/sampleData';
import { getPatientARMetrics } from './patientARService.new';
import { getInsuranceARClaims, calculateInsuranceARSummary } from './insuranceARService';
import { getLocalDateString } from '../utils/dateUtils';

/** Check if error indicates the table doesn't exist in Supabase */
function isTableNotFoundError(error: any): boolean {
  return (
    error?.code === '42P01' ||        // PostgreSQL: undefined_table
    error?.code === 'PGRST204' ||     // PostgREST: relation not found
    error?.message?.includes('404') ||
    error?.message?.includes('relation') ||
    error?.status === 404
  );
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

export async function getARSnapshots(): Promise<ARSnapshot[]> {
  if (isStaticDataMode()) {
    return [...sampleARSnapshots];
  }

  const { data, error } = await supabase
    .from('ar_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false });

  if (error) {
    console.error('Error fetching A/R snapshots:', error);
    // Table may not exist yet in Supabase - fall back to sample data
    if (isTableNotFoundError(error)) {
      console.warn('ar_snapshots table not found in Supabase. Using sample data. Create the table in Supabase to use live data.');
      return [...sampleARSnapshots];
    }
    throw error;
  }

  return data || [];
}

export async function getSnapshotsByDateRange(
  startDate: string,
  endDate: string
): Promise<ARSnapshot[]> {
  if (isStaticDataMode()) {
    return sampleARSnapshots.filter(s =>
      s.snapshot_date >= startDate && s.snapshot_date <= endDate
    );
  }

  const { data, error } = await supabase
    .from('ar_snapshots')
    .select('*')
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate)
    .order('snapshot_date', { ascending: true });

  if (error) {
    console.error('Error fetching snapshots by date range:', error);
    if (isTableNotFoundError(error)) {
      return sampleARSnapshots.filter(s =>
        s.snapshot_date >= startDate && s.snapshot_date <= endDate
      );
    }
    throw error;
  }

  return data || [];
}

export async function getLatestSnapshot(): Promise<ARSnapshot | null> {
  if (isStaticDataMode()) {
    return sampleARSnapshots.length > 0 ? sampleARSnapshots[0] : null;
  }

  const { data, error } = await supabase
    .from('ar_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows
    if (isTableNotFoundError(error)) {
      return sampleARSnapshots.length > 0 ? sampleARSnapshots[0] : null;
    }
    console.error('Error fetching latest snapshot:', error);
    throw error;
  }

  return data;
}

// =====================================================
// SNAPSHOT GENERATION
// =====================================================

/**
 * Generate a new A/R snapshot with current data.
 * Designed to be called on the 1st and 15th of each month.
 */
export async function generateSnapshot(snapshotDate?: string): Promise<ARSnapshot> {
  const date = snapshotDate || getLocalDateString();

  // Gather current metrics
  const [patientMetrics, insuranceClaims] = await Promise.all([
    getPatientARMetrics(),
    getInsuranceARClaims(),
  ]);

  const insuranceSummary = calculateInsuranceARSummary(insuranceClaims);

  const snapshot: Omit<ARSnapshot, 'id' | 'created_at'> = {
    snapshot_date: date,
    snapshot_type: 'combined',

    // Patient A/R
    patient_ar_total: patientMetrics.totalActiveBalance + patientMetrics.totalCollectionsBalance,
    patient_ar_collectible_count: patientMetrics.totalActive,
    patient_ar_collectible_balance: patientMetrics.totalActiveBalance,
    patient_ar_non_collectible_count: patientMetrics.totalWriteOffSuggested,
    patient_ar_non_collectible_balance: patientMetrics.totalWriteOffSuggestedBalance,
    patient_ar_collected_since_last: 0, // Will be calculated from previous snapshot
    patient_ar_written_off_since_last: 0,

    // Insurance A/R
    insurance_ar_total: insuranceSummary.totalOutstanding,
    insurance_ar_total_claims: insuranceSummary.totalClaims,
    insurance_ar_total_collected: insuranceSummary.totalCollected,
    insurance_ar_total_outstanding: insuranceSummary.totalOutstanding,

    // Patient aging
    patient_aging_0_30: patientMetrics.agingBuckets['0-30'],
    patient_aging_31_60: patientMetrics.agingBuckets['31-60'],
    patient_aging_61_90: patientMetrics.agingBuckets['61-90'],
    patient_aging_91_plus: patientMetrics.agingBuckets['90+'],

    // Insurance aging
    insurance_aging_0_30: insuranceSummary.agingBreakdown['0-30'].outstanding,
    insurance_aging_31_60: insuranceSummary.agingBreakdown['31-60'].outstanding,
    insurance_aging_61_90: insuranceSummary.agingBreakdown['61-90'].outstanding,
    insurance_aging_91_120: insuranceSummary.agingBreakdown['91-120'].outstanding,
    insurance_aging_121_plus: insuranceSummary.agingBreakdown['121+'].outstanding,

    // Status breakdown
    insurance_pending_review: insuranceSummary.statusBreakdown.pendingReview,
    insurance_resubmitted: insuranceSummary.statusBreakdown.resubmitted,
    insurance_final_review: insuranceSummary.statusBreakdown.finalReview,
    insurance_consultant_review: insuranceSummary.statusBreakdown.consultantReview,
    insurance_closed_paid: insuranceSummary.statusBreakdown.closedPaid,
    insurance_closed_unpaid: insuranceSummary.statusBreakdown.closedUnpaid,
    insurance_appeal_filed: insuranceSummary.statusBreakdown.appealFiled,
    insurance_denied: insuranceSummary.statusBreakdown.denied,

    // Team workload
    team_workload: insuranceSummary.teamWorkload,

    notes: `Auto-generated snapshot for ${date}`,
  };

  if (isStaticDataMode()) {
    return { id: `SNAP-${Date.now()}`, ...snapshot } as ARSnapshot;
  }

  const { data, error } = await supabase
    .from('ar_snapshots')
    .insert(snapshot)
    .select()
    .single();

  if (error) {
    console.error('Error generating snapshot:', error);
    throw error;
  }

  return data;
}

/**
 * Check if a snapshot should be generated today (1st or 15th)
 */
export function shouldGenerateSnapshot(): boolean {
  const today = new Date();
  const day = today.getDate();
  return day === 1 || day === 15;
}

/**
 * Check if a snapshot already exists for today
 */
export async function snapshotExistsForDate(date: string): Promise<boolean> {
  if (isStaticDataMode()) {
    return sampleARSnapshots.some(s => s.snapshot_date === date);
  }

  const { data, error } = await supabase
    .from('ar_snapshots')
    .select('id')
    .eq('snapshot_date', date)
    .limit(1);

  if (error) {
    if (isTableNotFoundError(error)) {
      return sampleARSnapshots.some(s => s.snapshot_date === date);
    }
    console.error('Error checking snapshot existence:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

// =====================================================
// TREND CALCULATIONS
// =====================================================

export interface ARTrendPoint {
  date: string;
  label: string; // formatted date label for display
  patientAR: number;
  insuranceAR: number;
  combinedAR: number;
  patient_0_30: number;
  patient_31_60: number;
  patient_61_90: number;
  patient_91_plus: number;
  insurance_0_30: number;
  insurance_31_60: number;
  insurance_61_90: number;
  insurance_91_120: number;
  insurance_121_plus: number;
}

export function calculateTrends(snapshots: ARSnapshot[]): ARTrendPoint[] {
  return snapshots
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .map(s => {
      const d = new Date(s.snapshot_date + 'T00:00:00');
      const month = d.toLocaleString('default', { month: 'short' });
      const day = d.getDate();
      return {
        date: s.snapshot_date,
        label: `${month} ${day}`,
        patientAR: s.patient_ar_total,
        insuranceAR: s.insurance_ar_total,
        combinedAR: s.patient_ar_total + s.insurance_ar_total,
        patient_0_30: s.patient_aging_0_30,
        patient_31_60: s.patient_aging_31_60,
        patient_61_90: s.patient_aging_61_90,
        patient_91_plus: s.patient_aging_91_plus,
        insurance_0_30: s.insurance_aging_0_30,
        insurance_31_60: s.insurance_aging_31_60,
        insurance_61_90: s.insurance_aging_61_90,
        insurance_91_120: s.insurance_aging_91_120,
        insurance_121_plus: s.insurance_aging_121_plus,
      };
    });
}

/**
 * Calculate period-over-period changes between two snapshots
 */
export function calculateSnapshotDelta(
  current: ARSnapshot,
  previous: ARSnapshot
): {
  patientARChange: number;
  patientARChangePct: number;
  insuranceARChange: number;
  insuranceARChangePct: number;
  combinedChange: number;
  combinedChangePct: number;
} {
  const patientARChange = current.patient_ar_total - previous.patient_ar_total;
  const insuranceARChange = current.insurance_ar_total - previous.insurance_ar_total;
  const combinedCurrent = current.patient_ar_total + current.insurance_ar_total;
  const combinedPrevious = previous.patient_ar_total + previous.insurance_ar_total;

  return {
    patientARChange,
    patientARChangePct: previous.patient_ar_total > 0
      ? (patientARChange / previous.patient_ar_total) * 100
      : 0,
    insuranceARChange,
    insuranceARChangePct: previous.insurance_ar_total > 0
      ? (insuranceARChange / previous.insurance_ar_total) * 100
      : 0,
    combinedChange: combinedCurrent - combinedPrevious,
    combinedChangePct: combinedPrevious > 0
      ? ((combinedCurrent - combinedPrevious) / combinedPrevious) * 100
      : 0,
  };
}
