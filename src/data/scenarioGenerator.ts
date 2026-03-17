/**
 * Scenario-Based Sample Data Generator
 *
 * Generates sample data variations for different demo scenarios.
 * Each scenario modifies the base sample data to emphasize a specific business situation.
 *
 * Usage:
 *   import { applyScenario, ScenarioType } from '../data/scenarioGenerator';
 *   const scenarioData = applyScenario('highProduction');
 *
 * Available Scenarios:
 *   - 'default'           → Base sample data (no modifications)
 *   - 'highProduction'    → Exceptional production day with high provider output
 *   - 'manyPayments'      → Heavy payment posting day with lots of deposits
 *   - 'insuranceHeavy'    → Many open insurance issues and denied claims
 *   - 'slowDay'           → Lower-than-usual production, missed appointments
 *   - 'monthEnd'          → Month-end reporting with strong MTD numbers
 *
 * ALL NAMES ARE FICTIONAL.
 */

import {
  sampleMetricsData,
  sampleEODData,
  sampleProviderMetrics,
  sampleClaims,
  sampleInsuranceIssues,
  sampleInsuranceARClaims,
  sampleWeeklyScorecardData,
  sampleAppointments,
  samplePatientCredits,
  sampleEFTReconciliationEntries,
} from './sampleData';
import { getLocalDateString } from '../utils/dateUtils';

// =====================================================
// TYPES
// =====================================================

export type ScenarioType =
  | 'default'
  | 'highProduction'
  | 'manyPayments'
  | 'insuranceHeavy'
  | 'slowDay'
  | 'monthEnd';

export interface ScenarioOverrides {
  metricsData: typeof sampleMetricsData;
  eodData: typeof sampleEODData;
  providerMetrics: typeof sampleProviderMetrics;
  claims: typeof sampleClaims;
  insuranceIssues: typeof sampleInsuranceIssues;
  insuranceARClaims: typeof sampleInsuranceARClaims;
  weeklyScorecardData: typeof sampleWeeklyScorecardData;
  appointments: typeof sampleAppointments;
  patientCredits: typeof samplePatientCredits;
  eftEntries: typeof sampleEFTReconciliationEntries;
}

export interface ScenarioInfo {
  name: string;
  description: string;
  highlights: string[];
}

// =====================================================
// SCENARIO METADATA
// =====================================================

export const scenarioInfo: Record<ScenarioType, ScenarioInfo> = {
  default: {
    name: 'Default Day',
    description: 'Standard business day with typical volume across all areas.',
    highlights: ['Balanced production', 'Normal claim volume', 'Typical patient flow'],
  },
  highProduction: {
    name: 'High Production Day',
    description: 'Exceptional production day — multiple crowns, implants, and high-value procedures.',
    highlights: [
      'Combined production over $28K',
      'Dr. Patel: $8,200 (2 implants + crown)',
      'Dr. Novak: $6,500 (3 crowns)',
      'Dr. Chen: $7,100 (implant + bridge)',
      'Hygiene team: $6,800 combined',
      '38 patients seen',
    ],
  },
  manyPayments: {
    name: 'Heavy Payment Day',
    description: 'Bulk payment posting day — insurance checks arrived, EFTs processed, patient payments collected.',
    highlights: [
      'Total payments: $32,450',
      'Insurance payments: $22,800',
      'Patient payments: $9,650',
      '15+ EFT deposits processed',
      'Multiple VCC payments closed',
    ],
  },
  insuranceHeavy: {
    name: 'Insurance Issues Day',
    description: 'High volume of insurance denials, appeals, and follow-up items requiring attention.',
    highlights: [
      '18 open insurance issues',
      '8 denied claims needing appeal',
      '5 claims awaiting CSD review',
      '$42K+ in outstanding insurance A/R',
      'Multiple pre-auth expirations',
    ],
  },
  slowDay: {
    name: 'Slow Day',
    description: 'Below-average production with cancellations and no-shows.',
    highlights: [
      'Combined production: $9,200',
      '5 cancellations, 3 no-shows',
      '18 patients seen (vs 32 avg)',
      'Collection rate: 82%',
      'Below daily production goal',
    ],
  },
  monthEnd: {
    name: 'Month-End Close',
    description: 'Last day of the month with strong MTD numbers and year-end trending.',
    highlights: [
      'MTD production: $385,000',
      'MTD collection rate: 96.2%',
      '28 new patients this month',
      'Production goal exceeded by 8%',
      'A/R aging improved 12% MoM',
    ],
  },
};

