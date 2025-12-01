// src/services/paymentInsights.ts
// Generate actionable insights from payment data

export interface PaymentInsight {
  id: string;
  type: 'positive' | 'warning' | 'info' | 'critical';
  icon: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface PaymentData {
  todaysPayments: number;
  weeklyPayments: number;
  monthlyPayments: number;
  insurancePayments: number;
  patientPayments: number;
  pendingDeposits: number;
  unappliedCredits: number;
  refundsPending: number;
}

interface EODMetrics {
  mtdProduction: number;
  mtdCollected: number;
  mtdCollectionRate: number;
  paymentsCollected: number;
  insurancePayments: number;
  patientPayments: number;
}

/**
 * Generate actionable insights from payment data
 */
export function generatePaymentInsights(
  paymentsData: PaymentData | null,
  eodData: EODMetrics | null
): PaymentInsight[] {
  if (!paymentsData && !eodData) return [];

  const insights: PaymentInsight[] = [];
  let counter = 0;

  // Helper to create insight
  const createInsight = (
    type: PaymentInsight['type'],
    icon: string,
    title: string,
    message: string,
    priority: PaymentInsight['priority'],
    action?: string
  ): PaymentInsight => ({
    id: `payment-insight-${++counter}`,
    type,
    icon,
    title,
    message,
    priority,
    action
  });

  // Today's Payment Performance
  if (paymentsData && eodData) {
    const todaysPayments = eodData.paymentsCollected || paymentsData.todaysPayments;
    const dailyAverage = paymentsData.monthlyPayments / 30; // Rough estimate

    if (todaysPayments > dailyAverage * 1.5) {
      insights.push(createInsight(
        'positive',
        'TrendingUp',
        'Strong Payment Day',
        `Today's payments of $${todaysPayments.toLocaleString()} are 50% above the daily average. Great collection activity!`,
        'high',
        'Continue follow-up on outstanding accounts'
      ));
    } else if (todaysPayments < dailyAverage * 0.5 && todaysPayments > 0) {
      insights.push(createInsight(
        'warning',
        'AlertCircle',
        'Below Average Collections',
        `Today's payments of $${todaysPayments.toLocaleString()} are below the daily average. Consider ramping up collection efforts.`,
        'high',
        'Review outstanding AR and follow up with patients'
      ));
    } else if (todaysPayments === 0) {
      insights.push(createInsight(
        'critical',
        'XCircle',
        'No Payments Recorded',
        'No payments have been posted today. Verify payment processing is functioning correctly.',
        'high',
        'Check payment gateway and posting procedures'
      ));
    }
  }

  // MTD Collection Rate Analysis
  if (eodData && eodData.mtdCollectionRate > 0) {
    if (eodData.mtdCollectionRate >= 95) {
      insights.push(createInsight(
        'positive',
        'CheckCircle',
        'Excellent Collection Rate',
        `MTD collection rate of ${eodData.mtdCollectionRate}% is excellent. Your revenue cycle is performing optimally.`,
        'low',
        'Maintain current collection practices'
      ));
    } else if (eodData.mtdCollectionRate >= 85) {
      insights.push(createInsight(
        'info',
        'Activity',
        'Good Collection Rate',
        `MTD collection rate of ${eodData.mtdCollectionRate}% is solid. There's opportunity to improve toward 95%+.`,
        'medium',
        'Review denied claims and patient balances'
      ));
    } else if (eodData.mtdCollectionRate < 85) {
      insights.push(createInsight(
        'warning',
        'AlertCircle',
        'Collection Rate Below Target',
        `MTD collection rate of ${eodData.mtdCollectionRate}% needs attention. Focus on improving collections.`,
        'high',
        'Prioritize AR follow-up and claim management'
      ));
    }
  }

  // Insurance vs Patient Payment Mix
  if (paymentsData && paymentsData.insurancePayments > 0 && paymentsData.patientPayments > 0) {
    const totalPayments = paymentsData.insurancePayments + paymentsData.patientPayments;
    const insurancePercent = (paymentsData.insurancePayments / totalPayments) * 100;

    if (insurancePercent > 80) {
      insights.push(createInsight(
        'info',
        'Shield',
        'Insurance-Heavy Payment Mix',
        `${insurancePercent.toFixed(0)}% of current payments are from insurance. Patient collections may need attention.`,
        'medium',
        'Review patient payment plans and collect at time of service'
      ));
    } else if (insurancePercent < 50) {
      insights.push(createInsight(
        'info',
        'Users',
        'Patient-Heavy Payment Mix',
        `${(100 - insurancePercent).toFixed(0)}% of current payments are from patients. Strong point-of-service collections!`,
        'low',
        'Continue collecting copays and patient portions upfront'
      ));
    }
  }

  // Pending Deposits Alert
  if (paymentsData && paymentsData.pendingDeposits > 5000) {
    insights.push(createInsight(
      'warning',
      'Clock',
      'Pending Deposits Need Processing',
      `$${paymentsData.pendingDeposits.toLocaleString()} in pending deposits. Process these to improve cash flow.`,
      'high',
      'Complete batch processing and bank deposits'
    ));
  }

  // Unapplied Credits
  if (paymentsData && paymentsData.unappliedCredits > 3000) {
    insights.push(createInsight(
      'warning',
      'DollarSign',
      'Unapplied Credits Require Attention',
      `$${paymentsData.unappliedCredits.toLocaleString()} in unapplied credits. These should be allocated to patient accounts.`,
      'high',
      'Review and apply credits to correct patient ledgers'
    ));
  } else if (paymentsData && paymentsData.unappliedCredits > 0 && paymentsData.unappliedCredits <= 1000) {
    insights.push(createInsight(
      'positive',
      'CheckCircle',
      'Minimal Unapplied Credits',
      `Only $${paymentsData.unappliedCredits.toLocaleString()} in unapplied credits. Great account management!`,
      'low'
    ));
  }

  // Refunds Pending
  if (paymentsData && paymentsData.refundsPending > 2000) {
    insights.push(createInsight(
      'info',
      'ArrowDownCircle',
      'Refunds Pending Processing',
      `$${paymentsData.refundsPending.toLocaleString()} in pending refunds. Process these promptly to maintain patient trust.`,
      'medium',
      'Review refund queue and process approved refunds'
    ));
  }

  // Weekly Trend Analysis
  if (paymentsData && paymentsData.weeklyPayments > 0 && paymentsData.monthlyPayments > 0) {
    const weeklyAverage = paymentsData.monthlyPayments / 4.33; // Average weeks per month
    const weeklyPerformance = (paymentsData.weeklyPayments / weeklyAverage) * 100;

    if (weeklyPerformance > 110) {
      insights.push(createInsight(
        'positive',
        'TrendingUp',
        'Strong Weekly Performance',
        `This week's payments are ${(weeklyPerformance - 100).toFixed(0)}% above the monthly average. Excellent momentum!`,
        'medium'
      ));
    } else if (weeklyPerformance < 80) {
      insights.push(createInsight(
        'warning',
        'TrendingDown',
        'Weak Weekly Performance',
        `This week's payments are ${(100 - weeklyPerformance).toFixed(0)}% below the monthly average. Increase collection efforts.`,
        'high',
        'Intensify patient and insurance follow-up calls'
      ));
    }
  }

  // MTD Production vs Collection Gap
  if (eodData && eodData.mtdProduction > 0 && eodData.mtdCollected > 0) {
    const gap = eodData.mtdProduction - eodData.mtdCollected;
    const gapPercent = (gap / eodData.mtdProduction) * 100;

    if (gapPercent > 20) {
      insights.push(createInsight(
        'warning',
        'AlertCircle',
        'Growing Collection Gap',
        `Production-to-collection gap of $${gap.toLocaleString()} (${gapPercent.toFixed(0)}%) is widening. Focus on collections.`,
        'high',
        'Accelerate claim submissions and patient AR follow-up'
      ));
    } else if (gapPercent <= 10) {
      insights.push(createInsight(
        'positive',
        'CheckCircle',
        'Tight Collection Cycle',
        `Production-to-collection gap is only ${gapPercent.toFixed(0)}%. Your revenue cycle is efficient!`,
        'low'
      ));
    }
  }

  // Sort by priority (high > medium > low) and return top insights
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return insights
    .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
    .slice(0, 6); // Return top 6 insights
}
