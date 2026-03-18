import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Search, Archive, ArchiveRestore, Plus, Edit, Trash2, History,
  MessageSquarePlus, CreditCard, Download, DollarSign, Clock,
  Image, CheckCircle, X, FileText, Layers, BarChart3,
  ScanLine, Package, Eye, Wifi, WifiOff, Monitor, AlertCircle, Loader2, Info
} from 'lucide-react';
import { extractCheckData } from '../utils/ocrEngine';
import {
  checkScannerService, discoverScanners, acquireScan,
  SCANNER_SETUP_INSTRUCTIONS,
  type ScannerDevice, type ScannerServiceStatus
} from '../utils/scannerDriver';
import { getLocalDateString, toLocalDateString } from '../utils/dateUtils';
import {
  insertInsuranceCheck, deleteInsuranceCheck, archiveInsuranceCheck, unarchiveInsuranceCheck,
  getActiveInsuranceChecks, getArchivedInsuranceChecks
} from '../services/claimsService';
import type { InsuranceCheck } from '../types/database.types';
import { autoResolveSubmittedIssuesFromPayment } from '../services/insuranceIssuesService';

// ---- Types ----

interface InsuranceCheckRecord {
  id: string;
  checkEftNumber: string;
  paymentType: 'Check' | 'EFT';
  insuranceCompany: string;
  distributionType: 'Bulk' | 'Individual';
  totalAmount: number;
  aging: number;
  enteredBy: string;
  handler: string;
  status: 'Created' | 'Entered' | 'Pending Review';
  dateOfService?: string;
  dateEntered?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface ScanSessionItem {
  id: string;
  file: File;
  previewUrl: string;
  extractedData: {
    checkNumber: string;
    amount: string;
    payer: string;
  };
  status: 'scanning' | 'extracted' | 'confirmed' | 'error';
  ocrConfidence?: number;
  ocrRawText?: string;
  errorMessage?: string;
  timestamp: Date;
}

type SubView = 'scan-session' | 'registry' | 'analytics';
type RegistryTimeframe = 'today' | 'week' | 'month' | 'all';
type RegistryGroupBy = 'day' | 'week' | 'month';

interface InsuranceCheckStationProps {
  isDayMode: boolean;
  insuranceChecks: InsuranceCheckRecord[];
  setInsuranceChecks: React.Dispatch<React.SetStateAction<InsuranceCheckRecord[]>>;
  showArchivedInsuranceChecks: boolean;
  setShowArchivedInsuranceChecks: React.Dispatch<React.SetStateAction<boolean>>;
  archiveInsuranceChecksDateFilter: string;
  setArchiveInsuranceChecksDateFilter: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  onEditCheck: (check: InsuranceCheckRecord) => void;
  onAddUpdate: (type: 'insurance-check', id: string, name: string, currentStatus: string) => void;
  onViewHistory: (id: string, checkNumber: string) => void;
}

// ---- Conversion helpers ----

const insuranceCheckToRecord = (check: InsuranceCheck): InsuranceCheckRecord => {
  const calculateAging = (dateEntered?: string): number => {
    if (!dateEntered) return 0;
    const enteredDate = new Date(dateEntered);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - enteredDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return {
    id: check.id,
    checkEftNumber: check.check_eft_number,
    paymentType: check.payment_type,
    insuranceCompany: check.insurance_company,
    distributionType: check.distribution_type,
    totalAmount: check.total_amount,
    aging: calculateAging(check.date_entered),
    enteredBy: check.entered_by,
    handler: check.handler,
    status: check.status,
    dateOfService: check.date_of_service,
    dateEntered: check.date_entered,
    isArchived: check.is_archived,
    archivedAt: check.archived_at,
    archivedBy: check.archived_by
  };
};

const recordToInsuranceCheck = (record: InsuranceCheckRecord): any => {
  const paymentDate = record.dateEntered || getLocalDateString();
  return {
    check_eft_number: record.checkEftNumber,
    payment_type: record.paymentType,
    insurance_company: record.insuranceCompany,
    distribution_type: record.distributionType,
    total_amount: record.totalAmount,
    aging: record.aging,
    entered_by: record.enteredBy,
    handler: record.handler,
    status: record.status,
    date_of_service: record.dateOfService || undefined,
    date_entered: record.dateEntered || paymentDate,
    is_archived: record.isArchived || false,
    archived_at: record.archivedAt || undefined,
    archived_by: record.archivedBy || undefined
  };
};

const getLast5BusinessDays = (): Date[] => {
  const days: Date[] = [];
  const today = new Date();
  let currentDate = new Date(today);
  while (days.length < 5) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return days.reverse();
};

const parseDateOnly = (value?: string): Date | null => {
  if (!value) return null;
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) => {
  const next = startOfDay(date);
  next.setDate(next.getDate() + 1);
  next.setMilliseconds(-1);
  return next;
};

const startOfWeek = (date: Date) => {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
};

const endOfWeek = (date: Date) => {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));

const formatRangeLabel = (start: Date, end: Date) => (
  `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
);

const csdGold = '#B8985F';

// ---- Component ----

export default function InsuranceCheckStation({
  isDayMode,
  insuranceChecks,
  setInsuranceChecks,
  showArchivedInsuranceChecks,
  setShowArchivedInsuranceChecks,
  archiveInsuranceChecksDateFilter,
  setArchiveInsuranceChecksDateFilter,
  searchQuery,
  setSearchQuery,
  onEditCheck,
  onAddUpdate,
  onViewHistory,
}: InsuranceCheckStationProps) {

  // Sub-view state
  const [activeView, setActiveView] = useState<SubView>('registry');
  const [registryTimeframe, setRegistryTimeframe] = useState<RegistryTimeframe>('today');
  const [registryGroupBy, setRegistryGroupBy] = useState<RegistryGroupBy>('day');
  const [expandedRegistryGroups, setExpandedRegistryGroups] = useState<Set<string>>(new Set());

  // Scan session state
  const [scanSessionItems, setScanSessionItems] = useState<ScanSessionItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add check modal state (within component now)
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedScanItem, setExpandedScanItem] = useState<string | null>(null);

  // Scanner integration state
  const [scannerServiceStatus, setScannerServiceStatus] = useState<ScannerServiceStatus>('checking');
  const [availableScanners, setAvailableScanners] = useState<ScannerDevice[]>([]);
  const [selectedScanner, setSelectedScanner] = useState<string>('');
  const [isScanningFromDevice, setIsScanningFromDevice] = useState(false);
  const [showScannerSetup, setShowScannerSetup] = useState(false);

  // Check for scanner service on mount and periodically
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const status = await checkScannerService();
      if (!mounted) return;
      setScannerServiceStatus(status);
      if (status === 'connected') {
        const scanners = await discoverScanners();
        if (!mounted) return;
        setAvailableScanners(scanners);
        if (scanners.length > 0 && !selectedScanner) {
          const defaultScanner = scanners.find(s => s.isDefault) ?? scanners[0];
          setSelectedScanner(defaultScanner.id);
        }
      }
    };
    check();
    const interval = setInterval(check, 30000); // re-check every 30s
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Base filtered checks (search + archive mode)
  const baseFilteredInsuranceChecks = useMemo(() => {
    return insuranceChecks.filter((check: InsuranceCheckRecord) => {
      const matchesSearch = searchQuery === '' ||
        check.checkEftNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.insuranceCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.paymentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.distributionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.handler.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.enteredBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.status.toLowerCase().includes(searchQuery.toLowerCase());

      if (showArchivedInsuranceChecks && archiveInsuranceChecksDateFilter && check.archivedAt) {
        const archivedDate = check.archivedAt.split('T')[0];
        return matchesSearch && archivedDate === archiveInsuranceChecksDateFilter;
      }
      return matchesSearch;
    });
  }, [insuranceChecks, searchQuery, showArchivedInsuranceChecks, archiveInsuranceChecksDateFilter]);

  const today = useMemo(() => parseDateOnly(getLocalDateString()) ?? new Date(), []);

  const scopedInsuranceChecks = useMemo(() => {
    if (showArchivedInsuranceChecks || registryTimeframe === 'all') {
      return baseFilteredInsuranceChecks;
    }

    return baseFilteredInsuranceChecks.filter((check) => {
      const effectiveDate = parseDateOnly(check.dateEntered);
      if (!effectiveDate) return false;

      if (registryTimeframe === 'today') {
        return effectiveDate >= startOfDay(today) && effectiveDate <= endOfDay(today);
      }

      if (registryTimeframe === 'week') {
        return effectiveDate >= startOfWeek(today) && effectiveDate <= endOfWeek(today);
      }

      return effectiveDate >= startOfMonth(today) && effectiveDate <= endOfMonth(today);
    });
  }, [baseFilteredInsuranceChecks, registryTimeframe, showArchivedInsuranceChecks, today]);

  const groupedInsuranceChecks = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; checks: InsuranceCheckRecord[]; sortDate: Date }>();

    scopedInsuranceChecks.forEach((check) => {
      const effectiveDate = parseDateOnly(
        showArchivedInsuranceChecks ? (check.archivedAt?.slice(0, 10) || check.dateEntered) : check.dateEntered
      ) ?? today;

      let groupId = '';
      let label = '';
      let sortDate = effectiveDate;

      if (registryGroupBy === 'day') {
        groupId = effectiveDate.toISOString().slice(0, 10);
        const isTodayGroup = groupId === getLocalDateString();
        label = isTodayGroup
          ? `Today · ${effectiveDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
          : effectiveDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      } else if (registryGroupBy === 'week') {
        const weekStart = startOfWeek(effectiveDate);
        const weekEnd = endOfWeek(effectiveDate);
        groupId = `week-${weekStart.toISOString().slice(0, 10)}`;
        label = `Week of ${formatRangeLabel(weekStart, weekEnd)}`;
        sortDate = weekStart;
      } else {
        const monthStart = startOfMonth(effectiveDate);
        groupId = `month-${monthStart.getFullYear()}-${monthStart.getMonth()}`;
        label = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        sortDate = monthStart;
      }

      const existing = groups.get(groupId);
      if (existing) {
        existing.checks.push(check);
      } else {
        groups.set(groupId, { id: groupId, label, checks: [check], sortDate });
      }
    });

    return Array.from(groups.values())
      .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
      .map(group => ({
        ...group,
        totalAmount: group.checks.reduce((sum, check) => sum + check.totalAmount, 0),
      }));
  }, [scopedInsuranceChecks, registryGroupBy, showArchivedInsuranceChecks, today]);

  useEffect(() => {
    setExpandedRegistryGroups(new Set(groupedInsuranceChecks.map(group => group.id)));
  }, [groupedInsuranceChecks]);

  // ---- Computed metrics ----

  const sessionTotal = useMemo(() => {
    return scanSessionItems
      .filter(item => item.status === 'confirmed')
      .reduce((sum, item) => sum + (parseFloat(item.extractedData.amount) || 0), 0);
  }, [scanSessionItems]);

  const sessionItemCount = scanSessionItems.length;
  const confirmedCount = scanSessionItems.filter(i => i.status === 'confirmed').length;

  const checkTotal = useMemo(() =>
    scopedInsuranceChecks.filter(c => c.paymentType === 'Check').reduce((sum, c) => sum + c.totalAmount, 0),
    [scopedInsuranceChecks]
  );
  const eftTotal = useMemo(() =>
    scopedInsuranceChecks.filter(c => c.paymentType === 'EFT').reduce((sum, c) => sum + c.totalAmount, 0),
    [scopedInsuranceChecks]
  );
  const grandTotal = checkTotal + eftTotal;

  // ---- Scan session handlers ----

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    addFilesToSession(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFilesToSession(files);
      e.target.value = '';
    }
  }, []);

  const addFilesToSession = (files: File[]) => {
    if (!sessionActive) setSessionActive(true);
    const newItems: ScanSessionItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      extractedData: { checkNumber: '', amount: '', payer: '' },
      status: 'scanning' as const,
      timestamp: new Date(),
    }));

    setScanSessionItems(prev => [...prev, ...newItems]);

    // Run OCR extraction via Tesseract.js for each image file
    newItems.forEach(async (item) => {
      if (!item.file.type.startsWith('image/')) {
        // PDFs need conversion first — mark as extracted so user can enter data manually
        setScanSessionItems(prev => prev.map(si =>
          si.id === item.id
            ? { ...si, status: 'extracted' as const, errorMessage: 'PDF OCR requires image conversion — enter data manually' }
            : si
        ));
        return;
      }

      try {
        const ocrResult = await extractCheckData(item.file);
        setScanSessionItems(prev => prev.map(si =>
          si.id === item.id
            ? {
                ...si,
                status: 'extracted' as const,
                extractedData: {
                  checkNumber: ocrResult.checkNumber,
                  amount: ocrResult.amount,
                  payer: ocrResult.payer,
                },
                ocrConfidence: ocrResult.confidence,
                ocrRawText: ocrResult.rawText,
              }
            : si
        ));
      } catch (err) {
        setScanSessionItems(prev => prev.map(si =>
          si.id === item.id
            ? {
                ...si,
                status: 'extracted' as const,
                errorMessage: `OCR failed: ${err instanceof Error ? err.message : 'Unknown error'}. Enter data manually.`,
              }
            : si
        ));
      }
    });
  };

  // Acquire scan from connected scanner device
  const handleScanFromDevice = async () => {
    if (!selectedScanner || isScanningFromDevice) return;
    setIsScanningFromDevice(true);
    try {
      const results = await acquireScan(selectedScanner, {
        resolution: 300,
        colorMode: 'grayscale',
        format: 'png',
      });
      const files = results.map(r => r.file);
      if (files.length > 0) {
        addFilesToSession(files);
      }
    } catch (err) {
      console.error('Scanner acquisition failed:', err);
    } finally {
      setIsScanningFromDevice(false);
    }
  };

  const refreshScanners = async () => {
    setScannerServiceStatus('checking');
    const status = await checkScannerService();
    setScannerServiceStatus(status);
    if (status === 'connected') {
      const scanners = await discoverScanners();
      setAvailableScanners(scanners);
      if (scanners.length > 0 && !selectedScanner) {
        const defaultScanner = scanners.find(s => s.isDefault) ?? scanners[0];
        setSelectedScanner(defaultScanner.id);
      }
    } else {
      setAvailableScanners([]);
    }
  };

  const updateScanItemData = (id: string, field: keyof ScanSessionItem['extractedData'], value: string) => {
    setScanSessionItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, extractedData: { ...item.extractedData, [field]: value } }
        : item
    ));
  };

  const confirmScanItem = (id: string) => {
    setScanSessionItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'confirmed' as const } : item
    ));
  };

  const removeScanItem = (id: string) => {
    setScanSessionItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const finalizeBatch = async () => {
    const confirmed = scanSessionItems.filter(i => i.status === 'confirmed');
    if (confirmed.length === 0) return;

    let successCount = 0;
    const failedItems: string[] = [];

    for (const item of confirmed) {
      const newCheck: InsuranceCheckRecord = {
        id: '',
        checkEftNumber: item.extractedData.checkNumber || `SCAN-${Date.now()}`,
        paymentType: 'Check',
        insuranceCompany: item.extractedData.payer || 'Unknown',
        distributionType: 'Bulk',
        totalAmount: parseFloat(item.extractedData.amount) || 0,
        aging: 0,
        enteredBy: 'Scan Session',
        handler: '',
        status: 'Created',
        dateEntered: getLocalDateString(),
      };

      try {
        const saved = await insertInsuranceCheck(recordToInsuranceCheck(newCheck));
        setInsuranceChecks(prev => [...prev, insuranceCheckToRecord(saved)]);
        successCount++;

        // Only revoke and remove successful items
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        setScanSessionItems(prev => prev.filter(si => si.id !== item.id));
      } catch (error) {
        console.error('Error saving scanned check:', error);
        failedItems.push(item.extractedData.checkNumber || 'Unknown');
        // Mark item as error so user can see what failed
        setScanSessionItems(prev => prev.map(si =>
          si.id === item.id ? { ...si, status: 'error' as const } : si
        ));
      }
    }

    // Show user feedback
    if (failedItems.length > 0) {
      alert(`Successfully saved ${successCount} check(s). Failed to save ${failedItems.length} check(s): ${failedItems.join(', ')}. Please review and retry.`);
    } else {
      setSessionActive(false);
    }
  };

  const clearSession = () => {
    scanSessionItems.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setScanSessionItems([]);
    setSessionActive(false);
  };

  // ---- CRUD handlers ----

  const handleArchiveCheck = async (id: string, archivedBy: string) => {
    try {
      await archiveInsuranceCheck(id, archivedBy);
      const updatedChecks = showArchivedInsuranceChecks ? await getArchivedInsuranceChecks() : await getActiveInsuranceChecks();
      setInsuranceChecks(updatedChecks.map(insuranceCheckToRecord));
    } catch (error) {
      console.error('Error archiving insurance check:', error);
      alert('Failed to archive insurance check. Please try again.');
    }
  };

  const handleUnarchiveCheck = async (id: string) => {
    try {
      await unarchiveInsuranceCheck(id);
      const updatedChecks = showArchivedInsuranceChecks ? await getArchivedInsuranceChecks() : await getActiveInsuranceChecks();
      setInsuranceChecks(updatedChecks.map(insuranceCheckToRecord));
    } catch (error) {
      console.error('Error unarchiving insurance check:', error);
      alert('Failed to unarchive insurance check. Please try again.');
    }
  };

  const handleDeleteCheck = async (id: string, checkNumber: string) => {
    if (!confirm(`Are you sure you want to delete check ${checkNumber}? This action cannot be undone.`)) return;
    try {
      await deleteInsuranceCheck(id);
      setInsuranceChecks(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting insurance check:', error);
      alert('Failed to delete insurance check. Please try again.');
    }
  };

  const handleAddCheckSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dateEntered = formData.get('dateEntered') as string || getLocalDateString();
    const newCheck: InsuranceCheckRecord = {
      id: '',
      checkEftNumber: formData.get('checkEftNumber') as string,
      paymentType: formData.get('paymentType') as 'Check' | 'EFT',
      insuranceCompany: formData.get('insuranceCompany') as string,
      distributionType: formData.get('distributionType') as 'Bulk' | 'Individual',
      totalAmount: parseFloat(formData.get('totalAmount') as string),
      aging: parseInt(formData.get('aging') as string) || 0,
      enteredBy: formData.get('enteredBy') as string,
      handler: formData.get('handler') as string,
      status: formData.get('status') as 'Created' | 'Entered' | 'Pending Review',
      dateOfService: formData.get('dateOfService') as string || undefined,
      dateEntered: dateEntered
    };

    try {
      const savedCheck = await insertInsuranceCheck(recordToInsuranceCheck(newCheck));
      setInsuranceChecks(prev => [...prev, insuranceCheckToRecord(savedCheck)]);
      setShowAddModal(false);

      // Auto-resolve matching Submitted insurance issues
      const patientName = (formData.get('patientName') as string) || newCheck.insuranceCompany;
      const dos = newCheck.dateOfService;
      if (patientName) {
        autoResolveSubmittedIssuesFromPayment(patientName, dos).then(resolvedIds => {
          if (resolvedIds.length > 0) {
            alert(`Auto-resolved ${resolvedIds.length} insurance issue(s) matching this payment.`);
          }
        }).catch(() => { /* silent */ });
      }
    } catch (error) {
      console.error('Error saving insurance check:', error);
      alert('Failed to save insurance check. Please try again.');
    }
  };

  // ---- Sub-view tab config ----

  const subViews: { key: SubView; label: string; icon: React.ReactNode; description: string }[] = [
    { key: 'scan-session', label: 'Scan Station', icon: <ScanLine className="w-5 h-5" />, description: 'Scan & capture checks' },
    { key: 'registry', label: 'Check/EFT Registry', icon: <Layers className="w-5 h-5" />, description: 'View all records' },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, description: 'Insights & trends' },
  ];

  const registryScopeLabel = useMemo(() => {
    if (showArchivedInsuranceChecks) return 'Archived Results';
    if (registryTimeframe === 'today') return 'Today';
    if (registryTimeframe === 'week') return 'This Week';
    if (registryTimeframe === 'month') return 'This Month';
    return 'All Time';
  }, [registryTimeframe, showArchivedInsuranceChecks]);

  // ---- Render ----

  return (
    <div className={`rounded-2xl ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} overflow-hidden`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDayMode ? 'border-gray-200/60' : 'border-white/10'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
              Insurance Payment Station
            </h2>
            <p className={`text-sm mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Scan, verify, and manage insurance checks & EFTs — landing on today&apos;s registry metrics first
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all hover-lift font-semibold text-sm"
          >
            <Plus className="w-5 h-5" />
            Add Manual Entry
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`rounded-xl px-4 py-3 ${isDayMode ? 'bg-emerald-50 border border-emerald-100' : 'bg-emerald-900/20 border border-emerald-800/30'}`}>
            <p className={`text-xs font-medium ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`}>Checks</p>
            <p className={`text-lg font-bold ${isDayMode ? 'text-emerald-800' : 'text-emerald-300'}`}>
              ${checkTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-emerald-500' : 'text-emerald-500'}`}>
              {scopedInsuranceChecks.filter(c => c.paymentType === 'Check').length} items
            </p>
          </div>
          <div className={`rounded-xl px-4 py-3 ${isDayMode ? 'bg-blue-50 border border-blue-100' : 'bg-blue-900/20 border border-blue-800/30'}`}>
            <p className={`text-xs font-medium ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`}>EFTs</p>
            <p className={`text-lg font-bold ${isDayMode ? 'text-blue-800' : 'text-blue-300'}`}>
              ${eftTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-blue-500' : 'text-blue-500'}`}>
              {scopedInsuranceChecks.filter(c => c.paymentType === 'EFT').length} items
            </p>
          </div>
          <div className={`rounded-xl px-4 py-3 ${isDayMode ? 'bg-purple-50 border border-purple-100' : 'bg-purple-900/20 border border-purple-800/30'}`}>
            <p className={`text-xs font-medium ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`}>Total Payments</p>
            <p className={`text-lg font-bold ${isDayMode ? 'text-purple-800' : 'text-purple-300'}`}>
              ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-purple-500' : 'text-purple-500'}`}>
              {scopedInsuranceChecks.length} total
            </p>
          </div>
          <div className={`rounded-xl px-4 py-3 ${isDayMode ? 'bg-amber-50 border border-amber-100' : 'bg-amber-900/20 border border-amber-800/30'}`}>
            <p className={`text-xs font-medium ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`}>Awaiting Entry</p>
            <p className={`text-lg font-bold ${isDayMode ? 'text-amber-800' : 'text-amber-300'}`}>
              ${scopedInsuranceChecks.filter(c => c.status !== 'Entered').reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-amber-500' : 'text-amber-500'}`}>
              {scopedInsuranceChecks.filter(c => c.status !== 'Entered').length} pending
            </p>
          </div>
        </div>
      </div>

      {/* Sub-view Navigation */}
      <div className={`flex border-b ${isDayMode ? 'border-gray-200/60' : 'border-white/10'}`}>
        {subViews.map(view => (
          <button
            key={view.key}
            onClick={() => setActiveView(view.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all relative ${
              activeView === view.key
                ? isDayMode
                  ? 'text-gray-900 bg-white/60'
                  : 'text-white bg-white/10'
                : isDayMode
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.label}</span>
            {activeView === view.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-500 to-gold-600" />
            )}
            {view.key === 'scan-session' && sessionActive && (
              <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Sub-view Content */}
      <div className="p-6">
        {/* ========== SCAN SESSION VIEW ========== */}
        {activeView === 'scan-session' && (
          <div className="space-y-6">
            {/* Session Status Bar */}
            {sessionActive && (
              <div className={`flex items-center justify-between rounded-xl px-5 py-3 ${
                isDayMode ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200' : 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-700/30'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`text-sm font-semibold ${isDayMode ? 'text-emerald-800' : 'text-emerald-300'}`}>
                      Session Active
                    </span>
                  </div>
                  <div className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {sessionItemCount} scanned &middot; {confirmedCount} confirmed
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Session Total</p>
                    <p className={`text-xl font-bold ${isDayMode ? 'text-emerald-700' : 'text-emerald-300'}`}>
                      ${sessionTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={finalizeBatch}
                      disabled={confirmedCount === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        confirmedCount > 0
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Package className="w-4 h-4 inline mr-1" />
                      Finalize Batch ({confirmedCount})
                    </button>
                    <button
                      onClick={clearSession}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        isDayMode ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scanner Device Panel */}
            <div className={`rounded-xl border p-4 ${
              isDayMode ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Monitor className={`w-4 h-4 ${isDayMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <h4 className={`text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                    Scanner Device
                  </h4>
                  {scannerServiceStatus === 'connected' ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-500">
                      <Wifi className="w-3 h-3" /> Connected
                    </span>
                  ) : scannerServiceStatus === 'checking' ? (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <WifiOff className="w-3 h-3" /> No service
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowScannerSetup(!showScannerSetup)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'
                    }`}
                    title="Setup instructions"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    onClick={refreshScanners}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isDayMode ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Detect Scanners
                  </button>
                </div>
              </div>

              {showScannerSetup && (
                <div className={`mb-3 rounded-lg p-3 text-xs ${
                  isDayMode ? 'bg-blue-50 border border-blue-100' : 'bg-blue-900/20 border border-blue-800/30'
                }`}>
                  <p className={`font-semibold mb-2 ${isDayMode ? 'text-blue-800' : 'text-blue-300'}`}>
                    {SCANNER_SETUP_INSTRUCTIONS.title}
                  </p>
                  <ol className={`list-decimal list-inside space-y-1 ${isDayMode ? 'text-blue-700' : 'text-blue-400'}`}>
                    {SCANNER_SETUP_INSTRUCTIONS.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <div className={`mt-2 pt-2 border-t ${isDayMode ? 'border-blue-200' : 'border-blue-700/30'}`}>
                    <p className={`font-medium mb-1 ${isDayMode ? 'text-blue-700' : 'text-blue-400'}`}>Requirements:</p>
                    <ul className={`list-disc list-inside space-y-0.5 ${isDayMode ? 'text-blue-600' : 'text-blue-500'}`}>
                      {SCANNER_SETUP_INSTRUCTIONS.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {scannerServiceStatus === 'connected' && availableScanners.length > 0 ? (
                <div className="flex items-center gap-3">
                  <select
                    value={selectedScanner}
                    onChange={(e) => setSelectedScanner(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                      isDayMode
                        ? 'bg-white border-gray-200 text-gray-700'
                        : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    {availableScanners.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type.toUpperCase()}){s.isDefault ? ' — Default' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleScanFromDevice}
                    disabled={isScanningFromDevice || !selectedScanner}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isScanningFromDevice
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg'
                    }`}
                  >
                    {isScanningFromDevice ? (
                      <><Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> Scanning...</>
                    ) : (
                      <><ScanLine className="w-4 h-4 inline mr-1" /> Scan Now</>
                    )}
                  </button>
                </div>
              ) : scannerServiceStatus === 'connected' ? (
                <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  Service running but no scanners detected. Check that your scanner is connected and drivers are installed.
                </p>
              ) : scannerServiceStatus === 'disconnected' ? (
                <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Scanner Bridge service not detected. Click the <Info className="w-3 h-3 inline" /> icon for setup instructions, or drag/drop files below.
                </p>
              ) : null}
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
                isDragging
                  ? isDayMode
                    ? 'border-emerald-400 bg-emerald-50/80 scale-[1.01]'
                    : 'border-emerald-400 bg-emerald-900/30 scale-[1.01]'
                  : isDayMode
                    ? 'border-gray-300 hover:border-emerald-300 hover:bg-emerald-50/30'
                    : 'border-gray-600 hover:border-emerald-600 hover:bg-emerald-900/10'
              } ${sessionActive ? 'py-8' : 'py-16'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  isDragging
                    ? 'bg-emerald-100 text-emerald-600'
                    : isDayMode
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-white/10 text-gray-400'
                }`}>
                  {isDragging ? (
                    <Download className="w-8 h-8 animate-bounce" />
                  ) : (
                    <ScanLine className="w-8 h-8" />
                  )}
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-200'}`}>
                    {isDragging ? 'Drop files to scan' : 'Drop check images here or click to browse'}
                  </p>
                  <p className={`text-sm mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Supports JPG, PNG, PDF &middot; Multiple files at once
                  </p>
                </div>
                {!sessionActive && (
                  <div className={`mt-3 flex items-center gap-6 text-xs ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5" />
                      <span>Live Preview</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Data Extraction</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Auto-Totaling</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scanned Items */}
            {scanSessionItems.length > 0 && (
              <div className="space-y-3">
                <h3 className={`text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                  Scanned Items ({scanSessionItems.length})
                </h3>
                {scanSessionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border transition-all ${
                      item.status === 'confirmed'
                        ? isDayMode
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-emerald-700/30 bg-emerald-900/10'
                        : item.status === 'error'
                        ? isDayMode
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-red-700/30 bg-red-900/10'
                        : isDayMode
                          ? 'border-gray-200 bg-white'
                          : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Preview thumbnail */}
                      <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ${
                        isDayMode ? 'bg-gray-100' : 'bg-white/10'
                      }`}>
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt="Check scan" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className={`w-6 h-6 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          </div>
                        )}
                      </div>

                      {/* Data fields */}
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <label className={`text-xs font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Check #</label>
                          <input
                            type="text"
                            value={item.extractedData.checkNumber}
                            onChange={(e) => updateScanItemData(item.id, 'checkNumber', e.target.value)}
                            placeholder={item.status === 'scanning' ? 'Extracting...' : 'Enter check #'}
                            disabled={item.status === 'scanning' || item.status === 'confirmed'}
                            className={`w-full mt-0.5 px-2 py-1.5 rounded-lg text-sm border ${
                              isDayMode
                                ? 'bg-white border-gray-200 focus:border-emerald-400'
                                : 'bg-white/5 border-white/10 focus:border-emerald-500 text-white'
                            } focus:outline-none disabled:opacity-50`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Amount</label>
                          <input
                            type="text"
                            value={item.extractedData.amount}
                            onChange={(e) => updateScanItemData(item.id, 'amount', e.target.value)}
                            placeholder={item.status === 'scanning' ? 'Extracting...' : '0.00'}
                            disabled={item.status === 'scanning' || item.status === 'confirmed'}
                            className={`w-full mt-0.5 px-2 py-1.5 rounded-lg text-sm border ${
                              isDayMode
                                ? 'bg-white border-gray-200 focus:border-emerald-400'
                                : 'bg-white/5 border-white/10 focus:border-emerald-500 text-white'
                            } focus:outline-none disabled:opacity-50`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Payer</label>
                          <input
                            type="text"
                            value={item.extractedData.payer}
                            onChange={(e) => updateScanItemData(item.id, 'payer', e.target.value)}
                            placeholder={item.status === 'scanning' ? 'Extracting...' : 'Insurance company'}
                            disabled={item.status === 'scanning' || item.status === 'confirmed'}
                            className={`w-full mt-0.5 px-2 py-1.5 rounded-lg text-sm border ${
                              isDayMode
                                ? 'bg-white border-gray-200 focus:border-emerald-400'
                                : 'bg-white/5 border-white/10 focus:border-emerald-500 text-white'
                            } focus:outline-none disabled:opacity-50`}
                          />
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.status === 'scanning' && (
                          <div className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                            isDayMode ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'
                          }`}>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Running OCR...
                          </div>
                        )}
                        {item.status === 'extracted' && (
                          <>
                            {item.ocrConfidence !== undefined && (
                              <div className={`text-xs px-2 py-0.5 rounded-full ${
                                item.ocrConfidence >= 80
                                  ? isDayMode ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900/20 text-emerald-400'
                                  : item.ocrConfidence >= 50
                                    ? isDayMode ? 'bg-amber-50 text-amber-600' : 'bg-amber-900/20 text-amber-400'
                                    : isDayMode ? 'bg-red-50 text-red-600' : 'bg-red-900/20 text-red-400'
                              }`} title={`OCR confidence: ${Math.round(item.ocrConfidence)}%`}>
                                {Math.round(item.ocrConfidence)}%
                              </div>
                            )}
                            {item.errorMessage && (
                              <div className={`text-xs px-2 py-0.5 rounded-full ${
                                isDayMode ? 'bg-amber-50 text-amber-600' : 'bg-amber-900/20 text-amber-400'
                              }`} title={item.errorMessage}>
                                <AlertCircle className="w-3 h-3 inline" />
                              </div>
                            )}
                            <button
                              onClick={() => confirmScanItem(item.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                              Confirm
                            </button>
                          </>
                        )}
                        {item.status === 'confirmed' && (
                          <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            isDayMode ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/30 text-emerald-400'
                          }`}>
                            Confirmed
                          </div>
                        )}
                        {item.previewUrl && (
                          <button
                            onClick={() => setExpandedScanItem(expandedScanItem === item.id ? null : item.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'
                            }`}
                            title="Preview image"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeScanItem(item.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDayMode ? 'hover:bg-red-50 text-red-400' : 'hover:bg-red-900/20 text-red-400'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Image Preview */}
                    {expandedScanItem === item.id && item.previewUrl && (
                      <div className={`px-4 pb-4 pt-0 border-t ${isDayMode ? 'border-gray-100' : 'border-white/5'}`}>
                        <img
                          src={item.previewUrl}
                          alt="Check scan preview"
                          className="mt-3 max-h-64 rounded-lg border border-gray-200 shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty state when no session */}
            {!sessionActive && scanSessionItems.length === 0 && (
              <div className={`rounded-xl p-6 ${isDayMode ? 'bg-gradient-to-br from-gray-50 to-blue-50/30' : 'bg-gradient-to-br from-white/5 to-blue-900/10'}`}>
                <h3 className={`text-lg font-semibold mb-3 ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>
                  How the Scan Station Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isDayMode ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/30 text-emerald-400'
                    }`}>1</div>
                    <div>
                      <p className={`text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Scan or Upload</p>
                      <p className={`text-xs mt-0.5 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Drop check images into the scan zone. Supports batch uploads.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isDayMode ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'
                    }`}>2</div>
                    <div>
                      <p className={`text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Verify & Confirm</p>
                      <p className={`text-xs mt-0.5 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Review extracted data, fill in details, and confirm each item.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isDayMode ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/30 text-purple-400'
                    }`}>3</div>
                    <div>
                      <p className={`text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Finalize Batch</p>
                      <p className={`text-xs mt-0.5 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Submit the batch to create records with running totals auto-calculated.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== REGISTRY VIEW ========== */}
        {activeView === 'registry' && (
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by Check/EFT#, Insurance Company, or Handler..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${
                    isDayMode
                      ? 'bg-white border-gray-200 focus:border-emerald-400'
                      : 'bg-white/5 border-white/10 focus:border-emerald-500 text-white'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-200`}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: 'This Week' },
                  { key: 'month', label: 'This Month' },
                  { key: 'all', label: 'All Time' },
                ] as const).map(option => (
                  <button
                    key={option.key}
                    onClick={() => setRegistryTimeframe(option.key)}
                    disabled={showArchivedInsuranceChecks}
                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      registryTimeframe === option.key && !showArchivedInsuranceChecks
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : isDayMode
                          ? 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
                          : 'bg-white/5 text-gray-300 border border-white/10 hover:border-emerald-500/40'
                    } ${showArchivedInsuranceChecks ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowArchivedInsuranceChecks(!showArchivedInsuranceChecks)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                    showArchivedInsuranceChecks
                      ? isDayMode
                        ? 'bg-white/60 text-gray-700 hover:bg-white/80 border border-white/40'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                      : 'bg-gradient-primary text-gold-400 shadow-glow-primary'
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  {showArchivedInsuranceChecks ? 'Show Active' : 'Show Archived'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`inline-flex rounded-xl p-1 ${isDayMode ? 'bg-gray-100' : 'bg-white/5 border border-white/10'}`}>
                {([
                  { key: 'day', label: 'Group by Day' },
                  { key: 'week', label: 'Group by Week' },
                  { key: 'month', label: 'Group by Month' },
                ] as const).map(option => (
                  <button
                    key={option.key}
                    onClick={() => setRegistryGroupBy(option.key)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      registryGroupBy === option.key
                        ? isDayMode
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'bg-emerald-500 text-white'
                        : isDayMode
                          ? 'text-gray-600 hover:text-gray-900'
                          : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className={`text-sm font-medium ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Showing <span className={`${isDayMode ? 'text-gray-900' : 'text-white'} font-bold`}>{registryScopeLabel}</span> · {scopedInsuranceChecks.length} records
              </div>
            </div>

            {showArchivedInsuranceChecks && (
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Filter by Date:
                </label>
                <input
                  type="date"
                  value={archiveInsuranceChecksDateFilter}
                  onChange={(e) => setArchiveInsuranceChecksDateFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-sm border ${
                    isDayMode
                      ? 'bg-white/80 border-gray-300'
                      : 'bg-white/5 border-white/10 text-gray-300'
                  } focus:ring-2 focus:ring-gold-400 focus:outline-none`}
                />
                {archiveInsuranceChecksDateFilter && (
                  <button
                    onClick={() => setArchiveInsuranceChecksDateFilter('')}
                    className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={`rounded-xl px-4 py-3 ${isDayMode ? 'bg-emerald-50 border border-emerald-100' : 'bg-emerald-900/20 border border-emerald-800/30'}`}>
                <p className={`text-xs font-medium ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`}>Checks · {registryScopeLabel}</p>
                <p className={`text-lg font-bold ${isDayMode ? 'text-emerald-800' : 'text-emerald-300'}`}>
                  ${checkTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`rounded-xl px-4 py-3 ${isDayMode ? 'bg-blue-50 border border-blue-100' : 'bg-blue-900/20 border border-blue-800/30'}`}>
                <p className={`text-xs font-medium ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`}>EFTs · {registryScopeLabel}</p>
                <p className={`text-lg font-bold ${isDayMode ? 'text-blue-800' : 'text-blue-300'}`}>
                  ${eftTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`rounded-xl px-4 py-3 ${isDayMode ? 'bg-purple-50 border border-purple-100' : 'bg-purple-900/20 border border-purple-800/30'}`}>
                <p className={`text-xs font-medium ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`}>Total · {registryScopeLabel}</p>
                <p className={`text-lg font-bold ${isDayMode ? 'text-purple-800' : 'text-purple-300'}`}>
                  ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`rounded-xl px-4 py-3 ${isDayMode ? 'bg-amber-50 border border-amber-100' : 'bg-amber-900/20 border border-amber-800/30'}`}>
                <p className={`text-xs font-medium ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`}>Awaiting Entry</p>
                <p className={`text-lg font-bold ${isDayMode ? 'text-amber-800' : 'text-amber-300'}`}>
                  ${scopedInsuranceChecks.filter(c => c.status !== 'Entered').reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {groupedInsuranceChecks.length === 0 ? (
              <div className={`rounded-xl px-4 py-10 text-center border ${isDayMode ? 'bg-white border-gray-200 text-gray-500' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                No insurance checks found matching your current search and timeframe.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedInsuranceChecks.map(group => {
                  const isExpanded = expandedRegistryGroups.has(group.id);
                  return (
                    <div key={group.id} className={`rounded-xl overflow-hidden border ${isDayMode ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                      <button
                        onClick={() => setExpandedRegistryGroups(prev => {
                          const next = new Set(prev);
                          if (next.has(group.id)) next.delete(group.id);
                          else next.add(group.id);
                          return next;
                        })}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left ${isDayMode ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}
                      >
                        <div>
                          <p className={`text-sm font-semibold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>{group.label}</p>
                          <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {group.checks.length} records · ${group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-semibold ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {group.checks.filter(check => check.status !== 'Entered').length} pending
                          </span>
                          {isExpanded ? <Eye className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className={`min-w-full divide-y ${isDayMode ? 'divide-gray-200' : 'divide-white/10'}`}>
                            <thead className={isDayMode ? 'bg-gray-50' : 'bg-white/5'}>
                              <tr>
                                {['Check/EFT#', 'Type', 'Insurance', 'Dist.', 'Amount', 'DOS', 'Date Created', 'Aging', 'Created By', 'Handler', 'Status', 'Actions'].map(h => (
                                  <th key={h} className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDayMode ? 'text-gray-700' : 'text-gray-400'}`}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${isDayMode ? 'divide-gray-100' : 'divide-white/5'}`}>
                              {group.checks.map((check) => (
                                <tr
                                  key={check.id}
                                  className={`transition-colors ${
                                    check.status === 'Created'
                                      ? isDayMode ? 'bg-gray-50/50 hover:bg-gray-100/50' : 'bg-white/[0.02] hover:bg-white/[0.05]'
                                      : check.status === 'Entered'
                                        ? isDayMode ? 'bg-green-50/50 hover:bg-green-100/50' : 'bg-emerald-900/10 hover:bg-emerald-900/20'
                                        : isDayMode ? 'bg-yellow-50/50 hover:bg-yellow-100/50' : 'bg-amber-900/10 hover:bg-amber-900/20'
                                  }`}
                                >
                                  <td className={`px-3 py-3 text-sm font-medium ${isDayMode ? 'text-gray-900' : 'text-gray-200'}`}>{check.checkEftNumber}</td>
                                  <td className="px-3 py-3">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                      check.paymentType === 'Check'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {check.paymentType}
                                    </span>
                                  </td>
                                  <td className={`px-3 py-3 text-sm ${isDayMode ? 'text-gray-900' : 'text-gray-200'}`}>{check.insuranceCompany}</td>
                                  <td className={`px-3 py-3 text-sm ${isDayMode ? 'text-gray-900' : 'text-gray-200'}`}>{check.distributionType}</td>
                                  <td className={`px-3 py-3 text-sm font-semibold ${isDayMode ? 'text-gray-900' : 'text-gray-200'}`}>${check.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className={`px-3 py-3 text-sm ${isDayMode ? 'text-gray-900' : 'text-gray-300'}`}>{check.dateOfService || '-'}</td>
                                  <td className={`px-3 py-3 text-sm ${isDayMode ? 'text-gray-900' : 'text-gray-300'}`}>{check.dateEntered || '-'}</td>
                                  <td className="px-3 py-3">
                                    <span className={`text-sm font-medium ${
                                      check.aging > 60 ? 'text-red-600' :
                                        check.aging > 30 ? 'text-orange-500' :
                                          'text-green-600'
                                    }`}>
                                      {check.aging}d
                                    </span>
                                  </td>
                                  <td className={`px-3 py-3 text-sm ${isDayMode ? 'text-gray-900' : 'text-gray-300'}`}>{check.enteredBy}</td>
                                  <td className={`px-3 py-3 text-sm ${isDayMode ? 'text-gray-900' : 'text-gray-300'}`}>{check.handler}</td>
                                  <td className="px-3 py-3">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                      check.status === 'Created'
                                        ? 'bg-gray-100 text-gray-800'
                                        : check.status === 'Entered'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {check.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-1">
                                      <button
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        onClick={() => onEditCheck(check)}
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                        onClick={() => onAddUpdate('insurance-check', check.id, check.checkEftNumber, check.status)}
                                        title="Add Update"
                                      >
                                        <MessageSquarePlus className="w-4 h-4" />
                                      </button>
                                      <button
                                        className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                        onClick={() => onViewHistory(check.id, check.checkEftNumber)}
                                        title="View History"
                                      >
                                        <History className="w-4 h-4" />
                                      </button>
                                      {check.isArchived ? (
                                        <button
                                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                          onClick={() => handleUnarchiveCheck(check.id)}
                                          title="Unarchive"
                                        >
                                          <ArchiveRestore className="w-4 h-4" />
                                        </button>
                                      ) : (
                                        <button
                                          className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                          onClick={() => handleArchiveCheck(check.id, 'Current User')}
                                          title="Archive"
                                        >
                                          <Archive className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button
                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                        onClick={() => handleDeleteCheck(check.id, check.checkEftNumber)}
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== ANALYTICS VIEW ========== */}
        {activeView === 'analytics' && (
          <div className="space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`rounded-xl p-5 ${isDayMode ? 'bg-white border border-gray-100 shadow-sm' : 'bg-white/5 border border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Avg Aging</p>
                    <p className="text-2xl font-bold" style={{ color: csdGold }}>
                      {scopedInsuranceChecks.length > 0
                        ? Math.round(scopedInsuranceChecks.reduce((sum, c) => sum + c.aging, 0) / scopedInsuranceChecks.length)
                        : 0} days
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </div>

              <div className={`rounded-xl p-5 ${isDayMode ? 'bg-white border border-gray-100 shadow-sm' : 'bg-white/5 border border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Awaiting Entry</p>
                    <p className="text-2xl font-bold" style={{ color: csdGold }}>
                      ${scopedInsuranceChecks.filter(c => c.status !== 'Entered').reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500 opacity-50" />
                </div>
              </div>

              <div className={`rounded-xl p-5 ${isDayMode ? 'bg-white border border-gray-100 shadow-sm' : 'bg-white/5 border border-white/10'}`}>
                <div>
                  <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'} mb-2`}>Payment Type</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Checks:</span>
                      <span className="text-sm font-semibold" style={{ color: csdGold }}>
                        ${checkTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>EFTs:</span>
                      <span className="text-sm font-semibold" style={{ color: csdGold }}>
                        ${eftTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-5 ${isDayMode ? 'bg-white border border-gray-100 shadow-sm' : 'bg-white/5 border border-white/10'}`}>
                <div>
                  <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'} mb-2`}>Status Breakdown</p>
                  <div className="space-y-1.5">
                    {(['Created', 'Entered', 'Pending Review'] as const).map(status => {
                      const count = scopedInsuranceChecks.filter(c => c.status === status).length;
                      const total = scopedInsuranceChecks.length || 1;
                      const pct = Math.round((count / total) * 100);
                      const color = status === 'Created' ? 'bg-gray-400' : status === 'Entered' ? 'bg-emerald-500' : 'bg-amber-500';
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${color}`} />
                              <span className={`text-xs ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>{status}</span>
                            </div>
                            <span className={`text-xs font-semibold ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>{count}</span>
                          </div>
                          <div className={`w-full h-1 rounded-full ${isDayMode ? 'bg-gray-100' : 'bg-white/10'}`}>
                            <div className={`h-1 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Average Amounts */}
            <div className={`rounded-xl p-5 ${isDayMode ? 'bg-white border border-gray-100 shadow-sm' : 'bg-white/5 border border-white/10'}`}>
              <h4 className="text-sm font-semibold mb-4" style={{ color: csdGold }}>
                Average Payment Amount by Type
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDayMode ? 'bg-emerald-50' : 'bg-emerald-900/20'}`}>
                      <CreditCard className={`w-5 h-5 ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    </div>
                    <span className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Avg Check Amount</span>
                  </div>
                  <span className="font-bold text-lg" style={{ color: csdGold }}>
                    ${(() => {
                      const checks = scopedInsuranceChecks.filter(c => c.paymentType === 'Check');
                      return checks.length > 0
                        ? (checks.reduce((sum, c) => sum + c.totalAmount, 0) / checks.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '0.00';
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDayMode ? 'bg-blue-50' : 'bg-blue-900/20'}`}>
                      <Download className={`w-5 h-5 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
                    </div>
                    <span className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Avg EFT Amount</span>
                  </div>
                  <span className="font-bold text-lg" style={{ color: csdGold }}>
                    ${(() => {
                      const efts = scopedInsuranceChecks.filter(c => c.paymentType === 'EFT');
                      return efts.length > 0
                        ? (efts.reduce((sum, c) => sum + c.totalAmount, 0) / efts.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '0.00';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Entered Totals */}
            <div className={`rounded-xl p-5 ${isDayMode ? 'bg-white border border-gray-100 shadow-sm' : 'bg-white/5 border border-white/10'}`}>
              <h4 className="text-sm font-semibold mb-4" style={{ color: csdGold }}>
                Daily Entered Totals (Last 5 Business Days)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {getLast5BusinessDays().map((date, index) => {
                  const dateStr = toLocalDateString(date);
                  const dayChecks = scopedInsuranceChecks.filter(c => c.status === 'Entered' && c.dateEntered && c.dateEntered.startsWith(dateStr));
                  const dayTotal = dayChecks.reduce((sum, c) => sum + c.totalAmount, 0);
                  const isToday = dateStr === getLocalDateString();

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border transition-all ${
                        isToday
                          ? isDayMode
                            ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-300'
                            : 'bg-emerald-900/20 border-emerald-700/30 ring-1 ring-emerald-600/30'
                          : isDayMode
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      <p className={`text-xs font-medium mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {isToday && <span className="ml-1 text-emerald-600 font-bold">Today</span>}
                      </p>
                      <p className="text-lg font-bold" style={{ color: csdGold }}>
                        ${dayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {dayChecks.length} entered
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aging Distribution */}
            <div className={`rounded-xl p-5 ${isDayMode ? 'bg-white border border-gray-100 shadow-sm' : 'bg-white/5 border border-white/10'}`}>
              <h4 className="text-sm font-semibold mb-4" style={{ color: csdGold }}>
                Aging Distribution
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: '0-30 Days', filter: (c: InsuranceCheckRecord) => c.aging <= 30, color: 'emerald' },
                  { label: '31-60 Days', filter: (c: InsuranceCheckRecord) => c.aging > 30 && c.aging <= 60, color: 'amber' },
                  { label: '60+ Days', filter: (c: InsuranceCheckRecord) => c.aging > 60, color: 'red' },
                ].map(bucket => {
                  const items = scopedInsuranceChecks.filter(bucket.filter);
                  const amount = items.reduce((sum, c) => sum + c.totalAmount, 0);
                  return (
                    <div key={bucket.label} className={`p-4 rounded-xl border ${
                      isDayMode ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/[0.03]'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full bg-${bucket.color}-500`} />
                        <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>{bucket.label}</span>
                      </div>
                      <p className="text-xl font-bold" style={{ color: csdGold }}>
                        ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== ADD CHECK MODAL ========== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
            <div className={`sticky top-0 ${isDayMode ? 'bg-white' : 'bg-gray-800'} border-b ${isDayMode ? 'border-gray-200' : 'border-gray-700'} p-6 flex justify-between items-center rounded-t-2xl`}>
              <h3 className="text-2xl font-bold" style={{ color: csdGold }}>Add New Insurance Check/EFT</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddCheckSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>Check/EFT Number</label>
                  <input name="checkEftNumber" type="text" required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDayMode ? 'border-gray-300' : 'border-gray-600 bg-gray-700 text-white'}`} placeholder="12345" />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDayMode ? '' : 'text-gray-300'}`}>Payment Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input type="radio" name="paymentType" value="Check" defaultChecked className="mr-2" />
                      <span className={`text-sm ${isDayMode ? '' : 'text-gray-300'}`}>Check</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input type="radio" name="paymentType" value="EFT" className="mr-2" />
                      <span className={`text-sm ${isDayMode ? '' : 'text-gray-300'}`}>EFT</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>Insurance Company</label>
                  <input name="insuranceCompany" type="text" required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDayMode ? 'border-gray-300' : 'border-gray-600 bg-gray-700 text-white'}`} placeholder="Delta Dental" />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDayMode ? '' : 'text-gray-300'}`}>Distribution Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio" name="distributionType" value="Bulk" defaultChecked className="mr-2"
                        onChange={(e) => {
                          const dosField = document.getElementById('station-dos-field') as HTMLInputElement;
                          if (dosField) { dosField.disabled = e.target.checked; dosField.value = ''; }
                        }}
                      />
                      <span className={`text-sm ${isDayMode ? '' : 'text-gray-300'}`}>Bulk</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio" name="distributionType" value="Individual" className="mr-2"
                        onChange={(e) => {
                          const dosField = document.getElementById('station-dos-field') as HTMLInputElement;
                          if (dosField) dosField.disabled = !e.target.checked;
                        }}
                      />
                      <span className={`text-sm ${isDayMode ? '' : 'text-gray-300'}`}>Individual</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>Total Amount</label>
                  <input name="totalAmount" type="number" step="0.01" required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDayMode ? 'border-gray-300' : 'border-gray-600 bg-gray-700 text-white'}`} placeholder="1500.00" />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>Aging (Days)</label>
                  <input name="aging" type="number" defaultValue="0" required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDayMode ? 'border-gray-300' : 'border-gray-600 bg-gray-700 text-white'}`} placeholder="0" />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>Entered By</label>
                  <input name="enteredBy" type="text" required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDayMode ? 'border-gray-300' : 'border-gray-600 bg-gray-700 text-white'}`} placeholder="John D." />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>Handler</label>
                  <input name="handler" type="text" required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDayMode ? 'border-gray-300' : 'border-gray-600 bg-gray-700 text-white'}`} placeholder="Sarah J." />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>DOS (Date of Service)</label>
                  <input
                    id="station-dos-field"
                    name="dateOfService"
                    type="date"
                    disabled
                    className={`w-full px-3 py-2 rounded-lg text-sm border ${isDayMode ? 'bg-gray-100 border-gray-300 text-gray-400' : 'bg-gray-800/50 border-gray-700 text-gray-500'} disabled:cursor-not-allowed focus:ring-2 focus:ring-gold-400 focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>Date Entered</label>
                  <input name="dateEntered" type="date" className={`w-full px-3 py-2 rounded-lg text-sm border ${isDayMode ? 'bg-white/80 border-gray-300' : 'bg-gray-700/50 border-gray-600 text-white'} focus:ring-2 focus:ring-gold-400 focus:outline-none`} />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDayMode ? '' : 'text-gray-300'}`}>Status</label>
                  <select name="status" required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDayMode ? 'border-gray-300' : 'border-gray-600 bg-gray-700 text-white'}`}>
                    <option value="Created">Created</option>
                    <option value="Entered">Entered</option>
                    <option value="Pending Review">Pending Review</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className={`px-4 py-2 border rounded-lg transition-all ${isDayMode ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                  Add Check/EFT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