// =====================================================
// DEEP CLONE HELPER
// =====================================================

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// =====================================================
// SCENARIO GENERATORS
// =====================================================

function generateHighProduction(): Partial<ScenarioOverrides> {
  const metrics = deepClone(sampleMetricsData);
  const eod = deepClone(sampleEODData);
  const providers = deepClone(sampleProviderMetrics);

  // Boost provider production significantly
  metrics.providers = {
    drPatel: 8200.00,
    drNovak: 6500.00,
    drChen: 7100.00,
    doctorTotal: 21800.00,
    nadia: 2450.00,
    lily: 2200.00,
    maya: 2150.00,
    tempHyg: 0.00,
    hygienistTotal: 6800.00,
    combinedTotal: 28600.00,
  };

  // Update provider metrics to match
  const providerMap: Record<string, number> = {
    provider_dr_patel: 8200.00,
    provider_dr_novak: 6500.00,
    provider_dr_chen: 7100.00,
    provider_nadia: 2450.00,
    provider_lily: 2200.00,
    provider_maya: 2150.00,
    provider_temp_hyg: 0.00,
  };
  providers.forEach(p => {
    if (providerMap[p.field_key] !== undefined) {
      p.value = providerMap[p.field_key];
    }
  });

  // EOD reflects high production
  eod.dailyProduction = 28600.00;
  eod.dailyProductionGoal = 19991.00;
  eod.paymentsCollected = 24800.00;
  eod.collectionRate = 86.71;
  eod.insurancePayments = 16500.00;
  eod.patientPayments = 8300.00;
  eod.productionCollectedDifference = -3800.00;
  eod.patientsSeenToday = 38;
  eod.newPatients = 6;
  eod.proceduresCompleted = 62;
  eod.topProcedures = [
    { code: 'D6010', description: 'Implant Placement', count: 3, revenue: 7500.00 },
    { code: 'D2740', description: 'Crown - PFM', count: 6, revenue: 7200.00 },
    { code: 'D6750', description: 'Crown - Implant Abutment', count: 3, revenue: 4050.00 },
    { code: 'D1110', description: 'Prophylaxis - Adult', count: 14, revenue: 2520.00 },
    { code: 'D2391', description: 'Composite - 1 Surface', count: 10, revenue: 1850.00 },
    { code: 'D2950', description: 'Core Buildup', count: 5, revenue: 1475.00 },
    { code: 'D0150', description: 'Comprehensive Exam', count: 8, revenue: 760.00 },
  ];

  // Dashboard metrics
  metrics.dashboard.bamCurrentRevenue = 215000.00;
  metrics.dashboard.collectionRate = 96.8;

  return { metricsData: metrics, eodData: eod, providerMetrics: providers };
}

