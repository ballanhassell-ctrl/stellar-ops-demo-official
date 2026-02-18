// src/components/InsuranceARReport.tsx
// Insurance A/R Report - mirrors "Stellar X Court Street Dental - Insurance A/R Report" spreadsheet

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  DollarSign,
  FileText,
  Users,
  Clock,
  MessageSquare,
  History,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import type {
  Claim,
  UnifiedClaimStatus,
  NoteEntry,
  AuditTrailEntry,
} from '../types/database.types';
import {
  getClaims,
  insertClaim,
  updateClaim,
  deleteClaim,
  calculateInsuranceARSummaryFromClaims,
} from '../services/claimsService';
import type { InsuranceARSummary } from '../services/claimsService';
import { supabase } from '../lib/supabaseClient';
import { sanitizePatientName } from '../utils/sanitizePatientName';
import NotesAuditDrawer, { createAuditEntry } from './NotesAuditDrawer';
import SuccessToast from './SuccessToast';

// =====================================================
// CONSTANTS
// =====================================================

// A/R-specific statuses (subset of UnifiedClaimStatus used in this report)
const ALL_STATUSES: UnifiedClaimStatus[] = [
  'Pending Review',
  'Resubmitted - 1st',
  'Resubmitted - 2nd',
  'Final Review',
  'Consultant Review',
  'Closed/Paid',
  'Closed/Unpaid',
  'Appeal Filed',
  'Denied',
  'Waiting for Info',
  'Lori Review',
  'Paid/Check or EFT Pending',
  'SEE NOTES',
];

type AgingStatus = '0-30 Days' | '31-60 Days' | '61-90 Days' | '91-120 Days' | '121+ Days';

const ALL_AGING_STATUSES: AgingStatus[] = [
  '0-30 Days',
  '31-60 Days',
  '61-90 Days',
  '91-120 Days',
  '121+ Days',
];

const EMPTY_CLAIM_FORM: ClaimFormData = {
  patient_name: '',
  patient_id: '',
  date_of_service: '',
  insurance_company: '',
  pri_sec: 'Primary',
  claim_amount: 0,
  collected: 0,
  outstanding: 0,
  status: 'Pending Review',
  aging_status: '0-30 Days',
  assigned_to: '',
  procedure_types: '',
  rep_name: '',
  reference_number: '',
  notes: '',
};

// =====================================================
// TYPES
// =====================================================

interface InsuranceARReportProps {
  isDayMode: boolean;
}

type ClaimFormData = {
  patient_name: string;
  patient_id: string;
  date_of_service: string;
  insurance_company: string;
  pri_sec: 'Primary' | 'Secondary';
  claim_amount: number;
  collected: number;
  outstanding: number;
  status: UnifiedClaimStatus;
  aging_status: AgingStatus;
  assigned_to: string;
  procedure_types: string;
  rep_name: string;
  reference_number: string;
  notes: string;
};

type SortField = keyof Claim;
type SortDirection = 'asc' | 'desc';
type ViewTab = 'active' | 'closed';

const CLOSED_STATUSES: UnifiedClaimStatus[] = ['Closed/Paid', 'Closed/Unpaid'];

function isClosedClaim(claim: Claim): boolean {
  return CLOSED_STATUSES.includes(claim.status);
}

// =====================================================
// STYLE HELPERS
// =====================================================

