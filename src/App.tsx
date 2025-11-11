import { useState } from 'react';
import {
  LayoutDashboard, FileText, DollarSign, Users,
  Shield, List, Award, Search, AlertCircle, Clock, XCircle, CheckCircle,
  TrendingUp, Activity, CreditCard, ArrowDownCircle, ArrowUpCircle, UserCheck, ClipboardCheck,
  Calendar, Send, Printer, Download, X, Mail, ExternalLink, Repeat
} from 'lucide-react';

// BAM Cycle Helper Functions
const officeClosureDays = [
  // 2025 Office Closure Days
  new Date('2025-01-01'), // New Year's Day
  new Date('2025-05-26'), // Memorial Day
  new Date('2025-07-04'), // Independence Day
  new Date('2025-09-01'), // Labor Day
  new Date('2025-11-27'), // Thanksgiving
  new Date('2025-11-28'), // Day After Thanksgiving
  new Date('2025-12-24'), // Christmas Eve
  new Date('2025-12-25'), // Christmas
  new Date('2025-12-26'), // Day After Christmas
  new Date('2025-12-29'), // Office Closure
  new Date('2025-12-30'), // Office Closure
  new Date('2025-12-31'), // New Year's Eve

  // 2026 Office Closure Days
  new Date('2026-01-01'), // New Year's Day
  new Date('2026-05-25'), // Memorial Day
  new Date('2026-07-04'), // Independence Day (falls on Saturday)
  new Date('2026-09-07'), // Labor Day
  new Date('2026-11-26'), // Thanksgiving
  new Date('2026-11-27'), // Day After Thanksgiving
  new Date('2026-12-24'), // Christmas Eve
  new Date('2026-12-25'), // Christmas
  new Date('2026-12-26'), // Day After Christmas (falls on Saturday)
  new Date('2026-12-29'), // Office Closure
  new Date('2026-12-30'), // Office Closure
  new Date('2026-12-31'), // New Year's Eve
];

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

const isHoliday = (date: Date) => {
  const dateStr = date.toISOString().split('T')[0];
  return officeClosureDays.some(holiday => holiday.toISOString().split('T')[0] === dateStr);
};

const isBusinessDay = (date: Date) => {
  return !isWeekend(date) && !isHoliday(date);
};

const addBusinessDays = (startDate: Date, numDays: number) => {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < numDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (isBusinessDay(currentDate)) {
      daysAdded++;
    }
  }

  return currentDate;
};