function generateManyPayments(): Partial<ScenarioOverrides> {
  const metrics = deepClone(sampleMetricsData);
  const eod = deepClone(sampleEODData);
  const credits = deepClone(samplePatientCredits);
  const eftEntries = deepClone(sampleEFTReconciliationEntries);

  // Heavy payment day
  metrics.payments = {
    todaysPayments: 32450.00,
    weeklyPayments: 68900.00,
    monthlyPayments: 245300.00,
    pendingDeposits: 4200.00,
    insurancePayments: 148500.00,
    patientPayments: 96800.00,
    unappliedCredits: 5450.00,
    refundsPending: 850.00,
  };

  eod.paymentsCollected = 32450.00;
  eod.collectionRate = 102.3;
  eod.insurancePayments = 22800.00;
  eod.patientPayments = 9650.00;
  eod.unappliedPayments = 5450.00;
  eod.paymentMethods = {
    visa: 3800.00,
    mastercard: 2100.00,
    americanExpress: 1200.00,
    discover: 750.00,
    cherry: 2500.00,
    careCredit: 1800.00,
    weave: 0.00,
    insuranceCheck: 8500.00,
    otherCheck: 3200.00,
    cash: 1100.00,
    eft: 7500.00,
  };

  // Add more EFT entries for the heavy day
  const today = getLocalDateString();
  const extraEFTs = [
    { ...eftEntries[0], id: 'eft-extra-001', insurance_company: 'Delta Dental', payment_amount: 2850.00, payment_date: today, status: 'posted' as const },
    { ...eftEntries[0], id: 'eft-extra-002', insurance_company: 'Cigna', payment_amount: 1920.00, payment_date: today, status: 'posted' as const },
    { ...eftEntries[0], id: 'eft-extra-003', insurance_company: 'MetLife', payment_amount: 3100.00, payment_date: today, status: 'reconciled' as const },
    { ...eftEntries[0], id: 'eft-extra-004', insurance_company: 'Guardian', payment_amount: 875.00, payment_date: today, status: 'pending' as const },
    { ...eftEntries[0], id: 'eft-extra-005', insurance_company: 'UnitedHealthcare', payment_amount: 4200.00, payment_date: today, status: 'posted' as const },
  ];

  // Add more patient credits
  const extraCredits = [
    { ...credits[0], id: 'pc-extra-001', patient_name: 'Rivera, Carmen', credit_amount: 425.00, credit_date: today, reason: 'Insurance overpayment', status: 'unapplied' as const },
    { ...credits[0], id: 'pc-extra-002', patient_name: 'Chang, David', credit_amount: 180.00, credit_date: today, reason: 'Double payment', status: 'unapplied' as const },
    { ...credits[0], id: 'pc-extra-003', patient_name: 'Morrison, James', credit_amount: 650.00, credit_date: today, reason: 'Pre-payment for treatment', status: 'unapplied' as const },
  ];

  return {
    metricsData: metrics,
    eodData: eod,
    patientCredits: [...credits, ...extraCredits],
    eftEntries: [...eftEntries, ...extraEFTs],
  };
}

