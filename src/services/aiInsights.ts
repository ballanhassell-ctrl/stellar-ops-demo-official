// src/services/aiInsights.ts
// AI-powered insights generation for RCM dashboard

export type InsightType = 'positive' | 'warning' | 'info' | 'critical';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface Insight {
  id: string;
  type: InsightType;
  icon: string;
  title: string;
  message: string;
  priority: InsightPriority;
  action?: string;
  metric?: string;
  timestamp: Date;
}

interface DashboardMetrics {
  bam: {
    currentRevenue: number;
    targetGoal: number;
    practiceGoal: number;
  };
  claims: {
    totalActive: number;
    pending: number;
    denied: number;
    overSixtyDays: number;
  };
  patients: {
    activePatients: number;
  };
  payments: {
    todaysPayments: number;
    weeklyPayments: number;
    monthlyPayments: number;
  };
  financials: {
    collectionRate: number;
    outstandingAR: number;
  };
}

interface NewPatientData {
  perDay: number;
  perWeek: number;
  perMonth: number;
  quarterly: number;
  perWeekGoal: number;
  perMonthGoal: number;
  quarterlyGoal: number;
}

// Thresholds for insight generation
const THRESHOLDS = {
  revenue: {
    aboveGoalPercent: 10,
    belowGoalPercent: 10,
  },
  claims: {
    pendingHigh: 50,
    overSixtyDaysCritical: 5,
    deniedConcern: 10,
  },
  collection: {
    excellent: 95,
    good: 90,
    concern: 85,
  },
  ar: {
    highThreshold: 100000,
    concernThreshold: 150000,
  },
  newPatients: {
    belowGoalPercent: 15,
  },
};

/**
 * Generates AI-powered insights based on current dashboard metrics
 */