const getBusinessDaysBetween = (startDate: Date, endDate: Date) => {
  let count = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isBusinessDay(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
};

// Patient Name Masking Function (HIPAA Protection)
const maskPatientName = (name: string, type: string) => {
  // If it's an insurance payment, show full company name
  if (type === 'Insurance') {
    return name;
  }

  // For patient payments, mask to initials only
  const nameParts = name.trim().split(' ');

  if (nameParts.length === 0) {
    return 'N/A';
  }

  if (nameParts.length === 1) {
    // Only one name provided, show first initial
    return `${nameParts[0].charAt(0).toUpperCase()}.`;
  }

  // Get first initial of first name and first initial of last name
  const firstInitial = nameParts[0].charAt(0).toUpperCase();
  const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();

  return `${firstInitial}. ${lastInitial}.`;
};

const calculateBAMCycle = (referenceStartDate: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cycleStart = new Date(referenceStartDate);
  cycleStart.setHours(0, 0, 0, 0);

  // Find the current cycle by iterating forward
  while (cycleStart < today) {
    const cycleEnd = addBusinessDays(cycleStart, 18); // 19 days total (0-18)

    if (today >= cycleStart && today <= cycleEnd) {
      // Found current cycle
      const businessDaysRemaining = getBusinessDaysBetween(today, cycleEnd);
      const nextCycleStart = new Date(cycleEnd);
      nextCycleStart.setDate(nextCycleStart.getDate() + 1);
      while (!isBusinessDay(nextCycleStart)) {
        nextCycleStart.setDate(nextCycleStart.getDate() + 1);
      }
      const nextCycleEnd = addBusinessDays(nextCycleStart, 18);

      return {
        currentCycleStart: cycleStart,
        currentCycleEnd: cycleEnd,
        daysRemaining: businessDaysRemaining,
        nextCycleStart: nextCycleStart,
        nextCycleEnd: nextCycleEnd
      };
    }

    // Move to next cycle
    cycleStart = new Date(cycleEnd);
    cycleStart.setDate(cycleStart.getDate() + 1);
    while (!isBusinessDay(cycleStart)) {
      cycleStart.setDate(cycleStart.getDate() + 1);
    }
  }

  // If we're before the reference date, calculate backwards
  cycleStart = new Date(referenceStartDate);
  const cycleEnd = addBusinessDays(cycleStart, 18);
  const businessDaysRemaining = getBusinessDaysBetween(today, cycleEnd);
  const nextCycleStart = new Date(cycleEnd);
  nextCycleStart.setDate(nextCycleStart.getDate() + 1);
  while (!isBusinessDay(nextCycleStart)) {
    nextCycleStart.setDate(nextCycleStart.getDate() + 1);
  }
  const nextCycleEnd = addBusinessDays(nextCycleStart, 18);

  return {
    currentCycleStart: cycleStart,
    currentCycleEnd: cycleEnd,
    daysRemaining: businessDaysRemaining,
    nextCycleStart: nextCycleStart,
    nextCycleEnd: nextCycleEnd
  };
};

const CourtStreetRCM = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState('EOD Report - Court Street Dental');
  const [emailMessage, setEmailMessage] = useState('');
  const [scheduleEmail, setScheduleEmail] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('17:00');
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [selectedTemplate, setSelectedTemplate] = useState('full');
  const [providerProductionDate, setProviderProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBAMModal, setShowBAMModal] = useState(false);

  const csdGold = '#B8985F';

  // Report templates
  const reportTemplates = {
    full: {
      name: 'Full Report',
      description: 'Complete EOD report with all sections',
      includes: ['Daily Summary', 'Payments Detail', 'Action Items', 'Top Procedures', 'MTD Summary', 'Important Notes']
    },
    executive: {
      name: 'Executive Summary',
      description: 'High-level overview for management',
      includes: ['Daily Summary', 'Action Items', 'MTD Summary']
    },
    financial: {
      name: 'Financial Focus',
      description: 'Payment and collection details',
      includes: ['Daily Summary', 'Payments Detail', 'Payment Methods', 'MTD Summary']
    },
    actionItems: {
      name: 'Action Items Only',
      description: 'Focus on tasks requiring attention',
      includes: ['Action Items', 'Important Notes']
    }
  };

  // BAM Cycle Configuration & Calculation
  const bamCycleReferenceStart = new Date('2025-10-20'); // First known BAM cycle start date
  const bamCycle = calculateBAMCycle(bamCycleReferenceStart);

  // Historical BAM Cycle Data (for trend graph)
  const historicalBAMData = [
    { cycle: 'Cycle 1', startDate: 'Aug 20', endDate: 'Sep 13', revenue: 52000, goal: 224548 },
    { cycle: 'Cycle 2', startDate: 'Sep 16', endDate: 'Oct 10', revenue: 54500, goal: 224548 },
    { cycle: 'Cycle 3', startDate: 'Oct 20', endDate: 'Nov 13', revenue: 48000, goal: 224548 }, // Previous cycle
    { cycle: 'Current', startDate: bamCycle.currentCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), endDate: bamCycle.currentCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: 0, goal: 224548 }, // Current cycle
  ];

  // Dashboard data
  const dashboardData = {
    bamCurrentRevenue: 183133.37, // Current revenue in this BAM cycle
    bamTargetGoal: 224548, // BAM Target Goal (configurable)
    bamCycleStart: bamCycle.currentCycleStart,
    bamCycleEnd: bamCycle.currentCycleEnd,
    bamDaysRemaining: bamCycle.daysRemaining,
    bamNextCycleStart: bamCycle.nextCycleStart,
    bamNextCycleEnd: bamCycle.nextCycleEnd,
    collectionRate: 44,
    activePatients: 1942,
    activeClaims: 283,
    pendingPayments: 0,
    outstandingAR: 223939.19
  };

  // Payments data
  const paymentsData = {
    todaysPayments: 0,
    weeklyPayments: 13741.66,
    monthlyPayments: 79569.47,
    pendingDeposits: 0,
    insurancePayments: 26198.07,
    patientPayments: 50401.61,
    unappliedCredits: 2969.79,
    refundsPending: 0
  };

  // Patients data
  const patientsData = {
    totalPatients: 0,
    activePatients: 1942,
    patientsWithBalance: 1128,
    totalPatientAR: 378548.69,
    patientARAging: {
      zeroToThirty: 128505.17,
      thirtyOneToSixty: 51944.66,
      sixtyOneToNinety: 34749.81,
      ninetyPlus: 264828.75
    },
    paymentPlans: 0,
    pastDueAccounts: 1128
  };

  // Pre-Auths data
  const preAuthsData = {
    totalPreAuths: 60,
    pending: 60,
    approved: 0,
    denied: 0,
    expiringSoon: 0,
    expiringThisMonth: 0
  };

  // Insurance data
  const insuranceData = {
    totalProviders: 11,
    activePlans: 11,
    credentialingPending: 0,
    verificationsPending: 0,
    topPayerByVolume: "Delta Dental",
    topPayerByRevenue: "Aetna",
    totalPortals: 11,
    eftEnrolled: 11,
    connectionNetwork: 4,
    directContracts: 6,
    providers: [
      {
        name: 'Aetna',
        feeSchedule: 'Direct',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'In',
        drJudge: 'In',
        drStrachan: 'In'
      },
      {
        name: 'Cigna',
        feeSchedule: 'Connection',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'In',
        drJudge: 'In',
        drStrachan: 'In'
      },
      {
        name: 'Delta Dental Insurance',
        feeSchedule: 'Direct',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'Out',
        drJudge: 'Out',
        drStrachan: 'Out'
      },
      {
        name: 'MetLife',
        feeSchedule: 'Connection',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'In',
        drJudge: 'In',
        drStrachan: 'In'
      },
      {
        name: 'Anthem BCBS',
        feeSchedule: 'Decare',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'In',
        drJudge: 'In',
        drStrachan: 'In'
      },
      {
        name: 'United Healthcare (Optum ID)',
        feeSchedule: 'Connection',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'Out',
        drJudge: 'Out',
        drStrachan: 'Out'
      },
      {
        name: 'Guardian',
        feeSchedule: 'Connection',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'Out',
        drJudge: 'Out',
        drStrachan: 'Out'
      },
      {
        name: 'Humana',
        feeSchedule: 'Direct',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'In',
        drJudge: 'In',
        drStrachan: 'In'
      },
      {
        name: 'Ameritas',
        feeSchedule: 'Direct',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'In',
        drJudge: 'In',
        drStrachan: 'In'
      },
      {
        name: 'Principal',
        feeSchedule: 'Direct',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'In',
        drJudge: 'In',
        drStrachan: 'In'
      },
      {
        name: 'Beam Benefits',
        feeSchedule: 'Direct',
        portalStatus: 'All Set!',
        eftStatus: 'Enrolled',
        drGajjar: 'Out',
        drJudge: 'Out',
        drStrachan: 'Out'
      }
    ],
    networkSummary: {
      drGajjar: { inNetwork: 7, outNetwork: 4, percentage: 64 },
      drJudge: { inNetwork: 7, outNetwork: 4, percentage: 64 },
      drStrachan: { inNetwork: 7, outNetwork: 4, percentage: 64 }
    }
  };

  // Scorecard data
  const scorecardData = {
    productionGoal: 250000,
    productionActual: 182905.83,
    collectionGoal: 98,
    collectionActual: 44,
    newPatientsGoal: 30,
    newPatientsActual: 14,
    claimApprovalRate: 90,
    avgDaysToPay: 0,
    // Enhanced metrics
    avgShowRateDr: 77.5,
    avgShowRateDrTarget: 90,
    avgShowRateHyg: 49.3,
    avgShowRateHygTarget: 85,
    avgNewPatientsPerWeek: 7,
    txAcceptance: 52.6,
    txAcceptanceTarget: 50,
    avgCollectionRate: 59,
    avgCollectionRateTarget: 100,
    totalTxPresented: 144558.59,
    totalTxAccepted: 60173.10,
    totalNewPatients: 14,
    fiveStarReviews: 36,
    weeklyData: [
      {
        week: 1,
        date: '12/31/2024',
        showRateDr: 80,
        showRateHyg: 53,
        newPts: 6,
        txPresented: 18470,
        txAcceptPct: 22,
        txAccepted: 18470,
        collectionPct: 33,
        fiveStars: 0
      },
      {
        week: 2,
        date: '1/5/2025',
        showRateDr: 75,
        showRateHyg: 46,
        newPts: 7,
        txPresented: 38955,
        txAcceptPct: 84,
        txAccepted: 32722.2,
        collectionPct: 88,
        fiveStars: 0
      }
    ]
  };

  // Advanced Scorecard Metrics
  const advancedMetrics = {
    // Financial Metrics
    cac: 0, // Customer Acquisition Cost
    grossProfitMargin: 0, // Gross Profit Margin %
    operatingProfitMargin: 0, // Operating Profit Margin %
    cashFlow: 0, // Cash Flow amount
    revenueGrowthRate: 0, // Revenue Growth Rate %

    // COGS Components
    cogs: {
      dentalSupplies: 0,
      labFees: 0,
      associateDoctorExpense: 0,
      hygienePayroll: 0,
      assistantPayroll: 0,
      totalCOGS: 0
    },

    operatingCosts: 0, // Total Operating Costs

    // Customer Metrics
    churnedPatientsPerMonth: 0,
    churnRate: 13.2, // Churn Rate %
    patientLifeCycleMonths: 0, // Patient Life Cycle in Months
    patientLifeCycleYears: 0, // Patient Life Cycle in Years
    activePtsFirstOfPriorMonth: 0,

    // Revenue Metrics
    averageRevenuePerClient: 0, // ARPC
    ltv: 0, // Lifetime Value (ARPC x Avg Retention Period)
    avgRetentionPeriod: 0, // Average Retention Period in months

    // Satisfaction Metrics
    nps: 99, // Net Promoter Score
    enps: 0, // Employee Net Promoter Score

    // Employee Metrics
    employeeUtilizationRate: 0 // Employee Utilization Rate %
  };

  // Checklist data
  const checklistData = {
    dailyCompleted: 0,
    dailyTotal: 8,
    weeklyCompleted: 0,
    weeklyTotal: 5,
    monthlyCompleted: 0,
    monthlyTotal: 4
  };

  // EOD Report data
  const eodData = {
    reportDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    dailyProduction: 5750,
    dailyProductionGoal: 10000,
    paymentsCollected: 5750,
    collectionRate: 100,
    insurancePayments: 4200,
    patientPayments: 1550,
    paymentMethods: {
      visa: 250,
      mastercard: 200,
      americanExpress: 450,
      discover: 175,
      insuranceCheck: 850,
      otherCheck: 325,
      cash: 150,
      eft: 3350
    },
    patientsSeenToday: 24,
    newPatients: 3,
    proceduresCompleted: 32,
    unbilledProcedures: 2,
    unappliedPayments: 450,
    failedTransactions: 1,
    actionItems: {
      claimsToSubmit: 5,
      deniedClaimsToResubmit: 2,
      preAuthsExpiring: 3,
      accountsNeedingFollowUp: 7,
      missedAppointments: 4
    },
    payments: [
      { time: '09:15 AM', patient: 'John Smith', amount: 250, type: 'Patient', method: 'Visa', procedure: 'Cleaning & Exam' },
      { time: '10:30 AM', patient: 'Delta Dental', amount: 1200, type: 'Insurance', method: 'EFT', procedure: 'Crown - Claim #12345' },
      { time: '11:45 AM', patient: 'Sarah Johnson', amount: 150, type: 'Patient', method: 'Cash', procedure: 'X-Rays' },
      { time: '01:20 PM', patient: 'Aetna', amount: 850, type: 'Insurance', method: 'Insurance Check', procedure: 'Root Canal - Claim #12346' },
      { time: '02:15 PM', patient: 'Michael Brown', amount: 325, type: 'Patient', method: 'Other Check', procedure: 'Filling' },
      { time: '03:30 PM', patient: 'MetLife', amount: 2150, type: 'Insurance', method: 'EFT', procedure: 'Bridge - Claim #12347' },
      { time: '04:00 PM', patient: 'Emily Davis', amount: 200, type: 'Patient', method: 'MasterCard', procedure: 'Periodontal Treatment' },
      { time: '04:30 PM', patient: 'Jane Wilson', amount: 450, type: 'Patient', method: 'American Express', procedure: 'Whitening Treatment' },
      { time: '05:00 PM', patient: 'Bob Anderson', amount: 175, type: 'Patient', method: 'Discover', procedure: 'Consultation' }
    ],
    topProcedures: [
      { name: 'Cleanings', count: 12, revenue: 1800 },
      { name: 'Fillings', count: 8, revenue: 2400 },
      { name: 'Crowns', count: 3, revenue: 3600 },
      { name: 'Root Canals', count: 2, revenue: 1800 },
      { name: 'X-Rays', count: 7, revenue: 350 }
    ],
    monthToDateSummary: {
      production: 87500,
      productionGoal: 150000,
      collected: 71250,
      collectionRate: 81.4,
      newPatients: 15
    }
  };

  // Claims data
  const claimsData = {
    totalActive: 283,
    pending: 201,
    denied: 0,
    overSixtyDays: 51,
    arAging: {
      zeroToThirty: { amount: 149062.80, count: 201 },
      thirtyOneToSixty: { amount: 21642.99, count: 31 },
      sixtyOneToNinety: { amount: 20201.52, count: 19 },
      ninetyPlus: { amount: 33031.88, count: 32 }
    }
  };

  // Helper function to get last 6 months
  const getLastSixMonths = () => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months.push({ month: monthName, count: 0 });
    }
    return months;
  };

  // New Patient Tracker data
  const newPatientTrackerData = {
    perDay: 4,
    perDayGoal: 2,
    perWeek: 14,
    perWeekGoal: 10,
    perMonth: 14,
    perMonthGoal: 40,
    quarterly: 43,
    quarterlyGoal: 120,
    monthlyAverages: [
      { month: getLastSixMonths()[0].month, count: 33 },
      { month: getLastSixMonths()[1].month, count: 22 },
      { month: getLastSixMonths()[2].month, count: 22 },
      { month: getLastSixMonths()[3].month, count: 26 },
      { month: getLastSixMonths()[4].month, count: 29 },
      { month: getLastSixMonths()[5].month, count: 14 }
    ]
  };

  // Third Party Financing data
  const thirdPartyFinancingData = {
    cherryPatients: 2,
    careCreditPatients: 3,
    cherryAmount: 8898.80,
    careCreditAmount: 4052.40,
    totalPatients: 5,
    totalAmount: 12951.20
  };

  // Daily Production by Provider data
  const dailyProductionByProvider = {
    // Doctors
    drGajjar: 7690,
    drJudge: 11795,
    drStrachan: 1150,
    doctorTotal: 20635,
    // Hygienists
    farah: 596.28,
    olga: 1098.99,
    jissel: 0,
    tempHyg: 0,
    hygienistTotal: 1695.27,
    // Combined
    combinedTotal: 22330.27
  };

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'claims', name: 'Claims', icon: FileText },
    { id: 'payments', name: 'Payments', icon: DollarSign },
    { id: 'patients', name: 'Patients', icon: Users },
    { id: 'preauths', name: 'Pre-Auths', icon: FileText },
    { id: 'insurance', name: 'Insurance', icon: Shield },
    { id: 'scorecard', name: 'Scorecard', icon: Award },
    { id: 'checklist', name: 'Checklist', icon: List },
    { id: 'eod-report', name: 'EOD Report', icon: Calendar }
  ];

  // Helper function to export PDF
  const exportToPDF = () => {
    // In a real implementation, this would use a library like jsPDF or html2pdf
    // For now, we'll use the browser's print-to-PDF functionality
    const printContent = document.getElementById('eod-report-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>EOD Report - ${selectedDate}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f3f4f6; }
                .header { color: #B8985F; font-size: 24px; margin-bottom: 10px; }
                .section { margin: 20px 0; }
                .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  // Helper function to send email
  const handleSendEmail = () => {
    // In a real implementation, this would call an API endpoint to send the email
    // For now, we'll show a success message
    if (!emailRecipients) {
      alert('Please enter at least one email recipient');
      return;
    }

    const emailData = {
      to: emailRecipients.split(',').map(email => email.trim()),
      subject: emailSubject,
      message: emailMessage,
      reportDate: selectedDate,
      reportData: eodData,
      template: selectedTemplate,
      schedule: scheduleEmail ? {
        enabled: true,
        time: scheduleTime,
        frequency: scheduleFrequency
      } : null
    };

    // Simulate API call
    console.log('Sending email with data:', emailData);

    if (scheduleEmail) {
      const template = reportTemplates[selectedTemplate as keyof typeof reportTemplates];
      alert(`EOD Report scheduled successfully!\nRecipients: ${emailRecipients}\nFrequency: ${scheduleFrequency} at ${scheduleTime}\nTemplate: ${template.name}`);
    } else {
      alert(`EOD Report sent successfully to: ${emailRecipients}`);
    }

    setShowEmailModal(false);
    setEmailRecipients('');
    setEmailMessage('');
    setScheduleEmail(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: csdGold }}>
                Court Street Dental RCM Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Powered by Stellar Consults - Revenue Cycle Management Solutions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://trello.com/b/Jq0zcebf/court-street-dental-admin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Task Board</span>
              </a>
              <div className="text-right">
                <p className="text-xs text-gray-500">A Collaborative Solution</p>
                <p className="text-xs font-medium text-gray-700">Court Street Dental × Stellar Consults</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    currentView === item.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'dashboard' ? (
          <div className="space-y-6">
            {/* Dashboard Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: csdGold }}>
                Practice Overview Dashboard
              </h2>
              <p className="text-gray-600 text-sm">
                Real-time insights into your revenue cycle performance
              </p>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* BAM Cycle Revenue */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                <div className="flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">BAM Cycle Revenue</p>
                      <p className="text-xs text-green-600">
                        {dashboardData.bamCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="mb-2">
                    <p className="text-3xl font-bold text-green-900">
                      ${dashboardData.bamCurrentRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      BAM Target: ${dashboardData.bamTargetGoal.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all ${dashboardData.bamCurrentRevenue >= dashboardData.bamTargetGoal ? 'bg-green-600' : 'bg-green-500'}`}
                      style={{
                        width: `${Math.min((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="border-t border-green-200 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-700 font-medium">Days Remaining:</span>
                      <span className="text-green-900 font-bold">{dashboardData.bamDaysRemaining} business days</span>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs text-green-600">
                        Next Cycle: {dashboardData.bamNextCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamNextCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection Rate */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">Collection Rate</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {dashboardData.collectionRate}%
                    </p>
                    <p className="text-xs text-blue-600 mt-2">Industry avg: 95%</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              {/* Active Patients */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 mb-1">Active Patients</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {dashboardData.activePatients}
                    </p>
                    <p className="text-xs text-purple-600 mt-2">This month</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              {/* Outstanding A/R */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-lg p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-1">Outstanding A/R</p>
                    <p className="text-3xl font-bold text-amber-900">
                      ${dashboardData.outstandingAR.toLocaleString()}
                    </p>
                    <p className="text-xs text-amber-600 mt-2">Total receivables</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Claims & Payments Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Claims Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Claims Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Active Claims</span>
                    </div>
                    <span className="text-lg font-bold text-blue-900">
                      {dashboardData.activeClaims}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">Pending Claims</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-900">
                      {claimsData.pending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-gray-700">Denied Claims</span>
                    </div>
                    <span className="text-lg font-bold text-red-900">
                      {claimsData.denied}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Claims &gt;60 Days</span>
                    </div>
                    <span className="text-lg font-bold text-orange-900">
                      {claimsData.overSixtyDays}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setCurrentView('claims')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Review Claims</span>
                    </div>
                    <span className="text-xs text-blue-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('payments')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Process Payments</span>
                    </div>
                    <span className="text-xs text-green-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('patients')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Manage Patients</span>
                    </div>
                    <span className="text-xs text-purple-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('scorecard')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 rounded-lg transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <Award className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-medium text-gray-700">View Scorecard</span>
                    </div>
                    <span className="text-xs text-amber-600">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* A/R Aging Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                A/R Aging Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-700 mb-1">0-30 Days</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${claimsData.arAging.zeroToThirty.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-700 mb-1">31-60 Days</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    ${claimsData.arAging.thirtyOneToSixty.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm font-medium text-orange-700 mb-1">61-90 Days</p>
                  <p className="text-2xl font-bold text-orange-900">
                    ${claimsData.arAging.sixtyOneToNinety.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-1">90+ Days</p>
                  <p className="text-2xl font-bold text-red-900">
                    ${claimsData.arAging.ninetyPlus.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* New Patient Tracker */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-6" style={{ color: csdGold }}>
                New Patient Tracker
              </h3>

              {/* Current Period Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Per Day */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Per Day</p>
                      <p className="text-xs text-blue-600 mt-0.5">Today</p>
                    </div>
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-4xl font-bold text-blue-900">
                      {newPatientTrackerData.perDay}
                    </p>
                    <p className="text-sm text-blue-600">/ {newPatientTrackerData.perDayGoal}</p>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${newPatientTrackerData.perDay >= newPatientTrackerData.perDayGoal ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{
                        width: `${Math.min((newPatientTrackerData.perDay / newPatientTrackerData.perDayGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-700 font-medium">Goal: {newPatientTrackerData.perDayGoal} per day</p>
                </div>

                {/* Per Week */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Per Week</p>
                      <p className="text-xs text-green-600 mt-0.5">Last 7 days</p>
                    </div>
                    <Users className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-4xl font-bold text-green-900">
                      {newPatientTrackerData.perWeek}
                    </p>
                    <p className="text-sm text-green-600">/ {newPatientTrackerData.perWeekGoal}</p>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${newPatientTrackerData.perWeek >= newPatientTrackerData.perWeekGoal ? 'bg-green-500' : 'bg-green-400'}`}
                      style={{
                        width: `${Math.min((newPatientTrackerData.perWeek / newPatientTrackerData.perWeekGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-green-700 font-medium">Goal: {newPatientTrackerData.perWeekGoal} per week</p>
                </div>

                {/* Per Month */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Per Month</p>
                      <p className="text-xs text-purple-600 mt-0.5">This month</p>
                    </div>
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-4xl font-bold text-purple-900">
                      {newPatientTrackerData.perMonth}
                    </p>
                    <p className="text-sm text-purple-600">/ {newPatientTrackerData.perMonthGoal}</p>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${newPatientTrackerData.perMonth >= newPatientTrackerData.perMonthGoal ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{
                        width: `${Math.min((newPatientTrackerData.perMonth / newPatientTrackerData.perMonthGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-purple-700 font-medium">Goal: {newPatientTrackerData.perMonthGoal} per month</p>
                </div>

                {/* Quarterly */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Quarterly</p>
                      <p className="text-xs text-amber-600 mt-0.5">This quarter</p>
                    </div>
                    <Users className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-4xl font-bold text-amber-900">
                      {newPatientTrackerData.quarterly}
                    </p>
                    <p className="text-sm text-amber-600">/ {newPatientTrackerData.quarterlyGoal}</p>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${newPatientTrackerData.quarterly >= newPatientTrackerData.quarterlyGoal ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{
                        width: `${Math.min((newPatientTrackerData.quarterly / newPatientTrackerData.quarterlyGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-amber-700 font-medium">Goal: {newPatientTrackerData.quarterlyGoal} per quarter</p>
                </div>
              </div>

              {/* 6-Month Trend */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">6-Month Trend</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {newPatientTrackerData.monthlyAverages.map((monthData, index) => {
                    const goalPerMonth = newPatientTrackerData.perMonthGoal;
                    const percentage = goalPerMonth > 0 ? (monthData.count / goalPerMonth) * 100 : 0;
                    const isOnTrack = monthData.count >= goalPerMonth;

                    return (
                      <div key={index} className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-lg p-4 hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-slate-600 mb-2 truncate">{monthData.month}</p>
                        <p className="text-3xl font-bold text-slate-900 mb-2">{monthData.count}</p>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isOnTrack ? 'bg-green-500' : percentage >= 75 ? 'bg-blue-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                            style={{
                              width: `${Math.min(percentage, 100)}%`
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-600">
                          {percentage >= 100 ? '✓ On track' : `${percentage.toFixed(0)}% of goal`}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-xs text-slate-600">≥100%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-slate-600">75-99%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-xs text-slate-600">50-74%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <span className="text-xs text-slate-600">&lt;50%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Monthly Goal: {newPatientTrackerData.perMonthGoal} NP's</p>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'claims' ? (
          <div className="space-y-6">
            {/* Claims Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Claims Management
              </h2>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by Patient, ID, or Insurance Plan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Claims Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Active Claims */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Active Claims</p>
                      <p className="text-3xl font-bold text-blue-900">{claimsData.totalActive}</p>
                      <p className="text-xs text-blue-600 mt-2">In process</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Pending Claims */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 mb-1">Pending Claims</p>
                      <p className="text-3xl font-bold text-yellow-900">{claimsData.pending}</p>
                      <p className="text-xs text-yellow-600 mt-2">Awaiting response</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>

                {/* Denied Claims */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-1">Denied Claims</p>
                      <p className="text-3xl font-bold text-red-900">{claimsData.denied}</p>
                      <p className="text-xs text-red-600 mt-2">Need attention</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                {/* Claims >60 Days */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700 mb-1">Claims &gt;60 Days</p>
                      <p className="text-3xl font-bold text-orange-900">{claimsData.overSixtyDays}</p>
                      <p className="text-xs text-orange-600 mt-2">Priority follow-up</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* AR Aging Analysis */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-6" style={{ color: csdGold }}>
                Insurance A/R Aging Analysis
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 0-30 Days */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-800 mb-2">0-30 Days</p>
                    <p className="text-2xl font-bold text-green-900 mb-1">
                      ${claimsData.arAging.zeroToThirty.amount.toLocaleString()}
                    </p>
                    <p className="text-lg font-medium text-green-700">
                      {claimsData.arAging.zeroToThirty.count}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Claims</p>
                  </div>
                </div>

                {/* 31-60 Days */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">31-60 Days</p>
                    <p className="text-2xl font-bold text-yellow-900 mb-1">
                      ${claimsData.arAging.thirtyOneToSixty.amount.toLocaleString()}
                    </p>
                    <p className="text-lg font-medium text-yellow-700">
                      {claimsData.arAging.thirtyOneToSixty.count}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">Claims</p>
                  </div>
                </div>

                {/* 61-90 Days */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-orange-800 mb-2">61-90 Days</p>
                    <p className="text-2xl font-bold text-orange-900 mb-1">
                      ${claimsData.arAging.sixtyOneToNinety.amount.toLocaleString()}
                    </p>
                    <p className="text-lg font-medium text-orange-700">
                      {claimsData.arAging.sixtyOneToNinety.count}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Claims</p>
                  </div>
                </div>

                {/* 90+ Days */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-red-800 mb-2">90+ Days</p>
                    <p className="text-2xl font-bold text-red-900 mb-1">
                      ${claimsData.arAging.ninetyPlus.amount.toLocaleString()}
                    </p>
                    <p className="text-lg font-medium text-red-700">
                      {claimsData.arAging.ninetyPlus.count}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Claims</p>
                  </div>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Outstanding A/R:</span>
                  <span className="text-xl font-bold" style={{ color: csdGold }}>
                    ${(
                      claimsData.arAging.zeroToThirty.amount +
                      claimsData.arAging.thirtyOneToSixty.amount +
                      claimsData.arAging.sixtyOneToNinety.amount +
                      claimsData.arAging.ninetyPlus.amount
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'payments' ? (
          <div className="space-y-6">
            {/* Payments Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Payment Processing & Reconciliation
              </h2>

              {/* Payment Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Payments */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Today's Payments</p>
                      <p className="text-3xl font-bold text-green-900">
                        ${paymentsData.todaysPayments.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 mt-2">Posted today</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                {/* Weekly Payments */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Weekly Payments</p>
                      <p className="text-3xl font-bold text-blue-900">
                        ${paymentsData.weeklyPayments.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">Last 7 days</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Monthly Payments */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 mb-1">Monthly Payments</p>
                      <p className="text-3xl font-bold text-purple-900">
                        ${paymentsData.monthlyPayments.toLocaleString()}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">This month</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-500" />
                  </div>
                </div>

                {/* Pending Deposits */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 mb-1">Pending Deposits</p>
                      <p className="text-3xl font-bold text-yellow-900">
                        ${paymentsData.pendingDeposits.toLocaleString()}
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">Awaiting deposit</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Sources */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Payment Sources
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Insurance Payments</p>
                        <p className="text-xs text-gray-500">EOB reconciliation</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-blue-900">
                      ${paymentsData.insurancePayments.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <Users className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Patient Payments</p>
                        <p className="text-xs text-gray-500">Direct patient collections</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-green-900">
                      ${paymentsData.patientPayments.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Action Items
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Unapplied Credits</span>
                    </div>
                    <span className="text-lg font-bold text-orange-900">
                      ${paymentsData.unappliedCredits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3">
                      <ArrowUpCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-gray-700">Refunds Pending</span>
                    </div>
                    <span className="text-lg font-bold text-red-900">
                      ${paymentsData.refundsPending.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Payment Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Recent Payment Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <ArrowDownCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">No recent payments</p>
                      <p className="text-xs text-gray-500">Awaiting payment data</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">--</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    Payment activity will appear here as transactions are processed
                  </p>
                </div>
              </div>
            </div>

            {/* Third Party Financing */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Third Party Financing
              </h3>
              <p className="text-sm text-gray-600 mb-4">Past 30 Days</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Cherry Financing */}
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-300 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-pink-900 mb-1">Cherry</h4>
                      <p className="text-xs text-pink-700">Financing Platform</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-pink-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-pink-700">Patients Financed</span>
                      <span className="text-2xl font-bold text-pink-900">
                        {thirdPartyFinancingData.cherryPatients}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-pink-200">
                      <span className="text-sm font-medium text-pink-700">Total Amount</span>
                      <span className="text-xl font-bold text-pink-900">
                        ${thirdPartyFinancingData.cherryAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CareCredit Financing */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-300 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-teal-900 mb-1">CareCredit</h4>
                      <p className="text-xs text-teal-700">Financing Platform</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-teal-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-teal-700">Patients Financed</span>
                      <span className="text-2xl font-bold text-teal-900">
                        {thirdPartyFinancingData.careCreditPatients}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-teal-200">
                      <span className="text-sm font-medium text-teal-700">Total Amount</span>
                      <span className="text-xl font-bold text-teal-900">
                        ${thirdPartyFinancingData.careCreditAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Combined Summary */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-lg p-6">
                <h4 className="text-sm font-semibold text-indigo-900 mb-4">Combined Financing Summary</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-indigo-700 mb-1">Total Patients</p>
                    <p className="text-3xl font-bold text-indigo-900">
                      {thirdPartyFinancingData.totalPatients}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-indigo-700 mb-1">Total Financed</p>
                    <p className="text-3xl font-bold text-indigo-900">
                      ${thirdPartyFinancingData.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'patients' ? (
          <div className="space-y-6">
            {/* Patients Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Patient Accounts Receivable Management
              </h2>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search patients by name, ID, or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Patient Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Patients */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Patients</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {patientsData.totalPatients}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">In practice</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Active Patients */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Active Patients</p>
                      <p className="text-3xl font-bold text-green-900">
                        {patientsData.activePatients}
                      </p>
                      <p className="text-xs text-green-600 mt-2">Last 12 months</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                {/* Patients with Balance */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700 mb-1">Patients w/ Balance</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {patientsData.patientsWithBalance}
                      </p>
                      <p className="text-xs text-orange-600 mt-2">Require follow-up</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </div>

                {/* Total Patient A/R */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 mb-1">Total Patient A/R</p>
                      <p className="text-3xl font-bold text-purple-900">
                        ${patientsData.totalPatientAR.toLocaleString()}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">Outstanding balance</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Patient A/R Aging */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Patient A/R Aging Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-800 mb-2">0-30 Days</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${patientsData.patientARAging.zeroToThirty.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Current</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">31-60 Days</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      ${patientsData.patientARAging.thirtyOneToSixty.toLocaleString()}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">Follow-up needed</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-orange-800 mb-2">61-90 Days</p>
                    <p className="text-2xl font-bold text-orange-900">
                      ${patientsData.patientARAging.sixtyOneToNinety.toLocaleString()}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Action required</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-red-800 mb-2">90+ Days</p>
                    <p className="text-2xl font-bold text-red-900">
                      ${patientsData.patientARAging.ninetyPlus.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Collections</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Plans & Collections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Plans */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Payment Plans
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Active Payment Plans</p>
                        <p className="text-xs text-gray-500">Patients on scheduled payments</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {patientsData.paymentPlans}
                    </p>
                  </div>
                </div>
              </div>

              {/* Past Due Accounts */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Collections Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Past Due Accounts</p>
                        <p className="text-xs text-gray-500">Require immediate attention</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-red-900">
                      {patientsData.pastDueAccounts}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Patient Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Recent Patient Activity
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  Patient activity and recent transactions will appear here
                </p>
              </div>
            </div>
          </div>
        ) : currentView === 'preauths' ? (
          <div className="space-y-6">
            {/* Pre-Auths Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Pre-Authorization Management
              </h2>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search pre-auths by patient, procedure, or auth number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pre-Auth Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Pre-Auths */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Pre-Auths</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {preAuthsData.totalPreAuths}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">Active requests</p>
                    </div>
                    <ClipboardCheck className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Pending Pre-Auths */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 mb-1">Pending</p>
                      <p className="text-3xl font-bold text-yellow-900">
                        {preAuthsData.pending}
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">Awaiting decision</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>

                {/* Approved Pre-Auths */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Approved</p>
                      <p className="text-3xl font-bold text-green-900">
                        {preAuthsData.approved}
                      </p>
                      <p className="text-xs text-green-600 mt-2">Ready for treatment</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                {/* Denied Pre-Auths */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-1">Denied</p>
                      <p className="text-3xl font-bold text-red-900">
                        {preAuthsData.denied}
                      </p>
                      <p className="text-xs text-red-600 mt-2">Require appeal</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Expiration Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expiring Soon */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Expiration Alerts
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Expiring in 7 Days</p>
                        <p className="text-xs text-gray-500">Urgent action required</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">
                      {preAuthsData.expiringSoon}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Expiring This Month</p>
                        <p className="text-xs text-gray-500">Monitor closely</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900">
                      {preAuthsData.expiringThisMonth}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pre-Auth Status by Insurance */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Status by Insurance
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    Insurance breakdown will appear here when pre-auths are submitted
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Pre-Auth Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Recent Pre-Authorization Activity
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  Recent pre-auth submissions and decisions will appear here
                </p>
              </div>
            </div>
          </div>
        ) : currentView === 'insurance' ? (
          <div className="space-y-6">
            {/* Insurance Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Insurance Portal Integration
              </h2>

              {/* Insurance Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Insurance Providers */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Providers</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {insuranceData.totalProviders}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">In network</p>
                    </div>
                    <Shield className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Active Plans */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Active Plans</p>
                      <p className="text-3xl font-bold text-green-900">
                        {insuranceData.activePlans}
                      </p>
                      <p className="text-xs text-green-600 mt-2">Contracted plans</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                {/* Credentialing Pending */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 mb-1">Credentialing</p>
                      <p className="text-3xl font-bold text-yellow-900">
                        {insuranceData.credentialingPending}
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">Pending approval</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>

                {/* Verifications Pending */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 mb-1">Verifications</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {insuranceData.verificationsPending}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">Need verification</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* EFT Enrollment & Network Status Table */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                EFT Enrollment & Network Status
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-700">Insurance</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Fee Schedule</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Portal Status</th>
                      <th className="text-left p-3 font-semibold text-gray-700">EFT Status</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Dr. Gajjar</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Dr. Judge</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Dr. Strachan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insuranceData.providers.map((provider, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{provider.name}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            provider.feeSchedule === 'Direct' ? 'bg-blue-100 text-blue-700' :
                            provider.feeSchedule === 'Connection' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {provider.feeSchedule}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {provider.portalStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {provider.eftStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            provider.drGajjar === 'In' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {provider.drGajjar}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            provider.drJudge === 'In' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {provider.drJudge}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            provider.drStrachan === 'In' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {provider.drStrachan}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Fee Schedule Legend */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Fee Schedules:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-blue-700">Direct</span>
                    <p className="text-gray-600">- Direct contract with insurance</p>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-700">Connection</span>
                    <p className="text-gray-600">- Via Connection Dental network</p>
                  </div>
                  <div>
                    <span className="font-semibold text-green-700">Decare</span>
                    <p className="text-gray-600">- Via Decare Dental network</p>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-900">{insuranceData.totalPortals}</p>
                  <p className="text-xs text-gray-600 mt-1">Total Portals</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-900">{insuranceData.eftEnrolled}</p>
                  <p className="text-xs text-gray-600 mt-1">EFT Enrolled</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-900">{insuranceData.connectionNetwork}</p>
                  <p className="text-xs text-gray-600 mt-1">Connection Network</p>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-900">{insuranceData.directContracts}</p>
                  <p className="text-xs text-gray-600 mt-1">Direct Contracts</p>
                </div>
              </div>
            </div>

            {/* Provider Network Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Provider Network Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Dr. Gajjar */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-5">
                  <h4 className="text-lg font-bold text-blue-900 mb-3">Dr. Gajjar</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">In-Network:</span>
                      <span className="text-lg font-bold text-green-700">
                        {insuranceData.networkSummary.drGajjar.inNetwork} ({insuranceData.networkSummary.drGajjar.percentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Out-of-Network:</span>
                      <span className="text-lg font-bold text-red-700">
                        {insuranceData.networkSummary.drGajjar.outNetwork}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${insuranceData.networkSummary.drGajjar.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Dr. Judge */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-5">
                  <h4 className="text-lg font-bold text-purple-900 mb-3">Dr. Judge</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">In-Network:</span>
                      <span className="text-lg font-bold text-green-700">
                        {insuranceData.networkSummary.drJudge.inNetwork} ({insuranceData.networkSummary.drJudge.percentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Out-of-Network:</span>
                      <span className="text-lg font-bold text-red-700">
                        {insuranceData.networkSummary.drJudge.outNetwork}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${insuranceData.networkSummary.drJudge.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Dr. Strachan */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 rounded-lg p-5">
                  <h4 className="text-lg font-bold text-teal-900 mb-3">Dr. Strachan</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">In-Network:</span>
                      <span className="text-lg font-bold text-green-700">
                        {insuranceData.networkSummary.drStrachan.inNetwork} ({insuranceData.networkSummary.drStrachan.percentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Out-of-Network:</span>
                      <span className="text-lg font-bold text-red-700">
                        {insuranceData.networkSummary.drStrachan.outNetwork}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${insuranceData.networkSummary.drStrachan.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'scorecard' ? (
          <div className="space-y-6">
            {/* Scorecard Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: csdGold }}>
                Practice Scorecard Metrics
              </h2>
              <p className="text-gray-600 text-sm">
                Track your practice performance against goals
              </p>
            </div>

            {/* Advanced Business Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-6" style={{ color: csdGold }}>
                Advanced Business Metrics
              </h3>

              {/* Financial Performance */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Financial Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-emerald-700 mb-1">CAC</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      ${advancedMetrics.cac.toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">Customer Acquisition Cost</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-blue-700 mb-1">Gross Profit Margin</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {advancedMetrics.grossProfitMargin}%
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Profitability ratio</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-indigo-700 mb-1">Operating Profit Margin</p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {advancedMetrics.operatingProfitMargin}%
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">Operational efficiency</p>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-teal-700 mb-1">Cash Flow</p>
                    <p className="text-2xl font-bold text-teal-900">
                      ${advancedMetrics.cashFlow.toLocaleString()}
                    </p>
                    <p className="text-xs text-teal-600 mt-1">Current period</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-cyan-700 mb-1">Revenue Growth Rate</p>
                    <p className="text-2xl font-bold text-cyan-900">
                      {advancedMetrics.revenueGrowthRate}%
                    </p>
                    <p className="text-xs text-cyan-600 mt-1">Year over year</p>
                  </div>
                </div>
              </div>

              {/* COGS Breakdown */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Cost of Goods Sold (COGS)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-orange-700 mb-1">Dental Supplies</p>
                    <p className="text-2xl font-bold text-orange-900">
                      ${advancedMetrics.cogs.dentalSupplies.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-amber-700 mb-1">Lab Fees</p>
                    <p className="text-2xl font-bold text-amber-900">
                      ${advancedMetrics.cogs.labFees.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-yellow-700 mb-1">Associate Doctor Expense</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      ${advancedMetrics.cogs.associateDoctorExpense.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-lime-50 to-lime-100 border-2 border-lime-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-lime-700 mb-1">Hygiene Payroll</p>
                    <p className="text-2xl font-bold text-lime-900">
                      ${advancedMetrics.cogs.hygienePayroll.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-700 mb-1">Assistant Payroll</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${advancedMetrics.cogs.assistantPayroll.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-400 rounded-lg p-4">
                    <p className="text-xs font-medium text-emerald-700 mb-1 font-semibold">Total COGS</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      ${advancedMetrics.cogs.totalCOGS.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-rose-700 mb-1">Operating Costs</p>
                        <p className="text-xs text-rose-600">Total operational expenses</p>
                      </div>
                      <p className="text-3xl font-bold text-rose-900">
                        ${advancedMetrics.operatingCosts.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Lifecycle & Churn Metrics */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Patient Lifecycle & Retention</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-purple-700 mb-1">Churned Patients</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {advancedMetrics.churnedPatientsPerMonth}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">Per month</p>
                  </div>
                  <div className="bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 border-2 border-fuchsia-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-fuchsia-700 mb-1">Churn Rate</p>
                    <p className="text-2xl font-bold text-fuchsia-900">
                      {advancedMetrics.churnRate}%
                    </p>
                    <p className="text-xs text-fuchsia-600 mt-1">Monthly rate</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-pink-700 mb-1">Patient Lifecycle</p>
                    <p className="text-xl font-bold text-pink-900">
                      {advancedMetrics.patientLifeCycleMonths}m / {advancedMetrics.patientLifeCycleYears}y
                    </p>
                    <p className="text-xs text-pink-600 mt-1">Average duration</p>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 border-2 border-violet-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-violet-700 mb-1">Active Pts (Prior Month)</p>
                    <p className="text-2xl font-bold text-violet-900">
                      {advancedMetrics.activePtsFirstOfPriorMonth}
                    </p>
                    <p className="text-xs text-violet-600 mt-1">Beginning of last month</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-indigo-700 mb-1">Avg Retention Period</p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {advancedMetrics.avgRetentionPeriod}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">Months</p>
                  </div>
                </div>
              </div>

              {/* Revenue & Value Metrics */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Revenue & Customer Value</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-sky-50 to-sky-100 border-2 border-sky-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-sky-700 mb-1">Average Revenue Per Client</p>
                    <p className="text-2xl font-bold text-sky-900">
                      ${advancedMetrics.averageRevenuePerClient.toLocaleString()}
                    </p>
                    <p className="text-xs text-sky-600 mt-1">ARPC</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-4">
                    <p className="text-xs font-medium text-blue-700 mb-1 font-semibold">Lifetime Value (LTV)</p>
                    <p className="text-3xl font-bold text-blue-900">
                      ${advancedMetrics.ltv.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">ARPC × Avg Retention Period</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-cyan-700 mb-1">LTV:CAC Ratio</p>
                    <p className="text-2xl font-bold text-cyan-900">
                      {advancedMetrics.cac > 0 ? (advancedMetrics.ltv / advancedMetrics.cac).toFixed(2) : '0.00'}:1
                    </p>
                    <p className="text-xs text-cyan-600 mt-1">Customer value efficiency</p>
                  </div>
                </div>
              </div>

              {/* Satisfaction & Employee Metrics */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Satisfaction & Employee Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-700 mb-1">Net Promoter Score</p>
                    <p className="text-3xl font-bold text-green-900">
                      {advancedMetrics.nps}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Patient satisfaction</p>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-teal-700 mb-1">Employee NPS (eNPS)</p>
                    <p className="text-3xl font-bold text-teal-900">
                      {advancedMetrics.enps}
                    </p>
                    <p className="text-xs text-teal-600 mt-1">Employee satisfaction</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-lg p-4">
                    <p className="text-xs font-medium text-emerald-700 mb-1">Employee Utilization Rate</p>
                    <p className="text-3xl font-bold text-emerald-900">
                      {advancedMetrics.employeeUtilizationRate}%
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">Productivity metric</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Practice Metrics - 4 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Avg Show Rate (Dr) */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Show Rate (Dr)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {scorecardData.avgShowRateDr}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Target: {scorecardData.avgShowRateDrTarget}%+
                    </p>
                  </div>
                  <UserCheck className="w-6 h-6 text-blue-500" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full ${scorecardData.avgShowRateDr >= scorecardData.avgShowRateDrTarget ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{
                      width: `${Math.min((scorecardData.avgShowRateDr / scorecardData.avgShowRateDrTarget) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Avg Show Rate (Hyg) */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-purple-500">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Show Rate (Hyg)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {scorecardData.avgShowRateHyg}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Target: {scorecardData.avgShowRateHygTarget}%+
                    </p>
                  </div>
                  <UserCheck className="w-6 h-6 text-purple-500" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full ${scorecardData.avgShowRateHyg >= scorecardData.avgShowRateHygTarget ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{
                      width: `${Math.min((scorecardData.avgShowRateHyg / scorecardData.avgShowRateHygTarget) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Avg New Patients */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg New Patients</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {scorecardData.avgNewPatientsPerWeek}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">per week</p>
                  </div>
                  <Users className="w-6 h-6 text-green-500" />
                </div>
              </div>

              {/* TX Acceptance */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-amber-500">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">TX Acceptance</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {scorecardData.txAcceptance}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Target: {scorecardData.txAcceptanceTarget}%+
                    </p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full ${scorecardData.txAcceptance >= scorecardData.txAcceptanceTarget ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{
                      width: `${Math.min((scorecardData.txAcceptance / scorecardData.txAcceptanceTarget) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Second Row - More Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Avg Collection Rate */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-600">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Collection Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {scorecardData.avgCollectionRate}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Target: {scorecardData.avgCollectionRateTarget}%+
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full ${scorecardData.avgCollectionRate >= scorecardData.avgCollectionRateTarget ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{
                      width: `${Math.min((scorecardData.avgCollectionRate / scorecardData.avgCollectionRateTarget) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Total TX Presented */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-indigo-500">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total TX Presented</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      ${scorecardData.totalTxPresented.toLocaleString()}
                    </p>
                  </div>
                  <FileText className="w-6 h-6 text-indigo-500" />
                </div>
              </div>

              {/* Total TX Accepted */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-teal-500">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total TX Accepted</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      ${scorecardData.totalTxAccepted.toLocaleString()}
                    </p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-teal-500" />
                </div>
              </div>

              {/* Total New Patients & 5★ Reviews */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-pink-500">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-600">Total New Patients</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {scorecardData.totalNewPatients}
                  </p>
                </div>
                <div className="border-t pt-2">
                  <p className="text-sm font-medium text-gray-600">5★ Reviews</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {scorecardData.fiveStarReviews}
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly Data Table */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Weekly Performance Data
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-700">Week</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Date</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Show Rate Dr</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Show Rate Hyg</th>
                      <th className="text-left p-3 font-semibold text-gray-700">New Pts</th>
                      <th className="text-left p-3 font-semibold text-gray-700">TX Presented</th>
                      <th className="text-left p-3 font-semibold text-gray-700">TX Accept %</th>
                      <th className="text-left p-3 font-semibold text-gray-700">TX Accepted</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Collection %</th>
                      <th className="text-left p-3 font-semibold text-gray-700">5★</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecardData.weeklyData.map((week) => (
                      <tr key={week.week} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{week.week}</td>
                        <td className="p-3 text-gray-700">{week.date}</td>
                        <td className="p-3">
                          <span className={`font-semibold ${week.showRateDr >= 90 ? 'text-green-600' : week.showRateDr >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {week.showRateDr}%
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-semibold ${week.showRateHyg >= 85 ? 'text-green-600' : week.showRateHyg >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {week.showRateHyg}%
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-900">{week.newPts}</td>
                        <td className="p-3 font-medium text-gray-900">${week.txPresented.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`font-semibold ${week.txAcceptPct >= 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {week.txAcceptPct}%
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-900">${week.txAccepted.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`font-semibold ${week.collectionPct >= 95 ? 'text-green-600' : week.collectionPct >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {week.collectionPct}%
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-900">{week.fiveStars}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly Trends Visualization */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Weekly Trends
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Show Rates Trends */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold mb-3 text-gray-700">Show Rates</h4>
                  <div className="space-y-3">
                    {scorecardData.weeklyData.map((week) => (
                      <div key={`show-${week.week}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Week {week.week}</span>
                          <span className="text-gray-700 font-medium">Dr: {week.showRateDr}% | Hyg: {week.showRateHyg}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${week.showRateDr >= 90 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${week.showRateDr}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Dr</p>
                          </div>
                          <div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${week.showRateHyg >= 85 ? 'bg-green-500' : 'bg-purple-500'}`}
                                style={{ width: `${week.showRateHyg}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Hyg</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Treatment Acceptance Trends */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold mb-3 text-gray-700">Treatment Acceptance</h4>
                  <div className="space-y-3">
                    {scorecardData.weeklyData.map((week) => (
                      <div key={`tx-${week.week}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Week {week.week}</span>
                          <span className="text-gray-700 font-medium">{week.txAcceptPct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              week.txAcceptPct >= 70 ? 'bg-green-500' : week.txAcceptPct >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${week.txAcceptPct}%` }}
                          >
                            {week.txAcceptPct}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Production by Provider */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold" style={{ color: csdGold }}>
                  Daily Production by Provider
                </h3>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <input
                    type="date"
                    value={providerProductionDate}
                    onChange={(e) => setProviderProductionDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Production for {new Date(providerProductionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              {/* Doctors Row */}
              <div className="mb-6">
                <h4 className="text-md font-bold text-gray-700 mb-3">Doctors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Dr. Gajjar */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">Dr. Gajjar</h4>
                        <p className="text-xs text-blue-700">Provider</p>
                      </div>
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-900">
                      ${dailyProductionByProvider.drGajjar.toLocaleString()}
                    </p>
                  </div>

                  {/* Dr. Judge */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-green-900 mb-1">Dr. Judge</h4>
                        <p className="text-xs text-green-700">Provider</p>
                      </div>
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-900">
                      ${dailyProductionByProvider.drJudge.toLocaleString()}
                    </p>
                  </div>

                  {/* Dr. Strachan */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-purple-900 mb-1">Dr. Strachan</h4>
                        <p className="text-xs text-purple-700">Provider</p>
                      </div>
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-purple-900">
                      ${dailyProductionByProvider.drStrachan.toLocaleString()}
                    </p>
                  </div>

                  {/* Doctor Total */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-400 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-amber-900 mb-1">Doctor Total</h4>
                        <p className="text-xs text-amber-700">Subtotal</p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-3xl font-bold text-amber-900">
                      ${dailyProductionByProvider.doctorTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hygienists Row */}
              <div className="mb-6">
                <h4 className="text-md font-bold text-gray-700 mb-3">Hygienists</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Farah */}
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-300 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-teal-900 mb-1">Farah</h4>
                        <p className="text-xs text-teal-700">Hygienist</p>
                      </div>
                      <DollarSign className="w-6 h-6 text-teal-600" />
                    </div>
                    <p className="text-3xl font-bold text-teal-900">
                      ${dailyProductionByProvider.farah.toLocaleString()}
                    </p>
                  </div>

                  {/* Olga */}
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-300 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-900 mb-1">Olga</h4>
                        <p className="text-xs text-cyan-700">Hygienist</p>
                      </div>
                      <DollarSign className="w-6 h-6 text-cyan-600" />
                    </div>
                    <p className="text-3xl font-bold text-cyan-900">
                      ${dailyProductionByProvider.olga.toLocaleString()}
                    </p>
                  </div>

                  {/* Jissel */}
                  <div className="bg-gradient-to-br from-sky-50 to-sky-100 border-2 border-sky-300 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-sky-900 mb-1">Jissel</h4>
                        <p className="text-xs text-sky-700">Hygienist</p>
                      </div>
                      <DollarSign className="w-6 h-6 text-sky-600" />
                    </div>
                    <p className="text-3xl font-bold text-sky-900">
                      ${dailyProductionByProvider.jissel.toLocaleString()}
                    </p>
                  </div>

                  {/* Temp HYG */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-indigo-900 mb-1">Temp HYG</h4>
                        <p className="text-xs text-indigo-700">Hygienist</p>
                      </div>
                      <DollarSign className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-3xl font-bold text-indigo-900">
                      ${dailyProductionByProvider.tempHyg.toLocaleString()}
                    </p>
                  </div>

                  {/* Hygienist Total */}
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-400 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-pink-900 mb-1">Hygienist Total</h4>
                        <p className="text-xs text-pink-700">Subtotal</p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-pink-600" />
                    </div>
                    <p className="text-3xl font-bold text-pink-900">
                      ${dailyProductionByProvider.hygienistTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Combined Total */}
              <div className="flex justify-center">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-500 rounded-lg p-6 shadow-lg w-full max-w-md">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-md font-bold text-emerald-900 mb-1">Combined Total</h4>
                      <p className="text-sm text-emerald-700">All Providers</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-4xl font-bold text-emerald-900">
                    ${dailyProductionByProvider.combinedTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* BAM Cycle Metrics */}
            <div
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-green-300"
              onClick={() => setShowBAMModal(true)}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold" style={{ color: csdGold }}>
                  BAM Cycle Metrics
                </h3>
                <div className="bg-green-100 rounded-full p-2">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">Click to view detailed BAM cycle analysis</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current Cycle */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Current Cycle</p>
                  <p className="text-sm text-green-600 mb-2">
                    {dashboardData.bamCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    ${dashboardData.bamCurrentRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Goal: ${dashboardData.bamTargetGoal.toLocaleString()}
                  </p>
                  <div className="w-full bg-green-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Days Remaining */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Days Remaining</p>
                  <p className="text-4xl font-bold text-blue-900 mt-4">
                    {dashboardData.bamDaysRemaining}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">Business days left</p>
                </div>

                {/* Next Cycle */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Next Cycle</p>
                  <p className="text-sm text-purple-600 mt-4">
                    {dashboardData.bamNextCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamNextCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-purple-700 mt-2">
                    19 business days
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'checklist' ? (
          <div className="space-y-6">
            {/* Checklist Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: csdGold }}>
                Daily, Weekly & Monthly Checklists
              </h2>
              <p className="text-gray-600 text-sm">
                Stay on track with systematic RCM task management
              </p>
            </div>

            {/* Checklist Progress Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily Tasks */}
              <div className="bg-white rounded-lg shadow p-5 border-t-4 border-blue-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Daily Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {checklistData.dailyCompleted}/{checklistData.dailyTotal}
                    </p>
                  </div>
                  <List className="w-8 h-8 text-blue-500" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(checklistData.dailyCompleted / checklistData.dailyTotal) * 100}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {checklistData.dailyTotal - checklistData.dailyCompleted} remaining
                </p>
              </div>

              {/* Weekly Tasks */}
              <div className="bg-white rounded-lg shadow p-5 border-t-4 border-green-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Weekly Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {checklistData.weeklyCompleted}/{checklistData.weeklyTotal}
                    </p>
                  </div>
                  <ClipboardCheck className="w-8 h-8 text-green-500" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(checklistData.weeklyCompleted / checklistData.weeklyTotal) * 100}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {checklistData.weeklyTotal - checklistData.weeklyCompleted} remaining
                </p>
              </div>

              {/* Monthly Tasks */}
              <div className="bg-white rounded-lg shadow p-5 border-t-4 border-purple-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {checklistData.monthlyCompleted}/{checklistData.monthlyTotal}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-purple-500" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{
                      width: `${(checklistData.monthlyCompleted / checklistData.monthlyTotal) * 100}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {checklistData.monthlyTotal - checklistData.monthlyCompleted} remaining
                </p>
              </div>
            </div>

            {/* Daily Checklist */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Daily RCM Tasks
              </h3>
              <div className="space-y-2">
                {[
                  'Review and post payments from previous day',
                  'Submit claims for completed procedures',
                  'Follow up on pending pre-authorizations',
                  'Verify insurance for scheduled appointments',
                  'Process patient payment plans',
                  'Review denied claims and submit appeals',
                  'Update A/R aging report',
                  'Reconcile daily deposits'
                ].map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                  >
                    <div className="w-5 h-5 border-2 border-gray-300 rounded mr-3"></div>
                    <span className="text-sm text-gray-700">{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly & Monthly Checklists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Tasks */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Weekly RCM Tasks
                </h3>
                <div className="space-y-2">
                  {[
                    'Review A/R aging by insurance carrier',
                    'Follow up on claims >30 days',
                    'Update pre-authorization expiration tracking',
                    'Review production and collection metrics',
                    'Reconcile insurance payments vs. EOBs'
                  ].map((task, index) => (
                    <div
                      key={index}
                      className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <div className="w-5 h-5 border-2 border-gray-300 rounded mr-3"></div>
                      <span className="text-sm text-gray-700">{task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Tasks */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Monthly RCM Tasks
                </h3>
                <div className="space-y-2">
                  {[
                    'Complete monthly financial close',
                    'Review practice scorecard metrics',
                    'Analyze collection rate trends',
                    'Update fee schedules and contracts'
                  ].map((task, index) => (
                    <div
                      key={index}
                      className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <div className="w-5 h-5 border-2 border-gray-300 rounded mr-3"></div>
                      <span className="text-sm text-gray-700">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'eod-report' ? (
          <div className="space-y-6">
            {/* EOD Report Header with Date Picker and Action Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2" style={{ color: csdGold }}>
                    End of Day Report
                  </h2>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="text-gray-600 text-sm">
                      {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    Email Report
                  </button>
                </div>
              </div>
            </div>

            {/* Wrap the entire report in a div with id for PDF export */}
            <div id="eod-report-content">
            {/* Daily Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Daily Production */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-1">Daily Production</p>
                    <p className="text-3xl font-bold text-green-900">
                      ${eodData.dailyProduction.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Goal: ${eodData.dailyProductionGoal.toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min((eodData.dailyProduction / eodData.dailyProductionGoal) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Payments Collected */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">Payments Collected</p>
                    <p className="text-3xl font-bold text-blue-900">
                      ${eodData.paymentsCollected.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Collection Rate: {eodData.collectionRate}%
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              {/* Patients Seen */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 mb-1">Patients Seen</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {eodData.patientsSeenToday}
                    </p>
                    <p className="text-xs text-purple-600 mt-2">
                      New Patients: {eodData.newPatients}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              {/* Procedures Completed */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-1">Procedures</p>
                    <p className="text-3xl font-bold text-amber-900">
                      {eodData.proceduresCompleted}
                    </p>
                    <p className="text-xs text-amber-600 mt-2">Completed today</p>
                  </div>
                  <Activity className="w-8 h-8 text-amber-500" />
                </div>
              </div>
            </div>

            {/* BAM Cycle Summary */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                BAM Cycle Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current Cycle */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Current Cycle</p>
                  <p className="text-sm text-green-600 mb-2">
                    {dashboardData.bamCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-2xl font-bold text-green-900 mb-1">
                    ${dashboardData.bamCurrentRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-700 mb-2">
                    Goal: ${dashboardData.bamTargetGoal.toLocaleString()}
                  </p>
                  <div className="w-full bg-green-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100).toFixed(1)}% of goal
                  </p>
                </div>

                {/* Days Remaining */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Days Remaining</p>
                  <p className="text-4xl font-bold text-blue-900 mt-6 mb-2">
                    {dashboardData.bamDaysRemaining}
                  </p>
                  <p className="text-xs text-blue-700">Business days left in current cycle</p>
                </div>

                {/* Next Cycle */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Next Cycle</p>
                  <p className="text-sm text-purple-600 mt-4 mb-2">
                    {dashboardData.bamNextCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamNextCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-purple-700">
                    19 business days | Goal: ${dashboardData.bamTargetGoal.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Payment Sources */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Payment Sources
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Insurance Payments</span>
                    <span className="text-lg font-bold text-blue-900">
                      ${eodData.insurancePayments.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Patient Payments</span>
                    <span className="text-lg font-bold text-green-900">
                      ${eodData.patientPayments.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Payment Methods
                </h3>

                {/* Credit Card Types */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Credit Cards</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <span className="text-sm font-medium text-blue-700">Visa</span>
                      <span className="text-lg font-bold text-blue-900">
                        ${eodData.paymentMethods.visa.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                      <span className="text-sm font-medium text-orange-700">MasterCard</span>
                      <span className="text-lg font-bold text-orange-900">
                        ${eodData.paymentMethods.mastercard.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg border border-teal-200">
                      <span className="text-sm font-medium text-teal-700">American Express</span>
                      <span className="text-lg font-bold text-teal-900">
                        ${eodData.paymentMethods.americanExpress.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                      <span className="text-sm font-medium text-amber-700">Discover</span>
                      <span className="text-lg font-bold text-amber-900">
                        ${eodData.paymentMethods.discover.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Check Payments */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Check Payments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                      <span className="text-sm font-medium text-purple-700">Insurance Checks</span>
                      <span className="text-lg font-bold text-purple-900">
                        ${eodData.paymentMethods.insuranceCheck.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
                      <span className="text-sm font-medium text-indigo-700">Other Checks</span>
                      <span className="text-lg font-bold text-indigo-900">
                        ${eodData.paymentMethods.otherCheck.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Other Payment Methods */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Other Methods</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <span className="text-sm font-medium text-green-700">Cash</span>
                      <span className="text-lg font-bold text-green-900">
                        ${eodData.paymentMethods.cash.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-700">EFT</span>
                      <span className="text-lg font-bold text-slate-900">
                        ${eodData.paymentMethods.eft.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Payments Detail */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Today's Payments - Detailed View
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-700">Time</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Patient/Payer</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Type</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Method</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Procedure</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eodData.payments.map((payment, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 text-gray-700">{payment.time}</td>
                        <td className="p-3 font-medium text-gray-900">{maskPatientName(payment.patient, payment.type)}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            payment.type === 'Insurance' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {payment.type}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700">{payment.method}</td>
                        <td className="p-3 text-gray-600 text-xs">{payment.procedure}</td>
                        <td className="p-3 text-right font-bold text-gray-900">
                          ${payment.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={5} className="p-3 text-right font-bold text-gray-700">Total:</td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        ${eodData.paymentsCollected.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Actionable Insights */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Action Items for Tomorrow
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Claims to Submit</p>
                      <p className="text-xs text-gray-500">Due tomorrow</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-900">
                    {eodData.actionItems.claimsToSubmit}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3">
                    <XCircle className="w-6 h-6 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Denied Claims</p>
                      <p className="text-xs text-gray-500">Need resubmission</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {eodData.actionItems.deniedClaimsToResubmit}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Pre-Auths Expiring</p>
                      <p className="text-xs text-gray-500">Within 7 days</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">
                    {eodData.actionItems.preAuthsExpiring}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Accounts Follow-Up</p>
                      <p className="text-xs text-gray-500">Need contact</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {eodData.actionItems.accountsNeedingFollowUp}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Missed Appointments</p>
                      <p className="text-xs text-gray-500">Reschedule needed</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {eodData.actionItems.missedAppointments}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Unbilled Procedures</p>
                      <p className="text-xs text-gray-500">To bill</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {eodData.unbilledProcedures}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Procedures */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Top Procedures Today
              </h3>
              <div className="space-y-3">
                {eodData.topProcedures.map((procedure, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-700">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{procedure.name}</p>
                        <p className="text-xs text-gray-500">{procedure.count} procedures</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      ${procedure.revenue.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Month-to-Date Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Month-to-Date Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">MTD Production</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ${eodData.monthToDateSummary.production.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Goal: ${eodData.monthToDateSummary.productionGoal.toLocaleString()}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min((eodData.monthToDateSummary.production / eodData.monthToDateSummary.productionGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">MTD Collected</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${eodData.monthToDateSummary.collected.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {eodData.monthToDateSummary.collectionRate}% collection rate
                  </p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">New Patients MTD</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {eodData.monthToDateSummary.newPatients}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">This month</p>
                </div>

                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Avg Daily Production</p>
                  <p className="text-2xl font-bold text-amber-900">
                    ${Math.round(eodData.monthToDateSummary.production / 10).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Based on 10 days</p>
                </div>
              </div>
            </div>

            {/* Important Notes Section */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3 text-amber-900 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Important Notes
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  <span><strong>Unapplied Payments:</strong> ${eodData.unappliedPayments.toLocaleString()} needs to be allocated</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  <span><strong>Failed Transaction:</strong> {eodData.failedTransactions} payment(s) failed - requires follow-up</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  <span><strong>Daily Goal:</strong> {((eodData.dailyProduction / eodData.dailyProductionGoal) * 100).toFixed(1)}% of daily production goal achieved</span>
                </li>
              </ul>
            </div>
            </div>
            {/* End of eod-report-content div */}

            {/* Email Modal */}
            {showEmailModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Email EOD Report</h3>
                          <p className="text-sm text-gray-500">Send report for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowEmailModal(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Email Form */}
                    <div className="space-y-4">
                      {/* Recipients */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Recipients <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={emailRecipients}
                          onChange={(e) => setEmailRecipients(e.target.value)}
                          placeholder="email@example.com, another@example.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Message (Optional)
                        </label>
                        <textarea
                          value={emailMessage}
                          onChange={(e) => setEmailMessage(e.target.value)}
                          rows={4}
                          placeholder="Add any notes or comments to include with the report..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Report Template Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Report Template
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(reportTemplates).map(([key, template]) => (
                            <div
                              key={key}
                              onClick={() => setSelectedTemplate(key)}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedTemplate === key
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-green-300'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="font-semibold text-sm text-gray-900">{template.name}</h4>
                                {selectedTemplate === key && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600">{template.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Schedule Email Option */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={scheduleEmail}
                              onChange={(e) => setScheduleEmail(e.target.checked)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Repeat className="w-4 h-4" />
                              Schedule Automatic Delivery
                            </span>
                          </label>
                        </div>

                        {scheduleEmail && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Frequency
                              </label>
                              <select
                                value={scheduleFrequency}
                                onChange={(e) => setScheduleFrequency(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly (Monday)</option>
                                <option value="monthly">Monthly (1st of month)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Send Time
                              </label>
                              <input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <div className="bg-white p-3 rounded border border-blue-300">
                                <p className="text-xs text-gray-600">
                                  <strong>Note:</strong> Scheduled reports will be sent automatically {scheduleFrequency} at {scheduleTime} to the specified recipients using the {reportTemplates[selectedTemplate as keyof typeof reportTemplates].name} template.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Report Preview Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Report Summary</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Daily Production</p>
                            <p className="font-bold text-gray-900">${eodData.dailyProduction.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Payments Collected</p>
                            <p className="font-bold text-gray-900">${eodData.paymentsCollected.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Patients Seen</p>
                            <p className="font-bold text-gray-900">{eodData.patientsSeenToday}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Action Items</p>
                            <p className="font-bold text-gray-900">
                              {eodData.actionItems.claimsToSubmit +
                               eodData.actionItems.deniedClaimsToResubmit +
                               eodData.actionItems.preAuthsExpiring +
                               eodData.actionItems.accountsNeedingFollowUp +
                               eodData.actionItems.missedAppointments}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowEmailModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendEmail}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium shadow-md flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View
            </h2>
            <div className="space-y-4">
              <p className="text-gray-600">
                Welcome to the Court Street Dental RCM Dashboard.
              </p>
              <p className="text-gray-600">
                This comprehensive Revenue Cycle Management application includes:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Claims Management & Tracking</li>
                <li>Payment Processing & Reconciliation</li>
                <li>Patient Accounts Receivable</li>
                <li>Pre-Authorization Management</li>
                <li>Insurance Portal Integration</li>
                <li>Practice Scorecard Metrics</li>
                <li>Daily, Weekly & Monthly Checklists</li>
              </ul>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Current view:</strong> <span className="font-semibold capitalize">{currentView}</span>
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Full implementation with data management, forms, and reporting features coming soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards Grid - Clickable Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer text-left"
          >
            <LayoutDashboard className="w-8 h-8 mb-2" />
            <h3 className="font-semibold mb-1">Dashboard</h3>
            <p className="text-sm text-blue-100">KPIs & Analytics</p>
          </button>

          <button
            onClick={() => setCurrentView('claims')}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer text-left"
          >
            <FileText className="w-8 h-8 mb-2" />
            <h3 className="font-semibold mb-1">Claims</h3>
            <p className="text-sm text-green-100">Track & Manage</p>
          </button>

          <button
            onClick={() => setCurrentView('payments')}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer text-left"
          >
            <DollarSign className="w-8 h-8 mb-2" />
            <h3 className="font-semibold mb-1">Payments</h3>
            <p className="text-sm text-purple-100">Process & Record</p>
          </button>

          <button
            onClick={() => setCurrentView('patients')}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer text-left"
          >
            <Users className="w-8 h-8 mb-2" />
            <h3 className="font-semibold mb-1">Patients</h3>
            <p className="text-sm text-amber-100">A/R Management</p>
          </button>
        </div>

        {/* BAM Cycle Modal */}
        {showBAMModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">BAM Cycle Analysis</h3>
                      <p className="text-sm text-gray-500">Business Activity Metric - 19 Business Day Cycles</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBAMModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Cycle Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Previous Cycle */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Previous Cycle</h4>
                      <Activity className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {historicalBAMData[historicalBAMData.length - 2]?.startDate} - {historicalBAMData[historicalBAMData.length - 2]?.endDate}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      ${historicalBAMData[historicalBAMData.length - 2]?.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      Goal: ${historicalBAMData[historicalBAMData.length - 2]?.goal.toLocaleString()}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (historicalBAMData[historicalBAMData.length - 2]?.revenue / historicalBAMData[historicalBAMData.length - 2]?.goal) >= 1
                            ? 'bg-green-600'
                            : (historicalBAMData[historicalBAMData.length - 2]?.revenue / historicalBAMData[historicalBAMData.length - 2]?.goal) >= 0.9
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min((historicalBAMData[historicalBAMData.length - 2]?.revenue / historicalBAMData[historicalBAMData.length - 2]?.goal) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {((historicalBAMData[historicalBAMData.length - 2]?.revenue / historicalBAMData[historicalBAMData.length - 2]?.goal) * 100).toFixed(1)}% of goal
                    </p>
                  </div>

                  {/* Current Cycle */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-green-700 uppercase tracking-wide">Current Cycle</h4>
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      {dashboardData.bamCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-3xl font-bold text-green-900 mb-2">
                      ${dashboardData.bamCurrentRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-700 mb-3">
                      Goal: ${dashboardData.bamTargetGoal.toLocaleString()}
                    </p>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      {((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100).toFixed(1)}% of goal
                    </p>
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-700">Days Remaining:</span>
                        <span className="text-2xl font-bold text-green-900">{dashboardData.bamDaysRemaining}</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">Business days left in cycle</p>
                    </div>
                  </div>

                  {/* Next Cycle */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide">Next Cycle</h4>
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      {dashboardData.bamNextCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamNextCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xl font-bold text-blue-900 mb-2">
                      19 Business Days
                    </p>
                    <p className="text-xs text-blue-600 mb-3">
                      Target Goal: ${dashboardData.bamTargetGoal.toLocaleString()}
                    </p>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs text-blue-700">
                        <strong>Note:</strong> Excludes weekends and office closure days
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trend Graph */}
                <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-6">BAM Cycle Revenue Trend</h4>
                  <div className="relative">
                    {/* Graph Area */}
                    <div className="flex items-end justify-between gap-4 h-64">
                      {historicalBAMData.map((cycle, index) => {
                        const percentage = (cycle.revenue / cycle.goal) * 100;
                        const isCurrentCycle = index === historicalBAMData.length - 1;
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            {/* Bar */}
                            <div className="w-full flex flex-col items-center justify-end" style={{ height: '200px' }}>
                              <div className="text-xs font-bold text-gray-700 mb-2">
                                ${(cycle.revenue / 1000).toFixed(0)}K
                              </div>
                              <div
                                className={`w-full rounded-t-lg transition-all ${
                                  isCurrentCycle
                                    ? 'bg-gradient-to-t from-green-400 to-green-500'
                                    : percentage >= 100
                                    ? 'bg-gradient-to-t from-green-300 to-green-400'
                                    : percentage >= 90
                                    ? 'bg-gradient-to-t from-yellow-300 to-yellow-400'
                                    : 'bg-gradient-to-t from-red-300 to-red-400'
                                } ${isCurrentCycle ? 'border-2 border-green-600' : ''}`}
                                style={{ height: `${Math.max(percentage, 10)}%` }}
                              ></div>
                            </div>
                            {/* Label */}
                            <div className="mt-3 text-center">
                              <p className={`text-xs font-semibold ${isCurrentCycle ? 'text-green-700' : 'text-gray-700'}`}>
                                {cycle.cycle}
                              </p>
                              <p className="text-xs text-gray-500">
                                {cycle.startDate} - {cycle.endDate}
                              </p>
                              <p className={`text-xs mt-1 font-medium ${
                                percentage >= 100 ? 'text-green-600' : percentage >= 90 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {percentage.toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Goal Line */}
                    <div className="absolute top-0 left-0 right-0" style={{ top: '0px' }}>
                      <div className="border-t-2 border-dashed border-gray-400 relative">
                        <span className="absolute -top-3 right-0 text-xs font-semibold text-gray-600 bg-gray-50 px-2">
                          Goal: ${dashboardData.bamTargetGoal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="text-sm font-bold text-blue-900 mb-2">Cycle Performance</h5>
                    <p className="text-xs text-blue-700">
                      Track your performance across 19-business-day cycles to identify trends and opportunities.
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="text-sm font-bold text-green-900 mb-2">Goal Tracking</h5>
                    <p className="text-xs text-green-700">
                      Each cycle has a target goal of ${dashboardData.bamTargetGoal.toLocaleString()} to maintain consistent revenue.
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="text-sm font-bold text-purple-900 mb-2">Business Days Only</h5>
                    <p className="text-xs text-purple-700">
                      Cycles exclude weekends and office closure days for accurate business performance metrics.
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <div className="mt-6">
                  <button
                    onClick={() => setShowBAMModal(false)}
                    className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium shadow-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourtStreetRCM;
