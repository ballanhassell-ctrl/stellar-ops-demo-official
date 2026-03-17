// src/components/PatientARTracker.tsx
// =====================================================
// Patient A/R Tracker - mirrors "Weekly A/R Review" spreadsheet
// Two sections: Collectible Accounts & Non-Collectible (Write-Off) Accounts
// =====================================================

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  X,
  ArrowRightLeft,
  CheckCircle2,
  DollarSign,
  Users,
  AlertTriangle,
  FileX2,
  TrendingDown,
  ChevronDown,

  Loader2,
  RefreshCw,
  Trash2,
  MessageSquare,
  History,
  Mail,
  Edit2,
} from 'lucide-react';
import type { PatientAR, PatientARStatus, NoteEntry } from '../types/database.types';
import {
  getPatientARRecords,
  insertPatientAR,
  updatePatientAR,
  deletePatientAR,
} from '../services/patientARService.new';
import { isStaticDataMode } from '../config/dataMode';
import { supabase } from '../lib/supabaseClient';
import { sanitizePatientName } from '../utils/sanitizePatientName';
import { fetchDailyARReportData, generateDailyARReportHTML, sendDailyARReport } from '../services/dailyARReportService';
import { getLocalDateString } from '../utils/dateUtils';
import NotesAuditDrawer, { createAuditEntry } from './NotesAuditDrawer';
import SuccessToast from './SuccessToast';
import DraggableEditModal from './DraggableEditModal';
import type { TabKey } from './DraggableEditModal';

// =====================================================
// CONSTANTS
// =====================================================

