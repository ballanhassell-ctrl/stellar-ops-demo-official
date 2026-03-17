// =====================================================
// EFT Reconciliation Tracker
// Tracks EFT payments organized by weekly periods
// Matches manager's spreadsheet layout with period grouping
// =====================================================

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Calendar,
  Save,
  Loader2,
  RefreshCw,
  FileText,
  MessageSquare,
  Filter,
} from 'lucide-react';
import type {
  EFTReconciliationPeriod,
  EFTReconciliationEntry,
  EFTReconciliationEntryStatus,
  NoteEntry,
} from '../types/database.types';
import {
  getEFTPeriods,
  insertEFTPeriod,
  updateEFTPeriod,
  deleteEFTPeriod,
  getAllEFTEntries,
  insertEFTEntry,
  updateEFTEntry,
  deleteEFTEntry,
  formatPeriodLabel,
} from '../services/eftReconciliationService';
import { sanitizePatientName } from '../utils/sanitizePatientName';
import { getLocalDateString } from '../utils/dateUtils';
import NotesAuditDrawer from './NotesAuditDrawer';
import SuccessToast from './SuccessToast';

// =====================================================
// CONSTANTS
// =====================================================

const INSURANCE_COMPANIES = ['Aetna', 'Cigna', 'DeltaDental', 'GEHA', 'PNC Echo', 'DD of IL', 'DD of WA', 'Other'];

const STATUS_OPTIONS: { value: EFTReconciliationEntryStatus; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'posted', label: 'Posted' },
  { value: 'pending', label: 'Pending' },
  { value: 'posted already by via', label: 'Posted Already' },
  { value: 'exception', label: 'Exception' },
  { value: 'reconciled', label: 'Reconciled' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string; dot: string }> = {
  '': { bg: 'bg-gray-100', text: 'text-gray-600', darkBg: 'bg-gray-800/40', darkText: 'text-gray-400', dot: 'bg-gray-400' },
  posted: { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'bg-green-900/40', darkText: 'text-green-300', dot: 'bg-green-500' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-900/40', darkText: 'text-amber-300', dot: 'bg-amber-500' },
  'posted already by via': { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/40', darkText: 'text-blue-300', dot: 'bg-blue-500' },
  exception: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'bg-red-900/40', darkText: 'text-red-300', dot: 'bg-red-500' },
  reconciled: { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-900/40', darkText: 'text-emerald-300', dot: 'bg-emerald-500' },
};

type NewPeriodForm = {
  period_start: string;
  period_end: string;
};

type NewEntryForm = {
  insurance_company: string;
  payment_date: string;
  trn_number: string;
  date_posted: string;
  amount: string;
  status: EFTReconciliationEntryStatus;
  notes: string;
};

const EMPTY_PERIOD_FORM: NewPeriodForm = {
  period_start: '',
  period_end: '',
};

const EMPTY_ENTRY_FORM: NewEntryForm = {
  insurance_company: '',
  payment_date: '',
  trn_number: '',
  date_posted: '',
  amount: '',
  status: '',
  notes: '',
};

// Helper: get the current month/year in EST
function getCurrentMonthEST(): { month: number; year: number } {
  const now = new Date();
  const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const estDate = new Date(estString);
  return { month: estDate.getMonth(), year: estDate.getFullYear() };
}

// Build a list of month/year options from the data range
function buildMonthOptions(periods: EFTReconciliationPeriod[]): { label: string; month: number; year: number }[] {
  if (periods.length === 0) return [];
  const months = new Set<string>();
  for (const p of periods) {
    const start = new Date(p.period_start + 'T00:00:00');
    const end = new Date(p.period_end + 'T00:00:00');
    months.add(`${start.getFullYear()}-${start.getMonth()}`);
    months.add(`${end.getFullYear()}-${end.getMonth()}`);
  }
  const sorted = Array.from(months)
    .map(key => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, month: m };
    })
    .sort((a, b) => b.year - a.year || b.month - a.month);

  return sorted.map(({ year, month }) => {
    const d = new Date(year, month, 1);
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return { label, month, year };
  });
}

