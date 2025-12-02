import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, DollarSign, Users,
  Shield, List, Award, Search, AlertCircle, Clock, XCircle, CheckCircle,
  TrendingUp, Activity, CreditCard, ArrowDownCircle, ArrowUpCircle, UserCheck, ClipboardCheck,
  Calendar, Send, Printer, Download, X, Mail, ExternalLink, Repeat, Sun, Moon, RefreshCw, Upload,
  Plus, Edit, Trash2, Archive, ArchiveRestore, History
} from 'lucide-react';
import { useMetrics } from './hooks/useMetrics';
import { useEODMetrics } from './hooks/useEODMetrics';
import { useProviderMetrics } from './hooks/useProviderMetrics';
import { useNewPatientTracker } from './hooks/useNewPatientTracker';
import LifecycleMetrics from './components/LifecycleMetrics';
import PatientDataUpload from './components/PatientDataUpload';
import { AIInsightsButton } from './components/AIInsightsButton';
import { AIInsightsPanel } from './components/AIInsightsPanel';
import { TopProceduresCSVUpload } from './components/TopProceduresCSVUpload';
import { generateInsights, Insight } from './services/aiInsights';
import { generatePaymentInsights, PaymentInsight } from './services/paymentInsights';
import { getTopProceduresForDate } from './services/topProcedures';
import { getInsuranceProviders, InsuranceProvider } from './services/insuranceProvider';
import {
  getClaims, insertClaim, updateClaim, deleteClaim, archiveClaim, unarchiveClaim, getClaimAuditHistory,
  getPreAuths, insertPreAuth, updatePreAuth, deletePreAuth, archivePreAuth, unarchivePreAuth, getPreAuthAuditHistory,
  getActiveClaims, getArchivedClaims, getActivePreAuths, getArchivedPreAuths,
  subscribeToClaimsChanges, subscribeToPreAuthsChanges
} from './services/claimsService';
import type { Claim, PreAuth, ClaimAuditHistory, PreAuthAuditHistory } from './types/database.types';

// BAM Cycle Helper Functions
// Get local date string in YYYY-MM-DD format (respects user's timezone)
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

// Office closure days for 2025-2026 (from DATA-ENTRY-INSTRUCTIONS.md)
const isOfficeClosed = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();

  // 2025 Closures
  if (year === 2025) {
    // New Year's Day (Jan 1)
    if (month === 1 && day === 1) return true;
    // Memorial Day (May 26)
    if (month === 5 && day === 26) return true;
    // Independence Day (Jul 4)
    if (month === 7 && day === 4) return true;
    // Labor Day (Sep 1)
    if (month === 9 && day === 1) return true;
    // Thanksgiving (Nov 27)
    if (month === 11 && day === 27) return true;
    // Day After Thanksgiving (Nov 28)
    if (month === 11 && day === 28) return true;
    // Christmas Eve (Dec 24)
    if (month === 12 && day === 24) return true;
    // Christmas (Dec 25)
    if (month === 12 && day === 25) return true;
    // Day After Christmas (Dec 26)
    if (month === 12 && day === 26) return true;
    // Office Closure (Dec 29, 30, 31)
    if (month === 12 && (day === 29 || day === 30 || day === 31)) return true;
  }

  // 2026 Closures
  if (year === 2026) {
    // New Year's Day (Jan 1)
    if (month === 1 && day === 1) return true;
    // Memorial Day (May 25)
    if (month === 5 && day === 25) return true;
    // Independence Day (Jul 4)
    if (month === 7 && day === 4) return true;
    // Labor Day (Sep 7)
    if (month === 9 && day === 7) return true;
    // Thanksgiving (Nov 26)
    if (month === 11 && day === 26) return true;
    // Day After Thanksgiving (Nov 27)
    if (month === 11 && day === 27) return true;
    // Christmas Eve (Dec 24)
    if (month === 12 && day === 24) return true;
    // Christmas (Dec 25)
    if (month === 12 && day === 25) return true;
    // Day After Christmas (Dec 26)
    if (month === 12 && day === 26) return true;
    // Office Closure (Dec 29, 30, 31)
    if (month === 12 && (day === 29 || day === 30 || day === 31)) return true;
  }

  return false;
};

// BAM-specific business day check (excludes weekends AND office closure days)
const isBAMBusinessDay = (date: Date) => {
  return !isWeekend(date) && !isOfficeClosed(date);
};

