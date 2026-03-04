// src/components/eod-report/types.ts
// Shared types for the EOD Report component tree

import type { EODData } from '../../hooks/useEODMetrics';
import type { PaymentInsight } from '../../services/paymentInsights';
import type { BAMCycleData } from '../../services/eodEmailTemplate';

export interface PatientARMetricsData {
  totalActive: number;
  totalActiveBalance: number;
  totalCollections: number;
  totalCollectionsBalance: number;
  totalWriteOffSuggested: number;
  totalWriteOffSuggestedBalance: number;
  pendingSuggestionsCount: number;
  agingBuckets: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
}

export interface DashboardData {
  bamCurrentRevenue: number;
  bamTargetGoal: number;
  practiceGoal: number;
  bamCycleStart: Date;
  bamCycleEnd: Date;
  bamDaysRemaining: number;
  bamNextCycleStart: Date;
  bamNextCycleEnd: Date;
  collectionRate: number;
  activePatients: number;
  activeClaims: number;
  outstandingAR: number;
}

export interface TopProcedure {
  procedure_code: string;
  procedure_name: string;
  count: number;
  revenue: number;
}

export interface ReportTemplate {
  name: string;
  description: string;
  includes: string[];
}

export interface EODReportProps {
  isDayMode: boolean;
  dashboardDate: string;
  setDashboardDate: (date: string) => void;
  eodData: EODData;
  dashboardData: DashboardData;
  patientARMetrics: PatientARMetricsData | null;
  paymentInsights: PaymentInsight[];
  topProcedures: TopProcedure[];
  // Navigation callbacks
  onNavigateToPatientAR: () => void;
  onOpenTopProceduresModal: () => void;
  // Refresh callback to get fresh action items before sending email
  onRefreshActionItems?: () => Promise<EODData | null>;
}

// Email-related types
export interface EmailFormState {
  recipients: string;
  subject: string;
  message: string;
  template: string;
  scheduleEnabled: boolean;
  scheduleFrequency: string;
  scheduleTime: string;
}

export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  full: {
    name: 'Full Report',
    description: 'Complete EOD report with all sections',
    includes: ['Daily Summary', 'BAM Cycle', 'Payments Detail', 'Action Items', 'MTD Summary', 'Top Procedures', 'Important Notes'],
  },
  executive: {
    name: 'Executive Summary',
    description: 'High-level overview for management',
    includes: ['Daily Summary', 'BAM Cycle', 'Action Items', 'MTD Summary'],
  },
  financial: {
    name: 'Financial Focus',
    description: 'Payment and collection details',
    includes: ['Daily Summary', 'BAM Cycle', 'Payments Detail', 'MTD Summary', 'Top Procedures'],
  },
  actionItems: {
    name: 'Action Items Only',
    description: 'Focus on tasks requiring attention',
    includes: ['Action Items', 'Important Notes'],
  },
};

export { type EODData, type PaymentInsight, type BAMCycleData };
