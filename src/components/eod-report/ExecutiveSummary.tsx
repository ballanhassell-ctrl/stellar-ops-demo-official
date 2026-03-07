// src/components/eod-report/ExecutiveSummary.tsx
// Executive Summary section following the CQC (Context, Questions, Conclusions) pattern
// This is the new "executive intelligence" layer that transforms raw metrics into narrative

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import type { EODData } from '../../hooks/useEODMetrics';
import type { DashboardData, PatientARMetricsData } from './types';

interface ExecutiveSummaryProps {
  isDayMode: boolean;
  eodData: EODData;
  dashboardData: DashboardData;
  patientARMetrics: PatientARMetricsData | null;
}

interface SummaryInsight {
  label: string;
  status: 'positive' | 'warning' | 'critical' | 'neutral';
  value: string;
  detail: string;
}

function generateExecutiveInsights(
  eodData: EODData,
  dashboardData: DashboardData,
  patientARMetrics: PatientARMetricsData | null
): SummaryInsight[] {
  const insights: SummaryInsight[] = [];

  // Production vs Goal
  const prodPct = eodData.dailyProductionGoal > 0
    ? (eodData.dailyProduction / eodData.dailyProductionGoal) * 100
    : 0;
  insights.push({
    label: 'Daily Production',
    status: prodPct >= 100 ? 'positive' : prodPct >= 80 ? 'neutral' : 'warning',
    value: `${prodPct.toFixed(0)}% of goal`,
    detail: prodPct >= 100
      ? `Exceeded target by $${(eodData.dailyProduction - eodData.dailyProductionGoal).toLocaleString()}`
      : `$${(eodData.dailyProductionGoal - eodData.dailyProduction).toLocaleString()} below target`,
  });

  // Collection Rate
  const collRate = eodData.collectionRate;
  insights.push({
    label: 'Collection Efficiency',
    status: collRate >= 95 ? 'positive' : collRate >= 80 ? 'neutral' : 'warning',
    value: `${collRate}%`,
    detail: collRate >= 95
      ? 'Strong collections performance today'
      : `$${eodData.productionCollectedDifference.toLocaleString()} uncollected production`,
  });

  // BAM Cycle Progress
  const bamPct = dashboardData.bamTargetGoal > 0
    ? (dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100
    : 0;
  const daysLeft = dashboardData.bamDaysRemaining;
  insights.push({
    label: 'BAM Cycle Trajectory',
    status: bamPct >= 80 ? 'positive' : bamPct >= 50 ? 'neutral' : 'warning',
    value: `${bamPct.toFixed(0)}% with ${daysLeft} days left`,
    detail: bamPct >= 100
      ? 'BAM target achieved for this cycle'
      : `$${(dashboardData.bamTargetGoal - dashboardData.bamCurrentRevenue).toLocaleString()} remaining to hit target`,
  });

  // Action Items requiring attention
  const totalActions = eodData.actionItems.deniedClaimsToResubmit +
    eodData.actionItems.missedAppointments +
    eodData.actionItems.patientsDueForRecall;
  insights.push({
    label: 'Pending Action Items',
    status: totalActions === 0 ? 'positive' : totalActions <= 5 ? 'neutral' : 'warning',
    value: `${totalActions} items`,
    detail: totalActions === 0
      ? 'All action items resolved'
      : `${eodData.actionItems.deniedClaimsToResubmit} denied claims, ${eodData.actionItems.missedAppointments} missed appts`,
  });

  // Patient A/R Health
  if (patientARMetrics) {
    const aging90Plus = patientARMetrics.agingBuckets['90+'];
    insights.push({
      label: 'A/R Health (90+ Days)',
      status: aging90Plus === 0 ? 'positive' : aging90Plus <= 10 ? 'neutral' : 'critical',
      value: `${aging90Plus} accounts`,
      detail: `$${patientARMetrics.totalActiveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} total active A/R`,
    });
  }

  return insights;
}

const statusConfig = {
  positive: {
    icon: CheckCircle,
    bg: (d: boolean) => d ? 'bg-emerald-50/80' : 'bg-emerald-900/20',
    border: (d: boolean) => d ? 'border-emerald-200/60' : 'border-emerald-500/30',
    iconColor: (d: boolean) => d ? 'text-emerald-600' : 'text-emerald-400',
    labelColor: (d: boolean) => d ? 'text-emerald-800' : 'text-emerald-300',
    dot: 'bg-emerald-500',
  },
  neutral: {
    icon: Target,
    bg: (d: boolean) => d ? 'bg-blue-50/80' : 'bg-blue-900/20',
    border: (d: boolean) => d ? 'border-blue-200/60' : 'border-blue-500/30',
    iconColor: (d: boolean) => d ? 'text-blue-600' : 'text-blue-400',
    labelColor: (d: boolean) => d ? 'text-blue-800' : 'text-blue-300',
    dot: 'bg-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: (d: boolean) => d ? 'bg-amber-50/80' : 'bg-amber-900/20',
    border: (d: boolean) => d ? 'border-amber-200/60' : 'border-amber-500/30',
    iconColor: (d: boolean) => d ? 'text-amber-600' : 'text-amber-400',
    labelColor: (d: boolean) => d ? 'text-amber-800' : 'text-amber-300',
    dot: 'bg-amber-500',
  },
  critical: {
    icon: TrendingDown,
    bg: (d: boolean) => d ? 'bg-red-50/80' : 'bg-red-900/20',
    border: (d: boolean) => d ? 'border-red-200/60' : 'border-red-500/30',
    iconColor: (d: boolean) => d ? 'text-red-600' : 'text-red-400',
    labelColor: (d: boolean) => d ? 'text-red-800' : 'text-red-300',
    dot: 'bg-red-500',
  },
};

export default function ExecutiveSummary({
  isDayMode,
  eodData,
  dashboardData,
  patientARMetrics,
}: ExecutiveSummaryProps) {
  const insights = generateExecutiveInsights(eodData, dashboardData, patientARMetrics);

  // Calculate overall health
  const positiveCount = insights.filter((i) => i.status === 'positive').length;
  const criticalCount = insights.filter((i) => i.status === 'critical').length;
  const warningCount = insights.filter((i) => i.status === 'warning').length;

  let overallStatus: 'positive' | 'neutral' | 'warning' | 'critical' = 'neutral';
  if (criticalCount > 0) overallStatus = 'critical';
  else if (warningCount > 1) overallStatus = 'warning';
  else if (positiveCount >= insights.length - 1) overallStatus = 'positive';

  const overallLabel = {
    positive: 'Strong Day',
    neutral: 'On Track',
    warning: 'Needs Attention',
    critical: 'Action Required',
  }[overallStatus];

  const overallIcon = {
    positive: TrendingUp,
    neutral: Target,
    warning: AlertTriangle,
    critical: TrendingDown,
  }[overallStatus];
  const OverallIcon = overallIcon;

  const cfg = statusConfig[overallStatus];

  return (
    <div
      className={`rounded-2xl p-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}
    >
      {/* Section Title + Overall Status Badge */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
          Executive Summary
        </h3>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cfg.bg(isDayMode)} border ${cfg.border(isDayMode)}`}
        >
          <OverallIcon className={`w-4 h-4 ${cfg.iconColor(isDayMode)}`} />
          <span className={`text-sm font-semibold ${cfg.labelColor(isDayMode)}`}>
            {overallLabel}
          </span>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight) => {
          const s = statusConfig[insight.status];
          const Icon = s.icon;
          return (
            <div
              key={insight.label}
              className={`${s.bg(isDayMode)} border ${s.border(isDayMode)} rounded-xl p-4 relative overflow-hidden group`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${s.dot} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={`text-xs font-bold uppercase tracking-wide ${s.labelColor(isDayMode)}`}>
                      {insight.label}
                    </p>
                    <Icon className={`w-4 h-4 ${s.iconColor(isDayMode)} flex-shrink-0`} />
                  </div>
                  <p className={`text-lg font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                    {insight.value}
                  </p>
                  <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {insight.detail}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