function getStatusColor(status: UnifiedClaimStatus): string {
  switch (status) {
    case 'Pending Review':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Resubmitted - 1st':
    case 'Resubmitted - 2nd':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Closed/Paid':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Closed/Unpaid':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Denied':
      return 'bg-red-200 text-red-900 border-red-400';
    case 'Paid/Check or EFT Pending':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'Waiting for Info':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Lori Review':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'SEE NOTES':
      return 'bg-gray-200 text-gray-800 border-gray-400';
    case 'Appeal Filed':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'Final Review':
    case 'Consultant Review':
      return 'bg-slate-100 text-slate-800 border-slate-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function getAgingColor(aging: AgingStatus): string {
  switch (aging) {
    case '0-30 Days':
      return 'bg-green-100 text-green-800 border-green-300';
    case '31-60 Days':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case '61-90 Days':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case '91-120 Days':
      return 'bg-red-100 text-red-800 border-red-300';
    case '121+ Days':
      return 'bg-red-200 text-red-900 border-red-400';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function getAgingDotColor(aging: string): string {
  switch (aging) {
    case '0-30':
      return 'bg-green-500';
    case '31-60':
      return 'bg-yellow-500';
    case '61-90':
      return 'bg-orange-500';
    case '91-120':
      return 'bg-red-500';
    case '121+':
      return 'bg-red-800';
    default:
      return 'bg-gray-500';
  }
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// =====================================================
// COMPONENT
// =====================================================

export default function InsuranceARReport({ isDayMode }: InsuranceARReportProps) {
  // State
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active / Closed tab
  const [viewTab, setViewTab] = useState<ViewTab>('active');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnifiedClaimStatus | 'All'>('All');
  const [agingFilter, setAgingFilter] = useState<AgingStatus | 'All'>('All');
  const [insuranceFilter, setInsuranceFilter] = useState<string>('All');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date_of_service');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [formData, setFormData] = useState<ClaimFormData>({ ...EMPTY_CLAIM_FORM });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null);

  // Notes & Audit drawer
  const [drawerClaimId, setDrawerClaimId] = useState<string | null>(null);

  // Clear all data
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClearAllClaims = async () => {
    setClearing(true);
    try {
      const { error: delError } = await supabase.from('claims').delete().gte('created_at', '1970-01-01');
      if (delError) throw delError;
      setClaims([]);
      setShowClearConfirm(false);
      setError(null);
    } catch (err) {
      console.error('Error clearing claims:', err);
      setError('Failed to clear claims. Please try again.');
      setShowClearConfirm(false);
    } finally {
      setClearing(false);
    }
  };

  // =====================================================
  // DATA LOADING
  // =====================================================

  const loadClaims = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClaims();
      setClaims(data);
    } catch (err) {
      console.error('Error loading insurance A/R claims:', err);
      setError('Failed to load claims. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // =====================================================
  // DERIVED VALUES
  // =====================================================

  // Split claims by tab
  const activeClaims = useMemo(() => claims.filter((c) => !isClosedClaim(c)), [claims]);
  const closedClaims = useMemo(() => claims.filter((c) => isClosedClaim(c)), [claims]);
  const tabClaims = viewTab === 'active' ? activeClaims : closedClaims;

  const summary: InsuranceARSummary | null = useMemo(() => {
    if (tabClaims.length === 0) return null;
    return calculateInsuranceARSummaryFromClaims(tabClaims);
  }, [tabClaims]);

  const uniqueInsuranceCompanies = useMemo(() => {
    const companies = new Set(tabClaims.map((c) => c.insurance_company));
    return Array.from(companies).sort();
  }, [tabClaims]);

  const uniqueAssignees = useMemo(() => {
    const assignees = new Set(tabClaims.map((c) => c.assigned_to));
    return Array.from(assignees).sort();
  }, [tabClaims]);

  const filteredAndSortedClaims = useMemo(() => {
    let result = [...tabClaims];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.patient_name.toLowerCase().includes(q) ||
          (c.reference_number && c.reference_number.toLowerCase().includes(q)) ||
          c.insurance_company.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Aging filter
    if (agingFilter !== 'All') {
      result = result.filter((c) => c.aging_status === agingFilter);
    }

    // Insurance company filter
    if (insuranceFilter !== 'All') {
      result = result.filter((c) => c.insurance_company === insuranceFilter);
    }

    // Assigned to filter
    if (assignedToFilter !== 'All') {
      result = result.filter((c) => c.assigned_to === assignedToFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [claims, viewTab, searchQuery, statusFilter, agingFilter, insuranceFilter, assignedToFilter, sortField, sortDirection]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'All') count++;
    if (agingFilter !== 'All') count++;
    if (insuranceFilter !== 'All') count++;
    if (assignedToFilter !== 'All') count++;
    return count;
  }, [statusFilter, agingFilter, insuranceFilter, assignedToFilter]);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setStatusFilter('All');
    setAgingFilter('All');
    setInsuranceFilter('All');
    setAssignedToFilter('All');
    setSearchQuery('');
  };

  const openAddModal = () => {
    setFormData({ ...EMPTY_CLAIM_FORM });
    setEditingClaim(null);
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (claim: Claim) => {
    setEditingClaim(claim);
    setFormError(null);
    setFormData({
      patient_name: claim.patient_name,
      patient_id: claim.patient_id || '',
      date_of_service: claim.date_of_service,
      insurance_company: claim.insurance_company,
      pri_sec: claim.pri_sec || 'Primary',
      claim_amount: claim.claim_amount,
      collected: claim.collected,
      outstanding: claim.outstanding,
      status: claim.status,
      aging_status: (claim.aging_status as AgingStatus) || '0-30 Days',
      assigned_to: claim.assigned_to || '',
      procedure_types: claim.procedure_types || '',
      rep_name: claim.rep_name || '',
      reference_number: claim.reference_number || '',
      notes: claim.notes || '',
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingClaim(null);
    setFormData({ ...EMPTY_CLAIM_FORM });
  };

  const handleFormChange = (
    field: keyof ClaimFormData,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-calculate outstanding when claim_amount or collected changes
      if (field === 'claim_amount' || field === 'collected') {
        const total = field === 'claim_amount' ? Number(value) : prev.claim_amount;
        const collected = field === 'collected' ? Number(value) : prev.collected;
        updated.outstanding = Math.max(0, total - collected);
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!formData.patient_name.trim() || !formData.date_of_service || !formData.insurance_company.trim()) {
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);
      const payload = {
        patient_name: sanitizePatientName(formData.patient_name.trim()),
        patient_id: formData.patient_id.trim() || '',
        date_of_service: formData.date_of_service,
        insurance_company: formData.insurance_company.trim(),
        pri_sec: formData.pri_sec as 'Primary' | 'Secondary',
        claim_amount: Number(formData.claim_amount),
        collected: Number(formData.collected),
        outstanding: Number(formData.outstanding),
        status: formData.status as UnifiedClaimStatus,
        aging_status: formData.aging_status as AgingStatus,
        assigned_to: formData.assigned_to.trim() || null,
        procedure_types: formData.procedure_types.trim() || null,
        rep_name: formData.rep_name.trim() || null,
        reference_number: formData.reference_number.trim() || null,
        notes: formData.notes.trim() || null,
        // Required Claim fields with defaults
        procedure_code: formData.procedure_types.trim() || '',
        claim_detail: '',
        claim_number: null,
        date_submitted: formData.date_of_service,
        follow_up_date: formData.date_of_service,
        created_by: '',
        completed_by: formData.assigned_to.trim() || '',
        aging_days: 0,
        archived: false,
        archived_at: null,
        archived_by: null,
        carrier_phone: null,
        date_sent_orig: null,
        structured_notes: [] as NoteEntry[],
        audit_trail: [] as AuditTrailEntry[],
      };

      if (editingClaim) {
        // Build audit entries for changed fields
        const auditEntries: AuditTrailEntry[] = [];
        const changedBy = formData.assigned_to.trim() || 'staff';
        if (editingClaim.status !== payload.status) {
          auditEntries.push(createAuditEntry('status_changed', changedBy, {
            field: 'status', oldValue: editingClaim.status, newValue: payload.status,
          }));
        }
        if (editingClaim.notes !== payload.notes) {
          auditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'notes', oldValue: editingClaim.notes, newValue: payload.notes,
          }));
        }
        if (editingClaim.claim_amount !== payload.claim_amount) {
          auditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'claim_amount', oldValue: String(editingClaim.claim_amount), newValue: String(payload.claim_amount),
          }));
        }
        if (editingClaim.collected !== payload.collected) {
          auditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'collected', oldValue: String(editingClaim.collected), newValue: String(payload.collected),
          }));
        }
        if (editingClaim.assigned_to !== payload.assigned_to) {
          auditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'assigned_to', oldValue: editingClaim.assigned_to, newValue: payload.assigned_to,
          }));
        }
        if (auditEntries.length > 0) {
          payload.audit_trail = [...(editingClaim.audit_trail || []), ...auditEntries];
        } else {
          payload.audit_trail = editingClaim.audit_trail || [];
        }
        payload.structured_notes = editingClaim.structured_notes || [];
        await updateClaim(editingClaim.id, payload);
      } else {
        payload.audit_trail = [createAuditEntry('created', formData.assigned_to.trim() || 'staff', { notes: 'Claim created' })];
        await insertClaim(payload);
      }

      const wasEditing = !!editingClaim;
      closeModal();
      await loadClaims();
      if (!wasEditing) {
        setToastMessage('Insurance A/R claim added successfully');
      }
    } catch (err) {
      console.error('Error saving claim:', err);
      setFormError('Failed to save claim. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClaim(id);
      setDeletingClaimId(null);
      await loadClaims();
    } catch (err) {
      console.error('Error deleting claim:', err);
      setError('Failed to delete claim. Please try again.');
    }
  };

  const handleResolveClaim = async (claim: Claim, resolution: 'Closed/Paid' | 'Closed/Unpaid') => {
    try {
      const changedBy = claim.assigned_to || 'staff';
      const auditEntry = createAuditEntry('status_changed', changedBy, {
        field: 'status',
        oldValue: claim.status,
        newValue: resolution,
      });
      await updateClaim(claim.id, {
        status: resolution,
        audit_trail: [...(claim.audit_trail || []), auditEntry],
      });
      await loadClaims();
      setToastMessage(`Claim marked as ${resolution}`);
    } catch (err) {
      console.error('Error resolving claim:', err);
      setError('Failed to resolve claim. Please try again.');
    }
  };

  const handleReopenClaim = async (claim: Claim) => {
    try {
      const changedBy = claim.assigned_to || 'staff';
      const auditEntry = createAuditEntry('status_changed', changedBy, {
        field: 'status',
        oldValue: claim.status,
        newValue: 'Pending Review',
      });
      await updateClaim(claim.id, {
        status: 'Pending Review' as UnifiedClaimStatus,
        audit_trail: [...(claim.audit_trail || []), auditEntry],
      });
      await loadClaims();
      setToastMessage('Claim reopened — moved back to Active');
    } catch (err) {
      console.error('Error reopening claim:', err);
      setError('Failed to reopen claim. Please try again.');
    }
  };

  // =====================================================
  // NOTES & AUDIT DRAWER
  // =====================================================

  const drawerClaim = useMemo(
    () => claims.find((c) => c.id === drawerClaimId) || null,
    [claims, drawerClaimId],
  );

  const handleDrawerAddNote = async (note: NoteEntry) => {
    if (!drawerClaimId) return;
    const claim = claims.find((c) => c.id === drawerClaimId);
    if (!claim) return;

    const updatedNotes = [...(claim.structured_notes || []), note];
    const auditEntry = createAuditEntry('note_added', note.author || 'staff', {
      notes: `Note added by ${note.author || 'staff'} (${note.source})`,
    });
    const updatedTrail = [...(claim.audit_trail || []), auditEntry];

    try {
      await updateClaim(drawerClaimId, {
        structured_notes: updatedNotes,
        audit_trail: updatedTrail,
      });
      await loadClaims();
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note.');
    }
  };

  // =====================================================
  // STYLE CLASSES
  // =====================================================

  const bgPrimary = isDayMode ? 'bg-white' : 'bg-gray-900';
  const bgSecondary = isDayMode ? 'bg-gray-50' : 'bg-gray-800';
  const bgTertiary = isDayMode ? 'bg-gray-100' : 'bg-gray-700';
  const textPrimary = isDayMode ? 'text-gray-900' : 'text-white';
  const textSecondary = isDayMode ? 'text-gray-600' : 'text-gray-300';
  const textMuted = isDayMode ? 'text-gray-500' : 'text-gray-400';
  const borderColor = isDayMode ? 'border-gray-200' : 'border-gray-700';
  const inputBg = isDayMode ? 'bg-white' : 'bg-gray-800';
  const inputBorder = isDayMode ? 'border-gray-300' : 'border-gray-600';
  const inputText = isDayMode ? 'text-gray-900' : 'text-white';
  const hoverRow = isDayMode ? 'hover:bg-gray-50' : 'hover:bg-gray-800';
  const cardShadow = isDayMode ? 'shadow-sm' : 'shadow-lg shadow-black/20';

  // =====================================================
  // RENDER: LOADING
  // =====================================================

  if (loading) {
    return (
      <div className={`${bgPrimary} rounded-lg ${cardShadow} p-8`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className={textSecondary}>Loading Insurance A/R Report...</p>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: ERROR
  // =====================================================

  if (error && claims.length === 0) {
    return (
      <div className={`${bgPrimary} rounded-lg ${cardShadow} p-8`}>
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadClaims}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className={`rounded-lg p-4 flex items-center justify-between ${isDayMode ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-800'}`}>
          <p className={`text-sm ${isDayMode ? 'text-red-700' : 'text-red-300'}`}>{error}</p>
          <button onClick={() => setError(null)} className={`${isDayMode ? 'text-red-500 hover:text-red-700' : 'text-red-400 hover:text-red-300'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================
          SUMMARY DASHBOARD
          ===================================================== */}
      {summary && (
        <div className="space-y-4">
          {/* Top-level KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Claims */}
            <div className={`${bgPrimary} rounded-lg ${cardShadow} p-5 border ${borderColor}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${textMuted}`}>Total Claims</p>
                  <p className={`text-2xl font-bold ${textPrimary}`}>
                    {summary.totalClaims.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Claim Value */}
            <div className={`${bgPrimary} rounded-lg ${cardShadow} p-5 border ${borderColor}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${textMuted}`}>Total Claim Value</p>
                  <p className={`text-2xl font-bold ${textPrimary}`}>
                    {formatCurrency(summary.totalClaimValue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Collected */}
            <div className={`${bgPrimary} rounded-lg ${cardShadow} p-5 border ${borderColor}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${textMuted}`}>Total Collected</p>
                  <p className={`text-2xl font-bold ${textPrimary}`}>
                    {formatCurrency(summary.totalCollected)}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Outstanding */}
            <div className={`${bgPrimary} rounded-lg ${cardShadow} p-5 border ${borderColor}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${textMuted}`}>Total Outstanding</p>
                  <p className={`text-sm font-semibold ${textMuted} mt-1`}>
                    Calculated on the 1st &amp; 15th
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary breakdown row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Status Breakdown */}
            <div className={`${bgPrimary} rounded-lg ${cardShadow} p-5 border ${borderColor}`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <FileText className="w-4 h-4" />
                Status Breakdown
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Pending Review', value: summary.statusBreakdown.pendingReview, color: 'bg-amber-500' },
                  { label: 'Resubmitted', value: summary.statusBreakdown.resubmitted, color: 'bg-blue-500' },
                  { label: 'Final Review', value: summary.statusBreakdown.finalReview, color: 'bg-slate-500' },
                  { label: 'Consultant Review', value: summary.statusBreakdown.consultantReview, color: 'bg-slate-400' },
                  { label: 'Closed/Paid', value: summary.statusBreakdown.closedPaid, color: 'bg-green-500' },
                  { label: 'Closed/Unpaid', value: summary.statusBreakdown.closedUnpaid, color: 'bg-red-500' },
                  { label: 'Appeal Filed', value: summary.statusBreakdown.appealFiled, color: 'bg-indigo-500' },
                  { label: 'Denied', value: summary.statusBreakdown.denied, color: 'bg-red-700' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className={textSecondary}>{item.label}</span>
                    </div>
                    <span className={`font-medium ${textPrimary}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aging Breakdown */}
            <div className={`${bgPrimary} rounded-lg ${cardShadow} p-5 border ${borderColor}`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <Clock className="w-4 h-4" />
                Aging Breakdown
              </h3>
              <div className="space-y-3">
                {(Object.entries(summary.agingBreakdown) as [string, { count: number; outstanding: number }][]).map(
                  ([bucket, data]) => (
                    <div key={bucket}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${getAgingDotColor(bucket)}`} />
                          <span className={textSecondary}>{bucket} Days</span>
                        </div>
                        <span className={`font-medium ${textPrimary}`}>{data.count} claims</span>
                      </div>
                      <div className="flex items-center justify-between text-xs ml-5">
                        <span className={textMuted}>Outstanding</span>
                        <span className={`${textMuted} italic`}>Calculated on the 1st &amp; 15th</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Team Workload */}
            <div className={`${bgPrimary} rounded-lg ${cardShadow} p-5 border ${borderColor}`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <Users className="w-4 h-4" />
                Team Workload
              </h3>
              {Object.keys(summary.teamWorkload).length === 0 ? (
                <p className={`text-sm ${textMuted}`}>No team data available.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(summary.teamWorkload)
                    .sort((a, b) => b[1].outstanding - a[1].outstanding)
                    .map(([member, data]) => (
                      <div key={member}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className={`font-medium ${textPrimary}`}>{member}</span>
                          <span className={textSecondary}>{data.count} claims</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={textMuted}>Outstanding</span>
                          <span className={`${textMuted} italic`}>Calculated on the 1st &amp; 15th</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ACTIVE / CLOSED TABS
          ===================================================== */}
      <div className={`flex gap-1 p-1 rounded-lg ${bgSecondary} border ${borderColor} w-fit`}>
        <button
          onClick={() => { setViewTab('active'); clearFilters(); }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewTab === 'active'
              ? 'bg-blue-600 text-white shadow-sm'
              : `${textSecondary} hover:${textPrimary} hover:${bgTertiary}`
          }`}
        >
          <Clock className="w-4 h-4" />
          Active Claims
          <span className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs font-bold rounded-full ${
            viewTab === 'active'
              ? 'bg-white/20 text-white'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {activeClaims.length}
          </span>
        </button>
        <button
          onClick={() => { setViewTab('closed'); clearFilters(); }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewTab === 'closed'
              ? 'bg-green-600 text-white shadow-sm'
              : `${textSecondary} hover:${textPrimary} hover:${bgTertiary}`
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Closed / Resolved
          <span className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs font-bold rounded-full ${
            viewTab === 'closed'
              ? 'bg-white/20 text-white'
              : 'bg-green-100 text-green-700'
          }`}>
            {closedClaims.length}
          </span>
        </button>
      </div>

      {/* =====================================================
          TOOLBAR: SEARCH, FILTERS, ADD CLAIM
          ===================================================== */}
      <div className={`${bgPrimary} rounded-lg ${cardShadow} border ${borderColor}`}>
        <div className="p-4 space-y-4">
          {/* Top row: search + actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
              <input
                type="text"
                placeholder="Search by patient name, reference #, insurance..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:${textMuted}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:${textSecondary}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : `${bgSecondary} ${inputBorder} ${textSecondary} hover:${textPrimary}`
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Claim
              </button>

              <button
                onClick={() => setShowClearConfirm(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
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
            <div className={`p-4 rounded-lg border ${isDayMode ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-800'}`}>
              <p className={`text-sm font-semibold mb-3 ${isDayMode ? 'text-red-800' : 'text-red-300'}`}>
                Are you sure you want to delete ALL claims? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={handleClearAllClaims} disabled={clearing}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                  {clearing ? 'Clearing...' : 'Yes, Delete All Claims'}
                </button>
                <button onClick={() => setShowClearConfirm(false)} disabled={clearing}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    isDayMode ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Filter dropdowns */}
          {showFilters && (
            <div className={`p-4 rounded-lg ${bgSecondary} border ${borderColor} space-y-3`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Status filter */}
                <div>
                  <label className={`block text-xs font-medium ${textMuted} mb-1`}>Claim Status</label>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as UnifiedClaimStatus | 'All')}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="All">All Statuses</option>
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                  </div>
                </div>

                {/* Aging filter */}
                <div>
                  <label className={`block text-xs font-medium ${textMuted} mb-1`}>Aging Status</label>
                  <div className="relative">
                    <select
                      value={agingFilter}
                      onChange={(e) => setAgingFilter(e.target.value as AgingStatus | 'All')}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="All">All Aging</option>
                      {ALL_AGING_STATUSES.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                  </div>
                </div>

                {/* Insurance company filter */}
                <div>
                  <label className={`block text-xs font-medium ${textMuted} mb-1`}>Insurance Company</label>
                  <div className="relative">
                    <select
                      value={insuranceFilter}
                      onChange={(e) => setInsuranceFilter(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="All">All Insurance Companies</option>
                      {uniqueInsuranceCompanies.map((co) => (
                        <option key={co} value={co}>{co}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                  </div>
                </div>

                {/* Assigned to filter */}
                <div>
                  <label className={`block text-xs font-medium ${textMuted} mb-1`}>Assigned To</label>
                  <div className="relative">
                    <select
                      value={assignedToFilter}
                      onChange={(e) => setAssignedToFilter(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="All">All Team Members</option>
                      {uniqueAssignees.map((a) => (
                        <option key={String(a)} value={String(a)}>{a}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                  </div>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results count + aging key */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className={`text-sm ${textMuted}`}>
              Showing {filteredAndSortedClaims.length} of {tabClaims.length} {viewTab === 'active' ? 'active' : 'closed'} claims
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className={`font-medium ${textMuted}`}>Aging Key:</span>
              {[
                { label: '0-30', color: 'bg-green-500' },
                { label: '31-60', color: 'bg-yellow-500' },
                { label: '61-90', color: 'bg-orange-500' },
                { label: '91-120', color: 'bg-red-500' },
                { label: '121+', color: 'bg-red-800' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className={textMuted}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================
            CLAIMS TABLE
            ===================================================== */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`${bgSecondary} border-t border-b ${borderColor}`}>
                {[
                  { field: 'patient_name' as SortField, label: 'Patient Name' },
                  { field: 'date_of_service' as SortField, label: 'DOS' },
                  { field: 'insurance_company' as SortField, label: 'Insurance Co' },
                  { field: 'pri_sec' as SortField, label: 'Pri/Sec' },
                  { field: 'claim_amount' as SortField, label: 'Total Claim' },
                  { field: 'collected' as SortField, label: 'Collected' },
                  { field: 'outstanding' as SortField, label: 'Outstanding' },
                  { field: 'status' as SortField, label: 'Status' },
                  { field: 'aging_status' as SortField, label: 'Aging' },
                  { field: 'assigned_to' as SortField, label: 'Assigned To' },
                  { field: 'procedure_types' as SortField, label: 'Procedures' },
                  { field: 'rep_name' as SortField, label: 'Rep Name' },
                  { field: 'reference_number' as SortField, label: 'Ref #' },
                  { field: 'notes' as SortField, label: 'Notes / Audit' },
                ].map((col) => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${textMuted} cursor-pointer select-none whitespace-nowrap hover:${textPrimary} transition-colors`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortField === col.field && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            sortDirection === 'asc' ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </div>
                  </th>
                ))}
                <th className={`px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider ${textMuted} whitespace-nowrap`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderColor}`}>
              {filteredAndSortedClaims.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center">
                    <p className={`${textMuted} text-base`}>No claims found.</p>
                    <p className={`${textMuted} text-sm mt-1`}>
                      {activeFilterCount > 0 || searchQuery
                        ? 'Try adjusting your filters or search query.'
                        : 'Click "Add Claim" to create your first claim.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedClaims.map((claim) => (
                  <tr key={claim.id} className={`${hoverRow} transition-colors`}>
                    <td className={`px-3 py-3 whitespace-nowrap font-medium ${textPrimary}`}>
                      {claim.patient_name}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`}>
                      {formatDate(claim.date_of_service)}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`}>
                      {claim.insurance_company}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`}>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        claim.pri_sec === 'Primary'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {claim.pri_sec}
                      </span>
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-right font-medium ${textPrimary}`}>
                      {formatCurrency(claim.claim_amount)}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-right ${textSecondary}`}>
                      {formatCurrency(claim.collected)}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-right ${textMuted} italic text-xs`}>
                      1st &amp; 15th
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {claim.aging_status && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getAgingColor(claim.aging_status)}`}>
                          {claim.aging_status}
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`}>
                      {claim.assigned_to || '-'}
                    </td>
                    <td className={`px-3 py-3 max-w-[160px] truncate ${textSecondary}`} title={claim.procedure_types || ''}>
                      {claim.procedure_types || '-'}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`}>
                      {claim.rep_name || '-'}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textMuted} text-xs font-mono`}>
                      {claim.reference_number || '-'}
                    </td>
                    <td className={`px-3 py-3 ${textMuted} text-xs`}>
                      <div className="flex items-center gap-1.5">
                        {claim.notes && (
                          <span className="truncate max-w-[120px]" title={claim.notes}>
                            {claim.notes}
                          </span>
                        )}
                        <button
                          onClick={() => setDrawerClaimId(claim.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                            isDayMode
                              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                              : 'text-blue-300 bg-blue-900/30 hover:bg-blue-900/50'
                          }`}
                          title="View notes & audit trail"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {(claim.structured_notes || []).length > 0 && (
                            <span>{(claim.structured_notes || []).length}</span>
                          )}
                          <History className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Resolve / Reopen toggle */}
                        {viewTab === 'active' ? (
                          <div className="relative group">
                            <button
                              className={`p-1.5 rounded-md transition-colors ${isDayMode ? 'hover:bg-green-50' : 'hover:bg-green-900/30'}`}
                              title="Mark as resolved"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                            {/* Dropdown for Closed/Paid vs Closed/Unpaid */}
                            <div className={`absolute right-0 top-full mt-1 z-20 hidden group-hover:flex flex-col ${bgPrimary} border ${borderColor} rounded-lg shadow-lg overflow-hidden min-w-[150px]`}>
                              <button
                                onClick={() => handleResolveClaim(claim, 'Closed/Paid')}
                                className={`px-3 py-2 text-xs text-left font-medium transition-colors ${isDayMode ? 'hover:bg-green-50 text-green-700' : 'hover:bg-green-900/30 text-green-400'}`}
                              >
                                Closed / Paid
                              </button>
                              <button
                                onClick={() => handleResolveClaim(claim, 'Closed/Unpaid')}
                                className={`px-3 py-2 text-xs text-left font-medium transition-colors ${isDayMode ? 'hover:bg-red-50 text-red-700' : 'hover:bg-red-900/30 text-red-400'}`}
                              >
                                Closed / Unpaid
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleReopenClaim(claim)}
                            className={`p-1.5 rounded-md transition-colors ${isDayMode ? 'hover:bg-amber-50' : 'hover:bg-amber-900/30'}`}
                            title="Reopen claim (move to Active)"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-600" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(claim)}
                          className={`p-1.5 rounded-md ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'} transition-colors`}
                          title="Edit claim"
                        >
                          <Edit2 className={`w-4 h-4 ${textMuted}`} />
                        </button>
                        {deletingClaimId === claim.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(claim.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingClaimId(null)}
                              className={`px-2 py-1 text-xs ${bgTertiary} ${textSecondary} rounded transition-colors`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingClaimId(claim.id)}
                            className={`p-1.5 rounded-md ${isDayMode ? 'hover:bg-red-50' : 'hover:bg-red-900/30'} transition-colors`}
                            title="Delete claim"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          ADD / EDIT CLAIM MODAL
          ===================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />

          {/* Modal */}
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl ${bgPrimary} ${cardShadow} border ${borderColor}`}>
            {/* Header */}
            <div className={`sticky top-0 ${bgPrimary} border-b ${borderColor} px-6 py-4 flex items-center justify-between z-10`}>
              <h2 className={`text-lg font-semibold ${textPrimary}`}>
                {editingClaim ? 'Edit Claim' : 'Add New Claim'}
              </h2>
              <button
                onClick={closeModal}
                className={`p-1.5 rounded-md ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'} transition-colors`}
              >
                <X className={`w-5 h-5 ${textMuted}`} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4">
              {/* Patient info row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => handleFormChange('patient_name', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="e.g. Smith, John"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Patient ID</label>
                  <input
                    type="text"
                    value={formData.patient_id}
                    onChange={(e) => handleFormChange('patient_id', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Service + insurance row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>
                    Date of Service <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_service}
                    onChange={(e) => handleFormChange('date_of_service', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>
                    Insurance Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_company}
                    onChange={(e) => handleFormChange('insurance_company', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="e.g. Aetna"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Pri/Sec</label>
                  <div className="relative">
                    <select
                      value={formData.pri_sec}
                      onChange={(e) => handleFormChange('pri_sec', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="Primary">Primary</option>
                      <option value="Secondary">Secondary</option>
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                  </div>
                </div>
              </div>

              {/* Financial row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Total Claim ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.claim_amount}
                    onChange={(e) => handleFormChange('claim_amount', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Collected ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.collected}
                    onChange={(e) => handleFormChange('collected', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Outstanding ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.outstanding}
                    readOnly
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${isDayMode ? 'bg-gray-100' : 'bg-gray-700'} ${inputText} text-sm cursor-not-allowed`}
                  />
                </div>
              </div>

              {/* Status row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Claim Status</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Aging Status</label>
                  <div className="relative">
                    <select
                      value={formData.aging_status}
                      onChange={(e) => handleFormChange('aging_status', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      {ALL_AGING_STATUSES.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                  </div>
                </div>
              </div>

              {/* Assignment row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Assigned To</label>
                  <input
                    type="text"
                    value={formData.assigned_to}
                    onChange={(e) => handleFormChange('assigned_to', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="e.g. BH, LP"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Rep Name</label>
                  <input
                    type="text"
                    value={formData.rep_name}
                    onChange={(e) => handleFormChange('rep_name', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Reference #</label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => handleFormChange('reference_number', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Procedure types */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Procedure Types</label>
                <input
                  type="text"
                  value={formData.procedure_types}
                  onChange={(e) => handleFormChange('procedure_types', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g. Prophy: Adult, Perio: SRP, Veneers"
                />
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className={`sticky bottom-0 ${bgPrimary} border-t ${borderColor} px-6 py-4 space-y-3`}>
              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}
              <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className={`px-4 py-2 rounded-lg border ${inputBorder} ${textSecondary} text-sm font-medium hover:${bgTertiary} transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={formSubmitting || !formData.patient_name.trim() || !formData.date_of_service || !formData.insurance_company.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formSubmitting
                  ? 'Saving...'
                  : editingClaim
                    ? 'Update Claim'
                    : 'Add Claim'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes & Audit Trail Drawer */}
      <NotesAuditDrawer
        isOpen={!!drawerClaimId}
        onClose={() => setDrawerClaimId(null)}
        isDayMode={isDayMode}
        entityType="Insurance A/R Claim"
        entityLabel={drawerClaim?.patient_name || ''}
        notes={drawerClaim?.structured_notes || []}
        auditTrail={drawerClaim?.audit_trail || []}
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