function generateInsuranceHeavy(): Partial<ScenarioOverrides> {
  const metrics = deepClone(sampleMetricsData);
  const eod = deepClone(sampleEODData);
  const claims = deepClone(sampleClaims);
  const issues = deepClone(sampleInsuranceIssues);
  const arClaims = deepClone(sampleInsuranceARClaims);

  // Inflate insurance issue counts
  metrics.claims = {
    totalActive: 92,
    pending: 8,
    denied: 12,
    overSixtyDays: 28,
    arAging: {
      zeroToThirty: { amount: 18500.00, count: 22 },
      thirtyOneToSixty: { amount: 22800.00, count: 28 },
      sixtyOneToNinety: { amount: 14200.00, count: 18 },
      ninetyPlus: { amount: 24500.00, count: 24 },
    },
  };

  metrics.dashboard.outstandingAR = 80000.00;
  metrics.dashboard.activeClaims = 92;

  // Add more denied claims
  const deniedStatuses: Array<typeof claims[0]['status']> = ['Denied', 'Denied/2nd Appeal'];

  // Generate additional denied claims
  const additionalDenied = Array.from({ length: 5 }, (_, i) => ({
    ...claims[0],
    id: `extra-denied-${i + 1}`,
    patient_name: ['Rivera, Carmen', 'Thornton, Elaine', 'Chang, David', 'Morrison, James', 'Patel, Sanjay'][i],
    patient_id: `P0${41 + i}`,
    insurance_company: ['Aetna', 'Delta Dental', 'Cigna', 'MetLife', 'Guardian'][i],
    claim_amount: [2450, 1875, 3200, 980, 4100][i],
    status: deniedStatuses[i % 2],
    aging_days: [45, 62, 78, 95, 110][i],
    outstanding: [2450, 1875, 3200, 980, 4100][i],
    collected: 0,
    structured_notes: [{
      text: `Denied - ${['Missing x-rays', 'Duplicate claim', 'Pre-auth required', 'Out of network', 'Timely filing'][i]}`,
      source: 'stellar' as const,
      author: 'System',
      created_at: new Date().toISOString(),
    }],
    audit_trail: [],
  }));

  // Generate additional insurance issues
  const additionalIssues = Array.from({ length: 8 }, (_, i) => ({
    ...issues[0],
    id: `extra-issue-${i + 1}`,
    patient_name: ['Bennett, Laura', 'Santos, Miguel', 'Park, Ji-Yeon', 'Williams, Tasha', 'Cohen, Rebecca', 'Okoro, Chidi', 'Reeves, Martin', 'Dunn, Catherine'][i],
    insurance_company: ['Aetna', 'Cigna', 'Delta Dental', 'MetLife', 'Guardian', 'UHC', 'BCBS', 'Humana'][i],
    issue_type: (['Needs Perio Chart', 'Invalid Tooth Code for Carrier', 'Pre-Auth Required', 'Needs Narrative', 'Need Provider Change', 'Invalid Tooth/Surface Code', 'Invalid Number of Surfaces', 'Other'] as const)[i],
    status: 'Open' as const,
    priority: (['high', 'medium', 'high', 'low', 'high', 'medium', 'low', 'high'] as const)[i],
    amount_at_risk: [3200, 1500, 4800, 850, 2100, 1950, 720, 5600][i],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // EOD action items reflect the insurance chaos
  eod.actionItems = {
    claimsToSubmit: 8,
    deniedClaimsToResubmit: 12,
    preAuthsApproved: 1,
    accountsNeedingFollowUp: 28,
    missedAppointments: 2,
    patientsDueForRecall: 15,
  };

  return {
    metricsData: metrics,
    eodData: eod,
    claims: [...claims, ...additionalDenied],
    insuranceIssues: [...issues, ...additionalIssues],
    insuranceARClaims: arClaims,
  };
}

function generateSlowDay(): Partial<ScenarioOverrides> {
  const metrics = deepClone(sampleMetricsData);
  const eod = deepClone(sampleEODData);
  const providers = deepClone(sampleProviderMetrics);
  const appointments = deepClone(sampleAppointments);

  // Low production numbers
  metrics.providers = {
    drPatel: 2100.00,
    drNovak: 1800.00,
    drChen: 1950.00,
    doctorTotal: 5850.00,
    nadia: 1200.00,
    lily: 950.00,
    maya: 1200.00,
    tempHyg: 0.00,
    hygienistTotal: 3350.00,
    combinedTotal: 9200.00,
  };

  const providerMap: Record<string, number> = {
    provider_dr_patel: 2100.00,
    provider_dr_novak: 1800.00,
    provider_dr_chen: 1950.00,
    provider_nadia: 1200.00,
    provider_lily: 950.00,
    provider_maya: 1200.00,
    provider_temp_hyg: 0.00,
  };
  providers.forEach(p => {
    if (providerMap[p.field_key] !== undefined) {
      p.value = providerMap[p.field_key];
    }
  });

  eod.dailyProduction = 9200.00;
  eod.dailyProductionGoal = 19991.00;
  eod.paymentsCollected = 7544.00;
  eod.collectionRate = 82.0;
  eod.insurancePayments = 4800.00;
  eod.patientPayments = 2744.00;
  eod.productionCollectedDifference = -1656.00;
  eod.patientsSeenToday = 18;
  eod.newPatients = 1;
  eod.proceduresCompleted = 22;

  eod.actionItems = {
    ...eod.actionItems,
    missedAppointments: 8,
    claimsToSubmit: 2,
  };

  eod.topProcedures = [
    { code: 'D1110', description: 'Prophylaxis - Adult', count: 6, revenue: 1080.00 },
    { code: 'D2391', description: 'Composite - 1 Surface', count: 4, revenue: 740.00 },
    { code: 'D0150', description: 'Comprehensive Exam', count: 3, revenue: 285.00 },
    { code: 'D2740', description: 'Crown - PFM', count: 2, revenue: 2400.00 },
    { code: 'D0274', description: 'Bitewings - 4 Films', count: 5, revenue: 350.00 },
  ];

  // Add cancelled/no-show appointments
  const today = getLocalDateString();
  const slowDayAppointments = [
    ...appointments,
    { id: 100, patient_id: 'P005', appointment_date: today, provider_name: 'Dr. Patel', production_amount: 1200.00, status: 'cancelled' as const, procedure_codes: 'D2740' },
    { id: 101, patient_id: 'P010', appointment_date: today, provider_name: 'Dr. Novak', production_amount: 850.00, status: 'cancelled' as const, procedure_codes: 'D2391,D2392' },
    { id: 102, patient_id: 'P015', appointment_date: today, provider_name: 'Dr. Chen', production_amount: 2500.00, status: 'cancelled' as const, procedure_codes: 'D6010' },
    { id: 103, patient_id: 'P020', appointment_date: today, provider_name: 'Dr. Patel', production_amount: 950.00, status: 'no_show' as const, procedure_codes: 'D2740' },
    { id: 104, patient_id: 'P025', appointment_date: today, provider_name: 'Dr. Novak', production_amount: 380.00, status: 'no_show' as const, procedure_codes: 'D2391' },
    { id: 105, patient_id: 'P030', appointment_date: today, provider_name: 'Dr. Chen', production_amount: 1500.00, status: 'no_show' as const, procedure_codes: 'D2740,D2950' },
  ];

  metrics.dashboard.collectionRate = 82.0;
  metrics.scorecard.showRateDr = 78.5;
  metrics.scorecard.showRateHyg = 72.0;

  return {
    metricsData: metrics,
    eodData: eod,
    providerMetrics: providers,
    appointments: slowDayAppointments,
  };
}

function generateMonthEnd(): Partial<ScenarioOverrides> {
  const metrics = deepClone(sampleMetricsData);
  const eod = deepClone(sampleEODData);
  const scorecard = deepClone(sampleWeeklyScorecardData);

  // Strong MTD numbers
  eod.monthToDateSummary = {
    production: 385000.00,
    productionGoal: 355000.00,
    collected: 370320.00,
    collectionRate: 96.2,
    newPatients: 28,
  };

  metrics.dashboard = {
    bamCurrentRevenue: 385000.00,
    bamPreviousRevenue: 342000.00,
    bamTargetGoal: 355000.00,
    practiceGoal: 400000.00,
    collectionRate: 96.2,
    activePatients: 162,
    activeClaims: 68,
    outstandingAR: 44200.00,
  };

  metrics.payments = {
    ...metrics.payments,
    monthlyPayments: 370320.00,
    weeklyPayments: 52400.00,
  };

  metrics.advanced = {
    ...metrics.advanced,
    revenueGrowthRate: 12.6,
    grossProfitMargin: 65.8,
    operatingProfitMargin: 31.2,
  };

  // Trending up scorecard
  scorecard[scorecard.length - 1] = {
    ...scorecard[scorecard.length - 1],
    showRateDr: 95.8,
    showRateHyg: 91.2,
    txPresented: 38500,
    txAcceptPct: 82.1,
    txAccepted: 31609,
    collectionPct: 96.2,
    fiveStars: 6,
    newPts: 7,
  };

  return {
    metricsData: metrics,
    eodData: eod,
    weeklyScorecardData: scorecard,
  };
}

// =====================================================
// MAIN ENTRY POINT
// =====================================================

/**
 * Apply a scenario to the base sample data.
 * Returns a full ScenarioOverrides object with the base data
 * merged with scenario-specific modifications.
 */
export function applyScenario(scenario: ScenarioType): ScenarioOverrides {
  const base: ScenarioOverrides = {
    metricsData: deepClone(sampleMetricsData),
    eodData: deepClone(sampleEODData),
    providerMetrics: deepClone(sampleProviderMetrics),
    claims: deepClone(sampleClaims),
    insuranceIssues: deepClone(sampleInsuranceIssues),
    insuranceARClaims: deepClone(sampleInsuranceARClaims),
    weeklyScorecardData: deepClone(sampleWeeklyScorecardData),
    appointments: deepClone(sampleAppointments),
    patientCredits: deepClone(samplePatientCredits),
    eftEntries: deepClone(sampleEFTReconciliationEntries),
  };

  if (scenario === 'default') return base;

  const generators: Record<Exclude<ScenarioType, 'default'>, () => Partial<ScenarioOverrides>> = {
    highProduction: generateHighProduction,
    manyPayments: generateManyPayments,
    insuranceHeavy: generateInsuranceHeavy,
    slowDay: generateSlowDay,
    monthEnd: generateMonthEnd,
  };

  const overrides = generators[scenario]();
  return { ...base, ...overrides };
}

/**
 * Get list of all available scenarios with their descriptions.
 */
export function getAvailableScenarios(): Array<{ type: ScenarioType; info: ScenarioInfo }> {
  return (Object.entries(scenarioInfo) as Array<[ScenarioType, ScenarioInfo]>).map(
    ([type, info]) => ({ type, info })
  );
}
