// src/components/CreditsTracker.tsx
// =====================================================
// Credits Tracker - manages patient unapplied credits,
// overpayments, insurance overpayments, and refunds
// =====================================================

import { getLocalDateString } from '../utils/dateUtils';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  X,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  Save,
  Loader2,
  RefreshCw,
  CreditCard,
  ArrowDownRight,
  MessageSquare,
  History,
} from 'lucide-react';
import type { PatientCredit, PatientCreditStatus, NoteEntry } from '../types/database.types';
import {
  getPatientCredits,
  insertPatientCredit,
  updatePatientCredit,
  deletePatientCredit,
} from '../services/patientCreditsService';
import { isStaticDataMode } from '../config/dataMode';
import { sanitizePatientName } from '../utils/sanitizePatientName';
import NotesAuditDrawer, { createAuditEntry } from './NotesAuditDrawer';
import SuccessToast from './SuccessToast';
import DraggableEditModal from './DraggableEditModal';
import type { TabKey } from './DraggableEditModal';

// =====================================================
// CONSTANTS
// =====================================================

const STATUS_OPTIONS: { value: PatientCreditStatus; label: string }[] = [
  { value: 'unapplied', label: 'Unapplied' },
  { value: 'applied', label: 'Applied' },
  { value: 'pending_refund', label: 'Pending Refund' },
  { value: 'refunded', label: 'Refunded' },
];

const STATUS_COLORS: Record<PatientCreditStatus, { bg: string; text: string; darkBg: string; darkText: string; dot: string }> = {
  unapplied: { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-900/40', darkText: 'text-amber-300', dot: 'bg-amber-500' },
  applied: { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'bg-green-900/40', darkText: 'text-green-300', dot: 'bg-green-500' },
  pending_refund: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'bg-orange-900/40', darkText: 'text-orange-300', dot: 'bg-orange-500' },
  refunded: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/40', darkText: 'text-blue-300', dot: 'bg-blue-500' },
};

const SOURCE_OPTIONS: { value: PatientCredit['credit_source']; label: string }[] = [
  { value: 'overpayment', label: 'Overpayment' },
  { value: 'insurance_overpayment', label: 'Insurance Overpayment' },
  { value: 'refund_pending', label: 'Refund Pending' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'other', label: 'Other' },
];

type EditingCell = {
  recordId: string;
  field: 'patient_name' | 'credit_amount' | 'credit_date' | 'notes' | 'applied_to';
} | null;

type NewCreditForm = {
  patient_name: string;
  patient_id: string;
  credit_date: string;
  credit_amount: string;
  credit_source: PatientCredit['credit_source'];
  status: PatientCreditStatus;
  notes: string;
};

const EMPTY_FORM: NewCreditForm = {
  patient_name: '',
  patient_id: '',
  credit_date: getLocalDateString(),
  credit_amount: '',
  credit_source: 'overpayment',
  status: 'unapplied',
  notes: '',
};

// =====================================================
// HELPERS
// =====================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusLabel(status: PatientCreditStatus): string {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found ? found.label : status;
}

function getSourceLabel(source: PatientCredit['credit_source']): string {
  const found = SOURCE_OPTIONS.find((s) => s.value === source);
  return found ? found.label : source;
}

// =====================================================
// COMPONENT
// =====================================================