// Find end date that gives exactly numBusinessDays from start (inclusive)
const findBAMCycleEndDate = (startDate: Date, numBusinessDays: number) => {
  let currentDate = new Date(startDate);
  let businessDayCount = 0;

  while (businessDayCount < numBusinessDays) {
    if (isBAMBusinessDay(currentDate)) {
      businessDayCount++;
    }

    if (businessDayCount < numBusinessDays) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return currentDate;
};

// BAM-specific business days between (excludes weekends and office closures)
const getBAMBusinessDaysBetween = (startDate: Date, endDate: Date) => {
  let count = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isBAMBusinessDay(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
};


const calculateBAMCycle = (referenceStartDate: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cycleStart = new Date(referenceStartDate);
  cycleStart.setHours(0, 0, 0, 0);

  // Find the current cycle by iterating forward
  while (cycleStart < today) {
    const cycleEnd = findBAMCycleEndDate(cycleStart, 19); // Exactly 19 business days

    if (today >= cycleStart && today <= cycleEnd) {
      // Found current cycle
      const businessDaysRemaining = getBAMBusinessDaysBetween(today, cycleEnd);
      // Next cycle starts the day after current cycle ends (calendar day, not business day)
      const nextCycleStart = new Date(cycleEnd);
      nextCycleStart.setDate(nextCycleStart.getDate() + 1);
      const nextCycleEnd = findBAMCycleEndDate(nextCycleStart, 19);

      return {
        currentCycleStart: cycleStart,
        currentCycleEnd: cycleEnd,
        daysRemaining: businessDaysRemaining,
        nextCycleStart: nextCycleStart,
        nextCycleEnd: nextCycleEnd
      };
    }

    // Move to next cycle (next calendar day after cycle ends)
    cycleStart = new Date(cycleEnd);
    cycleStart.setDate(cycleStart.getDate() + 1);
  }

  // If we're before the reference date, calculate backwards
  cycleStart = new Date(referenceStartDate);
  const cycleEnd = findBAMCycleEndDate(cycleStart, 19);
  const businessDaysRemaining = getBAMBusinessDaysBetween(today, cycleEnd);
  const nextCycleStart = new Date(cycleEnd);
  nextCycleStart.setDate(nextCycleStart.getDate() + 1);
  const nextCycleEnd = findBAMCycleEndDate(nextCycleStart, 19);

  return {
    currentCycleStart: cycleStart,
    currentCycleEnd: cycleEnd,
    daysRemaining: businessDaysRemaining,
    nextCycleStart: nextCycleStart,
    nextCycleEnd: nextCycleEnd
  };
};

/**
 * DAILY METRICS RESET SYSTEM
 *
 * This application automatically resets daily metrics at the beginning of each day
 * while preserving historical EOD (End of Day) data in localStorage.
 *
 * How it works:
 * 1. Daily metrics (eodData, dailyProductionByProvider) are stored in React state
 * 2. Data is auto-saved to localStorage whenever it changes
 * 3. Every minute, the system checks if the date has changed
 * 4. At midnight, yesterday's data is saved to EOD history and all daily metrics reset to 0
 * 5. Historical EOD data remains accessible for reporting
 *
 * To update daily metrics:
 * - Use updateEODData({ dailyProduction: 1000, paymentsCollected: 800, ... })
 * - Use updateDailyProduction({ drGajjar: 500, drJudge: 300, ... })
 *
 * To manually save current day:
 * - Call saveCurrentEODToHistory() from the browser console
 *
 * To load historical data:
 * - Call loadHistoricalEOD('2025-11-12') from the browser console
 */

// LocalStorage utility functions for data persistence
const STORAGE_KEYS = {
  CURRENT_DATE: 'csd_current_date',
  EOD_HISTORY: 'csd_eod_history',
  DAILY_DATA: 'csd_daily_data'
};

// DISABLED: localStorage utility functions (now using Supabase)
/*
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

const saveEODData = (date: string, data: any) => {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.EOD_HISTORY) || '{}');
    history[date] = {
      ...data,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.EOD_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving EOD data:', error);
  }
};

const getEODData = (date: string) => {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.EOD_HISTORY) || '{}');
    return history[date] || null;
  } catch (error) {
    console.error('Error loading EOD data:', error);
    return null;
  }
};

const saveDailyData = (data: any) => {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving daily data:', error);
  }
};

const getDailyData = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_DATA) || 'null');

    if (data && data.paymentMethods) {
      if (data.paymentMethods.cherry === undefined) {
        data.paymentMethods.cherry = 0;
      }
      if (data.paymentMethods.careCredit === undefined) {
        data.paymentMethods.careCredit = 0;
      }
    }

    return data;
  } catch (error) {
    console.error('Error loading daily data:', error);
    return null;
  }
};

const getInitialEODData = () => ({
  reportDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  dailyProduction: 0,
  dailyProductionGoal: 19991,
  paymentsCollected: 0,
  collectionRate: 0,
  insurancePayments: 0,
  patientPayments: 0,
  productionCollectedDifference: 0,
  paymentMethods: {
    visa: 0,
    mastercard: 0,
    americanExpress: 0,
    discover: 0,
    cherry: 0,
    careCredit: 0,
    insuranceCheck: 0,
    otherCheck: 0,
    cash: 0,
    eft: 0
  },
  patientsSeenToday: 0,
  newPatients: 0,
  proceduresCompleted: 0,
  unbilledProcedures: 0,
  unappliedPayments: 0,
  failedTransactions: 0,
  actionItems: {
    claimsToSubmit: 0,
    deniedClaimsToResubmit: 0,
    preAuthsExpiring: 0,
    accountsNeedingFollowUp: 0,
    missedAppointments: 0
  },
  payments: [],
  topProcedures: [],
  monthToDateSummary: {
    production: 182905.83,
    productionGoal: 250000,
    collected: 79569.47,
    collectionRate: 73,
    newPatients: 14
  }
});

const getInitialDailyProductionByProvider = () => ({
  drGajjar: 0,
  drJudge: 0,
  drStrachan: 0,
  doctorTotal: 0,
  farah: 0,
  olga: 0,
  jissel: 0,
  tempHyg: 0,
  hygienistTotal: 0,
  combinedTotal: 0
});
*/

// CSV Export Utility Functions
const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Patient Tracking Interfaces for Claims and Pre-Auths (Frontend camelCase)
interface ClaimRecord {
  id: string;
  patientId: string;
  patientName: string;
  insuranceCompany: string;
  claimNumber: string;
  procedureCode: string;
  claimDetail: string;
  claimAmount: number;
  status: 'Pending' | 'Approved' | 'Denied' | 'In Review' | 'Resubmitted';
  dateSubmitted: string;
  followUpDate: string;
  handler: string;
  notes: string;
  agingDays: number;
}

interface PreAuthRecord {
  id: string;
  patientId: string;
  patientName: string;
  insuranceCompany: string;
  preAuthNumber: string;
  procedureCode: string;
  treatmentDetail: string;
  requestedAmount: number;
  status: 'Pending' | 'Approved' | 'Denied' | 'Expired' | 'In Review';
  dateRequested: string;
  expirationDate: string;
  approvedAmount: number;
  handler: string;
  notes: string;
}

// Conversion functions between frontend camelCase and database snake_case
const claimToRecord = (claim: Claim): ClaimRecord => ({
  id: claim.id,
  patientId: claim.patient_id,
  patientName: claim.patient_name,
  insuranceCompany: claim.insurance_company,
  claimNumber: claim.claim_number,
  procedureCode: claim.procedure_code,
  claimDetail: claim.claim_detail,
  claimAmount: claim.claim_amount,
  status: claim.status,
  dateSubmitted: claim.date_submitted,
  followUpDate: claim.follow_up_date,
  handler: claim.handler,
  notes: claim.notes || '',
  agingDays: claim.aging_days
});

const recordToClaim = (record: ClaimRecord): Omit<Claim, 'created_at' | 'updated_at'> => ({
  id: record.id,
  patient_id: record.patientId,
  patient_name: record.patientName,
  insurance_company: record.insuranceCompany,
  claim_number: record.claimNumber,
  procedure_code: record.procedureCode,
  claim_detail: record.claimDetail,
  claim_amount: record.claimAmount,
  status: record.status,
  date_submitted: record.dateSubmitted,
  follow_up_date: record.followUpDate,
  handler: record.handler,
  notes: record.notes,
  aging_days: record.agingDays,
  archived: false,
  archived_at: null,
  archived_by: null
});

const preAuthToRecord = (preAuth: PreAuth): PreAuthRecord => ({
  id: preAuth.id,
  patientId: preAuth.patient_id,
  patientName: preAuth.patient_name,
  insuranceCompany: preAuth.insurance_company,
  preAuthNumber: preAuth.pre_auth_number,
  procedureCode: preAuth.procedure_code,
  treatmentDetail: preAuth.treatment_detail,
  requestedAmount: preAuth.requested_amount,
  status: preAuth.status,
  dateRequested: preAuth.date_requested,
  expirationDate: preAuth.expiration_date,
  approvedAmount: preAuth.approved_amount,
  handler: preAuth.handler,
  notes: preAuth.notes || ''
});

const recordToPreAuth = (record: PreAuthRecord): Omit<PreAuth, 'created_at' | 'updated_at'> => ({
  id: record.id,
  patient_id: record.patientId,
  patient_name: record.patientName,
  insurance_company: record.insuranceCompany,
  pre_auth_number: record.preAuthNumber,
  procedure_code: record.procedureCode,
  treatment_detail: record.treatmentDetail,
  requested_amount: record.requestedAmount,
  status: record.status,
  date_requested: record.dateRequested,
  expiration_date: record.expirationDate,
  approved_amount: record.approvedAmount,
  handler: record.handler,
  notes: record.notes,
  archived: false,
  archived_at: null,
  archived_by: null
});


const CourtStreetRCM = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  // Unified date state for all dashboard sections (uses local timezone)
  const [dashboardDate, setDashboardDate] = useState(getLocalDateString());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState('EOD Report - Court Street Dental');
  const [emailMessage, setEmailMessage] = useState('');
  const [scheduleEmail, setScheduleEmail] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('17:00');
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [selectedTemplate, setSelectedTemplate] = useState('full');
  const [showBAMModal, setShowBAMModal] = useState(false);
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);
  const [showTopProceduresModal, setShowTopProceduresModal] = useState(false);
  const [isDayMode, setIsDayMode] = useState(true);

  // AI Insights state
  const [isInsightsPanelOpen, setIsInsightsPanelOpen] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [paymentInsights, setPaymentInsights] = useState<PaymentInsight[]>([]);

  // Top Procedures state
  const [topProcedures, setTopProcedures] = useState<any[]>([]);

  // Insurance Provider state
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);

  // Patient Management state
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [preAuths, setPreAuths] = useState<PreAuthRecord[]>([]);
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  const [showAddPreAuthModal, setShowAddPreAuthModal] = useState(false);
  const [_claimsLoading, setClaimsLoading] = useState(true);
  const [_preAuthsLoading, setPreAuthsLoading] = useState(true);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClaimRecord | PreAuthRecord | null>(null);
  const [editingType, setEditingType] = useState<'claim' | 'preauth' | null>(null);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: 'claim' | 'preauth', id: string, name: string } | null>(null);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItem, setHistoryItem] = useState<{ type: 'claim' | 'preauth', id: string, name: string } | null>(null);
  const [historyData, setHistoryData] = useState<(ClaimAuditHistory | PreAuthAuditHistory)[]>([]);

  // Archive view toggle state
  const [showArchivedClaims, setShowArchivedClaims] = useState(false);
  const [showArchivedPreAuths, setShowArchivedPreAuths] = useState(false);

  // Fetch all metrics from Supabase using unified date
  const { data: metricsData, loading: metricsLoading, error: metricsError, refresh: refreshMetrics } = useMetrics(dashboardDate);
  const { data: eodData, loading: eodLoading, error: eodError, refresh: refreshEOD } = useEODMetrics(dashboardDate);
  const { data: dailyProductionByProvider, loading: providerLoading, error: providerError, refresh: refreshProvider } = useProviderMetrics(dashboardDate);
  const { data: newPatientTrackerData, loading: _newPatientLoading, error: _newPatientError, refresh: _refreshNewPatients } = useNewPatientTracker(eodData?.newPatients || 0);

  // DISABLED: Date tracking and daily reset logic (now using Supabase)
  // All data is stored in Supabase and fetched by date, no need for localStorage resets
  /*
  useEffect(() => {
    const checkAndResetDaily = () => {
      const today = getTodayDateString();
      const lastSavedDate = localStorage.getItem(STORAGE_KEYS.CURRENT_DATE);

      if (lastSavedDate && lastSavedDate !== today) {
        const yesterdayData = {
          ...eodData,
          dailyProductionByProvider
        };
        saveEODData(lastSavedDate, yesterdayData);

        const newEODData = getInitialEODData();
        const newProductionData = getInitialDailyProductionByProvider();

        setEodData(newEODData);
        setDailyProductionByProvider(newProductionData);

        saveDailyData({
          ...newEODData,
          dailyProductionByProvider: newProductionData
        });

        console.log(`Daily reset completed. Data from ${lastSavedDate} saved to history.`);
      }

      localStorage.setItem(STORAGE_KEYS.CURRENT_DATE, today);
    };

    checkAndResetDaily();
    const interval = setInterval(checkAndResetDaily, 60000);
    return () => clearInterval(interval);
  }, [eodData, dailyProductionByProvider]);
  */

  // DISABLED: Auto-save daily data (now using Supabase)
  // Data is automatically fetched from Supabase, no need to save to localStorage
  /*
  useEffect(() => {
    const dataToSave = {
      ...eodData,
      dailyProductionByProvider
    };
    saveDailyData(dataToSave);
  }, [eodData, dailyProductionByProvider]);
  */

  // DISABLED: Helper functions to update daily metrics (now using Supabase)
  // Data is read-only from Supabase. To edit, update Supabase directly or use CSV import.
  /*
  const updateEODData = (updates: any) => {
    setEodData((prev: any) => ({
      ...prev,
      ...updates,
      reportDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }));
  };

  const updateDailyProduction = (providerUpdates: any) => {
    setDailyProductionByProvider((prev: any) => ({
      ...prev,
      ...providerUpdates
    }));
  };

  const saveCurrentEODToHistory = () => {
    const today = getTodayDateString();
    const dataToSave = {
      ...eodData,
      dailyProductionByProvider
    };
    saveEODData(today, dataToSave);
    console.log(`EOD data for ${today} saved to history.`);
  };

  const loadHistoricalEOD = (date: string) => {
    const historicalData = getEODData(date);
    if (historicalData) {
      setEodData(historicalData);
      if (historicalData.dailyProductionByProvider) {
        setDailyProductionByProvider(historicalData.dailyProductionByProvider);
      }
      console.log(`Loaded EOD data from ${date}`);
    } else {
      console.log(`No EOD data found for ${date}`);
    }
  };
  */

  // Fetch claims from Supabase (refetch when toggle changes)
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setClaimsLoading(true);
        const claimsData = showArchivedClaims ? await getArchivedClaims() : await getActiveClaims();
        const claimRecords = claimsData.map(claimToRecord);
        setClaims(claimRecords);
      } catch (error) {
        console.error('Error fetching claims:', error);
      } finally {
        setClaimsLoading(false);
      }
    };

    fetchClaims();
  }, [showArchivedClaims]);

  // Fetch pre-auths from Supabase (refetch when toggle changes)
  useEffect(() => {
    const fetchPreAuths = async () => {
      try {
        setPreAuthsLoading(true);
        const preAuthsData = showArchivedPreAuths ? await getArchivedPreAuths() : await getActivePreAuths();
        const preAuthRecords = preAuthsData.map(preAuthToRecord);
        setPreAuths(preAuthRecords);
      } catch (error) {
        console.error('Error fetching pre-auths:', error);
      } finally {
        setPreAuthsLoading(false);
      }
    };

    fetchPreAuths();
  }, [showArchivedPreAuths]);

  // Set up real-time subscriptions for claims and pre-auths
  useEffect(() => {
    // Subscribe to claims changes
    const claimsSubscription = subscribeToClaimsChanges(async (payload) => {
      console.log('Claims change detected:', payload);
      // Refetch claims data
      try {
        const claimsData = await getClaims();
        const claimRecords = claimsData.map(claimToRecord);
        setClaims(claimRecords);
      } catch (error) {
        console.error('Error refetching claims after update:', error);
      }
    });

    // Subscribe to pre-auths changes
    const preAuthsSubscription = subscribeToPreAuthsChanges(async (payload) => {
      console.log('Pre-auths change detected:', payload);
      // Refetch pre-auths data
      try {
        const preAuthsData = await getPreAuths();
        const preAuthRecords = preAuthsData.map(preAuthToRecord);
        setPreAuths(preAuthRecords);
      } catch (error) {
        console.error('Error refetching pre-auths after update:', error);
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      claimsSubscription.unsubscribe();
      preAuthsSubscription.unsubscribe();
    };
  }, []);

  // Expose helper functions to window for console access (useful for testing and manual operations)
  useEffect(() => {
    (window as any).csdHelpers = {
      // Update functions disabled - data is read-only from Supabase
      // Use CSV import or Supabase UI to edit data
      getCurrentEODData: () => eodData,
      getCurrentProductionData: () => dailyProductionByProvider,
      refreshData: () => {
        refreshMetrics();
        refreshEOD();
        refreshProvider();
      },
      getStorageInfo: () => {
        console.log('Current Date:', localStorage.getItem(STORAGE_KEYS.CURRENT_DATE));
        console.log('EOD History:', JSON.parse(localStorage.getItem(STORAGE_KEYS.EOD_HISTORY) || '{}'));
        console.log('Daily Data:', JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_DATA) || 'null'));
      },
      clearAllData: () => {
        if (confirm('Are you sure you want to clear ALL stored data? This cannot be undone.')) {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_DATE);
          localStorage.removeItem(STORAGE_KEYS.EOD_HISTORY);
          localStorage.removeItem(STORAGE_KEYS.DAILY_DATA);
          window.location.reload();
        }
      },
      checkSupabaseConnection: async () => {
        console.log('🔍 Checking Supabase connection...');
        console.log('Environment Variables:');
        console.log('  VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Not set');
        console.log('  VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Set (first 20 chars): ' + import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20) + '...' : '✗ Not set');

        try {
          const { getMetricsForDate } = await import('./services/metrics');
          const today = getLocalDateString();
          console.log(`Fetching metrics for ${today}...`);
          const metrics = await getMetricsForDate(today);
          console.log(`✓ Successfully fetched ${metrics.length} metrics from Supabase`);
          console.log('Sample metrics:', metrics.slice(0, 3));
          return { success: true, count: metrics.length, sample: metrics.slice(0, 3) };
        } catch (error) {
          console.error('✗ Error connecting to Supabase:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      checkDateData: async (date: string) => {
        console.log(`🔍 Checking Supabase data for ${date}...`);
        try {
          const { getMetricsForDate } = await import('./services/metrics');
          const metrics = await getMetricsForDate(date);

          if (metrics.length === 0) {
            console.warn(`⚠️ No data found for ${date}`);
            return { found: false, count: 0 };
          }

          console.log(`✓ Found ${metrics.length} metrics for ${date}`);
          console.log('\n📊 Metrics Summary:');

          // Group by section
          const bySection: Record<string, any[]> = {};
          metrics.forEach(m => {
            const section = m.csd_metric_catalog?.section || 'UNKNOWN';
            if (!bySection[section]) bySection[section] = [];
            bySection[section].push({
              field: m.field_key,
              value: m.value,
              name: m.csd_metric_catalog?.field_name || 'Unknown'
            });
          });

          Object.keys(bySection).forEach(section => {
            console.log(`\n  ${section}:`);
            bySection[section].forEach(m => {
              console.log(`    • ${m.name} (${m.field}): ${m.value}`);
            });
          });

          console.log('\n📋 Full data:', metrics);
          return { found: true, count: metrics.length, data: metrics, bySection };
        } catch (error) {
          console.error('✗ Error fetching data:', error);
          return { found: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      compareExpectedFields: async (date: string) => {
        console.log(`🔍 Comparing expected fields vs actual data for ${date}...`);

        // Fields the app expects
        const expectedFields = {
          DASHBOARD: ['bam_current_revenue', 'bam_target_goal', 'practice_goal', 'collection_rate', 'active_patients', 'active_claims', 'pending_payments', 'outstanding_ar'],
          PAYMENTS: ['todays_payments', 'weekly_payments', 'monthly_payments', 'pending_deposits', 'insurance_payments', 'patient_payments', 'unapplied_credits', 'refunds_pending'],
          PATIENTS: ['total_patients', 'active_patients', 'patients_with_balance', 'total_patient_ar', 'patient_ar_0_30', 'patient_ar_31_60', 'patient_ar_61_90', 'patient_ar_90_plus', 'payment_plans', 'past_due_accounts'],
          PRE_AUTHS: ['total_pre_auths', 'pre_auths_pending', 'pre_auths_approved', 'pre_auths_denied', 'pre_auths_expiring_soon', 'pre_auths_expiring_this_month'],
          EOD_REPORT: ['eod_payment_cherry', 'eod_payment_carecredit']
        };

        try {
          const { getMetricsForDate } = await import('./services/metrics');
          const metrics = await getMetricsForDate(date);
          const foundFields = new Set(metrics.map(m => m.field_key));

          console.log('\n📊 Field Comparison Results:\n');

          let totalExpected = 0;
          let totalFound = 0;
          let totalMissing = 0;

          Object.entries(expectedFields).forEach(([section, fields]) => {
            const missing = fields.filter(f => !foundFields.has(f));
            const present = fields.filter(f => foundFields.has(f));

            totalExpected += fields.length;
            totalFound += present.length;
            totalMissing += missing.length;

            console.log(`  ${section}:`);
            console.log(`    Expected: ${fields.length} fields`);
            console.log(`    Found: ${present.length} fields`);

            if (missing.length > 0) {
              console.log(`    ❌ Missing (${missing.length}):`, missing);
            } else {
              console.log(`    ✓ All fields present!`);
            }

            if (present.length > 0) {
              console.log(`    ✓ Present (${present.length}):`, present);
            }
            console.log('');
          });

          console.log(`\n📈 Summary:`);
          console.log(`  Total Expected: ${totalExpected}`);
          console.log(`  Total Found: ${totalFound}`);
          console.log(`  Total Missing: ${totalMissing}`);
          console.log(`  Completion: ${Math.round((totalFound / totalExpected) * 100)}%\n`);

          if (totalMissing > 0) {
            console.log(`⚠️ You're missing ${totalMissing} fields. Add them to Supabase to see data in dashboard.`);
            console.log(`📖 See SUPABASE-FIELD-MAPPING.md for the complete field reference.`);
          } else {
            console.log(`✓ All expected fields are present!`);
          }

          return {
            totalExpected,
            totalFound,
            totalMissing,
            completionPercent: Math.round((totalFound / totalExpected) * 100),
            expectedFields,
            foundFields: Array.from(foundFields)
          };
        } catch (error) {
          console.error('✗ Error comparing fields:', error);
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    };
    console.log('CSD Helpers loaded. Access via window.csdHelpers');
  }, [eodData, dailyProductionByProvider]);

  // Generate AI insights whenever metrics data changes
  useEffect(() => {
    if (metricsData) {
      const newInsights = generateInsights(
        {
          bam: {
            currentRevenue: metricsData.dashboard.bamCurrentRevenue,
            targetGoal: metricsData.dashboard.bamTargetGoal,
            practiceGoal: metricsData.dashboard.practiceGoal,
          },
          claims: {
            totalActive: metricsData.claims.totalActive,
            pending: metricsData.claims.pending,
            denied: metricsData.claims.denied,
            overSixtyDays: metricsData.claims.overSixtyDays,
          },
          patients: {
            activePatients: metricsData.patients.activePatients,
          },
          payments: {
            todaysPayments: metricsData.payments.todaysPayments,
            weeklyPayments: metricsData.payments.weeklyPayments,
            monthlyPayments: metricsData.payments.monthlyPayments,
          },
          financials: {
            collectionRate: metricsData.dashboard.collectionRate,
            outstandingAR: metricsData.dashboard.outstandingAR,
          },
        },
        newPatientTrackerData
      );
      setInsights(newInsights);
    }
  }, [metricsData, newPatientTrackerData]);

  // Generate payment insights whenever payment metrics change
  useEffect(() => {
    if (metricsData && eodData) {
      const newPaymentInsights = generatePaymentInsights(
        metricsData.payments,
        {
          mtdProduction: eodData.monthToDateSummary.production,
          mtdCollected: eodData.monthToDateSummary.collected,
          mtdCollectionRate: eodData.monthToDateSummary.collectionRate,
          paymentsCollected: eodData.paymentsCollected,
          insurancePayments: eodData.insurancePayments,
          patientPayments: eodData.patientPayments,
        }
      );
      setPaymentInsights(newPaymentInsights);
    }
  }, [metricsData, eodData]);

  // Fetch top procedures for the selected date
  useEffect(() => {
    const fetchTopProcedures = async () => {
      const procedures = await getTopProceduresForDate(dashboardDate);
      setTopProcedures(procedures);
    };
    fetchTopProcedures();
  }, [dashboardDate]);

  // Fetch insurance providers (only needs to run once on mount)
  useEffect(() => {
    const fetchInsuranceProviders = async () => {
      const providers = await getInsuranceProviders();
      setInsuranceProviders(providers);
    };
    fetchInsuranceProviders();
  }, []);

  // Function to refresh insights
  const handleRefreshInsights = () => {
    setIsRefreshingInsights(true);
    // Refresh all data sources
    refreshMetrics();
    refreshEOD();
    // Wait a bit for data to update, then stop the spinner
    setTimeout(() => {
      setIsRefreshingInsights(false);
    }, 1000);
  };

  const csdGold = '#B8985F';

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

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
  const bamCycleReferenceStart = new Date(2025, 8, 23); // BAM cycle reference start date (Sept 23, 2025) - Month is 0-indexed
  const bamCycle = calculateBAMCycle(bamCycleReferenceStart);

  // Historical BAM Cycle Data (for trend graph)
  const historicalBAMData = [
    { cycle: 'Previous', startDate: 'Sep 23', endDate: 'Oct 17', revenue: 202259.69, goal: 224548 }, // Previous cycle (Sept 23 - Oct 17, 2025)
    { cycle: 'Current', startDate: bamCycle.currentCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), endDate: bamCycle.currentCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: 223235.05, goal: 224548 }, // Current cycle (Oct 18 - Nov 13, 2025)
  ];

  // Dashboard data - using Supabase data when available, fallback to defaults
  const dashboardData = {
    bamCurrentRevenue: metricsData?.dashboard.bamCurrentRevenue ?? 223235.05,
    bamTargetGoal: metricsData?.dashboard.bamTargetGoal ?? 224548,
    practiceGoal: metricsData?.dashboard.practiceGoal ?? 300000,
    bamCycleStart: bamCycle.currentCycleStart,
    bamCycleEnd: bamCycle.currentCycleEnd,
    bamDaysRemaining: bamCycle.daysRemaining,
    bamNextCycleStart: bamCycle.nextCycleStart,
    bamNextCycleEnd: bamCycle.nextCycleEnd,
    collectionRate: metricsData?.dashboard.collectionRate ?? 73,
    activePatients: metricsData?.dashboard.activePatients ?? 1935,
    activeClaims: metricsData?.dashboard.activeClaims ?? 284,
    pendingPayments: metricsData?.dashboard.pendingPayments ?? 0,
    outstandingAR: metricsData?.dashboard.outstandingAR ?? 186357.25
  };

  // Payments data - using Supabase data when available, fallback to defaults
  const paymentsData = {
    todaysPayments: metricsData?.payments.todaysPayments ?? 0,
    weeklyPayments: metricsData?.payments.weeklyPayments ?? 27589.99,
    monthlyPayments: metricsData?.payments.monthlyPayments ?? 93417.40,
    pendingDeposits: metricsData?.payments.pendingDeposits ?? 0,
    insurancePayments: metricsData?.payments.insurancePayments ?? 26198.07,
    patientPayments: metricsData?.payments.patientPayments ?? 67219.33,
    unappliedCredits: metricsData?.payments.unappliedCredits ?? 2969.79,
    refundsPending: metricsData?.payments.refundsPending ?? 0
  };

  // Patients data - using Supabase data when available, fallback to defaults
  const patientsData = {
    totalPatients: metricsData?.patients.totalPatients ?? 0,
    activePatients: metricsData?.patients.activePatients ?? 1942,
    patientsWithBalance: metricsData?.patients.patientsWithBalance ?? 1128,
    totalPatientAR: metricsData?.patients.totalPatientAR ?? 448646.05,
    patientARAging: {
      zeroToThirty: metricsData?.patients.patientARAging.zeroToThirty ?? 109630.41,
      thirtyOneToSixty: metricsData?.patients.patientARAging.thirtyOneToSixty ?? 46640.77,
      sixtyOneToNinety: metricsData?.patients.patientARAging.sixtyOneToNinety ?? 30086.07,
      ninetyPlus: metricsData?.patients.patientARAging.ninetyPlus ?? 262288.80
    },
    paymentPlans: metricsData?.patients.paymentPlans ?? 0,
    pastDueAccounts: metricsData?.patients.pastDueAccounts ?? 1128
  };

  // Insurance data - use Supabase if available, otherwise fallback to hardcoded
  const defaultProviders = [
    { name: 'Aetna', feeSchedule: 'Direct', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'In', drJudge: 'In', drStrachan: 'In' },
    { name: 'Cigna', feeSchedule: 'Connection', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'In', drJudge: 'In', drStrachan: 'In' },
    { name: 'Delta Dental Insurance', feeSchedule: 'Direct', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'Out', drJudge: 'Out', drStrachan: 'Out' },
    { name: 'MetLife', feeSchedule: 'Connection', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'In', drJudge: 'In', drStrachan: 'In' },
    { name: 'Anthem BCBS', feeSchedule: 'Decare', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'In', drJudge: 'In', drStrachan: 'In' },
    { name: 'United Healthcare (Optum ID)', feeSchedule: 'Connection', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'Out', drJudge: 'Out', drStrachan: 'Out' },
    { name: 'Guardian', feeSchedule: 'Connection', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'Out', drJudge: 'Out', drStrachan: 'Out' },
    { name: 'Humana', feeSchedule: 'Direct', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'In', drJudge: 'In', drStrachan: 'In' },
    { name: 'Ameritas', feeSchedule: 'Direct', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'In', drJudge: 'In', drStrachan: 'In' },
    { name: 'Principal', feeSchedule: 'Direct', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'In', drJudge: 'In', drStrachan: 'In' },
    { name: 'Beam Benefits', feeSchedule: 'Direct', portalStatus: 'All Set!', eftStatus: 'Enrolled', drGajjar: 'In', drJudge: 'In', drStrachan: 'In' }
  ];

  const providers = insuranceProviders.length > 0
    ? insuranceProviders.map((p: InsuranceProvider) => ({
        name: p.name,
        feeSchedule: p.fee_schedule,
        portalStatus: p.portal_status,
        eftStatus: p.eft_status,
        drGajjar: p.dr_gajjar_network,
        drJudge: p.dr_judge_network,
        drStrachan: p.dr_strachan_network
      }))
    : defaultProviders;

  // Calculate in-network count (all 3 doctors must be "In")
  const inNetworkCount = providers.filter(p => p.drGajjar === 'In' && p.drJudge === 'In' && p.drStrachan === 'In').length;
  const gajjarIn = providers.filter(p => p.drGajjar === 'In').length;
  const judgeIn = providers.filter(p => p.drJudge === 'In').length;
  const strachanIn = providers.filter(p => p.drStrachan === 'In').length;
  const totalPlans = providers.length;

  const insuranceData = {
    totalProviders: inNetworkCount, // Number of plans where ALL doctors are in-network
    activePlans: totalPlans,
    credentialingPending: 0,
    verificationsPending: 0,
    topPayerByVolume: "Delta Dental",
    topPayerByRevenue: "Aetna",
    totalPortals: totalPlans,
    eftEnrolled: totalPlans,
    connectionNetwork: providers.filter(p => p.feeSchedule === 'Connection').length,
    directContracts: providers.filter(p => p.feeSchedule === 'Direct').length,
    providers,
    networkSummary: {
      drGajjar: { inNetwork: gajjarIn, outNetwork: totalPlans - gajjarIn, percentage: totalPlans > 0 ? Math.round((gajjarIn / totalPlans) * 100) : 0 },
      drJudge: { inNetwork: judgeIn, outNetwork: totalPlans - judgeIn, percentage: totalPlans > 0 ? Math.round((judgeIn / totalPlans) * 100) : 0 },
      drStrachan: { inNetwork: strachanIn, outNetwork: totalPlans - strachanIn, percentage: totalPlans > 0 ? Math.round((strachanIn / totalPlans) * 100) : 0 }
    }
  };

  // Scorecard data - pulls from live data sources
  const scorecardData = {
    // Production metrics from BAM data
    productionGoal: metricsData?.dashboard.practiceGoal ?? 300000,
    productionActual: metricsData?.dashboard.bamCurrentRevenue ?? 0,

    // Collection metrics from dashboard
    collectionGoal: 98, // Target collection rate percentage
    collectionActual: metricsData?.dashboard.collectionRate ?? 0,

    // New patients from tracker
    newPatientsGoal: newPatientTrackerData?.perMonthGoal ?? 30,
    newPatientsActual: newPatientTrackerData?.perMonth ?? 0,

    // Claim metrics - calculated from claims data
    claimApprovalRate: (() => {
      if (!metricsData || !metricsData.claims.totalActive) return 90;
      const total = metricsData.claims.totalActive;
      const denied = metricsData.claims.denied || 0;
      return Math.round(((total - denied) / total) * 100);
    })(),
    avgDaysToPay: 0, // Can be added to Supabase csd_metric_values later

    // Enhanced metrics - show rates (defaults until added to Supabase)
    avgShowRateDr: 77.5,
    avgShowRateDrTarget: 90,
    avgShowRateHyg: 49.3,
    avgShowRateHygTarget: 85,

    // New patients per week from tracker
    avgNewPatientsPerWeek: newPatientTrackerData?.perWeek ?? 0,

    // Treatment acceptance (defaults until added to Supabase)
    txAcceptance: 52.6,
    txAcceptanceTarget: 50,

    // Collection rate from dashboard
    avgCollectionRate: metricsData?.dashboard.collectionRate ?? 0,
    avgCollectionRateTarget: 100,

    // Treatment totals (defaults until added to Supabase)
    totalTxPresented: 0,
    totalTxAccepted: 0,

    // Monthly totals
    totalNewPatients: newPatientTrackerData?.perMonth ?? 0,
    fiveStarReviews: 0, // Can be added to Supabase csd_metric_values later

    // Weekly data - defaults until added to Supabase
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
  // Advanced Metrics - fetched from Supabase
  const advancedMetrics = {
    // Financial Metrics - from Supabase
    cac: metricsData?.advanced.cac ?? 0,
    grossProfitMargin: metricsData?.advanced.grossProfitMargin ?? 0,
    operatingProfitMargin: metricsData?.advanced.operatingProfitMargin ?? 0,
    cashFlow: metricsData?.advanced.cashFlow ?? 0,
    revenueGrowthRate: metricsData?.advanced.revenueGrowthRate ?? 0,

    // COGS Components - from Supabase
    cogs: {
      dentalSupplies: metricsData?.advanced.cogs.dentalSupplies ?? 0,
      labFees: metricsData?.advanced.cogs.labFees ?? 0,
      associateDoctorExpense: metricsData?.advanced.cogs.associateDoctorExpense ?? 0,
      hygienePayroll: metricsData?.advanced.cogs.hygienePayroll ?? 0,
      assistantPayroll: metricsData?.advanced.cogs.assistantPayroll ?? 0,
      totalCOGS: metricsData?.advanced.cogs.totalCOGS ?? 0
    },

    operatingCosts: metricsData?.advanced.operatingCosts ?? 0,

    // Customer Metrics
    churnedPatientsPerMonth: metricsData?.advanced.churnedPatientsMonth ?? 0,
    churnRate: 13.2, // Calculated or hardcoded
    patientLifeCycleMonths: 0, // Calculated
    patientLifeCycleYears: 0, // Calculated
    activePtsFirstOfPriorMonth: 0, // TODO: Add to Supabase

    // Revenue Metrics
    averageRevenuePerClient: 0, // TODO: Calculate or add to Supabase
    ltv: 0, // TODO: Calculate (ARPC x Avg Retention Period)
    avgRetentionPeriod: 0, // TODO: Calculate

    // Satisfaction Metrics
    nps: 99, // TODO: Add to Supabase or calculate
    enps: 0, // TODO: Add to Supabase

    // Employee Metrics
    employeeUtilizationRate: 0 // TODO: Calculate or add to Supabase
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

  // EOD Report data (now managed by state - see above)

  // Claims data - using Supabase data when available, fallback to defaults
  const claimsData = {
    totalActive: metricsData?.claims.totalActive ?? 283,
    pending: metricsData?.claims.pending ?? 201,
    denied: metricsData?.claims.denied ?? 0,
    overSixtyDays: metricsData?.claims.overSixtyDays ?? 54,
    arAging: {
      zeroToThirty: {
        amount: metricsData?.claims.arAging.zeroToThirty.amount ?? 143767.80,
        count: metricsData?.claims.arAging.zeroToThirty.count ?? 284
      },
      thirtyOneToSixty: {
        amount: metricsData?.claims.arAging.thirtyOneToSixty.amount ?? 21870.99,
        count: metricsData?.claims.arAging.thirtyOneToSixty.count ?? 32
      },
      sixtyOneToNinety: {
        amount: metricsData?.claims.arAging.sixtyOneToNinety.amount ?? 22570.01,
        count: metricsData?.claims.arAging.sixtyOneToNinety.count ?? 21
      },
      ninetyPlus: {
        amount: metricsData?.claims.arAging.ninetyPlus.amount ?? 35995.39,
        count: metricsData?.claims.arAging.ninetyPlus.count ?? 33
      }
    }
  };

  // New Patient Tracker data is now managed by the useNewPatientTracker hook above

  // Third Party Financing data - now comes from metricsData.financing
  const thirdPartyFinancingData = metricsData?.financing || {
    cherryPatients: 0,
    careCreditPatients: 0,
    cherryAmount: 0,
    careCreditAmount: 0,
    totalPatients: 0,
    totalAmount: 0
  };

  // Daily Production by Provider data (now managed by state - see above)

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'patient-management', name: 'Patient Management', icon: Users },
    { id: 'payments', name: 'Payments', icon: DollarSign },
    { id: 'insurance', name: 'Insurance', icon: Shield },
    { id: 'scorecard', name: 'Scorecard', icon: Award },
    { id: 'checklist', name: 'Checklist', icon: List },
    { id: 'eod-report', name: 'EOD Report', icon: Calendar }
  ];

  // Sub-navigation for Patient Management tab
  const [patientManagementView, setPatientManagementView] = useState('claims');

  // Filter functions for search
  const filteredClaims = claims.filter(claim =>
    searchQuery === '' ||
    claim.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.insuranceCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.claimNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.procedureCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPreAuths = preAuths.filter(preAuth =>
    searchQuery === '' ||
    preAuth.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preAuth.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preAuth.insuranceCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preAuth.preAuthNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preAuth.procedureCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preAuth.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler functions for claims and pre-auths management
  const handleEditClaim = (claim: ClaimRecord) => {
    setEditingItem(claim);
    setEditingType('claim');
    setShowEditModal(true);
  };

  const handleEditPreAuth = (preAuth: PreAuthRecord) => {
    setEditingItem(preAuth);
    setEditingType('preauth');
    setShowEditModal(true);
  };

  const handleDeleteClick = (type: 'claim' | 'preauth', id: string, name: string) => {
    setDeleteItem({ type, id, name });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;

    try {
      if (deleteItem.type === 'claim') {
        await deleteClaim(deleteItem.id);
        setClaims(claims.filter(c => c.id !== deleteItem.id));
      } else {
        await deletePreAuth(deleteItem.id);
        setPreAuths(preAuths.filter(pa => pa.id !== deleteItem.id));
      }
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete. Please try again.');
    }
  };

  const handleArchiveClaim = async (id: string) => {
    try {
      await archiveClaim(id, 'user');
      // Remove from current view (we're viewing active records)
      setClaims(claims.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error archiving claim:', error);
      alert('Failed to archive claim. Please try again.');
    }
  };

  const handleUnarchiveClaim = async (id: string) => {
    try {
      await unarchiveClaim(id);
      // Remove from current view (we're viewing archived records)
      setClaims(claims.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error unarchiving claim:', error);
      alert('Failed to unarchive claim. Please try again.');
    }
  };

  const handleArchivePreAuth = async (id: string) => {
    try {
      await archivePreAuth(id, 'user');
      // Remove from current view (we're viewing active records)
      setPreAuths(preAuths.filter(pa => pa.id !== id));
    } catch (error) {
      console.error('Error archiving pre-auth:', error);
      alert('Failed to archive pre-auth. Please try again.');
    }
  };

  const handleUnarchivePreAuth = async (id: string) => {
    try {
      await unarchivePreAuth(id);
      // Remove from current view (we're viewing archived records)
      setPreAuths(preAuths.filter(pa => pa.id !== id));
    } catch (error) {
      console.error('Error unarchiving pre-auth:', error);
      alert('Failed to unarchive pre-auth. Please try again.');
    }
  };

  const handleViewHistory = async (type: 'claim' | 'preauth', id: string, name: string) => {
    setHistoryItem({ type, id, name });
    setShowHistoryModal(true);

    try {
      if (type === 'claim') {
        const history = await getClaimAuditHistory(id);
        setHistoryData(history);
      } else {
        const history = await getPreAuthAuditHistory(id);
        setHistoryData(history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryData([]);
    }
  };

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
              <title>EOD Report - ${dashboardDate}</title>
              <style>
                @media print {
                  @page { margin: 0.5in; }
                  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                }

                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  padding: 20px;
                  color: #1f2937;
                  background: white;
                }

                /* Report Header Styling */
                .report-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                  border-bottom: 3px solid #B8985F;
                }

                .report-header > div:first-child {
                  display: flex;
                  align-items: center;
                  gap: 15px;
                }

                .report-header h1 {
                  color: #B8985F;
                  font-size: 28px;
                  font-weight: bold;
                  margin: 0;
                }

                .report-header h2 {
                  font-size: 20px;
                  font-weight: 600;
                  margin: 0;
                  color: #1f2937;
                }

                .report-header p {
                  margin: 5px 0 0 0;
                  font-size: 14px;
                  color: #6b7280;
                }

                /* Logo styling */
                .report-header > div:first-child > div:first-child {
                  width: 64px;
                  height: 64px;
                  background-color: #B8985F;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                }

                .report-header > div:first-child > div:first-child span {
                  color: white;
                  font-size: 24px;
                  font-weight: bold;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                  font-size: 14px;
                }

                th, td {
                  border: 1px solid #e5e7eb;
                  padding: 10px;
                  text-align: left;
                }

                th {
                  background-color: #f9fafb;
                  font-weight: 600;
                  color: #374151;
                }

                .header {
                  color: #B8985F;
                  font-size: 20px;
                  font-weight: 600;
                  margin: 25px 0 15px 0;
                }

                .section {
                  margin: 20px 0;
                  page-break-inside: avoid;
                }

                .metric {
                  display: inline-block;
                  margin: 10px;
                  padding: 15px;
                  border: 2px solid #e5e7eb;
                  border-radius: 8px;
                  min-width: 200px;
                }

                /* Grid layouts for cards */
                .grid {
                  display: grid;
                  gap: 15px;
                  margin: 20px 0;
                }

                /* Improve card visibility in print */
                [class*="bg-gradient"] {
                  border: 2px solid #e5e7eb;
                  padding: 15px;
                  border-radius: 8px;
                  margin-bottom: 10px;
                  page-break-inside: avoid;
                }

                /* Hide certain UI elements in print */
                button, .no-print {
                  display: none !important;
                }
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
      reportDate: dashboardDate,
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

  // Loading state - wait for all data to load from Supabase
  if (metricsLoading || eodLoading || providerLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading dashboard data from Supabase...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (metricsError || eodError || providerError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">
            {metricsError || eodError || providerError}
          </p>
          <button
            onClick={() => {
              refreshMetrics();
              refreshEOD();
              refreshProvider();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Null safety guard - ensure data is loaded
  if (!eodData || !dailyProductionByProvider) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">No data available for selected date</p>
          <p className="text-sm text-gray-500 mt-2">Try selecting a different date or adding data to Supabase</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDayMode ? 'bg-gray-100' : 'bg-gray-900'}`}>
      {/* Header */}
      <div className={`${isDayMode ? 'bg-white' : 'bg-gray-800'} shadow`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: csdGold }}>
                Court Street Dental RCM Dashboard
              </h1>
              <p className={`text-sm mt-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Powered by Stellar Consults - Revenue Cycle Management Solutions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDayMode(!isDayMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-md ${
                  isDayMode
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-amber-400 text-gray-900 hover:bg-amber-300'
                }`}
              >
                {isDayMode ? (
                  <>
                    <Moon className="w-5 h-5" />
                    <span className="text-sm font-medium">Night Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-5 h-5" />
                    <span className="text-sm font-medium">Day Mode</span>
                  </>
                )}
              </button>
              <a
                href="https://trello.com/b/Jq0zcebf/court-street-dental-admin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                <span className="text-sm font-medium">Task Board</span>
              </a>
              <div className="text-right">
                <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>A Collaborative Solution</p>
                <p className={`text-xs font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Court Street Dental × Stellar Consults</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={`${isDayMode ? 'bg-white' : 'bg-gray-800'} shadow mb-6`}>
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex flex-wrap gap-4 py-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center space-x-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                    currentView === item.id
                      ? 'bg-blue-500 text-white'
                      : isDayMode
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className={`text-3xl font-bold mb-2 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                      {getGreeting()}, Team! 👋
                    </h2>
                    <h3 className="text-xl font-semibold mb-1" style={{ color: csdGold }}>
                      Practice Overview Dashboard
                    </h3>
                    <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-300'}`}>
                      Real-time insights into your revenue cycle performance
                    </p>
                  </div>
                  {/* Date Selector and Refresh */}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dashboardDate}
                      onChange={(e) => setDashboardDate(e.target.value)}
                      className={`px-3 py-2 rounded border ${
                        isDayMode
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                    />
                    <button
                      onClick={refreshMetrics}
                      disabled={metricsLoading}
                      className={`p-2 rounded hover:bg-opacity-80 transition-all ${
                        isDayMode
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } ${metricsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Refresh metrics"
                    >
                      <RefreshCw className={`w-5 h-5 ${metricsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                {/* Loading and Error States */}
                {metricsLoading && (
                  <div className={`mt-4 p-3 rounded ${isDayMode ? 'bg-blue-50 text-blue-700' : 'bg-blue-900 text-blue-200'}`}>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading metrics data...</span>
                    </div>
                  </div>
                )}
                {metricsError && (
                  <div className={`mt-4 p-3 rounded ${isDayMode ? 'bg-red-50 text-red-700' : 'bg-red-900 text-red-200'}`}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Error loading metrics: {metricsError}</span>
                    </div>
                  </div>
                )}
                {!metricsLoading && !metricsError && metricsData && (
                  <div className={`mt-4 p-3 rounded ${isDayMode ? 'bg-green-50 text-green-700' : 'bg-green-900 text-green-200'}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Showing data for: {(() => {
                        const [year, month, day] = dashboardDate.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      })()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* BAM Cycle Revenue */}
              <div className={`rounded-lg p-5 hover:shadow-lg transition-all ${
                isDayMode
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300'
                  : 'bg-gradient-to-br from-green-900 to-green-800 border-2 border-green-600'
              }`}>
                <div className="flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isDayMode ? 'text-green-700' : 'text-green-300'}`}>BAM Cycle Revenue</p>
                      <p className={`text-xs ${isDayMode ? 'text-green-600' : 'text-green-400'}`}>
                        {dashboardData.bamCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <TrendingUp className={`w-6 h-6 ${isDayMode ? 'text-green-500' : 'text-green-300'}`} />
                  </div>
                  <div className="mb-2">
                    <p className={`text-3xl font-bold ${isDayMode ? 'text-green-900' : 'text-green-100'}`}>
                      ${dashboardData.bamCurrentRevenue.toLocaleString()}
                    </p>
                    <p className={`text-xs mt-1 ${isDayMode ? 'text-green-700' : 'text-green-300'}`}>
                      BAM Target: ${dashboardData.bamTargetGoal.toLocaleString()}
                    </p>
                    <p className={`text-xs ${isDayMode ? 'text-green-600' : 'text-green-400'}`}>
                      Practice Goal: ${dashboardData.practiceGoal.toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-full rounded-full h-2 mb-3 ${isDayMode ? 'bg-green-200' : 'bg-green-950'}`}>
                    <div
                      className={`h-2 rounded-full transition-all ${dashboardData.bamCurrentRevenue >= dashboardData.bamTargetGoal ? 'bg-green-600' : 'bg-green-500'}`}
                      style={{
                        width: `${Math.min((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className={`border-t pt-2 ${isDayMode ? 'border-green-200' : 'border-green-700'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${isDayMode ? 'text-green-700' : 'text-green-300'}`}>Days Remaining:</span>
                      <span className={`font-bold ${isDayMode ? 'text-green-900' : 'text-green-100'}`}>{dashboardData.bamDaysRemaining} business days</span>
                    </div>
                    <div className="mt-1">
                      <p className={`text-xs ${isDayMode ? 'text-green-600' : 'text-green-400'}`}>
                        Next Cycle: {dashboardData.bamNextCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamNextCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection Rate */}
              <div className={`rounded-lg p-5 hover:shadow-lg transition-all ${
                isDayMode
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300'
                  : 'bg-gradient-to-br from-blue-900 to-blue-800 border-2 border-blue-600'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-blue-700' : 'text-blue-300'}`}>Collection Rate</p>
                    <p className={`text-3xl font-bold ${isDayMode ? 'text-blue-900' : 'text-blue-100'}`}>
                      {dashboardData.collectionRate}%
                    </p>
                    <p className={`text-xs mt-2 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`}>Industry avg: 95%</p>
                  </div>
                  <Activity className={`w-8 h-8 ${isDayMode ? 'text-blue-500' : 'text-blue-300'}`} />
                </div>
              </div>

              {/* Active Patients */}
              <div className={`rounded-lg p-5 hover:shadow-lg transition-all ${
                isDayMode
                  ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300'
                  : 'bg-gradient-to-br from-purple-900 to-purple-800 border-2 border-purple-600'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-purple-700' : 'text-purple-300'}`}>Active Patients</p>
                    <p className={`text-3xl font-bold ${isDayMode ? 'text-purple-900' : 'text-purple-100'}`}>
                      {dashboardData.activePatients}
                    </p>
                    <p className={`text-xs mt-2 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`}>This month</p>
                  </div>
                  <Users className={`w-8 h-8 ${isDayMode ? 'text-purple-500' : 'text-purple-300'}`} />
                </div>
              </div>

              {/* Outstanding A/R */}
              <div className={`rounded-lg p-5 hover:shadow-lg transition-all ${
                isDayMode
                  ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300'
                  : 'bg-gradient-to-br from-amber-900 to-amber-800 border-2 border-amber-600'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-amber-700' : 'text-amber-300'}`}>Outstanding A/R</p>
                    <p className={`text-3xl font-bold ${isDayMode ? 'text-amber-900' : 'text-amber-100'}`}>
                      ${dashboardData.outstandingAR.toLocaleString()}
                    </p>
                    <p className={`text-xs mt-2 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`}>Total receivables</p>
                  </div>
                  <DollarSign className={`w-8 h-8 ${isDayMode ? 'text-amber-500' : 'text-amber-300'}`} />
                </div>
              </div>
            </div>

            {/* Claims & Payments Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Claims Status */}
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Claims Status
                </h3>
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded-lg ${isDayMode ? 'bg-blue-50' : 'bg-blue-900/30'}`}>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Active Claims</span>
                    </div>
                    <span className={`text-lg font-bold ${isDayMode ? 'text-blue-900' : 'text-blue-300'}`}>
                      {dashboardData.activeClaims}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${isDayMode ? 'bg-yellow-50' : 'bg-yellow-900/30'}`}>
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Pending Claims</span>
                    </div>
                    <span className={`text-lg font-bold ${isDayMode ? 'text-yellow-900' : 'text-yellow-300'}`}>
                      {claimsData.pending}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${isDayMode ? 'bg-red-50' : 'bg-red-900/30'}`}>
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Denied Claims</span>
                    </div>
                    <span className={`text-lg font-bold ${isDayMode ? 'text-red-900' : 'text-red-300'}`}>
                      {claimsData.denied}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${isDayMode ? 'bg-orange-50' : 'bg-orange-900/30'}`}>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Claims &gt;60 Days</span>
                    </div>
                    <span className={`text-lg font-bold ${isDayMode ? 'text-orange-900' : 'text-orange-300'}`}>
                      {claimsData.overSixtyDays}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setCurrentView('claims')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      isDayMode
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200'
                        : 'bg-gradient-to-r from-blue-900/30 to-blue-800/30 hover:from-blue-800/40 hover:to-blue-700/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Review Claims</span>
                    </div>
                    <span className="text-xs text-blue-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('payments')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      isDayMode
                        ? 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200'
                        : 'bg-gradient-to-r from-green-900/30 to-green-800/30 hover:from-green-800/40 hover:to-green-700/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Process Payments</span>
                    </div>
                    <span className="text-xs text-green-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('patients')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      isDayMode
                        ? 'bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200'
                        : 'bg-gradient-to-r from-purple-900/30 to-purple-800/30 hover:from-purple-800/40 hover:to-purple-700/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Manage Patients</span>
                    </div>
                    <span className="text-xs text-purple-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('scorecard')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      isDayMode
                        ? 'bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200'
                        : 'bg-gradient-to-r from-amber-900/30 to-amber-800/30 hover:from-amber-800/40 hover:to-amber-700/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Award className="w-5 h-5 text-amber-600" />
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>View Scorecard</span>
                    </div>
                    <span className="text-xs text-amber-600">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Insurance A/R Aging Summary */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Insurance A/R Aging Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`text-center p-4 rounded-lg border ${isDayMode ? 'bg-green-50 border-green-200' : 'bg-green-900/30 border-green-700'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-green-700' : 'text-green-400'}`}>0-30 Days</p>
                  <p className={`text-2xl font-bold ${isDayMode ? 'text-green-900' : 'text-green-300'}`}>
                    ${claimsData.arAging.zeroToThirty.amount.toLocaleString()}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg border ${isDayMode ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-900/30 border-yellow-700'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-yellow-700' : 'text-yellow-400'}`}>31-60 Days</p>
                  <p className={`text-2xl font-bold ${isDayMode ? 'text-yellow-900' : 'text-yellow-300'}`}>
                    ${claimsData.arAging.thirtyOneToSixty.amount.toLocaleString()}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg border ${isDayMode ? 'bg-orange-50 border-orange-200' : 'bg-orange-900/30 border-orange-700'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-orange-700' : 'text-orange-400'}`}>61-90 Days</p>
                  <p className={`text-2xl font-bold ${isDayMode ? 'text-orange-900' : 'text-orange-300'}`}>
                    ${claimsData.arAging.sixtyOneToNinety.amount.toLocaleString()}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg border ${isDayMode ? 'bg-red-50 border-red-200' : 'bg-red-900/30 border-red-700'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-red-700' : 'text-red-400'}`}>90+ Days</p>
                  <p className={`text-2xl font-bold ${isDayMode ? 'text-red-900' : 'text-red-300'}`}>
                    ${claimsData.arAging.ninetyPlus.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* New Patient Tracker */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
        ) : currentView === 'patient-management' ? (
          <div className="space-y-6">
            {/* Sub-navigation tabs */}
            <div className={`rounded-lg shadow p-4 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPatientManagementView('claims')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    patientManagementView === 'claims'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDayMode
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Claims
                </button>
                <button
                  onClick={() => setPatientManagementView('preauths')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    patientManagementView === 'preauths'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDayMode
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Pre-Auths
                </button>
                <button
                  onClick={() => setPatientManagementView('patients')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    patientManagementView === 'patients'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDayMode
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Patients
                </button>
              </div>
            </div>

            {patientManagementView === 'claims' && (
              <>
            {/* Claims Header */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: csdGold }}>
                  Claims Management
                </h2>

                {/* Archive Toggle */}
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {showArchivedClaims ? 'Showing Archived' : 'Showing Active'}
                  </span>
                  <button
                    onClick={() => setShowArchivedClaims(!showArchivedClaims)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showArchivedClaims
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {showArchivedClaims ? (
                      <span className="flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        View Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        View Archived
                      </span>
                    )}
                  </button>
                </div>
              </div>

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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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

            {/* Detailed Claims Table */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold" style={{ color: csdGold }}>
                  Claims Details ({filteredClaims.length} {filteredClaims.length === 1 ? 'claim' : 'claims'})
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                    onClick={() => exportToCSV(filteredClaims, `claims-export-${getLocalDateString()}.csv`)}
                  >
                    <Download className="w-4 h-4" />
                    <span>Export to CSV</span>
                  </button>
                  <button
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    onClick={() => setShowAddClaimModal(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Claim</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Claim #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Insurance</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Procedure</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Aging</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Handler</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClaims.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                          No claims found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredClaims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{claim.patientName}</div>
                              <div className="text-xs text-gray-500">{claim.patientId}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{claim.claimNumber}</div>
                            <div className="text-xs text-gray-500">{claim.dateSubmitted}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{claim.insuranceCompany}</td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{claim.procedureCode}</div>
                            <div className="text-xs text-gray-500">{claim.claimDetail.length > 40 ? claim.claimDetail.substring(0, 40) + '...' : claim.claimDetail}</div>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-gray-900">${claim.claimAmount.toLocaleString()}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              claim.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              claim.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              claim.status === 'Denied' ? 'bg-red-100 text-red-800' :
                              claim.status === 'In Review' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-sm font-medium ${
                              claim.agingDays > 60 ? 'text-red-600' :
                              claim.agingDays > 30 ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {claim.agingDays} days
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{claim.handler}</td>
                          <td className="px-4 py-4">
                            <div className="flex space-x-1">
                              <button
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                onClick={() => handleEditClaim(claim)}
                                title="Edit Claim"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                onClick={() => handleViewHistory('claim', claim.id, claim.patientName)}
                                title="View History"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              {showArchivedClaims ? (
                                <button
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  onClick={() => handleUnarchiveClaim(claim.id)}
                                  title="Unarchive Claim"
                                >
                                  <ArchiveRestore className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                  onClick={() => handleArchiveClaim(claim.id)}
                                  title="Archive Claim"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                onClick={() => handleDeleteClick('claim', claim.id, claim.patientName)}
                                title="Delete Claim"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}

            {/* Pre-Auths Section */}
            {patientManagementView === 'preauths' && (
              <>
                {/* Pre-Auths Header */}
                <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: csdGold }}>
                      Pre-Authorization Management
                    </h2>

                    {/* Archive Toggle */}
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {showArchivedPreAuths ? 'Showing Archived' : 'Showing Active'}
                      </span>
                      <button
                        onClick={() => setShowArchivedPreAuths(!showArchivedPreAuths)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          showArchivedPreAuths
                            ? 'bg-gray-600 text-white hover:bg-gray-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {showArchivedPreAuths ? (
                          <span className="flex items-center gap-2">
                            <Archive className="w-4 h-4" />
                            View Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Archive className="w-4 h-4" />
                            View Archived
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search by Patient, Pre-Auth #, or Insurance..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Pre-Auth Statistics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Pre-Auths */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700 mb-1">Total Pre-Auths</p>
                          <p className="text-3xl font-bold text-blue-900">{preAuths.length}</p>
                          <p className="text-xs text-blue-600 mt-2">All requests</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>

                    {/* Pending */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-700 mb-1">Pending</p>
                          <p className="text-3xl font-bold text-yellow-900">{preAuths.filter(pa => pa.status === 'Pending').length}</p>
                          <p className="text-xs text-yellow-600 mt-2">Awaiting response</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                      </div>
                    </div>

                    {/* Approved */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">Approved</p>
                          <p className="text-3xl font-bold text-green-900">{preAuths.filter(pa => pa.status === 'Approved').length}</p>
                          <p className="text-xs text-green-600 mt-2">Ready to schedule</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                    </div>

                    {/* Denied */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-1">Denied</p>
                          <p className="text-3xl font-bold text-red-900">{preAuths.filter(pa => pa.status === 'Denied').length}</p>
                          <p className="text-xs text-red-600 mt-2">Need attention</p>
                        </div>
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Pre-Auths Table */}
                <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold" style={{ color: csdGold }}>
                      Pre-Authorization Details ({filteredPreAuths.length} {filteredPreAuths.length === 1 ? 'request' : 'requests'})
                    </h3>
                    <div className="flex items-center space-x-3">
                      <button
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                        onClick={() => exportToCSV(filteredPreAuths, `pre-auths-export-${getLocalDateString()}.csv`)}
                      >
                        <Download className="w-4 h-4" />
                        <span>Export to CSV</span>
                      </button>
                      <button
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                        onClick={() => setShowAddPreAuthModal(true)}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Request Pre-Auth</span>
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2 border-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pre-Auth #</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Insurance</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Treatment</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Requested</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Approved</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Expires</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Handler</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredPreAuths.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                              No pre-authorizations found matching your search.
                            </td>
                          </tr>
                        ) : (
                          filteredPreAuths.map((preAuth) => (
                            <tr key={preAuth.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{preAuth.patientName}</div>
                                  <div className="text-xs text-gray-500">{preAuth.patientId}</div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm text-gray-900">{preAuth.preAuthNumber}</div>
                                <div className="text-xs text-gray-500">{preAuth.dateRequested}</div>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900">{preAuth.insuranceCompany}</td>
                              <td className="px-4 py-4">
                                <div className="text-sm font-medium text-gray-900">{preAuth.procedureCode}</div>
                                <div className="text-xs text-gray-500">{preAuth.treatmentDetail.length > 35 ? preAuth.treatmentDetail.substring(0, 35) + '...' : preAuth.treatmentDetail}</div>
                              </td>
                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">${preAuth.requestedAmount.toLocaleString()}</td>
                              <td className="px-4 py-4 text-sm font-semibold text-green-700">
                                {preAuth.approvedAmount > 0 ? `$${preAuth.approvedAmount.toLocaleString()}` : '-'}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  preAuth.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                  preAuth.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  preAuth.status === 'Denied' ? 'bg-red-100 text-red-800' :
                                  preAuth.status === 'Expired' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {preAuth.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900">{preAuth.expirationDate}</td>
                              <td className="px-4 py-4 text-sm text-gray-900">{preAuth.handler}</td>
                              <td className="px-4 py-4">
                                <div className="flex space-x-1">
                                  <button
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    onClick={() => handleEditPreAuth(preAuth)}
                                    title="Edit Pre-Auth"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    onClick={() => handleViewHistory('preauth', preAuth.id, preAuth.patientName)}
                                    title="View History"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                  {showArchivedPreAuths ? (
                                    <button
                                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                      onClick={() => handleUnarchivePreAuth(preAuth.id)}
                                      title="Unarchive Pre-Auth"
                                    >
                                      <ArchiveRestore className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                      onClick={() => handleArchivePreAuth(preAuth.id)}
                                      title="Archive Pre-Auth"
                                    >
                                      <Archive className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    onClick={() => handleDeleteClick('preauth', preAuth.id, preAuth.patientName)}
                                    title="Delete Pre-Auth"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {patientManagementView === 'patients' && (
              <>
          <div className="space-y-6">
            {/* Patients Header */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              </>
            )}

            {/* Add New Claim Modal */}
            {showAddClaimModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
                  <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                    <h3 className="text-2xl font-bold" style={{ color: csdGold }}>Add New Claim</h3>
                    <button onClick={() => setShowAddClaimModal(false)} className="text-gray-500 hover:text-gray-700">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newClaim: ClaimRecord = {
                      id: `CLM-${String(claims.length + 1).padStart(3, '0')}`,
                      patientId: formData.get('patientId') as string,
                      patientName: formData.get('patientName') as string,
                      insuranceCompany: formData.get('insuranceCompany') as string,
                      claimNumber: formData.get('claimNumber') as string,
                      procedureCode: formData.get('procedureCode') as string,
                      claimDetail: formData.get('claimDetail') as string,
                      claimAmount: parseFloat(formData.get('claimAmount') as string),
                      status: formData.get('status') as 'Pending' | 'Approved' | 'Denied' | 'In Review' | 'Resubmitted',
                      dateSubmitted: formData.get('dateSubmitted') as string,
                      followUpDate: formData.get('followUpDate') as string,
                      handler: formData.get('handler') as string,
                      notes: formData.get('notes') as string,
                      agingDays: Math.floor((new Date().getTime() - new Date(formData.get('dateSubmitted') as string).getTime()) / (1000 * 60 * 60 * 24))
                    };

                    try {
                      // Save to Supabase
                      const savedClaim = await insertClaim(recordToClaim(newClaim));
                      // Update local state with the saved claim
                      setClaims([...claims, claimToRecord(savedClaim)]);
                      setShowAddClaimModal(false);
                    } catch (error) {
                      console.error('Error saving claim:', error);
                      alert('Failed to save claim. Please try again.');
                    }
                  }} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Patient ID</label>
                        <input name="patientId" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="PT-1234" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Patient Name</label>
                        <input name="patientName" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="John Smith" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Insurance Company</label>
                        <input name="insuranceCompany" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Delta Dental" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Claim Number</label>
                        <input name="claimNumber" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="DD-2025-0142" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Procedure Code</label>
                        <input name="procedureCode" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="D2392" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Claim Amount</label>
                        <input name="claimAmount" type="number" step="0.01" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="285.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select name="status" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Denied">Denied</option>
                          <option value="In Review">In Review</option>
                          <option value="Resubmitted">Resubmitted</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Handler</label>
                        <input name="handler" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Sarah J." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date Submitted</label>
                        <input name="dateSubmitted" type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                        <input name="followUpDate" type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Claim Detail</label>
                      <input name="claimDetail" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Resin-based composite - two surfaces, posterior" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea name="notes" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Additional notes..."></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button type="button" onClick={() => setShowAddClaimModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                        Cancel
                      </button>
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                        Add Claim
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add New Pre-Auth Modal */}
            {showAddPreAuthModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
                  <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                    <h3 className="text-2xl font-bold" style={{ color: csdGold }}>Request Pre-Authorization</h3>
                    <button onClick={() => setShowAddPreAuthModal(false)} className="text-gray-500 hover:text-gray-700">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newPreAuth: PreAuthRecord = {
                      id: `PA-${String(preAuths.length + 1).padStart(3, '0')}`,
                      patientId: formData.get('patientId') as string,
                      patientName: formData.get('patientName') as string,
                      insuranceCompany: formData.get('insuranceCompany') as string,
                      preAuthNumber: formData.get('preAuthNumber') as string,
                      procedureCode: formData.get('procedureCode') as string,
                      treatmentDetail: formData.get('treatmentDetail') as string,
                      requestedAmount: parseFloat(formData.get('requestedAmount') as string),
                      status: formData.get('status') as 'Pending' | 'Approved' | 'Denied' | 'Expired' | 'In Review',
                      dateRequested: formData.get('dateRequested') as string,
                      expirationDate: formData.get('expirationDate') as string,
                      approvedAmount: parseFloat(formData.get('approvedAmount') as string) || 0,
                      handler: formData.get('handler') as string,
                      notes: formData.get('notes') as string
                    };

                    try {
                      // Save to Supabase
                      const savedPreAuth = await insertPreAuth(recordToPreAuth(newPreAuth));
                      // Update local state with the saved pre-auth
                      setPreAuths([...preAuths, preAuthToRecord(savedPreAuth)]);
                      setShowAddPreAuthModal(false);
                    } catch (error) {
                      console.error('Error saving pre-auth:', error);
                      alert('Failed to save pre-authorization. Please try again.');
                    }
                  }} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Patient ID</label>
                        <input name="patientId" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="PT-1234" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Patient Name</label>
                        <input name="patientName" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="John Smith" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Insurance Company</label>
                        <input name="insuranceCompany" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Delta Dental" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pre-Auth Number</label>
                        <input name="preAuthNumber" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="DD-PA-2025-0432" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Procedure Code</label>
                        <input name="procedureCode" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="D6010" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Requested Amount</label>
                        <input name="requestedAmount" type="number" step="0.01" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="2400.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select name="status" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Denied">Denied</option>
                          <option value="Expired">Expired</option>
                          <option value="In Review">In Review</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Handler</label>
                        <input name="handler" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Sarah J." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date Requested</label>
                        <input name="dateRequested" type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Expiration Date</label>
                        <input name="expirationDate" type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Approved Amount (if applicable)</label>
                        <input name="approvedAmount" type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Treatment Detail</label>
                      <input name="treatmentDetail" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Surgical placement of implant body" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea name="notes" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Additional notes..."></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button type="button" onClick={() => setShowAddPreAuthModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                        Cancel
                      </button>
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                        Request Pre-Auth
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : currentView === 'payments' ? (
          <div className="space-y-6">
            {/* Payments Header */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Third Party Financing
              </h3>
              <p className="text-sm text-gray-600 mb-4">Current Month (Most Recent Data)</p>

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
        ) : currentView === 'insurance' ? (
          <div className="space-y-6">
            {/* Insurance Header */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <h2 className="text-2xl font-bold mb-2" style={{ color: csdGold }}>
                Practice Scorecard Metrics
              </h2>
              <p className="text-gray-600 text-sm">
                Track your practice performance against goals
              </p>
            </div>

            {/* Advanced Business Metrics */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <h3 className="text-xl font-bold mb-4" style={{ color: csdGold }}>
                Advanced Business Metrics
              </h3>

              {/* Experimental Data Disclaimer */}
              <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Calculated Metrics</p>
                    <p className="text-xs text-amber-700 mt-1">These metrics are calculated estimates based on available data. Please review for accuracy and adjust assumptions as needed.</p>
                  </div>
                </div>
              </div>

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
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Patient Lifecycle & Retention</h4>
                  <button
                    onClick={() => setShowLifecycleModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Manage Data & Details</span>
                  </button>
                </div>
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
              <div className={`rounded-lg shadow p-5 border-l-4 border-blue-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-l-4 border-purple-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-l-4 border-green-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-l-4 border-amber-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-l-4 border-blue-600 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-l-4 border-indigo-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-l-4 border-teal-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-l-4 border-pink-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
                    {scorecardData.weeklyData.map((week: any) => (
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Weekly Trends
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Show Rates Trends */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold mb-3 text-gray-700">Show Rates</h4>
                  <div className="space-y-3">
                    {scorecardData.weeklyData.map((week: any) => (
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
                    {scorecardData.weeklyData.map((week: any) => (
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold" style={{ color: csdGold }}>
                  Daily Production by Provider
                </h3>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <input
                    type="date"
                    value={dashboardDate}
                    onChange={(e) => setDashboardDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Production for {(() => {
                  const [year, month, day] = dashboardDate.split('-').map(Number);
                  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                })()}
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
              className={`rounded-lg shadow p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-green-300 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}
              onClick={() => setShowBAMModal(true)}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold" style={{ color: csdGold }}>
                  BAM Cycle Metrics
                </h3>
                <div className={`rounded-full p-2 ${isDayMode ? 'bg-green-100' : 'bg-green-900/30'}`}>
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>

              <p className={`text-sm mb-4 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Click to view detailed BAM cycle analysis</p>

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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-t-4 border-blue-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-t-4 border-green-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-5 border-t-4 border-purple-500 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2" style={{ color: csdGold }}>
                    End of Day Report
                  </h2>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={dashboardDate}
                      onChange={(e) => setDashboardDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="text-gray-600 text-sm">
                      {(() => {
                        const [year, month, day] = dashboardDate.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      })()}
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
              {/* Report Header with Logo - prints on export */}
              <div className="report-header mb-6 pb-4 border-b-2" style={{ borderColor: csdGold }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Logo placeholder - replace src with actual logo path when available */}
                    <div className="flex items-center justify-center w-16 h-16 rounded-full" style={{ backgroundColor: csdGold }}>
                      <span className="text-2xl font-bold text-white">SC</span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold" style={{ color: csdGold }}>
                        Stellar Consults
                      </h1>
                      <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        Dental Revenue Cycle Management
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className={`text-xl font-semibold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                      End of Day Report
                    </h2>
                    <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                      {eodData.reportDate}
                    </p>
                  </div>
                </div>
              </div>

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
            <div className={`rounded-lg shadow p-6 mt-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
              <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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

                {/* Patient Financing */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Patient Financing</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border border-pink-200">
                      <span className="text-sm font-medium text-pink-700">Cherry</span>
                      <span className="text-lg font-bold text-pink-900">
                        ${(eodData.paymentMethods.cherry || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg border border-rose-200">
                      <span className="text-sm font-medium text-rose-700">CareCredit</span>
                      <span className="text-lg font-bold text-rose-900">
                        ${(eodData.paymentMethods.careCredit || 0).toLocaleString()}
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

            {/* Payment Performance Insights */}
            <div className={`rounded-lg shadow p-6 mt-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: csdGold }}>
                  Payment Performance Insights
                </h3>
                <span className="text-xs text-gray-500">
                  {paymentInsights.length} actionable insight{paymentInsights.length !== 1 ? 's' : ''}
                </span>
              </div>

              {paymentInsights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentInsights.map((insight) => {
                    // Map icon names to icon components
                    const IconComponent = {
                      'TrendingUp': TrendingUp,
                      'TrendingDown': TrendingUp,
                      'AlertCircle': AlertCircle,
                      'CheckCircle': CheckCircle,
                      'XCircle': XCircle,
                      'Activity': Activity,
                      'Shield': Shield,
                      'Users': Users,
                      'Clock': Clock,
                      'DollarSign': DollarSign,
                      'ArrowDownCircle': ArrowDownCircle,
                    }[insight.icon] || Activity;

                    // Map insight types to color schemes
                    const colorScheme = {
                      'positive': {
                        bg: 'bg-gradient-to-br from-green-50 to-green-100',
                        border: 'border-green-300',
                        icon: 'text-green-600',
                        title: 'text-green-900',
                        text: 'text-green-800',
                        badge: 'bg-green-200 text-green-800'
                      },
                      'warning': {
                        bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
                        border: 'border-amber-300',
                        icon: 'text-amber-600',
                        title: 'text-amber-900',
                        text: 'text-amber-800',
                        badge: 'bg-amber-200 text-amber-800'
                      },
                      'info': {
                        bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
                        border: 'border-blue-300',
                        icon: 'text-blue-600',
                        title: 'text-blue-900',
                        text: 'text-blue-800',
                        badge: 'bg-blue-200 text-blue-800'
                      },
                      'critical': {
                        bg: 'bg-gradient-to-br from-red-50 to-red-100',
                        border: 'border-red-300',
                        icon: 'text-red-600',
                        title: 'text-red-900',
                        text: 'text-red-800',
                        badge: 'bg-red-200 text-red-800'
                      }
                    }[insight.type];

                    return (
                      <div
                        key={insight.id}
                        className={`${colorScheme.bg} border-2 ${colorScheme.border} rounded-lg p-4 hover:shadow-lg transition-all`}
                      >
                        <div className="flex items-start gap-3">
                          <IconComponent className={`w-6 h-6 ${colorScheme.icon} flex-shrink-0 mt-0.5`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className={`font-semibold text-sm ${colorScheme.title}`}>
                                {insight.title}
                              </h4>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorScheme.badge} flex-shrink-0`}>
                                {insight.priority}
                              </span>
                            </div>
                            <p className={`text-sm ${colorScheme.text} mb-2`}>
                              {insight.message}
                            </p>
                            {insight.action && (
                              <div className={`text-xs font-medium ${colorScheme.text} flex items-start gap-1.5 mt-2 pt-2 border-t ${colorScheme.border}`}>
                                <ArrowUpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>{insight.action}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No payment insights available for this date</p>
                  <p className="text-sm mt-1">Insights will appear as payment data is collected</p>
                </div>
              )}
            </div>

            {/* Actionable Insights */}
            <div className={`rounded-lg shadow p-6 mt-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: csdGold }}>
                  Top Procedures Today
                </h3>
                <button
                  onClick={() => setShowTopProceduresModal(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload CSV
                </button>
              </div>
              <div className="space-y-3">
                {topProcedures.length > 0 ? (
                  topProcedures.map((procedure: any, index: number) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${isDayMode ? 'bg-gray-50' : 'bg-gray-700'}`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-700">{index + 1}</span>
                        </div>
                        <div>
                          <p className={`font-medium ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                            {procedure.procedure_name}
                            {procedure.procedure_code && <span className="text-xs ml-2 text-gray-500">({procedure.procedure_code})</span>}
                          </p>
                          <p className="text-xs text-gray-500">{procedure.count} procedure{procedure.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                        ${procedure.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className={`text-center py-8 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No procedures recorded for this date</p>
                    <button
                      onClick={() => setShowTopProceduresModal(true)}
                      className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                      Upload CSV file
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Month-to-Date Summary */}
            <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
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
                <div className={`rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
                  <div className="p-6">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDayMode ? 'bg-green-100' : 'bg-green-900/30'}`}>
                          <Mail className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className={`text-xl font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>Email EOD Report</h3>
                          <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Send report for {(() => {
                            const [year, month, day] = dashboardDate.split('-').map(Number);
                            return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                          })()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowEmailModal(false)}
                        className={`transition-colors ${isDayMode ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
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
                              <div className={`p-3 rounded border ${isDayMode ? 'bg-white border-blue-300' : 'bg-gray-700 border-blue-700'}`}>
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
          <div className={`rounded-lg shadow p-6 ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View
            </h2>
            <div className="space-y-4">
              <p className={`${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Welcome to the Court Street Dental RCM Dashboard.
              </p>
              <p className={`${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                This comprehensive Revenue Cycle Management application includes:
              </p>
              <ul className={`list-disc list-inside space-y-2 ml-4 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
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
            <div className={`rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDayMode ? 'bg-green-100' : 'bg-green-900/30'}`}>
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>BAM Cycle Analysis</h3>
                      <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Business Activity Metric - 19 Business Day Cycles</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBAMModal(false)}
                    className={`transition-colors ${isDayMode ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
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

        {/* Lifecycle Metrics Modal */}
        {showLifecycleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDayMode ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>Patient Lifecycle Management</h3>
                      <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Track patient retention, revenue, and upload data</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLifecycleModal(false)}
                    className={`transition-colors ${isDayMode ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Lifecycle Metrics Display */}
                <div className="mb-8">
                  <LifecycleMetrics />
                </div>

                {/* Data Upload Section */}
                <div className="mb-6">
                  <PatientDataUpload />
                </div>

                {/* Close Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowLifecycleModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Procedures CSV Upload */}
        <TopProceduresCSVUpload
          isOpen={showTopProceduresModal}
          onClose={() => setShowTopProceduresModal(false)}
          onSuccess={() => {
            // Refresh top procedures after upload
            getTopProceduresForDate(dashboardDate).then(setTopProcedures);
            refreshEOD();
          }}
          currentDate={dashboardDate}
        />

        {/* Edit Modal */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingType === 'claim' ? 'Edit Claim' : 'Edit Pre-Authorization'}
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                    setEditingType(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {editingType === 'claim' ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const claim = editingItem as ClaimRecord;
                    const updatedClaim = {
                      patient_id: claim.patientId, // Preserve existing patient_id
                      patient_name: formData.get('patientName') as string,
                      insurance_company: formData.get('insuranceCompany') as string,
                      claim_number: formData.get('claimNumber') as string,
                      procedure_code: formData.get('procedureCode') as string,
                      claim_detail: formData.get('claimDetail') as string,
                      claim_amount: parseFloat(formData.get('claimAmount') as string),
                      status: formData.get('status') as Claim['status'],
                      date_submitted: formData.get('dateSubmitted') as string,
                      follow_up_date: formData.get('followUpDate') as string,
                      handler: formData.get('handler') as string,
                      notes: formData.get('notes') as string || null,
                      aging_days: parseInt(formData.get('agingDays') as string),
                    };

                    try {
                      await updateClaim(claim.id, updatedClaim);
                      // Refetch based on current toggle state
                      const updatedClaims = showArchivedClaims ? await getArchivedClaims() : await getActiveClaims();
                      setClaims(updatedClaims.map(claimToRecord));
                      setShowEditModal(false);
                      setEditingItem(null);
                      setEditingType(null);
                    } catch (error) {
                      console.error('Error updating claim:', error);
                      alert('Failed to update claim. Please try again.');
                    }
                  }}>
                    {(() => {
                      const claim = editingItem as ClaimRecord;
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                            <input
                              type="text"
                              name="patientName"
                              defaultValue={claim.patientName}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Company</label>
                            <input
                              type="text"
                              name="insuranceCompany"
                              defaultValue={claim.insuranceCompany}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Claim Number</label>
                            <input
                              type="text"
                              name="claimNumber"
                              defaultValue={claim.claimNumber}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Procedure Code</label>
                            <input
                              type="text"
                              name="procedureCode"
                              defaultValue={claim.procedureCode}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Claim Detail</label>
                            <input
                              type="text"
                              name="claimDetail"
                              defaultValue={claim.claimDetail}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Claim Amount</label>
                            <input
                              type="number"
                              name="claimAmount"
                              step="0.01"
                              defaultValue={claim.claimAmount}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              name="status"
                              defaultValue={claim.status}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Denied">Denied</option>
                              <option value="In Review">In Review</option>
                              <option value="Resubmitted">Resubmitted</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Submitted</label>
                            <input
                              type="date"
                              name="dateSubmitted"
                              defaultValue={claim.dateSubmitted}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-Up Date</label>
                            <input
                              type="date"
                              name="followUpDate"
                              defaultValue={claim.followUpDate}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Handler</label>
                            <input
                              type="text"
                              name="handler"
                              defaultValue={claim.handler}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Aging Days</label>
                            <input
                              type="number"
                              name="agingDays"
                              defaultValue={claim.agingDays}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                              name="notes"
                              defaultValue={claim.notes || ''}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })()}
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingItem(null);
                          setEditingType(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const preAuth = editingItem as PreAuthRecord;
                    const updatedPreAuth = {
                      patient_id: preAuth.patientId, // Preserve existing patient_id
                      patient_name: formData.get('patientName') as string,
                      insurance_company: formData.get('insuranceCompany') as string,
                      pre_auth_number: formData.get('preAuthNumber') as string,
                      procedure_code: formData.get('procedureCode') as string,
                      treatment_detail: formData.get('treatmentDetail') as string,
                      requested_amount: parseFloat(formData.get('requestedAmount') as string),
                      status: formData.get('status') as PreAuth['status'],
                      date_requested: formData.get('dateRequested') as string,
                      expiration_date: formData.get('expirationDate') as string,
                      approved_amount: parseFloat(formData.get('approvedAmount') as string),
                      handler: formData.get('handler') as string,
                      notes: formData.get('notes') as string || null,
                    };

                    try {
                      await updatePreAuth(preAuth.id, updatedPreAuth);
                      // Refetch based on current toggle state
                      const updatedPreAuths = showArchivedPreAuths ? await getArchivedPreAuths() : await getActivePreAuths();
                      setPreAuths(updatedPreAuths.map(preAuthToRecord));
                      setShowEditModal(false);
                      setEditingItem(null);
                      setEditingType(null);
                    } catch (error) {
                      console.error('Error updating pre-auth:', error);
                      alert('Failed to update pre-auth. Please try again.');
                    }
                  }}>
                    {(() => {
                      const preAuth = editingItem as PreAuthRecord;
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                            <input
                              type="text"
                              name="patientName"
                              defaultValue={preAuth.patientName}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Company</label>
                            <input
                              type="text"
                              name="insuranceCompany"
                              defaultValue={preAuth.insuranceCompany}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Auth Number</label>
                            <input
                              type="text"
                              name="preAuthNumber"
                              defaultValue={preAuth.preAuthNumber}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Procedure Code</label>
                            <input
                              type="text"
                              name="procedureCode"
                              defaultValue={preAuth.procedureCode}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Detail</label>
                            <input
                              type="text"
                              name="treatmentDetail"
                              defaultValue={preAuth.treatmentDetail}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Requested Amount</label>
                            <input
                              type="number"
                              name="requestedAmount"
                              step="0.01"
                              defaultValue={preAuth.requestedAmount}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount</label>
                            <input
                              type="number"
                              name="approvedAmount"
                              step="0.01"
                              defaultValue={preAuth.approvedAmount}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              name="status"
                              defaultValue={preAuth.status}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Denied">Denied</option>
                              <option value="Expired">Expired</option>
                              <option value="In Review">In Review</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Requested</label>
                            <input
                              type="date"
                              name="dateRequested"
                              defaultValue={preAuth.dateRequested}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                            <input
                              type="date"
                              name="expirationDate"
                              defaultValue={preAuth.expirationDate}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Handler</label>
                            <input
                              type="text"
                              name="handler"
                              defaultValue={preAuth.handler}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                              name="notes"
                              defaultValue={preAuth.notes || ''}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })()}
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingItem(null);
                          setEditingType(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                  Confirm Delete
                </h3>
                <p className="text-sm text-gray-600 text-center mb-4">
                  Are you sure you want to delete this {deleteItem?.type === 'claim' ? 'claim' : 'pre-authorization'} for{' '}
                  <span className="font-semibold">{deleteItem?.name}</span>?
                  <br />
                  <span className="text-red-600 font-semibold">This action cannot be undone.</span>
                </p>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteItem(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History/Audit Timeline Modal */}
        {showHistoryModal && historyItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Audit History
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {historyItem.type === 'claim' ? 'Claim' : 'Pre-Authorization'} for {historyItem.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryItem(null);
                    setHistoryData([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {historyData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No history available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyData.map((entry) => (
                      <div key={entry.audit_id} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-l-0 last:pb-0">
                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              entry.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                              entry.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                              entry.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                              entry.action === 'ARCHIVE' ? 'bg-orange-100 text-orange-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {entry.action}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.changed_at).toLocaleString()}
                            </span>
                          </div>
                          {entry.changed_by && (
                            <p className="text-sm text-gray-600 mb-2">
                              Changed by: <span className="font-medium">{entry.changed_by}</span>
                            </p>
                          )}
                          {entry.changes && entry.changes.changed_fields && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">Changes:</p>
                              <div className="space-y-2">
                                {Object.entries(entry.changes.changed_fields).map(([field, values]: [string, any]) => (
                                  <div key={field} className="text-xs bg-white p-2 rounded border border-gray-200">
                                    <span className="font-semibold text-gray-700">{field}:</span>
                                    <div className="mt-1 flex items-center space-x-2">
                                      <span className="text-red-600 line-through">
                                        {JSON.stringify(values.old)}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                      <span className="text-green-600 font-medium">
                                        {JSON.stringify(values.new)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Insights Button */}
        <AIInsightsButton
          onClick={() => setIsInsightsPanelOpen(true)}
          insightCount={insights.length}
          hasHighPriority={insights.some(i => i.priority === 'high')}
        />

        {/* AI Insights Panel */}
        <AIInsightsPanel
          isOpen={isInsightsPanelOpen}
          onClose={() => setIsInsightsPanelOpen(false)}
          insights={insights}
          isDayMode={isDayMode}
          onRefresh={handleRefreshInsights}
          isRefreshing={isRefreshingInsights}
        />
      </div>
    </div>
  );
};

export default CourtStreetRCM;