const STATUS_OPTIONS: { value: PatientARStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: '1st_contact_made', label: '1st Contact Made' },
  { value: '2nd_contact_made', label: '2nd Contact Made' },
  { value: 'final_contact_made', label: 'Final Contact Made' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending_writeoff', label: 'Pending Write-off' },
  { value: 'high_balance_alert', label: 'High Balance Alert' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_COLORS: Record<PatientARStatus, { bg: string; text: string; darkBg: string; darkText: string; dot: string }> = {
  not_started: { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'bg-gray-700/50', darkText: 'text-gray-300', dot: 'bg-gray-400' },
  '1st_contact_made': { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/40', darkText: 'text-blue-300', dot: 'bg-blue-500' },
  '2nd_contact_made': { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-900/40', darkText: 'text-amber-300', dot: 'bg-amber-500' },
  final_contact_made: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'bg-orange-900/40', darkText: 'text-orange-300', dot: 'bg-orange-500' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'bg-green-900/40', darkText: 'text-green-300', dot: 'bg-green-500' },
  pending_writeoff: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'bg-red-900/40', darkText: 'text-red-300', dot: 'bg-red-500' },
  high_balance_alert: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'bg-purple-900/40', darkText: 'text-purple-300', dot: 'bg-purple-500' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-900/40', darkText: 'text-emerald-300', dot: 'bg-emerald-500' },
};

type ActiveTab = 'collectible' | 'non_collectible';

type EditingCell = {
  recordId: string;
  field: 'patient_name' | 'patient_id' | 'related_family' | 'current_balance' | 'dos' | 'background_notes' | 'team_discussion_notes' | 'action_needed' | 'dr_decision' | 'write_off_reason';
} | null;

type EditingContact = {
  recordId: string;
  contactType: '1st' | '2nd' | 'final';
} | null;

type NewRecordForm = {
  patient_name: string;
  patient_id: string;
  related_family: string;
  dos: string;
  original_balance: string;
  current_balance: string;
  is_collectible: boolean;
  status: PatientARStatus;
  background_notes: string;
  action_needed: string;
};

const EMPTY_FORM: NewRecordForm = {
  patient_name: '',
  patient_id: '',
  related_family: '',
  dos: '',
  original_balance: '',
  current_balance: '',
  is_collectible: true,
  status: 'not_started',
  background_notes: '',
  action_needed: '',
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

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function getStatusLabel(status: PatientARStatus): string {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found ? found.label : status;
}

// =====================================================
// COMPONENT
// =====================================================

export default function PatientARTracker({ isDayMode, isAdmin, dashboardDate }: { isDayMode: boolean; isAdmin?: boolean; dashboardDate?: string }) {
  // ---------------------------------------------------
  // STATE
  // ---------------------------------------------------
  const [records, setRecords] = useState<PatientAR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('collectible');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState<NewRecordForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingContact, setEditingContact] = useState<EditingContact>(null);
  const [contactDate, setContactDate] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [contactInitials, setContactInitials] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);

  // Notes & Audit drawer state
  const [drawerRecordId, setDrawerRecordId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Draggable edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalRecord, setEditModalRecord] = useState<PatientAR | null>(null);

  // Daily report state
  const [sendingReport, setSendingReport] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportPreviewHtml, setReportPreviewHtml] = useState('');
  const [reportDate, setReportDate] = useState(dashboardDate || '');
  const [reportRecipients, setReportRecipients] = useState('');
  const [reportMessage, setReportMessage] = useState('');

  // ---------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientARRecords();
      setRecords(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load Patient A/R records';
      setError(message);
      console.error('PatientARTracker fetch error:', err);
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
  const collectibleRecords = useMemo(
    () => records.filter((r) => r.is_collectible),
    [records],
  );

  const nonCollectibleRecords = useMemo(
    () => records.filter((r) => !r.is_collectible),
    [records],
  );

  const filteredCollectible = useMemo(() => {
    if (!searchQuery.trim()) return collectibleRecords;
    const q = searchQuery.toLowerCase();
    return collectibleRecords.filter(
      (r) =>
        r.patient_name.toLowerCase().includes(q) ||
        (r.related_family && r.related_family.toLowerCase().includes(q)),
    );
  }, [collectibleRecords, searchQuery]);

  const filteredNonCollectible = useMemo(() => {
    if (!searchQuery.trim()) return nonCollectibleRecords;
    const q = searchQuery.toLowerCase();
    return nonCollectibleRecords.filter(
      (r) =>
        r.patient_name.toLowerCase().includes(q) ||
        (r.related_family && r.related_family.toLowerCase().includes(q)),
    );
  }, [nonCollectibleRecords, searchQuery]);

  const activeRecords = activeTab === 'collectible' ? filteredCollectible : filteredNonCollectible;

  // Summary metrics
  const totalCollectibleBalance = useMemo(
    () => collectibleRecords.reduce((sum, r) => sum + r.current_balance, 0),
    [collectibleRecords],
  );

  const totalWriteOffBalance = useMemo(
    () => nonCollectibleRecords.reduce((sum, r) => sum + r.current_balance, 0),
    [nonCollectibleRecords],
  );

  const totalCollected = useMemo(
    () => records.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.collected_amount, 0),
    [records],
  );

  // ---------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------

  const handleAddRecord = useCallback(async () => {
    if (!newForm.patient_name.trim() || !newForm.dos || !newForm.current_balance) return;

    const currentBal = parseFloat(newForm.current_balance);
    if (isNaN(currentBal) || currentBal < 0) {
      setError('Current balance must be a valid positive number.');
      return;
    }
    const originalBal = newForm.original_balance ? parseFloat(newForm.original_balance) : null;
    if (originalBal !== null && (isNaN(originalBal) || originalBal < 0)) {
      setError('Original balance must be a valid positive number.');
      return;
    }

    setSaving(true);
    try {
      const record: Omit<PatientAR, 'id' | 'created_at' | 'updated_at' | 'aging_days' | 'aging_bucket'> = {
        patient_id: newForm.patient_id.trim() || null,
        patient_name: sanitizePatientName(newForm.patient_name.trim()),
        related_family: newForm.related_family.trim() || null,
        dos: newForm.dos,
        original_balance: newForm.original_balance ? parseFloat(newForm.original_balance) : parseFloat(newForm.current_balance),
        current_balance: parseFloat(newForm.current_balance),
        is_collectible: newForm.is_collectible,
        status: newForm.status,
        background_notes: newForm.background_notes.trim() || null,
        team_discussion_notes: null,
        action_needed: newForm.action_needed.trim() || null,
        dr_decision: null,
        first_contact_date: null,
        first_contact_initials: null,
        second_contact_date: null,
        second_contact_initials: null,
        final_contact_date: null,
        final_contact_initials: null,
        write_off_suggested_date: null,
        write_off_reason: null,
        collected_amount: 0,
        structured_notes: [],
        audit_trail: [createAuditEntry('created', 'staff', { notes: 'Record created' })],
        created_by: 'staff',
        updated_by: 'staff',
      };

      if (isStaticDataMode()) {
        const fakeId = 'par-' + Date.now().toString(36);
        const now = new Date().toISOString();
        const dosDate = new Date(newForm.dos + 'T00:00:00');
        const agingDays = Math.max(0, Math.floor((Date.now() - dosDate.getTime()) / (1000 * 60 * 60 * 24)));
        let agingBucket: PatientAR['aging_bucket'] = '0-30';
        if (agingDays > 90) agingBucket = '90+';
        else if (agingDays > 60) agingBucket = '61-90';
        else if (agingDays > 30) agingBucket = '31-60';

        const newRecord: PatientAR = {
          ...record,
          id: fakeId,
          aging_days: agingDays,
          aging_bucket: agingBucket,
          structured_notes: record.structured_notes || [],
          audit_trail: record.audit_trail || [createAuditEntry('created', 'staff', { notes: 'Record created' })],
          created_at: now,
          updated_at: now,
        };
        setRecords((prev) => [...prev, newRecord]);
      } else {
        await insertPatientAR(record);
        await fetchData();
      }

      setNewForm({ ...EMPTY_FORM });
      setShowAddModal(false);
      setToastMessage('Patient A/R record added successfully');
    } catch (err) {
      console.error('Error adding patient AR:', err);
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Unknown error';
      setError(`Failed to add record: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [newForm, fetchData]);

  const handleUpdateField = useCallback(
    async (id: string, field: string, value: string | null) => {
      try {
        const record = records.find((r) => r.id === id);
        const oldValue = record ? String((record as Record<string, unknown>)[field] ?? '') : '';
        const auditEntry = createAuditEntry('updated', 'staff', {
          field,
          oldValue: oldValue || null,
          newValue: value,
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
          await updatePatientAR(id, { [field]: value, audit_trail: [...existingTrail, auditEntry], updated_by: 'staff' });
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
    async (id: string, newStatus: PatientARStatus) => {
      try {
        const record = records.find((r) => r.id === id);
        const oldStatus = record?.status || '';
        const auditEntry = createAuditEntry('status_changed', 'staff', {
          field: 'status',
          oldValue: oldStatus,
          newValue: newStatus,
        });

        if (isStaticDataMode()) {
          setRecords((prev) =>
            prev.map((r) =>
              r.id === id
                ? { ...r, status: newStatus, audit_trail: [...(r.audit_trail || []), auditEntry], updated_at: new Date().toISOString() }
                : r,
            ),
          );
        } else {
          const existingTrail = record?.audit_trail || [];
          await updatePatientAR(id, { status: newStatus, audit_trail: [...existingTrail, auditEntry], updated_by: 'staff' });
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

  const handleToggleCollectible = useCallback(
    async (id: string, makeCollectible: boolean) => {
      try {
        const record = records.find((r) => r.id === id);
        const auditEntry = createAuditEntry('moved', 'staff', {
          field: 'is_collectible',
          oldValue: record?.is_collectible ? 'Collectible' : 'Non-Collectible',
          newValue: makeCollectible ? 'Collectible' : 'Non-Collectible',
        });

        if (isStaticDataMode()) {
          setRecords((prev) =>
            prev.map((r) =>
              r.id === id
                ? { ...r, is_collectible: makeCollectible, audit_trail: [...(r.audit_trail || []), auditEntry], updated_at: new Date().toISOString() }
                : r,
            ),
          );
        } else {
          const existingTrail = record?.audit_trail || [];
          await updatePatientAR(id, { is_collectible: makeCollectible, audit_trail: [...existingTrail, auditEntry], updated_by: 'staff' });
          await fetchData();
        }
      } catch (err) {
        console.error('Error toggling collectible:', err);
        setError('Failed to move record.');
      }
    },
    [fetchData, records],
  );

  const handleMarkCompleted = useCallback(
    async (id: string) => {
      try {
        if (isStaticDataMode()) {
          setRecords((prev) =>
            prev.map((r) =>
              r.id === id
                ? { ...r, status: 'completed' as PatientARStatus, updated_at: new Date().toISOString() }
                : r,
            ),
          );
        } else {
          await updatePatientAR(id, { status: 'completed', updated_by: 'staff' });
          await fetchData();
        }
      } catch (err) {
        console.error('Error marking completed:', err);
        setError('Failed to mark as completed.');
      }
    },
    [fetchData],
  );

  const handleDeleteRecord = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this record?')) return;
      try {
        if (isStaticDataMode()) {
          setRecords((prev) => prev.filter((r) => r.id !== id));
        } else {
          await deletePatientAR(id);
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

    if (field === 'current_balance') {
      const numValue = parseFloat(editingValue);
      if (isNaN(numValue) || numValue < 0) {
        setEditingCell(null);
        setEditingValue('');
        return;
      }
      try {
        const record = records.find((r) => r.id === recordId);
        const oldValue = record ? String(record.current_balance) : '';
        const auditEntry = createAuditEntry('updated', 'staff', {
          field: 'current_balance',
          oldValue,
          newValue: String(numValue),
        });
        if (isStaticDataMode()) {
          setRecords((prev) =>
            prev.map((r) => (r.id === recordId ? { ...r, current_balance: numValue, audit_trail: [...(r.audit_trail || []), auditEntry], updated_at: new Date().toISOString() } : r)),
          );
        } else {
          const existingTrail = record?.audit_trail || [];
          await updatePatientAR(recordId, { current_balance: numValue, audit_trail: [...existingTrail, auditEntry], updated_by: 'staff' });
          await fetchData();
        }
      } catch (err) {
        console.error('Error updating field:', err);
        setError('Failed to update. Please try again.');
      }
    } else if (field === 'patient_name') {
      const trimmed = sanitizePatientName(editingValue.trim());
      if (!trimmed) {
        setEditingCell(null);
        setEditingValue('');
        return;
      }
      await handleUpdateField(recordId, field, trimmed);
    } else if (field === 'dos') {
      if (!editingValue) {
        setEditingCell(null);
        setEditingValue('');
        return;
      }
      await handleUpdateField(recordId, field, editingValue);
    } else {
      await handleUpdateField(recordId, field, editingValue.trim() || null);
    }
    setEditingCell(null);
    setEditingValue('');
  }, [editingCell, editingValue, handleUpdateField, fetchData]);

  const handleSaveContact = useCallback(async () => {
    if (!editingContact) return;
    const { recordId, contactType } = editingContact;
    const dateField =
      contactType === '1st'
        ? 'first_contact_date'
        : contactType === '2nd'
          ? 'second_contact_date'
          : 'final_contact_date';
    const initialsField =
      contactType === '1st'
        ? 'first_contact_initials'
        : contactType === '2nd'
          ? 'second_contact_initials'
          : 'final_contact_initials';

    try {
      const record = records.find((r) => r.id === recordId);
      const auditEntry = createAuditEntry('updated', contactInitials.trim() || 'staff', {
        field: `${contactType}_contact`,
        oldValue: (record as Record<string, unknown>)?.[dateField] as string || null,
        newValue: contactDate || null,
        notes: `${contactType} contact set: ${contactDate || 'cleared'} by ${contactInitials.trim() || 'staff'}`,
      });

      if (isStaticDataMode()) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  [dateField]: contactDate || null,
                  [initialsField]: contactInitials.trim() || null,
                  audit_trail: [...(r.audit_trail || []), auditEntry],
                  updated_at: new Date().toISOString(),
                }
              : r,
          ),
        );
      } else {
        const existingTrail = record?.audit_trail || [];
        await updatePatientAR(recordId, {
          [dateField]: contactDate || null,
          [initialsField]: contactInitials.trim() || null,
          audit_trail: [...existingTrail, auditEntry],
          updated_by: 'staff',
        });
        await fetchData();
      }
    } catch (err) {
      console.error('Error saving contact:', err);
      setError('Failed to save contact info.');
    }
    setEditingContact(null);
    setContactDate('');
    setContactInitials('');
  }, [editingContact, contactDate, contactInitials, fetchData]);

  const startEditCell = useCallback(
    (recordId: string, field: EditingCell extends null ? never : NonNullable<EditingCell>['field'], currentValue: string | null) => {
      setEditingCell({ recordId, field });
      setEditingValue(currentValue || '');
    },
    [],
  );

  const startEditContact = useCallback(
    (recordId: string, contactType: '1st' | '2nd' | 'final', currentDate: string | null, currentInitials: string | null) => {
      setEditingContact({ recordId, contactType });
      setContactDate(currentDate || '');
      setContactInitials(currentInitials || '');
    },
    [],
  );

  const handleClearAllPatientAR = useCallback(async () => {
    setClearing(true);
    try {
      if (isStaticDataMode()) {
        setRecords([]);
      } else {
        const { error: delError } = await supabase.from('patient_ar').delete().gte('created_at', '1970-01-01');
        if (delError) throw delError;
        setRecords([]);
      }
      setShowClearConfirm(false);
      setError(null);
    } catch (err) {
      console.error('Error clearing patient A/R:', err);
      setError('Failed to clear patient A/R records. Please try again.');
      setShowClearConfirm(false);
    } finally {
      setClearing(false);
    }
  }, []);

  // ---------------------------------------------------
  // DAILY REPORT HANDLERS
  // ---------------------------------------------------

  const handlePreviewDailyReport = useCallback(async (dateOverride?: string) => {
    try {
      const data = await fetchDailyARReportData(dateOverride || reportDate || undefined);
      const logoBaseUrl = window.location.origin;
      const html = generateDailyARReportHTML(data, logoBaseUrl);
      setReportPreviewHtml(html);
      setShowReportPreview(true);
    } catch (err) {
      console.error('Error generating daily report preview:', err);
      setError('Failed to generate daily report preview.');
    }
  }, [reportDate]);

  const handleSendDailyReport = useCallback(async () => {
    const recipientList = reportRecipients.split(',').map(e => e.trim()).filter(Boolean);
    if (recipientList.length === 0) {
      setError('Please enter at least one email recipient.');
      return;
    }
    setSendingReport(true);
    try {
      const data = await fetchDailyARReportData(reportDate || undefined);
      const result = await sendDailyARReport(
        recipientList,
        data,
        reportMessage || undefined,
      );
      if (result.success) {
        setToastMessage('Daily A/R report sent successfully!');
      } else {
        // Fallback: open in new tab for manual sending
        const html = generateDailyARReportHTML(data, window.location.origin, reportMessage || undefined);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setToastMessage('Report opened in new tab (email service not configured). You can print or forward it.');
      }
      setShowReportPreview(false);
    } catch (err) {
      console.error('Error sending daily report:', err);
      setError('Failed to send daily report.');
    } finally {
      setSendingReport(false);
    }
  }, [reportDate, reportRecipients, reportMessage]);

  // ---------------------------------------------------
  // NOTES & AUDIT DRAWER HANDLERS
  // ---------------------------------------------------

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
          await updatePatientAR(drawerRecordId, {
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

  function renderStatusBadge(status: PatientARStatus) {
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

  function renderStatusDropdown(record: PatientAR) {
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
    record: PatientAR,
    field: NonNullable<EditingCell>['field'],
    value: string | null,
    displayValue?: string,
    customClassName?: string,
  ) {
    const isEditing = editingCell?.recordId === record.id && editingCell?.field === field;
    const inputType = field === 'current_balance' ? 'number' : field === 'dos' ? 'date' : 'text';
    const useTextarea = !['patient_name', 'patient_id', 'related_family', 'current_balance', 'dos'].includes(field);

    const fieldLabels: Record<string, string> = {
      patient_name: 'Patient Name',
      patient_id: 'Patient ID',
      related_family: 'Related Family',
      current_balance: 'Balance',
      dos: 'Date of Service',
      background_notes: 'Background Notes',
      team_discussion_notes: 'Team Discussion',
      action_needed: 'Action Needed',
      dr_decision: 'Dr. Gajjar Decision',
      write_off_reason: 'Write-Off Reason',
    };

    const shownValue = displayValue || value;

    return (
      <div className="relative">
        <div
          onClick={() => startEditCell(record.id, field, value)}
          className={customClassName || `cursor-pointer min-h-[24px] px-1 py-0.5 rounded text-xs leading-snug ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-white/5'} ${shownValue ? '' : 'italic opacity-40'}`}
          title="Click to edit"
        >
          {shownValue || '--'}
        </div>

        {/* Floating edit popover */}
        {isEditing && (
          <div
            className={`absolute z-50 left-0 top-full mt-1 rounded-xl shadow-2xl border ${isDayMode ? 'bg-white border-gray-200' : 'bg-gray-800 border-white/15'} p-3`}
            style={{ minWidth: useTextarea ? '280px' : '220px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {fieldLabels[field] || field}
            </p>
            {useTextarea ? (
              <textarea
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                autoFocus
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${isDayMode ? 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-300' : 'bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500/40'} focus:outline-none`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEditingCell();
                  }
                  if (e.key === 'Escape') {
                    setEditingCell(null);
                    setEditingValue('');
                  }
                }}
              />
            ) : (
              <input
                type={inputType}
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                autoFocus
                step={field === 'current_balance' ? '0.01' : undefined}
                min={field === 'current_balance' ? '0' : undefined}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${isDayMode ? 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-300' : 'bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500/40'} focus:outline-none`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEditingCell();
                  }
                  if (e.key === 'Escape') {
                    setEditingCell(null);
                    setEditingValue('');
                  }
                }}
              />
            )}
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setEditingCell(null);
                  setEditingValue('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDayMode ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/10'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditingCell}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderContactCell(
    record: PatientAR,
    contactType: '1st' | '2nd' | 'final',
    dateValue: string | null,
    initialsValue: string | null,
  ) {
    const isEditing = editingContact?.recordId === record.id && editingContact?.contactType === contactType;
    const hasData = dateValue || initialsValue;
    const contactLabel = contactType === 'final' ? 'Final Contact' : `${contactType} Contact`;

    return (
      <div className="relative">
        <div
          onClick={() => startEditContact(record.id, contactType, dateValue, initialsValue)}
          className={`cursor-pointer min-h-[24px] px-1 py-0.5 rounded text-xs text-center ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-white/5'} ${hasData ? '' : 'italic opacity-40'}`}
          title="Click to set contact"
        >
          {hasData ? (
            <div className="flex flex-col items-center leading-tight">
              <span>{formatShortDate(dateValue)}</span>
              {initialsValue && <span className="font-semibold text-[10px] opacity-70">{initialsValue}</span>}
            </div>
          ) : (
            '--'
          )}
        </div>

        {/* Floating contact popover */}
        {isEditing && (
          <div
            className={`absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 rounded-xl shadow-2xl border ${isDayMode ? 'bg-white border-gray-200' : 'bg-gray-800 border-white/15'} p-3`}
            style={{ minWidth: '200px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {contactLabel}
            </p>
            <div className="space-y-2">
              <div>
                <label className={`text-[10px] font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Date</label>
                <input
                  type="date"
                  value={contactDate}
                  onChange={(e) => setContactDate(e.target.value)}
                  autoFocus
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDayMode ? 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-300' : 'bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500/40'} focus:outline-none`}
                />
              </div>
              <div>
                <label className={`text-[10px] font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Initials</label>
                <input
                  type="text"
                  placeholder="e.g. DM"
                  value={contactInitials}
                  onChange={(e) => setContactInitials(e.target.value.toUpperCase())}
                  maxLength={5}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDayMode ? 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-300' : 'bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500/40'} focus:outline-none`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveContact();
                    if (e.key === 'Escape') {
                      setEditingContact(null);
                      setContactDate('');
                      setContactInitials('');
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setEditingContact(null);
                  setContactDate('');
                  setContactInitials('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDayMode ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/10'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------
  // MODAL SAVE HANDLER (must be before early returns to satisfy hooks rules)
  // ---------------------------------------------------
  const handleModalSave = useCallback(async (_tab: TabKey, data: Record<string, unknown>, isNewEntry: boolean) => {
    try {
      if (isNewEntry) {
        const newRecord = {
          patient_name: sanitizePatientName(String(data.patient_name || '')),
          patient_id: String(data.patient_id || '') || null,
          related_family: String(data.related_family || '') || null,
          dos: String(data.dos || getLocalDateString()),
          current_balance: Number(data.current_balance) || 0,
          original_balance: data.original_balance ? Number(data.original_balance) : null,
          status: (String(data.status) || 'not_started') as PatientARStatus,
          action_needed: String(data.action_needed || '') || null,
          background_notes: String(data.background_notes || '') || null,
          is_collectible: activeTab === 'collectible',
          collected_amount: 0,
          team_discussion_notes: null,
          dr_decision: null,
          first_contact_date: null,
          first_contact_initials: null,
          second_contact_date: null,
          second_contact_initials: null,
          final_contact_date: null,
          final_contact_initials: null,
          write_off_suggested_date: null,
          write_off_reason: null,
          created_by: 'staff',
          updated_by: 'staff',
          structured_notes: [] as NoteEntry[],
          audit_trail: [createAuditEntry('created', 'staff')],
        };
        if (isStaticDataMode()) {
          setRecords((prev) => [{ ...newRecord, id: crypto.randomUUID(), aging_days: 0, aging_bucket: '0-30' as const }, ...prev]);
        } else {
          await insertPatientAR(newRecord);
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
          related_family: String(data.related_family || '') || null,
          dos: String(data.dos || ''),
          current_balance: Number(data.current_balance) || 0,
          status: String(data.status) || 'not_started',
          action_needed: String(data.action_needed || '') || null,
          background_notes: String(data.background_notes || '') || null,
          audit_trail: [...existingTrail, auditEntry],
          updated_by: 'staff',
        };
        if (isStaticDataMode()) {
          setRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } as PatientAR : r));
        } else {
          await updatePatientAR(id, updates);
          await fetchData();
        }
      }
      setEditModalOpen(false);
      setEditModalRecord(null);
    } catch (err) {
      throw err;
    }
  }, [activeTab, fetchData, records]);

  // ---------------------------------------------------
  // RENDER: LOADING / ERROR
  // ---------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
        <span className={`ml-3 text-lg ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
          Loading Patient A/R data...
        </span>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div
        className={`rounded-2xl p-8 text-center ${isDayMode ? 'glass-card border border-white/40' : 'glass-card-dark border border-white/10'}`}
      >
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <h3 className={`text-xl font-semibold mb-2 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
          Error Loading Data
        </h3>
        <p className={`mb-4 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all hover-lift font-semibold text-sm mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // ---------------------------------------------------
  // RENDER: MAIN
  // ---------------------------------------------------
  return (
    <div className="space-y-6" onClick={() => setStatusDropdownOpen(null)}>
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
            Patient A/R Tracker
          </h2>
          <p className={`text-sm mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Weekly A/R Review - Collectible &amp; Non-Collectible Accounts
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
            onClick={() => {
              setNewForm({ ...EMPTY_FORM, is_collectible: activeTab === 'collectible' });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all hover-lift font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Patient A/R
          </button>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <input
                type="date"
                value={reportDate}
                max={getLocalDateString()}
                onChange={(e) => setReportDate(e.target.value)}
                className={`px-2 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/10 border-white/20 text-white'
                }`}
              />
            )}
            <button
              onClick={() => handlePreviewDailyReport()}
              disabled={sendingReport}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                isDayMode ? 'border-blue-300 text-blue-600 hover:bg-blue-50' : 'border-blue-700 text-blue-400 hover:bg-blue-900/30'
              }`}
              title="Preview & send daily A/R report"
            >
              <Mail className="w-4 h-4" />
              Daily Report{isAdmin && reportDate && reportDate !== getLocalDateString() ? ` (${reportDate})` : ''}
            </button>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
              isDayMode ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-red-700 text-red-400 hover:bg-red-900/30'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Clear All Confirmation Banner */}
      {showClearConfirm && (
        <div className={`p-4 rounded-xl border ${isDayMode ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-800'}`}>
          <p className={`text-sm font-semibold mb-3 ${isDayMode ? 'text-red-800' : 'text-red-300'}`}>
            Are you sure you want to delete ALL patient A/R records? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={handleClearAllPatientAR} disabled={clearing}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
              {clearing ? 'Clearing...' : 'Yes, Delete All Patient A/R'}
            </button>
            <button onClick={() => setShowClearConfirm(false)} disabled={clearing}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                isDayMode ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* SUMMARY STRIP — compact single-row metrics */}
      {/* ============================================= */}
      <div className={`rounded-xl ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'}`}>
        <div className="flex items-stretch divide-x ${isDayMode ? 'divide-gray-200/60' : 'divide-white/10'}">
          {[
            { label: 'Collectible', value: String(collectibleRecords.length), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Non-Collect.', value: String(nonCollectibleRecords.length), icon: FileX2, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Collect. Balance', value: formatCurrency(totalCollectibleBalance), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Write-Off Bal.', value: formatCurrency(totalWriteOffBalance), icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Collected', value: formatCurrency(totalCollected), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="flex-1 flex items-center gap-2.5 px-4 py-3">
                <div className={`p-1.5 rounded-lg ${m.bg} flex-shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDayMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>{m.label}</p>
                  <p className={`text-sm font-bold ${isDayMode ? 'text-gray-900' : 'text-white'} truncate`}>{m.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================= */}
      {/* TABS + SEARCH */}
      {/* ============================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5">
          <button
            onClick={() => setActiveTab('collectible')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'collectible'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                : isDayMode
                  ? 'text-gray-600 hover:bg-white/60'
                  : 'text-gray-400 hover:bg-white/10'
            }`}
          >
            Collectible ({collectibleRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('non_collectible')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'non_collectible'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                : isDayMode
                  ? 'text-gray-600 hover:bg-white/60'
                  : 'text-gray-400 hover:bg-white/10'
            }`}
          >
            Non-Collectible ({nonCollectibleRecords.length})
          </button>
        </div>

        {/* Search */}
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
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className={`w-4 h-4 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          )}
        </div>
      </div>

      {/* ============================================= */}
      {/* SECTION HEADER */}
      {/* ============================================= */}
      <div
        className={`rounded-xl ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'}`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b ${isDayMode ? 'border-gray-100' : 'border-white/5'}">
          <div>
            <h3 className={`text-sm font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              {activeTab === 'collectible'
                ? 'Collectible Accounts'
                : 'Non-Collectible — Write-Offs'}
            </h3>
            <p className={`text-[10px] mt-0.5 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Click any cell to edit. Status key:
              {' '}{STATUS_OPTIONS.slice(0, 4).map((o) => o.label).join(' / ')} / ...
            </p>
          </div>
        </div>

        {/* ============================================= */}
        {/* TABLE */}
        {/* ============================================= */}
        {activeRecords.length === 0 ? (
          <div className="text-center py-8 px-5">
            <p className={`text-xs ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {searchQuery
                ? 'No matching records found.'
                : activeTab === 'collectible'
                  ? 'No collectible accounts. Add a new patient A/R record to get started.'
                  : 'No non-collectible accounts.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className={`border-b ${isDayMode ? 'border-gray-200' : 'border-white/10'}`}>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Patient Name
                  </th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Patient ID
                  </th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Family
                  </th>
                  <th className={`text-right text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Balance
                  </th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    DOS
                  </th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 min-w-[140px] ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Background Notes
                  </th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Status
                  </th>
                  <th className={`text-center text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    1st Contact
                  </th>
                  <th className={`text-center text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    2nd Contact
                  </th>
                  <th className={`text-center text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Final Contact
                  </th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 min-w-[140px] ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Team Discussion
                  </th>
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 min-w-[120px] ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Action Needed
                  </th>
                  <th className={`text-center text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Notes / Audit
                  </th>
                  {activeTab === 'non_collectible' && (
                    <>
                      <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 min-w-[120px] ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        Dr. Gajjar Decision
                      </th>
                      <th className={`text-left text-xs font-semibold uppercase tracking-wider py-3 px-2 min-w-[120px] ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        Write-Off Reason
                      </th>
                    </>
                  )}
                  <th className={`text-center text-xs font-semibold uppercase tracking-wider py-2 px-1.5 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={`${isDayMode ? 'stellar-row-hover' : 'stellar-row-hover-dark'} transition-colors border-b ${isDayMode ? 'border-gray-100' : 'border-white/5'}`}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={() => { setEditModalRecord(record); setEditModalOpen(true); }}
                  >
                    {/* Patient Name */}
                    <td className="py-1.5 px-1.5">
                      {renderEditableCell(
                        record,
                        'patient_name',
                        record.patient_name,
                        record.patient_name,
                        `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-sm font-medium ${isDayMode ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/5'}`,
                      )}
                    </td>

                    {/* Patient ID */}
                    <td className="py-1.5 px-1.5">
                      {renderEditableCell(
                        record,
                        'patient_id',
                        record.patient_id,
                        record.patient_id || '--',
                        `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-xs ${isDayMode ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'} ${!record.patient_id ? 'italic opacity-40' : ''}`,
                      )}
                    </td>

                    {/* Related Family */}
                    <td className="py-1.5 px-1.5">
                      {renderEditableCell(
                        record,
                        'related_family',
                        record.related_family,
                        record.related_family || '--',
                        `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-xs ${isDayMode ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'} ${!record.related_family ? 'italic opacity-40' : ''}`,
                      )}
                    </td>

                    {/* Balance */}
                    <td className="py-1.5 px-1.5">
                      {renderEditableCell(
                        record,
                        'current_balance',
                        String(record.current_balance),
                        formatCurrency(record.current_balance),
                        `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-sm font-semibold text-right ${record.current_balance >= 500 ? 'text-red-500' : isDayMode ? 'text-gray-900' : 'text-white'} ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-white/5'}`,
                      )}
                    </td>

                    {/* DOS */}
                    <td className="py-1.5 px-1.5">
                      {renderEditableCell(
                        record,
                        'dos',
                        record.dos,
                        formatDate(record.dos),
                        `cursor-pointer min-h-[28px] px-1 py-0.5 rounded text-xs ${isDayMode ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'}`,
                      )}
                    </td>

                    {/* Background Notes */}
                    <td className="py-1.5 px-1.5">
                      {renderEditableCell(record, 'background_notes', record.background_notes)}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                      {renderStatusDropdown(record)}
                    </td>

                    {/* 1st Contact */}
                    <td className="py-1.5 px-1.5">
                      {renderContactCell(record, '1st', record.first_contact_date, record.first_contact_initials)}
                    </td>

                    {/* 2nd Contact */}
                    <td className="py-1.5 px-1.5">
                      {renderContactCell(record, '2nd', record.second_contact_date, record.second_contact_initials)}
                    </td>

                    {/* Final Contact */}
                    <td className="py-1.5 px-1.5">
                      {renderContactCell(record, 'final', record.final_contact_date, record.final_contact_initials)}
                    </td>

                    {/* Team Discussion Notes */}
                    <td className="py-1.5 px-1.5">
                      {renderEditableCell(record, 'team_discussion_notes', record.team_discussion_notes)}
                    </td>

                    {/* Action Needed */}
                    <td className="py-1.5 px-1.5">
                      {renderEditableCell(record, 'action_needed', record.action_needed)}
                    </td>

                    {/* Notes & Audit Trail */}
                    <td className="py-1.5 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDrawerRecordId(record.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            isDayMode
                              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                              : 'text-blue-300 bg-blue-900/30 hover:bg-blue-900/50'
                          }`}
                          title="View notes & audit trail"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {(record.structured_notes || []).length > 0 && (
                            <span>{(record.structured_notes || []).length}</span>
                          )}
                          <History className="w-3 h-3 ml-0.5" />
                        </button>
                      </div>
                    </td>

                    {/* Non-collectible extra columns */}
                    {activeTab === 'non_collectible' && (
                      <>
                        <td className="py-1.5 px-1.5">
                          {renderEditableCell(record, 'dr_decision', record.dr_decision)}
                        </td>
                        <td className="py-1.5 px-1.5">
                          {renderEditableCell(record, 'write_off_reason', record.write_off_reason)}
                        </td>
                      </>
                    )}

                    {/* Actions */}
                    <td className="py-1.5 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        {/* Open edit modal */}
                        <button
                          onClick={() => { setEditModalRecord(record); setEditModalOpen(true); }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${isDayMode ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40'}`}
                          title="Edit record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        {/* Toggle collectible / write-off */}
                        {activeTab === 'collectible' ? (
                          <button
                            onClick={() => handleToggleCollectible(record.id, false)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${isDayMode ? 'hover:bg-red-100 text-red-500' : 'hover:bg-red-900/30 text-red-400'}`}
                            title="Send to Write-Off"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleCollectible(record.id, true)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${isDayMode ? 'hover:bg-blue-100 text-blue-500' : 'hover:bg-blue-900/30 text-blue-400'}`}
                            title="Move to Collectible"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Mark completed */}
                        {record.status !== 'completed' && (
                          <button
                            onClick={() => handleMarkCompleted(record.id)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${isDayMode ? 'hover:bg-emerald-100 text-emerald-500' : 'hover:bg-emerald-900/30 text-emerald-400'}`}
                            title="Mark Completed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
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

      {/* ============================================= */}
      {/* ADD PATIENT A/R MODAL */}
      {/* ============================================= */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl p-6 ${isDayMode ? 'glass-card border border-white/40' : 'glass-card-dark border border-white/10'} shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                Add Patient A/R
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className={`p-2 rounded-lg ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Patient Name */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Patient Name *
                </label>
                <input
                  type="text"
                  value={newForm.patient_name}
                  onChange={(e) => setNewForm((f) => ({ ...f, patient_name: e.target.value }))}
                  placeholder="Last, First"
                  className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                />
              </div>

              {/* Patient ID + Related Family */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={newForm.patient_id}
                    onChange={(e) => setNewForm((f) => ({ ...f, patient_id: e.target.value }))}
                    placeholder="Optional"
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Related Family
                  </label>
                  <input
                    type="text"
                    value={newForm.related_family}
                    onChange={(e) => setNewForm((f) => ({ ...f, related_family: e.target.value }))}
                    placeholder="Optional"
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
              </div>

              {/* DOS + Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Date of Service *
                  </label>
                  <input
                    type="date"
                    value={newForm.dos}
                    onChange={(e) => setNewForm((f) => ({ ...f, dos: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Current Balance *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newForm.current_balance}
                    onChange={(e) => setNewForm((f) => ({ ...f, current_balance: e.target.value }))}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
              </div>

              {/* Original Balance */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Original Balance (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newForm.original_balance}
                  onChange={(e) => setNewForm((f) => ({ ...f, original_balance: e.target.value }))}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                />
              </div>

              {/* Account Type + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Account Type
                  </label>
                  <select
                    value={newForm.is_collectible ? 'collectible' : 'non_collectible'}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, is_collectible: e.target.value === 'collectible' }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  >
                    <option value="collectible">Collectible</option>
                    <option value="non_collectible">Non-Collectible (Write-Off)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Status
                  </label>
                  <select
                    value={newForm.status}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, status: e.target.value as PatientARStatus }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Background Notes */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Background Notes
                </label>
                <textarea
                  value={newForm.background_notes}
                  onChange={(e) => setNewForm((f) => ({ ...f, background_notes: e.target.value }))}
                  rows={2}
                  placeholder="Any background context..."
                  className={`w-full px-3 py-2 rounded-xl border resize-none ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                />
              </div>

              {/* Action Needed */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Action Needed
                </label>
                <input
                  type="text"
                  value={newForm.action_needed}
                  onChange={(e) => setNewForm((f) => ({ ...f, action_needed: e.target.value }))}
                  placeholder="e.g. Call patient, send statement..."
                  className={`w-full px-3 py-2 rounded-xl border ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setShowAddModal(false)}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${isDayMode ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/10'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecord}
                disabled={saving || !newForm.patient_name.trim() || !newForm.dos || !newForm.current_balance}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all hover-lift font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Report Preview Modal */}
      {showReportPreview && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReportPreview(false)}
        >
          <div
            className={`w-full max-w-3xl max-h-[85vh] rounded-2xl ${isDayMode ? 'glass-card border border-white/40' : 'glass-card-dark border border-white/10'} shadow-2xl flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                  Daily A/R Report Preview
                </h3>
                <button
                  onClick={() => setShowReportPreview(false)}
                  className={`p-2 rounded-lg ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Recipients (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={reportRecipients}
                    onChange={(e) => setReportRecipients(e.target.value)}
                    placeholder="email@example.com, another@example.com"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDayMode ? 'border-gray-300 bg-white text-gray-900' : 'border-white/20 bg-white/10 text-white'
                    }`}
                  />
                </div>
                <button
                  onClick={handleSendDailyReport}
                  disabled={sendingReport || !reportRecipients.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm disabled:opacity-50"
                >
                  {sendingReport ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                  ) : (
                    <><Mail className="w-4 h-4" />Email Report</>
                  )}
                </button>
              </div>
              <div className="mt-3">
                <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Additional Message (Optional)
                </label>
                <textarea
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  rows={2}
                  placeholder="Add a note for the team..."
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    isDayMode ? 'border-gray-300 bg-white text-gray-900' : 'border-white/20 bg-white/10 text-white'
                  }`}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <iframe
                srcDoc={reportPreviewHtml}
                className="w-full h-full min-h-[500px]"
                title="Daily A/R Report Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes & Audit Trail Drawer */}
      <NotesAuditDrawer
        isOpen={!!drawerRecordId}
        onClose={() => setDrawerRecordId(null)}
        isDayMode={isDayMode}
        entityType="Patient A/R"
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
        initialTab="patient_ar"
        initialData={editModalRecord}
        isDayMode={isDayMode}
      />
    </div>
  );
}