export default function CreditsTracker({ isDayMode }: { isDayMode: boolean }) {
  const [records, setRecords] = useState<PatientCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState<NewCreditForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editingValue, setEditingValue] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PatientCreditStatus | 'all'>('all');

  // Notes & Audit drawer state
  const [drawerRecordId, setDrawerRecordId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Draggable edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalRecord, setEditModalRecord] = useState<PatientCredit | null>(null);

  // ---------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientCredits();
      setRecords(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load credits';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------
  const filteredRecords = useMemo(() => {
    let filtered = records;
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.patient_name.toLowerCase().includes(q));
    }
    return filtered;
  }, [records, searchQuery, statusFilter]);

  const totalUnapplied = useMemo(
    () => records.filter((r) => r.status === 'unapplied').reduce((sum, r) => sum + r.credit_amount, 0),
    [records],
  );

  const totalApplied = useMemo(
    () => records.filter((r) => r.status === 'applied').reduce((sum, r) => sum + r.credit_amount, 0),
    [records],
  );

  const totalPendingRefund = useMemo(
    () => records.filter((r) => r.status === 'pending_refund').reduce((sum, r) => sum + r.credit_amount, 0),
    [records],
  );

  const totalRefunded = useMemo(
    () => records.filter((r) => r.status === 'refunded').reduce((sum, r) => sum + r.credit_amount, 0),
    [records],
  );

  // ---------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------

  const handleAddRecord = useCallback(async () => {
    if (!newForm.patient_name.trim() || !newForm.credit_amount) return;
    setSaving(true);
    try {
      const record: Omit<PatientCredit, 'id' | 'created_at' | 'updated_at'> = {
        patient_id: newForm.patient_id || null,
        patient_name: sanitizePatientName(newForm.patient_name.trim()),
        credit_date: newForm.credit_date,
        credit_amount: parseFloat(newForm.credit_amount),
        credit_source: newForm.credit_source,
        status: newForm.status,
        applied_to: null,
        applied_date: null,
        notes: newForm.notes.trim() || null,
        structured_notes: [],
        audit_trail: [createAuditEntry('created', 'staff', { notes: 'Credit record created' })],
        created_by: 'staff',
        updated_by: 'staff',
      };

      if (isStaticDataMode()) {
        const fakeId = 'crd-' + Date.now().toString(36);
        const now = new Date().toISOString();
        const newRecord: PatientCredit = {
          ...record,
          id: fakeId,
          created_at: now,
          updated_at: now,
        };
        setRecords((prev) => [newRecord, ...prev]);
      } else {
        await insertPatientCredit(record);
        await fetchData();
      }

      setNewForm({ ...EMPTY_FORM });
      setShowAddModal(false);
      setToastMessage('Credit record added successfully');
    } catch (err) {
      console.error('Error adding credit:', err);
      setError('Failed to add credit. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [newForm, fetchData]);

  const handleUpdateField = useCallback(
    async (id: string, field: string, value: string | number | null) => {
      try {
        const record = records.find((r) => r.id === id);
        const oldValue = record ? String((record as Record<string, unknown>)[field] ?? '') : '';
        const auditEntry = createAuditEntry('updated', 'staff', {
          field,
          oldValue: oldValue || null,
          newValue: value !== null ? String(value) : null,
        });

        if (isStaticDataMode()) {
          setRecords((prev) =>
            prev.map((r) =>
              r.id === id
                ? { ...r, [field]: value, audit_trail: [...(r.audit_trail || []), auditEntry], updated_at: new Date().toISOString() }
                : r,
            ),
          );
        } else {
          const existingTrail = record?.audit_trail || [];
          await updatePatientCredit(id, { [field]: value, audit_trail: [...existingTrail, auditEntry], updated_by: 'staff' });
          await fetchData();
        }
      } catch (err) {
        console.error('Error updating field:', err);
        setError('Failed to update. Please try again.');
      }
    },
    [fetchData, records],
  );

  const handleStatusChange = useCallback(
    async (id: string, newStatus: PatientCreditStatus) => {
      try {
        const record = records.find((r) => r.id === id);
        const oldStatus = record?.status || '';
        const auditEntry = createAuditEntry('status_changed', 'staff', {
          field: 'status',
          oldValue: oldStatus,
          newValue: newStatus,
        });

        const extraUpdates: Record<string, unknown> = {};
        if (newStatus === 'applied' && !record?.applied_date) {
          extraUpdates.applied_date = getLocalDateString();
        }

        if (isStaticDataMode()) {
          setRecords((prev) =>
            prev.map((r) =>
              r.id === id
                ? { ...r, status: newStatus, ...extraUpdates, audit_trail: [...(r.audit_trail || []), auditEntry], updated_at: new Date().toISOString() }
                : r,
            ),
          );
        } else {
          const existingTrail = record?.audit_trail || [];
          await updatePatientCredit(id, { status: newStatus, ...extraUpdates, audit_trail: [...existingTrail, auditEntry], updated_by: 'staff' } as Partial<PatientCredit>);
          await fetchData();
        }
        setStatusDropdownOpen(null);
      } catch (err) {
        console.error('Error updating status:', err);
        setError('Failed to update status.');
      }
    },
    [fetchData, records],
  );

  const handleDeleteRecord = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this credit record?')) return;
      try {
        if (isStaticDataMode()) {
          setRecords((prev) => prev.filter((r) => r.id !== id));
        } else {
          await deletePatientCredit(id);
          await fetchData();
        }
      } catch (err) {
        console.error('Error deleting record:', err);
        setError('Failed to delete record.');
      }
    },
    [fetchData],
  );

  const handleSaveEditingCell = useCallback(async () => {
    if (!editingCell) return;
    const { recordId, field } = editingCell;

    if (field === 'credit_amount') {
      const numValue = parseFloat(editingValue);
      if (isNaN(numValue) || numValue < 0) {
        setEditingCell(null);
        setEditingValue('');
        return;
      }
      await handleUpdateField(recordId, field, numValue);
    } else if (field === 'patient_name') {
      const trimmed = sanitizePatientName(editingValue.trim());
      if (!trimmed) {
        setEditingCell(null);
        setEditingValue('');
        return;
      }
      await handleUpdateField(recordId, field, trimmed);
    } else {
      await handleUpdateField(recordId, field, editingValue.trim() || null);
    }
    setEditingCell(null);
    setEditingValue('');
  }, [editingCell, editingValue, handleUpdateField]);

  const startEditCell = useCallback(
    (recordId: string, field: NonNullable<EditingCell>['field'], currentValue: string | null) => {
      setEditingCell({ recordId, field });
      setEditingValue(currentValue || '');
    },
    [],
  );

  // Notes drawer
  const drawerRecord = useMemo(
    () => records.find((r) => r.id === drawerRecordId) || null,
    [records, drawerRecordId],
  );

  const handleAddNote = useCallback(
    async (note: NoteEntry) => {
      if (!drawerRecordId) return;
      const record = records.find((r) => r.id === drawerRecordId);
      if (!record) return;

      const updatedNotes = [...(record.structured_notes || []), note];
      const auditEntry = createAuditEntry('note_added', note.author || 'staff', {
        notes: `Note added by ${note.author || 'staff'} (${note.source})`,
      });
      const updatedTrail = [...(record.audit_trail || []), auditEntry];

      try {
        if (isStaticDataMode()) {
          setRecords((prev) =>
            prev.map((r) =>
              r.id === drawerRecordId
                ? { ...r, structured_notes: updatedNotes, audit_trail: updatedTrail, updated_at: new Date().toISOString() }
                : r,
            ),
          );
        } else {
          await updatePatientCredit(drawerRecordId, {
            structured_notes: updatedNotes,
            audit_trail: updatedTrail,
            updated_by: 'staff',
          });
          await fetchData();
        }
      } catch (err) {
        console.error('Error adding note:', err);
        setError('Failed to add note.');
      }
    },
    [drawerRecordId, records, fetchData],
  );

  // ---------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------

  function renderStatusBadge(status: PatientCreditStatus) {
    const colors = STATUS_COLORS[status];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${isDayMode ? `${colors.bg} ${colors.text}` : `${colors.darkBg} ${colors.darkText}`}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {getStatusLabel(status)}
      </span>
    );
  }

  function renderStatusDropdown(record: PatientCredit) {
    const isOpen = statusDropdownOpen === record.id;
    return (
      <div className="relative">
        <button
          onClick={() => setStatusDropdownOpen(isOpen ? null : record.id)}
          className="flex items-center gap-1 w-full"
        >
          {renderStatusBadge(record.status)}
          <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-50" />
        </button>
        {isOpen && (
          <div
            className={`absolute z-40 mt-1 left-0 min-w-[180px] rounded-xl shadow-xl border ${isDayMode ? 'bg-white border-gray-200' : 'bg-gray-800 border-white/10'} py-1`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(record.id, opt.value)}
                className={`w-full text-left px-3 py-1.5 text-xs ${isDayMode ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'} ${record.status === opt.value ? 'font-bold' : ''}`}
              >
                {renderStatusBadge(opt.value)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderEditableCell(
    record: PatientCredit,
    field: NonNullable<EditingCell>['field'],
    value: string | null,
    displayValue?: string,
    customClassName?: string,
  ) {
    const isEditing = editingCell?.recordId === record.id && editingCell?.field === field;

    if (isEditing) {
      const inputType = field === 'credit_amount' ? 'number' : field === 'credit_date' ? 'date' : 'text';
      const useTextarea = field === 'notes' || field === 'applied_to';

      return (
        <div className="flex items-center gap-1">
          {useTextarea ? (
            <textarea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              autoFocus
              rows={2}
              className={`w-full px-2 py-1 rounded-lg border text-xs resize-none ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEditingCell(); }
                if (e.key === 'Escape') { setEditingCell(null); setEditingValue(''); }
              }}
            />
          ) : (
            <input
              type={inputType}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              autoFocus
              step={field === 'credit_amount' ? '0.01' : undefined}
              min={field === 'credit_amount' ? '0' : undefined}
              className={`w-full px-2 py-1 rounded-lg border text-xs ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSaveEditingCell(); }
                if (e.key === 'Escape') { setEditingCell(null); setEditingValue(''); }
              }}
            />
          )}
          <button onClick={handleSaveEditingCell} className="p-1 text-emerald-500 hover:text-emerald-600 flex-shrink-0" title="Save">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setEditingCell(null); setEditingValue(''); }} className="p-1 text-red-400 hover:text-red-500 flex-shrink-0" title="Cancel">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    const shownValue = displayValue || value;

    return (
      <div
        onClick={() => startEditCell(record.id, field, value)}
        className={customClassName || `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-xs leading-relaxed ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-white/5'} ${shownValue ? '' : 'italic opacity-40'}`}
        title="Click to edit"
      >
        {shownValue || 'Click to add...'}
      </div>
    );
  }

  // ---------------------------------------------------
  // MODAL SAVE HANDLER
  // ---------------------------------------------------
  const handleModalSave = async (_tab: TabKey, data: Record<string, unknown>, isNewEntry: boolean) => {
    if (isNewEntry) {
      const newRecord = {
        patient_name: sanitizePatientName(String(data.patient_name || '')),
        patient_id: String(data.patient_id || '') || null,
        credit_amount: Number(data.credit_amount) || 0,
        credit_date: String(data.credit_date || getLocalDateString()),
        credit_source: (String(data.credit_source) || 'other') as PatientCredit['credit_source'],
        status: (String(data.status) || 'unapplied') as PatientCreditStatus,
        applied_to: String(data.applied_to || '') || null,
        applied_date: null,
        notes: String(data.notes || '') || null,
        structured_notes: [] as NoteEntry[],
        audit_trail: [createAuditEntry('created', 'staff')],
        created_by: 'staff',
        updated_by: 'staff',
      };
      if (isStaticDataMode()) {
        setRecords((prev) => [{ ...newRecord, id: crypto.randomUUID() } as PatientCredit, ...prev]);
      } else {
        await insertPatientCredit(newRecord);
        await fetchData();
      }
    } else {
      const id = String(data.id);
      const record = records.find((r) => r.id === id);
      const auditEntry = createAuditEntry('updated', 'staff');
      const existingTrail = record?.audit_trail || [];
      const updates: Record<string, unknown> = {
        patient_name: sanitizePatientName(String(data.patient_name || '')),
        patient_id: String(data.patient_id || '') || null,
        credit_amount: Number(data.credit_amount) || 0,
        credit_date: String(data.credit_date || ''),
        credit_source: String(data.credit_source) || 'other',
        status: String(data.status) || 'unapplied',
        applied_to: String(data.applied_to || '') || null,
        notes: String(data.notes || '') || null,
        audit_trail: [...existingTrail, auditEntry],
        updated_by: 'staff',
      };
      if (isStaticDataMode()) {
        setRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } as PatientCredit : r));
      } else {
        await updatePatientCredit(id, updates);
        await fetchData();
      }
    }
    setEditModalOpen(false);
    setEditModalRecord(null);
  };

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
        <span className={`ml-3 text-lg ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Loading credits data...</span>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className={`rounded-2xl p-8 text-center ${isDayMode ? 'glass-card border border-white/40' : 'glass-card-dark border border-white/10'}`}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <h3 className={`text-xl font-semibold mb-2 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>Error Loading Data</h3>
        <p className={`mb-4 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>{error}</p>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all hover-lift font-semibold text-sm mx-auto">
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" onClick={() => setStatusDropdownOpen(null)}>
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
            Credits Tracker
          </h2>
          <p className={`text-sm mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Track patient credits, overpayments, and refunds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className={`p-2.5 rounded-xl border transition-all ${isDayMode ? 'border-gray-200 hover:bg-gray-100 text-gray-600' : 'border-white/10 hover:bg-white/5 text-gray-400'}`}
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setNewForm({ ...EMPTY_FORM }); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all hover-lift font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Credit
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-2xl p-4 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10"><CreditCard className="w-4 h-4 text-amber-500" /></div>
            <span className={`text-xs font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Unapplied Credits</span>
          </div>
          <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>{formatCurrency(totalUnapplied)}</p>
          <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>{records.filter(r => r.status === 'unapplied').length} records</p>
        </div>

        <div className={`rounded-2xl p-4 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-green-500/10"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
            <span className={`text-xs font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Applied Credits</span>
          </div>
          <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>{formatCurrency(totalApplied)}</p>
          <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>{records.filter(r => r.status === 'applied').length} records</p>
        </div>

        <div className={`rounded-2xl p-4 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10"><DollarSign className="w-4 h-4 text-orange-500" /></div>
            <span className={`text-xs font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Pending Refunds</span>
          </div>
          <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>{formatCurrency(totalPendingRefund)}</p>
          <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>{records.filter(r => r.status === 'pending_refund').length} records</p>
        </div>

        <div className={`rounded-2xl p-4 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10"><ArrowDownRight className="w-4 h-4 text-blue-500" /></div>
            <span className={`text-xs font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Refunded</span>
          </div>
          <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>{formatCurrency(totalRefunded)}</p>
          <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>{records.filter(r => r.status === 'refunded').length} records</p>
        </div>
      </div>

      {/* STATUS KEY + FILTERS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(['all', ...STATUS_OPTIONS.map(s => s.value)] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                  : isDayMode
                    ? 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    : 'text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
            >
              {s === 'all' ? `All (${records.length})` : `${getStatusLabel(s)} (${records.filter(r => r.status === s).length})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900 placeholder-gray-400' : 'bg-white/5 border-white/10 text-white placeholder-gray-500'} text-sm`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className={`w-4 h-4 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className={`rounded-2xl p-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
        <h3 className={`text-lg font-bold mb-4 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
          Credit Records
        </h3>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <p className={`text-sm ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {searchQuery ? 'No matching credit records found.' : 'No credit records. Add a new credit to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className={`border-b ${isDayMode ? 'border-gray-200' : 'border-white/10'}`}>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Patient Name</th>
                  <th className={`text-right text-xs font-semibold uppercase tracking-wider py-3 px-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Amount</th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Date</th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Source</th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Status</th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 min-w-[120px] ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Applied To</th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 min-w-[140px] ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Notes</th>
                  <th className={`text-center text-xs font-semibold uppercase tracking-wider py-3 px-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Audit</th>
                  <th className={`text-center text-xs font-semibold uppercase tracking-wider py-3 px-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={`${isDayMode ? 'stellar-row-hover' : 'stellar-row-hover-dark'} cursor-pointer transition-colors border-b ${isDayMode ? 'border-gray-100' : 'border-white/5'}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button, select, input, textarea, [role="button"]')) return;
                      e.stopPropagation();
                      setEditModalRecord(record);
                      setEditModalOpen(true);
                    }}
                  >
                    <td className="py-2.5 px-2">
                      {renderEditableCell(
                        record, 'patient_name', record.patient_name, record.patient_name,
                        `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-sm font-medium ${isDayMode ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/5'}`,
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      {renderEditableCell(
                        record, 'credit_amount', String(record.credit_amount), formatCurrency(record.credit_amount),
                        `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-sm font-semibold text-right ${isDayMode ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/5'}`,
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      {renderEditableCell(
                        record, 'credit_date', record.credit_date, formatDate(record.credit_date),
                        `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-xs ${isDayMode ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'}`,
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDayMode ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-gray-300'}`}>
                        {getSourceLabel(record.credit_source)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                      {renderStatusDropdown(record)}
                    </td>
                    <td className="py-2.5 px-2">
                      {renderEditableCell(record, 'applied_to', record.applied_to)}
                    </td>
                    <td className="py-2.5 px-2">
                      {renderEditableCell(record, 'notes', record.notes)}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDrawerRecordId(record.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            isDayMode ? 'text-blue-700 bg-blue-50 hover:bg-blue-100' : 'text-blue-300 bg-blue-900/30 hover:bg-blue-900/50'
                          }`}
                          title="View notes & audit trail"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {(record.structured_notes || []).length > 0 && <span>{(record.structured_notes || []).length}</span>}
                          <History className="w-3 h-3 ml-0.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${isDayMode ? 'hover:bg-red-100 text-red-400' : 'hover:bg-red-900/30 text-red-400'}`}
                          title="Delete record"
                        >
                          <X className="w-3.5 h-3.5" />
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

      {/* ADD CREDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div
            className={`w-full max-w-lg rounded-2xl p-6 ${isDayMode ? 'glass-card border border-white/40' : 'glass-card-dark border border-white/10'} shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>Add Credit</h3>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-lg ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Patient Name *</label>
                <input
                  type="text"
                  value={newForm.patient_name}
                  onChange={(e) => setNewForm((f) => ({ ...f, patient_name: e.target.value }))}
                  placeholder="Last, First"
                  className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Patient ID</label>
                  <input
                    type="text"
                    value={newForm.patient_id}
                    onChange={(e) => setNewForm((f) => ({ ...f, patient_id: e.target.value }))}
                    placeholder="Optional"
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Credit Date *</label>
                  <input
                    type="date"
                    value={newForm.credit_date}
                    onChange={(e) => setNewForm((f) => ({ ...f, credit_date: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Credit Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newForm.credit_amount}
                    onChange={(e) => setNewForm((f) => ({ ...f, credit_amount: e.target.value }))}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Source</label>
                  <select
                    value={newForm.credit_source}
                    onChange={(e) => setNewForm((f) => ({ ...f, credit_source: e.target.value as PatientCredit['credit_source'] }))}
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  >
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Status</label>
                <select
                  value={newForm.status}
                  onChange={(e) => setNewForm((f) => ({ ...f, status: e.target.value as PatientCreditStatus }))}
                  className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Notes</label>
                <textarea
                  value={newForm.notes}
                  onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any notes about this credit..."
                  className={`w-full px-3 py-2 rounded-xl border resize-none ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setShowAddModal(false)}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${isDayMode ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/10'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecord}
                disabled={saving || !newForm.patient_name.trim() || !newForm.credit_amount}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all hover-lift font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : (<><Plus className="w-4 h-4" />Add Credit</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes & Audit Trail Drawer */}
      <NotesAuditDrawer
        isOpen={!!drawerRecordId}
        onClose={() => setDrawerRecordId(null)}
        isDayMode={isDayMode}
        entityType="Credit"
        entityLabel={drawerRecord?.patient_name || ''}
        notes={drawerRecord?.structured_notes || []}
        auditTrail={drawerRecord?.audit_trail || []}
        onAddNote={handleAddNote}
      />

      {/* Success Toast */}
      <SuccessToast
        message={toastMessage || ''}
        isVisible={!!toastMessage}
        onClose={() => setToastMessage(null)}
        isDayMode={isDayMode}
      />

      {/* Draggable Edit Modal */}
      <DraggableEditModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditModalRecord(null); }}
        onSave={handleModalSave}
        initialTab="credits"
        initialData={editModalRecord}
        isDayMode={isDayMode}
      />
    </div>
  );
}