// Build a list of unique years from periods
function buildYearOptions(periods: EFTReconciliationPeriod[]): number[] {
  const years = new Set<number>();
  for (const p of periods) {
    years.add(new Date(p.period_start + 'T00:00:00').getFullYear());
    years.add(new Date(p.period_end + 'T00:00:00').getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

type ViewFilter = 'current_month' | 'month' | 'year' | 'all';

// =====================================================
// COMPONENT
// =====================================================

interface EFTReconciliationProps {
  isDayMode: boolean;
}

export default function EFTReconciliation({ isDayMode }: EFTReconciliationProps) {
  // --------------------------------------------------
  // State
  // --------------------------------------------------
  const [periods, setPeriods] = useState<EFTReconciliationPeriod[]>([]);
  const [entries, setEntries] = useState<EFTReconciliationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const expandedPeriodsRef = useRef<Set<string>>(new Set());

  // View filter
  const currentEST = getCurrentMonthEST();
  const [viewFilter, setViewFilter] = useState<ViewFilter>('current_month');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentEST.month);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(currentEST.year);
  const [selectedYear, setSelectedYear] = useState<number>(currentEST.year);

  // Period form
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState<NewPeriodForm>(EMPTY_PERIOD_FORM);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

  // Entry form
  const [showAddEntry, setShowAddEntry] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<NewEntryForm>(EMPTY_ENTRY_FORM);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Notes/Audit drawer
  const [drawerEntry, setDrawerEntry] = useState<EFTReconciliationEntry | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  // Track if this is the initial load
  const isInitialLoad = useRef(true);

  // Keep ref in sync with state
  useEffect(() => {
    expandedPeriodsRef.current = expandedPeriods;
  }, [expandedPeriods]);

  // --------------------------------------------------
  // Data Fetching - preserves expanded state on refresh
  // --------------------------------------------------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [periodsData, entriesData] = await Promise.all([
        getEFTPeriods(),
        getAllEFTEntries(),
      ]);
      setPeriods(periodsData);
      setEntries(entriesData);
      // Only auto-expand on first load, not on subsequent refreshes
      if (isInitialLoad.current && periodsData.length > 0) {
        isInitialLoad.current = false;
        setExpandedPeriods(new Set([periodsData[0].id]));
      }
    } catch (error) {
      console.error('Error fetching EFT data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --------------------------------------------------
  // Computed - filter periods based on view selection
  // --------------------------------------------------
  const entriesByPeriod = useMemo(() => {
    const map: Record<string, EFTReconciliationEntry[]> = {};
    for (const entry of entries) {
      if (!map[entry.period_id]) map[entry.period_id] = [];
      map[entry.period_id].push(entry);
    }
    return map;
  }, [entries]);

  // Filter periods by view selection
  const viewFilteredPeriods = useMemo(() => {
    if (viewFilter === 'all') return periods;

    return periods.filter(p => {
      const start = new Date(p.period_start + 'T00:00:00');
      const end = new Date(p.period_end + 'T00:00:00');

      if (viewFilter === 'current_month' || viewFilter === 'month') {
        const targetMonth = viewFilter === 'current_month' ? currentEST.month : selectedMonth;
        const targetYear = viewFilter === 'current_month' ? currentEST.year : selectedMonthYear;
        // Include period if it overlaps with the target month at all
        const monthStart = new Date(targetYear, targetMonth, 1);
        const monthEnd = new Date(targetYear, targetMonth + 1, 0); // last day of month
        return start <= monthEnd && end >= monthStart;
      }

      if (viewFilter === 'year') {
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31);
        return start <= yearEnd && end >= yearStart;
      }

      return true;
    });
  }, [periods, viewFilter, selectedMonth, selectedMonthYear, selectedYear, currentEST.month, currentEST.year]);

  // Apply search on top of view filter
  const filteredPeriods = useMemo(() => {
    if (!searchTerm) return viewFilteredPeriods;
    const lower = searchTerm.toLowerCase();
    return viewFilteredPeriods.filter(p => {
      if (p.period_label.toLowerCase().includes(lower)) return true;
      const periodEntries = entriesByPeriod[p.id] || [];
      return periodEntries.some(e =>
        e.insurance_company.toLowerCase().includes(lower) ||
        e.trn_number.toLowerCase().includes(lower) ||
        (e.notes && e.notes.toLowerCase().includes(lower))
      );
    });
  }, [viewFilteredPeriods, searchTerm, entriesByPeriod]);

  // Get entries that belong to the visible/filtered periods for metrics
  const visibleEntries = useMemo(() => {
    const visiblePeriodIds = new Set(viewFilteredPeriods.map(p => p.id));
    return entries.filter(e => visiblePeriodIds.has(e.period_id));
  }, [entries, viewFilteredPeriods]);

  // Summary metrics scoped to the selected view period
  const summaryMetrics = useMemo(() => {
    const totalAmount = visibleEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalEntries = visibleEntries.length;
    const totalPeriods = viewFilteredPeriods.length;
    const postedAmount = visibleEntries.filter(e => e.status === 'posted' || e.status === 'reconciled').reduce((sum, e) => sum + e.amount, 0);
    const pendingAmount = visibleEntries.filter(e => e.status === '' || e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
    return { totalAmount, totalEntries, totalPeriods, postedAmount, pendingAmount };
  }, [viewFilteredPeriods, visibleEntries]);

  // Build month/year options for the filter dropdowns
  const monthOptions = useMemo(() => buildMonthOptions(periods), [periods]);
  const yearOptions = useMemo(() => buildYearOptions(periods), [periods]);

  // View filter label for the metrics header
  const viewFilterLabel = useMemo(() => {
    if (viewFilter === 'current_month') {
      const d = new Date(currentEST.year, currentEST.month, 1);
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) + ' (Current)';
    }
    if (viewFilter === 'month') {
      const d = new Date(selectedMonthYear, selectedMonth, 1);
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewFilter === 'year') return String(selectedYear);
    return 'All Time';
  }, [viewFilter, selectedMonth, selectedMonthYear, selectedYear, currentEST.month, currentEST.year]);

  // --------------------------------------------------
  // Period Handlers
  // --------------------------------------------------
  const togglePeriod = (id: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddPeriod = async () => {
    if (!periodForm.period_start || !periodForm.period_end) return;
    setSaving(true);
    try {
      const label = formatPeriodLabel(periodForm.period_start, periodForm.period_end);
      await insertEFTPeriod({
        period_start: periodForm.period_start,
        period_end: periodForm.period_end,
        period_label: label,
        notes: null,
        created_by: 'staff',
      });
      setPeriodForm(EMPTY_PERIOD_FORM);
      setShowAddPeriod(false);
      setToast({ message: 'EFT period created', type: 'success' });
      await fetchData();
    } catch {
      setToast({ message: 'Failed to create period', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm('Delete this EFT period and all its entries?')) return;
    try {
      await deleteEFTPeriod(id);
      setToast({ message: 'Period deleted', type: 'success' });
      await fetchData();
    } catch {
      setToast({ message: 'Failed to delete period', type: 'error' });
    }
  };

  // --------------------------------------------------
  // Entry Handlers
  // --------------------------------------------------
  const handleAddEntry = async (periodId: string) => {
    if (!entryForm.insurance_company || !entryForm.trn_number || !entryForm.amount) return;
    setSaving(true);
    try {
      await insertEFTEntry({
        period_id: periodId,
        insurance_company: sanitizePatientName(entryForm.insurance_company),
        payment_date: entryForm.payment_date || getLocalDateString(),
        trn_number: entryForm.trn_number.trim(),
        date_posted: entryForm.date_posted || null,
        amount: parseFloat(entryForm.amount) || 0,
        status: entryForm.status,
        notes: entryForm.notes || null,
        structured_notes: [],
        audit_trail: [],
        entered_by: 'staff',
      });
      setEntryForm(EMPTY_ENTRY_FORM);
      setShowAddEntry(null);
      setToast({ message: 'EFT entry added', type: 'success' });
      await fetchData();
    } catch {
      setToast({ message: 'Failed to add entry', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditEntry = (entry: EFTReconciliationEntry) => {
    setEditingEntryId(entry.id);
    setEntryForm({
      insurance_company: entry.insurance_company,
      payment_date: entry.payment_date,
      trn_number: entry.trn_number,
      date_posted: entry.date_posted || '',
      amount: String(entry.amount),
      status: entry.status,
      notes: entry.notes || '',
    });
    setShowAddEntry(entry.period_id);
  };

  const handleUpdateEntry = async () => {
    if (!editingEntryId) return;
    setSaving(true);
    try {
      await updateEFTEntry(editingEntryId, {
        insurance_company: sanitizePatientName(entryForm.insurance_company),
        payment_date: entryForm.payment_date,
        trn_number: entryForm.trn_number.trim(),
        date_posted: entryForm.date_posted || null,
        amount: parseFloat(entryForm.amount) || 0,
        status: entryForm.status,
        notes: entryForm.notes || null,
      });
      setEntryForm(EMPTY_ENTRY_FORM);
      setEditingEntryId(null);
      setShowAddEntry(null);
      setToast({ message: 'Entry updated', type: 'success' });
      await fetchData();
    } catch {
      setToast({ message: 'Failed to update entry', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this EFT entry?')) return;
    try {
      await deleteEFTEntry(id);
      setToast({ message: 'Entry deleted', type: 'success' });
      await fetchData();
    } catch {
      setToast({ message: 'Failed to delete entry', type: 'error' });
    }
  };

  // Inline edit handler - updates local state immediately so accordion stays open
  const handleInlineSave = async (entryId: string, field: string, value: string) => {
    try {
      const updates: Record<string, unknown> = {};
      if (field === 'amount') {
        updates[field] = parseFloat(value) || 0;
      } else if (field === 'date_posted') {
        updates[field] = value || null;
      } else {
        updates[field] = value;
      }

      // Optimistically update local entries state to avoid re-render losing accordion state
      setEntries(prev =>
        prev.map(e =>
          e.id === entryId ? { ...e, ...updates } as EFTReconciliationEntry : e
        )
      );
      setEditingCell(null);

      // Persist to DB
      await updateEFTEntry(entryId, updates as Partial<Omit<EFTReconciliationEntry, 'id' | 'created_at' | 'updated_at'>>);

      // Refresh data in background without resetting expanded state
      const [periodsData, entriesData] = await Promise.all([
        getEFTPeriods(),
        getAllEFTEntries(),
      ]);
      setPeriods(periodsData);
      setEntries(entriesData);
    } catch {
      setToast({ message: 'Failed to save', type: 'error' });
      // Revert on error
      await fetchData();
    }
  };

  // Notes handler
  const handleNotesUpdate = async (entry: EFTReconciliationEntry, newNotes: NoteEntry[]) => {
    try {
      await updateEFTEntry(entry.id, { structured_notes: newNotes });
      await fetchData();
    } catch {
      setToast({ message: 'Failed to save notes', type: 'error' });
    }
  };

  // --------------------------------------------------
  // Styling helpers
  // --------------------------------------------------
  const cardClass = isDayMode
    ? 'bg-white/80 border border-white/40 shadow-sm'
    : 'bg-white/5 border border-white/10';
  const headerText = isDayMode ? 'text-gray-900' : 'text-white';
  const subText = isDayMode ? 'text-gray-500' : 'text-gray-400';
  const inputClass = isDayMode
    ? 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20'
    : 'bg-gray-800 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-400/20';
  const tableHeaderClass = isDayMode
    ? 'bg-gray-50 text-gray-700'
    : 'bg-gray-800/60 text-gray-300';
  const tableRowClass = isDayMode
    ? 'hover:bg-blue-50/50 border-b border-gray-100'
    : 'hover:bg-white/5 border-b border-white/5';

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className={`ml-3 text-lg ${subText}`}>Loading EFT Reconciliation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <SuccessToast
          message={toast.message}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Notes/Audit Drawer */}
      {drawerEntry && (
        <NotesAuditDrawer
          isOpen={!!drawerEntry}
          onClose={() => setDrawerEntry(null)}
          isDayMode={isDayMode}
          entityType="EFT Entry"
          entityLabel={`${drawerEntry.insurance_company} - ${drawerEntry.trn_number}`}
          notes={drawerEntry.structured_notes}
          auditTrail={drawerEntry.audit_trail}
          onAddNote={(note: NoteEntry) => handleNotesUpdate(drawerEntry, [...drawerEntry.structured_notes, note])}
        />
      )}

      {/* View Filter Bar */}
      <div className={`rounded-xl p-4 ${cardClass}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${subText}`} />
            <span className={`text-sm font-medium ${subText}`}>View:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewFilter('current_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewFilter === 'current_month'
                  ? 'bg-blue-500 text-white shadow-md'
                  : isDayMode
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={() => setViewFilter('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewFilter === 'month'
                  ? 'bg-blue-500 text-white shadow-md'
                  : isDayMode
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setViewFilter('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewFilter === 'year'
                  ? 'bg-blue-500 text-white shadow-md'
                  : isDayMode
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              By Year
            </button>
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewFilter === 'all'
                  ? 'bg-blue-500 text-white shadow-md'
                  : isDayMode
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Month picker */}
          {viewFilter === 'month' && monthOptions.length > 0 && (
            <select
              value={`${selectedMonthYear}-${selectedMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setSelectedMonth(m);
                setSelectedMonthYear(y);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${inputClass}`}
            >
              {monthOptions.map(opt => (
                <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Year picker */}
          {viewFilter === 'year' && yearOptions.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${inputClass}`}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary Cards - scoped to selected view period */}
      <div className={`rounded-xl p-4 ${cardClass}`}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className={`w-4 h-4 text-blue-500`} />
          <span className={`text-sm font-semibold ${headerText}`}>
            Reconciliation Summary — {viewFilterLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Periods', value: summaryMetrics.totalPeriods, icon: Calendar, color: 'blue' },
            { label: 'Entries', value: summaryMetrics.totalEntries, icon: FileText, color: 'indigo' },
            { label: 'Total Amount', value: `$${summaryMetrics.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'green' },
            { label: 'Posted/Reconciled', value: `$${summaryMetrics.postedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'emerald' },
            { label: 'Pending', value: `$${summaryMetrics.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'amber' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-lg p-3 ${isDayMode ? 'bg-gray-50' : 'bg-white/5'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 text-${color}-500`} />
                <span className={`text-xs font-medium ${subText}`}>{label}</span>
              </div>
              <div className={`text-lg font-bold ${headerText}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className={`rounded-xl p-4 ${cardClass}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subText}`} />
            <input
              type="text"
              placeholder="Search insurance, TRN, period..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${inputClass}`}
            />
          </div>
          <button
            onClick={() => { setShowAddPeriod(true); setPeriodForm(EMPTY_PERIOD_FORM); setEditingPeriodId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> New Period
          </button>
          <button
            onClick={fetchData}
            className={`p-2 rounded-lg border transition-all ${isDayMode ? 'border-gray-200 hover:bg-gray-50 text-gray-600' : 'border-white/10 hover:bg-white/5 text-gray-400'}`}
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Period Modal */}
      {showAddPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`rounded-xl p-6 w-full max-w-md ${isDayMode ? 'bg-white' : 'bg-gray-900'} shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${headerText}`}>
                {editingPeriodId ? 'Edit EFT Period' : 'New EFT Period'}
              </h3>
              <button onClick={() => { setShowAddPeriod(false); setEditingPeriodId(null); }} className={`p-1 rounded-lg hover:bg-gray-100 ${subText}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>Period Start</label>
                <input
                  type="date"
                  value={periodForm.period_start}
                  onChange={(e) => setPeriodForm(f => ({ ...f, period_start: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>Period End</label>
                <input
                  type="date"
                  value={periodForm.period_end}
                  onChange={(e) => setPeriodForm(f => ({ ...f, period_end: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                />
              </div>
              {periodForm.period_start && periodForm.period_end && (
                <div className={`text-sm ${subText} bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3`}>
                  Preview: <strong>{formatPeriodLabel(periodForm.period_start, periodForm.period_end)}</strong>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowAddPeriod(false); setEditingPeriodId(null); }}
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium ${isDayMode ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-white/10 text-gray-300 hover:bg-white/5'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={editingPeriodId ? async () => {
                    setSaving(true);
                    try {
                      const label = formatPeriodLabel(periodForm.period_start, periodForm.period_end);
                      await updateEFTPeriod(editingPeriodId, {
                        period_start: periodForm.period_start,
                        period_end: periodForm.period_end,
                        period_label: label,
                      });
                      setShowAddPeriod(false);
                      setEditingPeriodId(null);
                      setToast({ message: 'Period updated', type: 'success' });
                      await fetchData();
                    } catch { setToast({ message: 'Failed to update', type: 'error' }); }
                    finally { setSaving(false); }
                  } : handleAddPeriod}
                  disabled={!periodForm.period_start || !periodForm.period_end || saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingPeriodId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Periods List */}
      {filteredPeriods.length === 0 ? (
        <div className={`rounded-xl p-12 text-center ${cardClass}`}>
          <Calendar className={`w-12 h-12 mx-auto mb-3 ${subText}`} />
          <p className={`text-lg font-medium ${headerText}`}>No EFT Periods Found</p>
          <p className={`text-sm mt-1 ${subText}`}>
            {searchTerm ? 'Try adjusting your search' : viewFilter !== 'all' ? 'No periods in this time range. Try "All Time" or a different month.' : 'Create a new EFT period to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPeriods.map((period) => {
            const periodEntries = entriesByPeriod[period.id] || [];
            const isExpanded = expandedPeriods.has(period.id);
            const periodTotal = periodEntries.reduce((sum, e) => sum + e.amount, 0);

            return (
              <div key={period.id} className={`rounded-xl overflow-hidden ${cardClass}`}>
                {/* Period Header - Magenta bar like spreadsheet */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                  style={{ background: 'linear-gradient(to right, #e040fb, #d500f9)' }}
                  onClick={() => togglePeriod(period.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-white" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-white" />
                    )}
                    <span className="text-white font-bold text-sm">
                      {period.period_label}
                    </span>
                    <span className="text-white/80 text-xs font-medium">
                      ({periodEntries.length} entries)
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-bold text-sm">
                      ${periodTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingPeriodId(period.id);
                          setPeriodForm({ period_start: period.period_start, period_end: period.period_end });
                          setShowAddPeriod(true);
                        }}
                        className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        title="Edit period"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePeriod(period.id)}
                        className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        title="Delete period"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div>
                    {/* Entry Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={tableHeaderClass}>
                            <th className="px-4 py-2.5 text-left font-semibold text-xs">Insurance</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-xs">Payment Date</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-xs">TRN #</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-xs">Date Posted</th>
                            <th className="px-4 py-2.5 text-right font-semibold text-xs">Amount</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-xs">Status</th>
                            <th className="px-4 py-2.5 text-center font-semibold text-xs w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periodEntries.map((entry) => {
                            const statusColor = STATUS_COLORS[entry.status] || STATUS_COLORS[''];
                            return (
                              <tr key={entry.id} className={tableRowClass}>
                                {/* Insurance */}
                                <td className={`px-4 py-2 font-medium ${headerText}`}>
                                  {editingCell?.id === entry.id && editingCell.field === 'insurance_company' ? (
                                    <select
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onBlur={() => handleInlineSave(entry.id, 'insurance_company', editingValue)}
                                      autoFocus
                                      className={`px-2 py-1 rounded border text-xs ${inputClass}`}
                                    >
                                      {INSURANCE_COMPANIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:underline"
                                      onClick={() => { setEditingCell({ id: entry.id, field: 'insurance_company' }); setEditingValue(entry.insurance_company); }}
                                    >
                                      {entry.insurance_company}
                                    </span>
                                  )}
                                </td>

                                {/* Payment Date */}
                                <td className={`px-4 py-2 ${subText}`}>
                                  {editingCell?.id === entry.id && editingCell.field === 'payment_date' ? (
                                    <input
                                      type="date"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onBlur={() => handleInlineSave(entry.id, 'payment_date', editingValue)}
                                      autoFocus
                                      className={`px-2 py-1 rounded border text-xs ${inputClass}`}
                                    />
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:underline"
                                      onClick={() => { setEditingCell({ id: entry.id, field: 'payment_date' }); setEditingValue(entry.payment_date); }}
                                    >
                                      {new Date(entry.payment_date + 'T00:00:00').toLocaleDateString()}
                                    </span>
                                  )}
                                </td>

                                {/* TRN # */}
                                <td className={`px-4 py-2 font-mono text-xs ${headerText}`}>
                                  {editingCell?.id === entry.id && editingCell.field === 'trn_number' ? (
                                    <input
                                      type="text"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onBlur={() => handleInlineSave(entry.id, 'trn_number', editingValue)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleInlineSave(entry.id, 'trn_number', editingValue); }}
                                      autoFocus
                                      className={`px-2 py-1 rounded border text-xs w-40 ${inputClass}`}
                                    />
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:underline"
                                      onClick={() => { setEditingCell({ id: entry.id, field: 'trn_number' }); setEditingValue(entry.trn_number); }}
                                    >
                                      {entry.trn_number}
                                    </span>
                                  )}
                                </td>

                                {/* Date Posted */}
                                <td className={`px-4 py-2 ${subText}`}>
                                  {editingCell?.id === entry.id && editingCell.field === 'date_posted' ? (
                                    <input
                                      type="date"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onBlur={() => handleInlineSave(entry.id, 'date_posted', editingValue)}
                                      autoFocus
                                      className={`px-2 py-1 rounded border text-xs ${inputClass}`}
                                    />
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:underline"
                                      onClick={() => { setEditingCell({ id: entry.id, field: 'date_posted' }); setEditingValue(entry.date_posted || ''); }}
                                    >
                                      {entry.date_posted
                                        ? new Date(entry.date_posted + 'T00:00:00').toLocaleDateString()
                                        : <span className="italic text-gray-400">—</span>}
                                    </span>
                                  )}
                                </td>

                                {/* Amount */}
                                <td className={`px-4 py-2 text-right font-semibold ${headerText}`}>
                                  {editingCell?.id === entry.id && editingCell.field === 'amount' ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onBlur={() => handleInlineSave(entry.id, 'amount', editingValue)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleInlineSave(entry.id, 'amount', editingValue); }}
                                      autoFocus
                                      className={`px-2 py-1 rounded border text-xs w-28 text-right ${inputClass}`}
                                    />
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:underline"
                                      onClick={() => { setEditingCell({ id: entry.id, field: 'amount' }); setEditingValue(String(entry.amount)); }}
                                    >
                                      ${entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="px-4 py-2">
                                  {editingCell?.id === entry.id && editingCell.field === 'status' ? (
                                    <select
                                      value={editingValue}
                                      onChange={(e) => {
                                        setEditingValue(e.target.value);
                                        handleInlineSave(entry.id, 'status', e.target.value);
                                      }}
                                      autoFocus
                                      className={`px-2 py-1 rounded border text-xs ${inputClass}`}
                                    >
                                      {STATUS_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                                        isDayMode ? `${statusColor.bg} ${statusColor.text}` : `${statusColor.darkBg} ${statusColor.darkText}`
                                      }`}
                                      onClick={() => { setEditingCell({ id: entry.id, field: 'status' }); setEditingValue(entry.status); }}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                                      {STATUS_OPTIONS.find(o => o.value === entry.status)?.label || 'None'}
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setDrawerEntry(entry)}
                                      className={`p-1 rounded hover:bg-blue-100 ${isDayMode ? 'text-blue-600' : 'text-blue-400 hover:bg-blue-900/30'}`}
                                      title="Notes & Audit"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleEditEntry(entry)}
                                      className={`p-1 rounded hover:bg-gray-100 ${isDayMode ? 'text-gray-600' : 'text-gray-400 hover:bg-white/10'}`}
                                      title="Edit entry"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className={`p-1 rounded hover:bg-red-100 ${isDayMode ? 'text-red-600' : 'text-red-400 hover:bg-red-900/30'}`}
                                      title="Delete entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Period Total Row */}
                          {periodEntries.length > 0 && (
                            <tr className={isDayMode ? 'bg-gray-50 font-bold' : 'bg-gray-800/40 font-bold'}>
                              <td className={`px-4 py-2.5 ${headerText}`} colSpan={4}>
                                Total
                              </td>
                              <td className={`px-4 py-2.5 text-right ${headerText}`}>
                                ${periodTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          )}

                          {periodEntries.length === 0 && (
                            <tr>
                              <td colSpan={7} className={`px-4 py-8 text-center ${subText}`}>
                                No entries in this period yet. Add one below.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Entry Button / Form */}
                    <div className={`px-4 py-3 ${isDayMode ? 'border-t border-gray-100' : 'border-t border-white/5'}`}>
                      {showAddEntry === period.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${subText}`}>Insurance *</label>
                              <select
                                value={entryForm.insurance_company}
                                onChange={(e) => setEntryForm(f => ({ ...f, insurance_company: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                              >
                                <option value="">Select...</option>
                                {INSURANCE_COMPANIES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="__custom">Other (type below)</option>
                              </select>
                              {entryForm.insurance_company === '__custom' && (
                                <input
                                  type="text"
                                  placeholder="Insurance name"
                                  onChange={(e) => setEntryForm(f => ({ ...f, insurance_company: e.target.value }))}
                                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                                />
                              )}
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${subText}`}>Payment Date</label>
                              <input
                                type="date"
                                value={entryForm.payment_date}
                                onChange={(e) => setEntryForm(f => ({ ...f, payment_date: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${subText}`}>TRN # *</label>
                              <input
                                type="text"
                                value={entryForm.trn_number}
                                onChange={(e) => setEntryForm(f => ({ ...f, trn_number: e.target.value }))}
                                placeholder="Transaction number"
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${subText}`}>Date Posted</label>
                              <input
                                type="date"
                                value={entryForm.date_posted}
                                onChange={(e) => setEntryForm(f => ({ ...f, date_posted: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${subText}`}>Amount *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={entryForm.amount}
                                onChange={(e) => setEntryForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder="0.00"
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${subText}`}>Status</label>
                              <select
                                value={entryForm.status}
                                onChange={(e) => setEntryForm(f => ({ ...f, status: e.target.value as EFTReconciliationEntryStatus }))}
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                              >
                                {STATUS_OPTIONS.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${subText}`}>Notes</label>
                            <input
                              type="text"
                              value={entryForm.notes}
                              onChange={(e) => setEntryForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Optional notes..."
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowAddEntry(null); setEditingEntryId(null); setEntryForm(EMPTY_ENTRY_FORM); }}
                              className={`px-4 py-2 rounded-lg border text-sm font-medium ${isDayMode ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-white/10 text-gray-300 hover:bg-white/5'}`}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={editingEntryId ? handleUpdateEntry : () => handleAddEntry(period.id)}
                              disabled={!entryForm.insurance_company || !entryForm.trn_number || !entryForm.amount || saving}
                              className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                            >
                              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                              <Save className="w-4 h-4" />
                              {editingEntryId ? 'Update Entry' : 'Add Entry'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowAddEntry(period.id); setEntryForm(EMPTY_ENTRY_FORM); setEditingEntryId(null); }}
                          className={`flex items-center gap-2 text-sm font-medium ${isDayMode ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                        >
                          <Plus className="w-4 h-4" /> Add Entry
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