export function generateInsights(
  metrics: DashboardMetrics | null,
  newPatientData: NewPatientData | null
): Insight[] {
  if (!metrics) return [];

  const insights: Insight[] = [];
  let insightCounter = 0;

  const createInsight = (
    type: InsightType,
    icon: string,
    title: string,
    message: string,
    priority: InsightPriority,
    action?: string,
    metric?: string
  ): Insight => ({
    id: `insight-${insightCounter++}-${Date.now()}`,
    type,
    icon,
    title,
    message,
    priority,
    action,
    metric,
    timestamp: new Date(),
  });

  // ============================================
  // REVENUE ANALYSIS
  // ============================================
  const revenueVsTarget = metrics.bam.currentRevenue - metrics.bam.targetGoal;
  const revenuePercent = ((revenueVsTarget / metrics.bam.targetGoal) * 100).toFixed(1);

  if (revenueVsTarget > 0 && parseFloat(revenuePercent) >= THRESHOLDS.revenue.aboveGoalPercent) {
    insights.push(
      createInsight(
        'positive',
        '🎯',
        'Revenue Above Target',
        `Revenue is ${revenuePercent}% above goal ($${metrics.bam.currentRevenue.toLocaleString()} vs $${metrics.bam.targetGoal.toLocaleString()})`,
        'high',
        undefined,
        'bam_current_revenue'
      )
    );
  } else if (revenueVsTarget < 0 && Math.abs(parseFloat(revenuePercent)) >= THRESHOLDS.revenue.belowGoalPercent) {
    insights.push(
      createInsight(
        'warning',
        '⚠️',
        'Revenue Below Target',
        `Revenue is ${Math.abs(parseFloat(revenuePercent))}% below goal. Current: $${metrics.bam.currentRevenue.toLocaleString()}`,
        'high',
        'Review revenue cycle processes',
        'bam_current_revenue'
      )
    );
  }

  const revenueVsPractice = metrics.bam.currentRevenue - metrics.bam.practiceGoal;
  const practicePercent = ((revenueVsPractice / metrics.bam.practiceGoal) * 100).toFixed(1);

  if (metrics.bam.currentRevenue >= metrics.bam.practiceGoal) {
    insights.push(
      createInsight(
        'positive',
        '🏆',
        'Practice Goal Achieved',
        `Hit practice goal! ${practicePercent}% of $${metrics.bam.practiceGoal.toLocaleString()} target`,
        'high',
        undefined,
        'practice_goal'
      )
    );
  }

  // ============================================
  // CLAIMS ANALYSIS
  // ============================================
  if (metrics.claims.overSixtyDays >= THRESHOLDS.claims.overSixtyDaysCritical) {
    insights.push(
      createInsight(
        'critical',
        '🔴',
        'Aging Claims Need Attention',
        `${metrics.claims.overSixtyDays} claims are over 60 days old`,
        'high',
        'Review and follow up on aging claims immediately',
        'claims_over_sixty_days'
      )
    );
  } else if (metrics.claims.overSixtyDays === 0 && metrics.claims.totalActive > 0) {
    insights.push(
      createInsight(
        'positive',
        '✅',
        'Excellent Claims Management',
        'Zero claims over 60 days - outstanding performance!',
        'medium',
        undefined,
        'claims_over_sixty_days'
      )
    );
  }

  if (metrics.claims.pending >= THRESHOLDS.claims.pendingHigh) {
    insights.push(
      createInsight(
        'warning',
        '📋',
        'High Pending Claims Volume',
        `${metrics.claims.pending} claims pending - consider prioritizing review`,
        'medium',
        'Review pending claims queue',
        'claims_pending'
      )
    );
  }

  if (metrics.claims.denied >= THRESHOLDS.claims.deniedConcern) {
    insights.push(
      createInsight(
        'warning',
        '❌',
        'Denied Claims Requiring Action',
        `${metrics.claims.denied} denied claims need follow-up or appeals`,
        'high',
        'Review denial reasons and initiate appeals',
        'claims_denied'
      )
    );
  }

  // ============================================
  // COLLECTION RATE ANALYSIS
  // ============================================
  const collectionRate = metrics.financials.collectionRate;

  if (collectionRate >= THRESHOLDS.collection.excellent) {
    insights.push(
      createInsight(
        'positive',
        '💰',
        'Outstanding Collection Rate',
        `Collection rate at ${collectionRate.toFixed(1)}% - excellent performance!`,
        'medium',
        undefined,
        'collection_rate'
      )
    );
  } else if (collectionRate >= THRESHOLDS.collection.good) {
    insights.push(
      createInsight(
        'info',
        '💵',
        'Good Collection Performance',
        `Collection rate at ${collectionRate.toFixed(1)}% - solid performance`,
        'low',
        undefined,
        'collection_rate'
      )
    );
  } else if (collectionRate < THRESHOLDS.collection.concern) {
    insights.push(
      createInsight(
        'warning',
        '⚠️',
        'Collection Rate Needs Improvement',
        `Collection rate at ${collectionRate.toFixed(1)}% - below target of ${THRESHOLDS.collection.concern}%`,
        'high',
        'Review collection processes and follow-up procedures',
        'collection_rate'
      )
    );
  }

  // ============================================
  // A/R ANALYSIS
  // ============================================
  if (metrics.financials.outstandingAR >= THRESHOLDS.ar.concernThreshold) {
    insights.push(
      createInsight(
        'critical',
        '🔴',
        'High Outstanding A/R',
        `Outstanding A/R at $${metrics.financials.outstandingAR.toLocaleString()} - immediate attention required`,
        'high',
        'Review A/R aging buckets and initiate collection efforts',
        'outstanding_ar'
      )
    );
  } else if (metrics.financials.outstandingAR >= THRESHOLDS.ar.highThreshold) {
    insights.push(
      createInsight(
        'warning',
        '📊',
        'Monitor Outstanding A/R',
        `Outstanding A/R at $${metrics.financials.outstandingAR.toLocaleString()} - keep monitoring`,
        'medium',
        'Review aging buckets regularly',
        'outstanding_ar'
      )
    );
  }

  // ============================================
  // NEW PATIENT ANALYSIS
  // ============================================
  if (newPatientData) {
    const weeklyProgress = (newPatientData.perWeek / newPatientData.perWeekGoal) * 100;
    const monthlyProgress = (newPatientData.perMonth / newPatientData.perMonthGoal) * 100;

    if (weeklyProgress >= 100) {
      insights.push(
        createInsight(
          'positive',
          '🎉',
          'Weekly New Patient Goal Met',
          `${newPatientData.perWeek} new patients this week - goal achieved!`,
          'medium',
          undefined,
          'new_pts_per_week'
        )
      );
    } else if (weeklyProgress < (100 - THRESHOLDS.newPatients.belowGoalPercent)) {
      insights.push(
        createInsight(
          'info',
          '📈',
          'New Patient Acquisition',
          `${newPatientData.perWeek} of ${newPatientData.perWeekGoal} weekly goal (${weeklyProgress.toFixed(0)}%)`,
          'low',
          'Review marketing and referral strategies',
          'new_pts_per_week'
        )
      );
    }

    if (monthlyProgress >= 100) {
      insights.push(
        createInsight(
          'positive',
          '🌟',
          'Monthly New Patient Goal Exceeded',
          `${newPatientData.perMonth} new patients this month - outstanding!`,
          'high',
          undefined,
          'new_pts_per_month'
        )
      );
    }

    if (newPatientData.perDay > 0) {
      insights.push(
        createInsight(
          'info',
          '👥',
          'New Patient Today',
          `${newPatientData.perDay} new patient${newPatientData.perDay > 1 ? 's' : ''} added today`,
          'low',
          undefined,
          'eod_new_patients'
        )
      );
    }
  }

  // ============================================
  // PAYMENT ANALYSIS
  // ============================================
  if (metrics.payments.todaysPayments > 0) {
    insights.push(
      createInsight(
        'info',
        '💳',
        'Daily Payment Activity',
        `$${metrics.payments.todaysPayments.toLocaleString()} collected today`,
        'low',
        undefined,
        'todays_payments'
      )
    );
  }

  const weeklyAvg = metrics.payments.weeklyPayments / 7;
  if (metrics.payments.todaysPayments > weeklyAvg * 1.5) {
    insights.push(
      createInsight(
        'positive',
        '💸',
        'High Payment Day',
        `Today's payments (${metrics.payments.todaysPayments.toLocaleString()}) are ${((metrics.payments.todaysPayments / weeklyAvg) * 100 - 100).toFixed(0)}% above weekly average`,
        'medium',
        undefined,
        'todays_payments'
      )
    );
  }

  // ============================================
  // PATIENT COUNT ANALYSIS
  // ============================================
  if (metrics.patients.activePatients > 0) {
    insights.push(
      createInsight(
        'info',
        '👨‍⚕️',
        'Active Patient Base',
        `${metrics.patients.activePatients.toLocaleString()} active patients in practice`,
        'low',
        undefined,
        'active_patients'
      )
    );
  }

  // Sort insights by priority (high -> medium -> low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights;
}

/**
 * Filters insights by type
 */
export function filterInsightsByType(insights: Insight[], type: InsightType): Insight[] {
  return insights.filter(insight => insight.type === type);
}

/**
 * Gets count of insights by type
 */
export function getInsightCounts(insights: Insight[]): Record<InsightType, number> {
  return {
    positive: insights.filter(i => i.type === 'positive').length,
    warning: insights.filter(i => i.type === 'warning').length,
    info: insights.filter(i => i.type === 'info').length,
    critical: insights.filter(i => i.type === 'critical').length,
  };
}
