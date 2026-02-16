// =====================================================
// VCC Payments Tracker
// Tracks VCC standard payments, posting status,
// CC/terminal and check processing, and opt-out workflows
// =====================================================

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Clock,
  DollarSign,
  CreditCard,
  AlertCircle,
  MessageSquare,
  FileText,
  Ban,
  History,
} from 'lucide-react';
import {
  getVCCPayments,
  insertVCCPayment,
  updateVCCPayment,
  deleteVCCPayment,
  calculateVCCSummary,
  sampleVCCPayments,
  type VCCPayment,
  type NewVCCPayment,
  type OptOutNote,
} from '../services/vccPaymentsService';
import type { NoteEntry } from '../types/database.types';
import { sanitizePatientName } from '../utils/sanitizePatientName';
import NotesAuditDrawer, { createAuditEntry } from './NotesAuditDrawer';
import SuccessToast from './SuccessToast';

// =====================================================
// CONSTANTS
// =====================================================

const CLAIM_TYPES = ['VCC Standard'];
const STATUS_OPTIONS: VCCPayment['status'][] = ['Needs OD Posting & Payment Deposit', 'Needs to be Posted to OD', 'Pending Payment Deposit', 'Closed'];
const STAFF_INITIALS = ['BH', 'LP', 'VM', 'DM', 'LM'];

const EMPTY_FORM: NewVCCPayment = {
  patient_name: '',
  date_of_service: '',
  multiple_dos: false,
  claim_type: 'VCC Standard',
  payment_amount: 0,
  posted_to_open_dental: false,
  posted_by_initials: '',
  processed_via_terminal: false,
  processed_by_initials: '',
  deposited_via_check: false,
  deposited_via_check_by_initials: '',
  status: 'Needs OD Posting & Payment Deposit',
  opt_out_requested: false,
  opted_out: false,
  opt_out_notes: [],
  structured_notes: [],
  audit_trail: [],
};

// =====================================================
// COMPONENT
// =====================================================

interface VCCPaymentsTrackerProps {
  isDayMode: boolean;
}

export default function VCCPaymentsTracker({ isDayMode }: VCCPaymentsTrackerProps) {
  // --------------------------------------------------
  // State
  // --------------------------------------------------
  const [payments, setPayments] = useState<VCCPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewVCCPayment>({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Opt-out modal state
  const [optOutModalPaymentId, setOptOutModalPaymentId] = useState<string | null>(null);
  const [optOutNoteText, setOptOutNoteText] = useState('');
  const [optOutNoteInitials, setOptOutNoteInitials] = useState('');

  // Use local-only mode when Supabase table doesn't exist
  const [localMode, setLocalMode] = useState(false);

  // Notes & Audit drawer
  const [drawerPaymentId, setDrawerPaymentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --------------------------------------------------
  // localStorage helpers for local-mode persistence
  // --------------------------------------------------
  const LOCAL_STORAGE_KEY = 'vcc_payments_local';

  const loadLocalPayments = useCallback((): VCCPayment[] | null => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as VCCPayment[];
      }
    } catch {
      // Corrupted data, ignore
    }
    return null;
  }, []);

  const saveLocalPayments = useCallback((data: VCCPayment[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable, ignore
    }
  }, []);

  // --------------------------------------------------
  // Data fetching
  // --------------------------------------------------
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVCCPayments();
      setPayments(data);
      setLocalMode(false);
    } catch {
      // If Supabase table doesn't exist, fall back to local state
      setLocalMode(true);
      const cached = loadLocalPayments();
      setPayments(cached ?? [...sampleVCCPayments]);
    } finally {
      setLoading(false);
    }
  }, [loadLocalPayments]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Persist to localStorage whenever payments change in local mode
  useEffect(() => {
    if (localMode && payments.length > 0) {
      saveLocalPayments(payments);
    }
  }, [localMode, payments, saveLocalPayments]);

  // --------------------------------------------------
  // Derived data
  // --------------------------------------------------
  const summary = useMemo(() => calculateVCCSummary(payments), [payments]);

  const filteredPayments = useMemo(() => {
    let filtered = payments;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.patient_name.toLowerCase().includes(lower) ||
          p.claim_type.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    return filtered;
  }, [payments, searchTerm, statusFilter]);

  const optOutModalPayment = useMemo(
    () => payments.find(p => p.id === optOutModalPaymentId) ?? null,
    [payments, optOutModalPaymentId]
  );

  // --------------------------------------------------
  // Handlers
  // --------------------------------------------------
  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.patient_name.trim() || (!form.multiple_dos && !form.date_of_service)) return;

    const sanitized: NewVCCPayment = {
      ...form,
      patient_name: sanitizePatientName(form.patient_name),
      payment_amount: Number(form.payment_amount) || 0,
    };

    // Auto-set status based on workflow
    const paymentProcessed = sanitized.processed_via_terminal || sanitized.deposited_via_check;
    if (sanitized.posted_to_open_dental && paymentProcessed) {
      sanitized.status = 'Closed';
    } else if (!sanitized.posted_to_open_dental && !paymentProcessed) {
      sanitized.status = 'Needs OD Posting & Payment Deposit';
    } else if (!sanitized.posted_to_open_dental) {
      sanitized.status = 'Needs to be Posted to OD';
    } else {
      sanitized.status = 'Pending Payment Deposit';
    }

    try {
      if (localMode) {
        // Local-only mode
        if (editingId) {
          const auditEntry = createAuditEntry('updated', sanitized.posted_by_initials || 'staff', { notes: 'Payment updated' });
          setPayments(prev =>
            prev.map(p => (p.id === editingId ? {
              ...p,
              ...sanitized,
              structured_notes: p.structured_notes || [],
              audit_trail: [...(p.audit_trail || []), auditEntry],
              updated_at: new Date().toISOString(),
            } : p))
          );
        } else {
          const newPayment: VCCPayment = {
            ...sanitized,
            id: crypto.randomUUID(),
            structured_notes: [],
            audit_trail: [createAuditEntry('created', sanitized.posted_by_initials || 'staff', { notes: 'Payment created' })],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setPayments(prev => [newPayment, ...prev]);
        }
      } else {
        if (editingId) {
          const existingPayment = payments.find(p => p.id === editingId);
          const auditEntry = createAuditEntry('updated', sanitized.posted_by_initials || 'staff', { notes: 'Payment updated' });
          sanitized.audit_trail = [...(existingPayment?.audit_trail || []), auditEntry];
          sanitized.structured_notes = existingPayment?.structured_notes || [];
          await updateVCCPayment(editingId, sanitized);
        } else {
          sanitized.audit_trail = [createAuditEntry('created', sanitized.posted_by_initials || 'staff', { notes: 'Payment created' })];
          await insertVCCPayment(sanitized);
        }
        await fetchPayments();
      }
      if (!editingId) {
        setToastMessage('VCC payment added successfully');
      }
    } catch (err) {
      console.error('Error saving VCC payment:', err);
    }

    resetForm();
  };

  const handleEdit = (payment: VCCPayment) => {
    setEditingId(payment.id);
    setForm({
      patient_name: payment.patient_name,
      date_of_service: payment.date_of_service,
      multiple_dos: payment.multiple_dos,
      claim_type: payment.claim_type,
      payment_amount: payment.payment_amount,
      posted_to_open_dental: payment.posted_to_open_dental,
      posted_by_initials: payment.posted_by_initials,
      processed_via_terminal: payment.processed_via_terminal,
      processed_by_initials: payment.processed_by_initials,
      deposited_via_check: payment.deposited_via_check,
      deposited_via_check_by_initials: payment.deposited_via_check_by_initials,
      status: payment.status,
      opt_out_requested: payment.opt_out_requested,
      opted_out: payment.opted_out,
      opt_out_notes: payment.opt_out_notes,
      structured_notes: payment.structured_notes || [],
      audit_trail: payment.audit_trail || [],
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      if (localMode) {
        setPayments(prev => prev.filter(p => p.id !== id));
      } else {
        await deleteVCCPayment(id);
        await fetchPayments();
      }
    } catch (err) {
      console.error('Error deleting VCC payment:', err);
    }
    setDeleteConfirmId(null);
  };

  const handleTogglePosted = async (payment: VCCPayment) => {
    const newPosted = !payment.posted_to_open_dental;
    const updates: Partial<NewVCCPayment> = {
      posted_to_open_dental: newPosted,
      posted_by_initials: newPosted ? payment.posted_by_initials : '',
    };
    // Auto-update status
    const paymentProcessed = payment.processed_via_terminal || payment.deposited_via_check;
    if (newPosted && paymentProcessed) updates.status = 'Closed';
    else if (!newPosted && !paymentProcessed) updates.status = 'Needs OD Posting & Payment Deposit';
    else if (!newPosted) updates.status = 'Needs to be Posted to OD';
    else updates.status = 'Pending Payment Deposit';

    if (localMode) {
      setPayments(prev => prev.map(p => (p.id === payment.id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)));
    } else {
      await updateVCCPayment(payment.id, updates);
      await fetchPayments();
    }
  };

  const handleToggleProcessed = async (payment: VCCPayment) => {
    const newProcessed = !payment.processed_via_terminal;
    const updates: Partial<NewVCCPayment> = {
      processed_via_terminal: newProcessed,
      processed_by_initials: newProcessed ? payment.processed_by_initials : '',
      // Mutual exclusivity: if enabling CC, disable Check
      ...(newProcessed ? { deposited_via_check: false, deposited_via_check_by_initials: '' } : {}),
    };
    if (payment.posted_to_open_dental && newProcessed) updates.status = 'Closed';
    else if (!payment.posted_to_open_dental && !newProcessed) updates.status = 'Needs OD Posting & Payment Deposit';
    else if (!payment.posted_to_open_dental) updates.status = 'Needs to be Posted to OD';
    else updates.status = 'Pending Payment Deposit';

    if (localMode) {
      setPayments(prev => prev.map(p => (p.id === payment.id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)));
    } else {
      await updateVCCPayment(payment.id, updates);
      await fetchPayments();
    }
  };

  const handleToggleCheck = async (payment: VCCPayment) => {
    const newCheck = !payment.deposited_via_check;
    const updates: Partial<NewVCCPayment> = {
      deposited_via_check: newCheck,
      deposited_via_check_by_initials: newCheck ? payment.deposited_via_check_by_initials : '',
      // Mutual exclusivity: if enabling Check, disable CC
      ...(newCheck ? { processed_via_terminal: false, processed_by_initials: '' } : {}),
    };
    if (payment.posted_to_open_dental && newCheck) updates.status = 'Closed';
    else if (!payment.posted_to_open_dental && !newCheck) updates.status = 'Needs OD Posting & Payment Deposit';
    else if (!payment.posted_to_open_dental) updates.status = 'Needs to be Posted to OD';
    else updates.status = 'Pending Payment Deposit';

    if (localMode) {
      setPayments(prev => prev.map(p => (p.id === payment.id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)));
    } else {
      await updateVCCPayment(payment.id, updates);
      await fetchPayments();
    }
  };

  const handleSetInitials = async (payment: VCCPayment, field: 'posted_by_initials' | 'processed_by_initials' | 'deposited_via_check_by_initials', value: string) => {
    if (localMode) {
      setPayments(prev => prev.map(p => (p.id === payment.id ? { ...p, [field]: value, updated_at: new Date().toISOString() } : p)));
    } else {
      await updateVCCPayment(payment.id, { [field]: value });
      await fetchPayments();
    }
  };

  // Opt-out handlers
  const handleAddOptOutNote = async () => {
    if (!optOutModalPaymentId || !optOutNoteText.trim() || !optOutNoteInitials.trim()) return;

    const newNote: OptOutNote = {
      id: crypto.randomUUID(),
      initials: optOutNoteInitials.trim().toUpperCase(),
      note: optOutNoteText.trim(),
      created_at: new Date().toISOString(),
    };

    const payment = payments.find(p => p.id === optOutModalPaymentId);
    if (!payment) return;

    const updatedNotes = [...payment.opt_out_notes, newNote];

    if (localMode) {
      setPayments(prev =>
        prev.map(p =>
          p.id === optOutModalPaymentId
            ? { ...p, opt_out_notes: updatedNotes, opt_out_requested: true, updated_at: new Date().toISOString() }
            : p
        )
      );
    } else {
      await updateVCCPayment(optOutModalPaymentId, { opt_out_notes: updatedNotes, opt_out_requested: true });
      await fetchPayments();
    }

    setOptOutNoteText('');
    setOptOutNoteInitials('');
  };

  const handleToggleOptedOut = async (paymentId: string, currentValue: boolean) => {
    if (localMode) {
      setPayments(prev =>
        prev.map(p =>
          p.id === paymentId
            ? { ...p, opted_out: !currentValue, updated_at: new Date().toISOString() }
            : p
        )
      );
    } else {
      await updateVCCPayment(paymentId, { opted_out: !currentValue });
      await fetchPayments();
    }
  };

  // --------------------------------------------------
  // Notes & Audit drawer handler
  // --------------------------------------------------
  const drawerPayment = useMemo(
    () => payments.find(p => p.id === drawerPaymentId) ?? null,
    [payments, drawerPaymentId],
  );

  const handleDrawerAddNote = async (note: NoteEntry) => {
    if (!drawerPaymentId) return;
    const payment = payments.find(p => p.id === drawerPaymentId);
    if (!payment) return;

    const updatedNotes = [...(payment.structured_notes || []), note];
    const auditEntry = createAuditEntry('note_added', note.author || 'staff', {
      notes: `Note added by ${note.author || 'staff'} (${note.source})`,
    });
    const updatedTrail = [...(payment.audit_trail || []), auditEntry];

    if (localMode) {
      setPayments(prev =>
        prev.map(p =>
          p.id === drawerPaymentId
            ? { ...p, structured_notes: updatedNotes, audit_trail: updatedTrail, updated_at: new Date().toISOString() }
            : p,
        ),
      );
    } else {
      await updateVCCPayment(drawerPaymentId, {
        structured_notes: updatedNotes,
        audit_trail: updatedTrail,
      });
      await fetchPayments();
    }
  };

  // --------------------------------------------------
  // Styling helpers
  // --------------------------------------------------
  const cardClass = `rounded-2xl p-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`;
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDayMode
      ? 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
      : 'bg-white/10 border-white/20 text-white focus:border-blue-400'
  } focus:outline-none focus:ring-2 focus:ring-blue-500/30`;
  const labelClass = `block text-xs font-semibold mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`;

  const statusColor = (status: string) => {
    switch (status) {
      case 'Closed':
        return isDayMode ? 'bg-green-100 text-green-800' : 'bg-green-900/40 text-green-300';
      case 'Pending Payment Deposit':
        return isDayMode ? 'bg-amber-100 text-amber-800' : 'bg-amber-900/40 text-amber-300';
      case 'Needs to be Posted to OD':
        return isDayMode ? 'bg-orange-100 text-orange-800' : 'bg-orange-900/40 text-orange-300';
      case 'Needs OD Posting & Payment Deposit':
      default:
        return isDayMode ? 'bg-red-100 text-red-800' : 'bg-red-900/40 text-red-300';
    }
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
              VCC Payments
            </h2>
            <p className={`text-xs mt-0.5 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Track VCC standard claim payments, posting, and payment processing
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-primary text-gold-400 shadow-glow-primary hover-lift transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </button>
        </div>

        {/* Summary Cards - Compact Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {/* Total Claims */}
          <div className={`${isDayMode ? 'bg-slate-50' : 'bg-white/5'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="flex items-center gap-1.5">
              <FileText className={`w-3.5 h-3.5 ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-slate-600' : 'text-slate-400'}`}>Total Claims</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{summary.totalPayments}</p>
          </div>

          {/* Total Amount */}
          <div className={`${isDayMode ? 'bg-emerald-50' : 'bg-emerald-900/20'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-emerald-200' : 'border-emerald-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <DollarSign className={`w-3.5 h-3.5 ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-emerald-700' : 'text-emerald-400'}`}>Total Amount</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-emerald-900' : 'text-emerald-300'}`}>
              ${summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Pending */}
          <div className={`${isDayMode ? 'bg-amber-50' : 'bg-amber-900/20'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-amber-200' : 'border-amber-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <Clock className={`w-3.5 h-3.5 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-amber-700' : 'text-amber-400'}`}>Pending Deposit</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-amber-900' : 'text-amber-300'}`}>
              ${summary.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-[10px] ${isDayMode ? 'text-amber-600' : 'text-amber-500'}`}>{summary.pendingCount} claims</p>
          </div>

          {/* Total Closed */}
          <div className={`${isDayMode ? 'bg-green-50' : 'bg-green-900/20'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-green-200' : 'border-green-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <CheckCircle className={`w-3.5 h-3.5 ${isDayMode ? 'text-green-600' : 'text-green-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-green-700' : 'text-green-400'}`}>Closed</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-green-900' : 'text-green-300'}`}>
              ${summary.closedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-[10px] ${isDayMode ? 'text-green-600' : 'text-green-500'}`}>{summary.closedCount} claims</p>
          </div>

          {/* Checks */}
          <div className={`${isDayMode ? 'bg-green-50' : 'bg-green-900/20'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-green-200' : 'border-green-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <FileText className={`w-3.5 h-3.5 ${isDayMode ? 'text-green-600' : 'text-green-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-green-700' : 'text-green-400'}`}>Checks</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-green-900' : 'text-green-300'}`}>
              ${summary.closedCheckAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-[10px] ${isDayMode ? 'text-green-600' : 'text-green-500'}`}>{summary.closedCheckCount} claims</p>
          </div>

          {/* CC Terminal */}
          <div className={`${isDayMode ? 'bg-green-50' : 'bg-green-900/20'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-green-200' : 'border-green-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <CreditCard className={`w-3.5 h-3.5 ${isDayMode ? 'text-green-600' : 'text-green-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-green-700' : 'text-green-400'}`}>CC/Terminal</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-green-900' : 'text-green-300'}`}>
              ${summary.closedTerminalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-[10px] ${isDayMode ? 'text-green-600' : 'text-green-500'}`}>{summary.closedTerminalCount} claims</p>
          </div>

          {/* Posted to OD */}
          <div className={`${isDayMode ? 'bg-blue-50' : 'bg-blue-900/20'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-blue-200' : 'border-blue-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <CreditCard className={`w-3.5 h-3.5 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-blue-700' : 'text-blue-400'}`}>Posted to OD</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-blue-900' : 'text-blue-300'}`}>{summary.postedCount}</p>
            <p className={`text-[10px] ${isDayMode ? 'text-blue-600' : 'text-blue-500'}`}>{summary.notPostedCount} not posted</p>
          </div>

          {/* Needs OD Posting */}
          <div className={`${isDayMode ? 'bg-orange-50' : 'bg-orange-900/20'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-orange-200' : 'border-orange-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <AlertCircle className={`w-3.5 h-3.5 ${isDayMode ? 'text-orange-600' : 'text-orange-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-orange-700' : 'text-orange-400'}`}>Needs OD Posting</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-orange-900' : 'text-orange-300'}`}>
              ${summary.notPostedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-[10px] ${isDayMode ? 'text-orange-600' : 'text-orange-500'}`}>{summary.notPostedCount} claims</p>
          </div>

          {/* Opt Out Requested */}
          <div className={`${isDayMode ? 'bg-red-50' : 'bg-red-900/20'} rounded-lg px-3 py-2 border ${isDayMode ? 'border-red-200' : 'border-red-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <Ban className={`w-3.5 h-3.5 ${isDayMode ? 'text-red-600' : 'text-red-400'}`} />
              <p className={`text-[11px] font-medium ${isDayMode ? 'text-red-700' : 'text-red-400'}`}>Opt-Out</p>
            </div>
            <p className={`text-lg font-bold ${isDayMode ? 'text-red-900' : 'text-red-300'}`}>{summary.optOutRequestedCount}</p>
            <p className={`text-[10px] ${isDayMode ? 'text-red-600' : 'text-red-500'}`}>{summary.optedOutCount} opted out</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-2xl rounded-2xl p-6 ${isDayMode ? 'bg-white shadow-xl' : 'bg-gray-900 border border-white/10'} max-h-[85vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                {editingId ? 'Edit VCC Payment' : 'Add VCC Payment'}
              </h3>
              <button onClick={resetForm} className={`p-1.5 rounded-lg ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient Name */}
              <div>
                <label className={labelClass}>Patient Name *</label>
                <input
                  type="text"
                  value={form.patient_name}
                  onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))}
                  className={inputClass}
                  placeholder="Last, First"
                />
              </div>

              {/* Date of Service */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Date of Service {!form.multiple_dos && '*'}
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.multiple_dos}
                      onChange={e => setForm(f => ({ ...f, multiple_dos: e.target.checked, ...(e.target.checked ? { date_of_service: '' } : {}) }))}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-xs font-medium ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Multiple</span>
                  </label>
                </div>
                <input
                  type="date"
                  value={form.date_of_service}
                  onChange={e => setForm(f => ({ ...f, date_of_service: e.target.value }))}
                  disabled={form.multiple_dos}
                  className={`${inputClass} ${form.multiple_dos ? 'opacity-40 cursor-not-allowed' : ''}`}
                  placeholder={form.multiple_dos ? 'Multiple DOS' : ''}
                />
                {form.multiple_dos && (
                  <p className={`text-xs mt-1 font-medium ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`}>Multiple DOS will be recorded</p>
                )}
              </div>

              {/* Claim Type */}
              <div>
                <label className={labelClass}>Claim Type</label>
                <select
                  value={form.claim_type}
                  onChange={e => setForm(f => ({ ...f, claim_type: e.target.value }))}
                  className={inputClass}
                >
                  {CLAIM_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className={labelClass}>Payment Amount</label>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 text-sm ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.payment_amount || ''}
                    onChange={e => setForm(f => ({ ...f, payment_amount: parseFloat(e.target.value) || 0 }))}
                    className={`${inputClass} pl-7`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as VCCPayment['status'] }))}
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Posted to Open Dental */}
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.posted_to_open_dental}
                      onChange={e => setForm(f => ({ ...f, posted_to_open_dental: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Posted to Open Dental</span>
                  </label>
                </div>
                {form.posted_to_open_dental && (
                  <div className="mt-2">
                    <label className={labelClass}>Posted By (Initials)</label>
                    <select
                      value={form.posted_by_initials}
                      onChange={e => setForm(f => ({ ...f, posted_by_initials: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Select...</option>
                      {STAFF_INITIALS.map(i => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Payment Processed via CC on Clover/Terminal */}
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-2 ${form.deposited_via_check ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={form.processed_via_terminal}
                      disabled={form.deposited_via_check}
                      onChange={e => setForm(f => ({ ...f, processed_via_terminal: e.target.checked, ...(e.target.checked ? { deposited_via_check: false, deposited_via_check_by_initials: '' } : {}) }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                    />
                    <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>CC on Clover/Terminal</span>
                  </label>
                </div>
                {form.processed_via_terminal && (
                  <div className="mt-2">
                    <label className={labelClass}>Processed By (Initials)</label>
                    <select
                      value={form.processed_by_initials}
                      onChange={e => setForm(f => ({ ...f, processed_by_initials: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Select...</option>
                      {STAFF_INITIALS.map(i => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Payment Deposited via Check */}
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-2 ${form.processed_via_terminal ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={form.deposited_via_check}
                      disabled={form.processed_via_terminal}
                      onChange={e => setForm(f => ({ ...f, deposited_via_check: e.target.checked, ...(e.target.checked ? { processed_via_terminal: false, processed_by_initials: '' } : {}) }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                    />
                    <span className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Deposited via Check</span>
                  </label>
                </div>
                {form.deposited_via_check && (
                  <div className="mt-2">
                    <label className={labelClass}>Deposited By (Initials)</label>
                    <select
                      value={form.deposited_via_check_by_initials}
                      onChange={e => setForm(f => ({ ...f, deposited_via_check_by_initials: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Select...</option>
                      {STAFF_INITIALS.map(i => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={resetForm}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isDayMode ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.patient_name.trim() || (!form.multiple_dos && !form.date_of_service)}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-primary text-gold-400 shadow-glow-primary hover-lift transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Update Payment' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className={cardClass}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by patient name..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="flex gap-2">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-gradient-primary text-gold-400 shadow-glow-primary'
                    : isDayMode
                    ? 'bg-white/60 text-gray-600 hover:bg-white/80 border border-white/40'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className={cardClass}>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className={`w-12 h-12 mx-auto mb-3 ${isDayMode ? 'text-gray-300' : 'text-gray-600'}`} />
            <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {payments.length === 0 ? 'No VCC payments added yet. Click "Add Payment" to get started.' : 'No payments match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDayMode ? 'border-gray-200' : 'border-white/10'}`}>
                  <th className={`text-left py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Patient Name</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>DOS</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Claim Type</th>
                  <th className={`text-right py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Amount</th>
                  <th className={`text-center py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Posted to OD</th>
                  <th className={`text-center py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>CC on Clover/Terminal</th>
                  <th className={`text-center py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Check</th>
                  <th className={`text-center py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Status</th>
                  <th className={`text-center py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Opt Out</th>
                  <th className={`text-center py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Notes / Audit</th>
                  <th className={`text-center py-3 px-3 font-semibold ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(payment => (
                  <tr
                    key={payment.id}
                    className={`border-b ${isDayMode ? 'border-gray-100 hover:bg-blue-50/50' : 'border-white/5 hover:bg-white/5'} transition-colors`}
                  >
                    {/* Patient Name */}
                    <td className={`py-3 px-3 font-medium ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                      {payment.patient_name}
                    </td>

                    {/* DOS */}
                    <td className={`py-3 px-3 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                      {payment.multiple_dos ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isDayMode ? 'bg-blue-100 text-blue-800' : 'bg-blue-900/40 text-blue-300'
                        }`}>Multiple</span>
                      ) : payment.date_of_service ? new Date(payment.date_of_service + 'T00:00:00').toLocaleDateString() : '-'}
                    </td>

                    {/* Claim Type */}
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isDayMode ? 'bg-purple-100 text-purple-800' : 'bg-purple-900/40 text-purple-300'
                      }`}>
                        {payment.claim_type}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className={`py-3 px-3 text-right font-semibold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                      ${payment.payment_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Posted to OD */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleTogglePosted(payment)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            payment.posted_to_open_dental
                              ? 'bg-green-500 border-green-500 text-white'
                              : isDayMode
                              ? 'border-gray-300 hover:border-green-400'
                              : 'border-gray-600 hover:border-green-400'
                          }`}
                        >
                          {payment.posted_to_open_dental && <CheckCircle className="w-4 h-4" />}
                        </button>
                        {payment.posted_to_open_dental && (
                          <select
                            value={payment.posted_by_initials}
                            onChange={e => handleSetInitials(payment, 'posted_by_initials', e.target.value)}
                            className={`text-xs px-1 py-0.5 rounded border ${
                              isDayMode ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/10 border-white/20 text-gray-300'
                            }`}
                          >
                            <option value="">--</option>
                            {STAFF_INITIALS.map(i => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>

                    {/* CC on Clover/Terminal */}
                    <td className={`py-3 px-3 text-center ${payment.deposited_via_check ? 'opacity-40' : ''}`}>
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleToggleProcessed(payment)}
                          disabled={payment.deposited_via_check}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            payment.processed_via_terminal
                              ? 'bg-green-500 border-green-500 text-white'
                              : payment.deposited_via_check
                              ? 'border-gray-400 cursor-not-allowed'
                              : isDayMode
                              ? 'border-gray-300 hover:border-green-400'
                              : 'border-gray-600 hover:border-green-400'
                          }`}
                        >
                          {payment.processed_via_terminal && <CheckCircle className="w-4 h-4" />}
                        </button>
                        {payment.processed_via_terminal && (
                          <select
                            value={payment.processed_by_initials}
                            onChange={e => handleSetInitials(payment, 'processed_by_initials', e.target.value)}
                            className={`text-xs px-1 py-0.5 rounded border ${
                              isDayMode ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/10 border-white/20 text-gray-300'
                            }`}
                          >
                            <option value="">--</option>
                            {STAFF_INITIALS.map(i => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>

                    {/* Check */}
                    <td className={`py-3 px-3 text-center ${payment.processed_via_terminal ? 'opacity-40' : ''}`}>
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleToggleCheck(payment)}
                          disabled={payment.processed_via_terminal}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            payment.deposited_via_check
                              ? 'bg-green-500 border-green-500 text-white'
                              : payment.processed_via_terminal
                              ? 'border-gray-400 cursor-not-allowed'
                              : isDayMode
                              ? 'border-gray-300 hover:border-green-400'
                              : 'border-gray-600 hover:border-green-400'
                          }`}
                        >
                          {payment.deposited_via_check && <CheckCircle className="w-4 h-4" />}
                        </button>
                        {payment.deposited_via_check && (
                          <select
                            value={payment.deposited_via_check_by_initials}
                            onChange={e => handleSetInitials(payment, 'deposited_via_check_by_initials', e.target.value)}
                            className={`text-xs px-1 py-0.5 rounded border ${
                              isDayMode ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/10 border-white/20 text-gray-300'
                            }`}
                          >
                            <option value="">--</option>
                            {STAFF_INITIALS.map(i => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>

                    {/* Opt Out */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {payment.opted_out ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isDayMode ? 'bg-red-100 text-red-700' : 'bg-red-900/40 text-red-300'
                          }`}>
                            Opted Out
                          </span>
                        ) : payment.opt_out_requested ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isDayMode ? 'bg-orange-100 text-orange-700' : 'bg-orange-900/40 text-orange-300'
                          }`}>
                            Requested
                          </span>
                        ) : (
                          <span className={`text-xs ${isDayMode ? 'text-gray-400' : 'text-gray-600'}`}>-</span>
                        )}
                        <button
                          onClick={() => setOptOutModalPaymentId(payment.id)}
                          className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all ${
                            isDayMode ? 'text-blue-600 hover:bg-blue-50' : 'text-blue-400 hover:bg-blue-900/20'
                          }`}
                        >
                          <MessageSquare className="w-3 h-3" />
                          Notes
                        </button>
                      </div>
                    </td>

                    {/* Notes / Audit Trail */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setDrawerPaymentId(payment.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          isDayMode
                            ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                            : 'text-blue-300 bg-blue-900/30 hover:bg-blue-900/50'
                        }`}
                        title="View notes & audit trail"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {(payment.structured_notes || []).length > 0 && (
                          <span>{(payment.structured_notes || []).length}</span>
                        )}
                        <History className="w-3 h-3" />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(payment)}
                          className={`p-1.5 rounded-lg transition-all ${
                            isDayMode ? 'text-blue-600 hover:bg-blue-50' : 'text-blue-400 hover:bg-blue-900/20'
                          }`}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {deleteConfirmId === payment.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(payment.id)}
                              className="px-2 py-1 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-600"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                isDayMode ? 'bg-gray-100 text-gray-600' : 'bg-white/10 text-gray-400'
                              }`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(payment.id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              isDayMode ? 'text-red-500 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/20'
                            }`}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Opt-Out Status Modal */}
      {optOutModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 ${isDayMode ? 'bg-white shadow-xl' : 'bg-gray-900 border border-white/10'} max-h-[80vh] flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-lg font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                  Opt-Out Status
                </h3>
                <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {optOutModalPayment.patient_name} &mdash; DOS: {optOutModalPayment.date_of_service ? new Date(optOutModalPayment.date_of_service + 'T00:00:00').toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <button
                onClick={() => { setOptOutModalPaymentId(null); setOptOutNoteText(''); setOptOutNoteInitials(''); }}
                className={`p-1.5 rounded-lg ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Opted Out Checkbox */}
            <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl ${
              isDayMode ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-500/20'
            }`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optOutModalPayment.opted_out}
                  onChange={() => handleToggleOptedOut(optOutModalPayment.id, optOutModalPayment.opted_out)}
                  className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className={`text-sm font-semibold ${isDayMode ? 'text-red-800' : 'text-red-300'}`}>
                  Mark as Opted Out
                </span>
              </label>
              {optOutModalPayment.opted_out && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
                  isDayMode ? 'bg-red-200 text-red-800' : 'bg-red-800 text-red-200'
                }`}>
                  OPTED OUT
                </span>
              )}
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {optOutModalPayment.opt_out_notes.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${isDayMode ? 'text-gray-300' : 'text-gray-600'}`} />
                  <p className={`text-sm ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>No opt-out notes yet.</p>
                </div>
              ) : (
                optOutModalPayment.opt_out_notes.map(note => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-xl ${isDayMode ? 'bg-gray-50 border border-gray-200' : 'bg-white/5 border border-white/10'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isDayMode ? 'bg-blue-100 text-blue-800' : 'bg-blue-900/40 text-blue-300'
                      }`}>
                        {note.initials}
                      </span>
                      <span className={`text-xs ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={`text-sm ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>{note.note}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            <div className={`border-t pt-4 ${isDayMode ? 'border-gray-200' : 'border-white/10'}`}>
              <div className="flex gap-2 mb-2">
                <select
                  value={optOutNoteInitials}
                  onChange={e => setOptOutNoteInitials(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm w-24 ${
                    isDayMode
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-white/10 border-white/20 text-white'
                  }`}
                >
                  <option value="">Initials</option>
                  {STAFF_INITIALS.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={optOutNoteText}
                  onChange={e => setOptOutNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddOptOutNote(); }}
                  placeholder="Add a note about opt-out status..."
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                    isDayMode
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-white/10 border-white/20 text-white'
                  }`}
                />
              </div>
              <button
                onClick={handleAddOptOutNote}
                disabled={!optOutNoteText.trim() || !optOutNoteInitials}
                className="w-full px-4 py-2 rounded-xl font-semibold text-sm bg-gradient-primary text-gold-400 shadow-glow-primary hover-lift transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes & Audit Trail Drawer */}
      <NotesAuditDrawer
        isOpen={!!drawerPaymentId}
        onClose={() => setDrawerPaymentId(null)}
        isDayMode={isDayMode}
        entityType="VCC Payment"
        entityLabel={drawerPayment?.patient_name || ''}
        notes={drawerPayment?.structured_notes || []}
        auditTrail={drawerPayment?.audit_trail || []}
        onAddNote={handleDrawerAddNote}
      />

      {/* Success Toast */}
      <SuccessToast
        message={toastMessage || ''}
        isVisible={!!toastMessage}
        onClose={() => setToastMessage(null)}
        isDayMode={isDayMode}
      />
    </div>
  );
}
