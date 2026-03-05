// src/components/InsuranceARReport.tsx
// Insurance A/R Report - mirrors "Stellar X Court Street Dental - Insurance A/R Report" spreadsheet

import { getLocalDateString } from '../utils/dateUtils';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Users,
  Clock,
  MessageSquare,
  History,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  Calendar,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import type {
  Claim,
  UnifiedClaimStatus,
  NoteEntry,
  AuditTrailEntry,
  InsuranceIssueType,
  PatientARStatus,
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
import { insertInsuranceIssue } from '../services/insuranceIssuesService';
import { insertPatientAR } from '../services/patientARService.new';
import NotesAuditDrawer, { createAuditEntry } from './NotesAuditDrawer';
import SuccessToast from './SuccessToast';
import InlineEditableField from './InlineEditableField';
import type { AuditTrailEntry } from '../types/database.types';

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
  'Waiting for CSD/Moved to IIR',
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
  follow_up_date: '',
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
  follow_up_date: string;
};

type SortField = keyof Claim;
type SortDirection = 'asc' | 'desc';
type ViewTab = 'active' | 'closed';

const CLOSED_STATUSES: UnifiedClaimStatus[] = ['Closed/Paid', 'Closed/Unpaid'];

// Statuses that should prompt transfer to Patient A/R for collections
const PATIENT_AR_TRANSFER_STATUSES: UnifiedClaimStatus[] = ['Denied', 'Closed/Unpaid'];

// Statuses that require a follow-up date (waiting on external response)
const FOLLOW_UP_REQUIRED_STATUSES: UnifiedClaimStatus[] = [
  'Resubmitted - 1st',
  'Resubmitted - 2nd',
  'Consultant Review',
  'Appeal Filed',
  'Final Review',
  'Waiting for CSD/Moved to IIR',
];

// Providers for Insurance Issues "In Charge" field
const PROVIDERS = ['DDS1', 'DDS2', 'DMD1', 'HYG2', 'HYG3', 'HYG5', 'Daniely'];

const ISSUE_TYPES: InsuranceIssueType[] = [
  'Needs Perio Chart',
  'Invalid Tooth Code for Carrier',
  'Invalid Number of Surfaces',
  'Invalid Surface Code for Carrier',
  'Tooth Code Required by Carrier',
  'Oral Cavity Code Required by Carrier',
  'Needs Narrative',
  'Need Provider Change',
  'Invalid Tooth/Surface Code',
  'Pre-Auth Required',
  'Other',
];

type TransferToIssuesForm = {
  in_charge: string;
  issue_type: InsuranceIssueType;
  in_vyne: boolean;
};

function isClosedClaim(claim: Claim): boolean {
  return CLOSED_STATUSES.includes(claim.status);
}

function isFollowUpRequired(status: UnifiedClaimStatus): boolean {
  return FOLLOW_UP_REQUIRED_STATUSES.includes(status);
}

function getTodayISO(): string {
  return getLocalDateString();
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
    case 'Waiting for CSD/Moved to IIR':
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Selected row for detail panel
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  // Transfer to Insurance Issues modal (triggered on "Waiting for CSD/Moved to IIR" status)
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferClaim, setTransferClaim] = useState<{ claim: Claim } | null>(null);
  const [transferForm, setTransferForm] = useState<TransferToIssuesForm>({
    in_charge: '',
    issue_type: 'Other',
    in_vyne: false,
  });
  const [transferring, setTransferring] = useState(false);

  // Transfer to Patient A/R modal (triggered on Denied / Closed/Unpaid)
  const [showPatientARModal, setShowPatientARModal] = useState(false);
  const [patientARClaim, setPatientARClaim] = useState<Claim | null>(null);
  const [patientARTransferring, setPatientARTransferring] = useState(false);

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

  // Silent reload — updates claims without showing the loading spinner.
  // Used after save+transfer so the transfer modals aren't unmounted by loading=true.
  const reloadClaimsSilently = useCallback(async () => {
    try {
      const data = await getClaims();
      setClaims(data);
    } catch (err) {
      console.error('Error reloading claims:', err);
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

  // Follow-up notifications: claims due today or overdue
  const followUpDueClaims = useMemo(() => {
    const today = getTodayISO();
    return activeClaims.filter((c) => {
      if (!isFollowUpRequired(c.status)) return false;
      if (!c.follow_up_date) return false;
      return c.follow_up_date <= today;
    });
  }, [activeClaims]);

  const summary: InsuranceARSummary | null = useMemo(() => {
    if (tabClaims.length === 0) return null;
    return calculateInsuranceARSummaryFromClaims(tabClaims);
  }, [tabClaims]);

  // Combined collected totals across both active and closed tabs
  const collectedTotals = useMemo(() => {
    const activeTotal = activeClaims.reduce((sum, c) => sum + (c.collected || 0), 0);
    const closedTotal = closedClaims.reduce((sum, c) => sum + (c.collected || 0), 0);
    return { activeTotal, closedTotal, combinedTotal: activeTotal + closedTotal };
  }, [activeClaims, closedClaims]);

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

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedClaims.length / rowsPerPage));
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedClaims.slice(start, start + rowsPerPage);
  }, [filteredAndSortedClaims, currentPage, rowsPerPage]);

  // Reset to page 1 when filters/search/tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, agingFilter, insuranceFilter, assignedToFilter, viewTab]);

  // Selected claim for detail panel
  const selectedClaim = useMemo(
    () => (selectedClaimId ? filteredAndSortedClaims.find((c) => c.id === selectedClaimId) || null : null),
    [filteredAndSortedClaims, selectedClaimId],
  );

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
      follow_up_date: claim.follow_up_date || '',
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

    // Validate: follow-up date required for certain statuses
    const newStatus = formData.status as UnifiedClaimStatus;
    if (isFollowUpRequired(newStatus)) {
      if (!formData.follow_up_date) {
        setFormError('A follow-up date is required when setting status to "' + newStatus + '".');
        return;
      }
      // When status is CHANGING to a follow-up-required status, enforce a future/today date
      const isStatusChanging = editingClaim && editingClaim.status !== newStatus;
      const isNewClaim = !editingClaim;
      if ((isStatusChanging || isNewClaim) && formData.follow_up_date < getTodayISO()) {
        setFormError('Follow-up date must be today or in the future for "' + newStatus + '".');
        return;
      }
    }

    // Capture previous status BEFORE any async work (avoids stale closure issues)
    const isEditMode = !!editingClaim;
    const previousStatus = editingClaim?.status;

    try {
      setFormSubmitting(true);
      setFormError(null);
      const payload: Omit<Claim, 'id' | 'created_at' | 'updated_at'> = {
        patient_name: sanitizePatientName(formData.patient_name.trim()),
        patient_id: formData.patient_id.trim() || '',
        date_of_service: formData.date_of_service,
        insurance_company: formData.insurance_company.trim(),
        pri_sec: formData.pri_sec as 'Primary' | 'Secondary',
        claim_amount: Number(formData.claim_amount),
        collected: Number(formData.collected),
        outstanding: Number(formData.outstanding),
        status: newStatus,
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
        follow_up_date: formData.follow_up_date || formData.date_of_service,
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

      // ── SAVE (edit or new) ──
      let savedClaim: Claim;

      if (isEditMode && editingClaim) {
        // Build audit entries for changed fields
        const auditEntries: AuditTrailEntry[] = [];
        const changedBy = formData.assigned_to.trim() || 'staff';
        if (editingClaim.status !== newStatus) {
          auditEntries.push(createAuditEntry('status_changed', changedBy, {
            field: 'status', oldValue: editingClaim.status, newValue: newStatus,
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
        if (editingClaim.follow_up_date !== payload.follow_up_date) {
          auditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'follow_up_date', oldValue: editingClaim.follow_up_date, newValue: payload.follow_up_date,
          }));
        }
        if (auditEntries.length > 0) {
          payload.audit_trail = [...(editingClaim.audit_trail || []), ...auditEntries];
        } else {
          payload.audit_trail = editingClaim.audit_trail || [];
        }
        payload.structured_notes = editingClaim.structured_notes || [];
        await updateClaim(editingClaim.id, payload);
        savedClaim = { ...editingClaim, ...payload, id: editingClaim.id } as Claim;
      } else {
        payload.audit_trail = [createAuditEntry('created', formData.assigned_to.trim() || 'staff', { notes: 'Claim created' })];
        const inserted = await insertClaim(payload);
        savedClaim = inserted as Claim;
      }

      // ── TRANSFER CHECKS (unified for both edit and new) ──
      // For edits: only prompt when status actually changed
      // For new claims: always prompt if the status warrants it
      const statusIsNew = isEditMode ? (previousStatus !== newStatus) : true;

      if (statusIsNew && newStatus === 'Waiting for CSD/Moved to IIR') {
        // Hide the form (don't full-reset via closeModal to avoid state interference)
        setShowAddModal(false);
        // Show the Insurance Issues transfer modal
        setTransferClaim({ claim: savedClaim });
        setTransferForm({ in_charge: '', issue_type: 'Other', in_vyne: false });
        setShowTransferModal(true);
        // Silently refresh the claims list in the background
        reloadClaimsSilently();
        return;
      }

      if (statusIsNew && PATIENT_AR_TRANSFER_STATUSES.includes(newStatus)) {
        setShowAddModal(false);
        setPatientARClaim(savedClaim);
        setShowPatientARModal(true);
        reloadClaimsSilently();
        return;
      }

      // ── Normal close (no transfer needed) ──
      closeModal();
      await loadClaims();
      if (!isEditMode) {
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

      // If Closed/Unpaid, prompt transfer to Patient A/R (set state FIRST, then reload)
      if (resolution === 'Closed/Unpaid') {
        const savedClaim = { ...claim, status: resolution } as Claim;
        setPatientARClaim(savedClaim);
        setShowPatientARModal(true);
        reloadClaimsSilently();
      } else {
        await loadClaims();
        setToastMessage(`Claim marked as ${resolution}`);
      }
    } catch (err) {
      console.error('Error resolving claim:', err);
      setError('Failed to resolve claim. Please try again.');
    }
  };

  // Transfer a "Waiting for CSD/Moved to IIR" claim to Insurance Issues
  const handleTransferToIssues = async () => {
    if (!transferClaim || !transferForm.in_charge) return;
    try {
      setTransferring(true);
      const c = transferClaim.claim;

      // Build structured notes - carry over all notes from the claim
      const transferredNotes: NoteEntry[] = [];

      // 1. Carry over existing structured notes
      if (c.structured_notes && c.structured_notes.length > 0) {
        transferredNotes.push(...c.structured_notes);
      }

      // 2. Convert plain-text notes field into a structured note
      if (c.notes && c.notes.trim()) {
        transferredNotes.push({
          text: c.notes,
          source: 'stellar',
          author: c.assigned_to || c.completed_by || 'staff',
          created_at: c.updated_at || c.created_at || new Date().toISOString(),
        });
      }

      // 3. Add a system note documenting the transfer context
      transferredNotes.push({
        text: `Transferred from Insurance A/R (Status: ${c.status}, Insurance: ${c.insurance_company}, Claim Amount: $${c.claim_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
        source: 'stellar',
        author: 'system',
        created_at: new Date().toISOString(),
      });

      await insertInsuranceIssue({
        patient_id: c.patient_id || null,
        patient_name: c.patient_name,
        date_of_service: c.date_of_service,
        procedure_codes: c.procedure_types || c.procedure_code || '',
        in_charge: transferForm.in_charge,
        issue_type: transferForm.issue_type,
        in_vyne: transferForm.in_vyne,
        status: 'Open',
        corrected_at: null,
        corrected_by: null,
        correction_note: null,
        submission_status: null,
        submitted_by: null,
        submitted_at: null,
        resolved_at: null,
        notes: c.notes || null,
        structured_notes: transferredNotes,
        audit_trail: [createAuditEntry('created', transferForm.in_charge, {
          notes: `Transferred from Insurance A/R claim for ${c.insurance_company}`,
        })],
        is_pre_auth: false,
      });
      setShowTransferModal(false);
      setTransferClaim(null);
      setEditingClaim(null);
      setFormData({ ...EMPTY_CLAIM_FORM });
      setToastMessage(`${c.patient_name} transferred to Insurance Issues with notes`);
    } catch (err) {
      console.error('Error transferring to insurance issues:', err);
      setError('Failed to create insurance issue. You can add it manually in the Insurance Issues tab.');
      setShowTransferModal(false);
      setTransferClaim(null);
      setEditingClaim(null);
      setFormData({ ...EMPTY_CLAIM_FORM });
    } finally {
      setTransferring(false);
    }
  };

  const handleSkipTransfer = () => {
    setShowTransferModal(false);
    setTransferClaim(null);
    setEditingClaim(null);
    setFormData({ ...EMPTY_CLAIM_FORM });
    setToastMessage('Claim saved. You can add to Insurance Issues later if needed.');
  };

  // Transfer a Denied / Closed/Unpaid claim to Patient A/R
  const handleTransferToPatientAR = async () => {
    if (!patientARClaim) return;
    try {
      setPatientARTransferring(true);
      const c = patientARClaim;
      const outstandingAmount = c.claim_amount - c.collected;
      await insertPatientAR({
        patient_id: c.patient_id || null,
        patient_name: c.patient_name,
        related_family: null,
        dos: c.date_of_service,
        original_balance: c.claim_amount,
        current_balance: outstandingAmount > 0 ? outstandingAmount : c.claim_amount,
        is_collectible: true,
        status: 'not_started' as PatientARStatus,
        background_notes: `Transferred from Insurance A/R — Claim status: ${c.status}. Insurance: ${c.insurance_company}. ${c.notes || ''}`.trim(),
        team_discussion_notes: null,
        action_needed: c.status === 'Denied' ? 'Claim denied by insurance — begin patient collections' : 'Claim closed unpaid — begin patient collections',
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
        audit_trail: [createAuditEntry('created', c.assigned_to || 'staff', {
          notes: `Auto-created from Insurance A/R claim (status: ${c.status})`,
        })],
        created_by: c.assigned_to || 'staff',
        updated_by: c.assigned_to || 'staff',
      });
      setShowPatientARModal(false);
      setPatientARClaim(null);
      setEditingClaim(null);
      setFormData({ ...EMPTY_CLAIM_FORM });
      setToastMessage(`Patient sent to Patient A/R for collections (${c.patient_name})`);
    } catch (err) {
      console.error('Error transferring to Patient A/R:', err);
      setError('Failed to create Patient A/R record. You can add it manually in the Patient A/R tab.');
      setShowPatientARModal(false);
      setPatientARClaim(null);
      setEditingClaim(null);
      setFormData({ ...EMPTY_CLAIM_FORM });
    } finally {
      setPatientARTransferring(false);
    }
  };

  const handleSkipPatientARTransfer = () => {
    setShowPatientARModal(false);
    setPatientARClaim(null);
    setEditingClaim(null);
    setFormData({ ...EMPTY_CLAIM_FORM });
    setToastMessage('Claim saved. You can add to Patient A/R later if needed.');
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

  // Inline save handler for claim fields
  const handleInlineClaimSave = async (claim: Claim, field: string, newValue: string | number | boolean | null, auditEntry: AuditTrailEntry) => {
    try {
      const updates: Record<string, unknown> = {
        [field]: newValue,
        audit_trail: [...(claim.audit_trail || []), auditEntry],
      };

      // Auto-calculate outstanding when collected changes
      if (field === 'collected' && typeof newValue === 'number') {
        updates.outstanding = claim.claim_amount - newValue;
      }
      if (field === 'claim_amount' && typeof newValue === 'number') {
        updates.outstanding = newValue - claim.collected;
      }

      await updateClaim(claim.id, updates);
      await fetchClaims();
    } catch (err) {
      console.error('Error updating claim field:', err);
      setError('Failed to update claim.');
    }
  };

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
          FOLLOW-UP NOTIFICATION BANNER
          ===================================================== */}
      {followUpDueClaims.length > 0 && viewTab === 'active' && (
        <div className={`rounded-lg p-4 border ${isDayMode ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-800'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${isDayMode ? 'text-amber-800' : 'text-amber-300'}`}>
                {followUpDueClaims.length} claim{followUpDueClaims.length !== 1 ? 's' : ''} due for follow-up today or overdue
              </p>
              <div className="mt-2 space-y-1">
                {followUpDueClaims.slice(0, 5).map((c) => {
                  const isOverdue = c.follow_up_date < getTodayISO();
                  return (
                    <div key={c.id} className={`flex items-center gap-2 text-xs ${isDayMode ? 'text-amber-700' : 'text-amber-400'}`}>
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="font-medium">{c.patient_name}</span>
                      <span className={`${isDayMode ? 'text-amber-500' : 'text-amber-500'}`}>-</span>
                      <span>{c.insurance_company}</span>
                      <span className={`${isDayMode ? 'text-amber-500' : 'text-amber-500'}`}>-</span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(c.status)}`}>{c.status}</span>
                      <span className={`${isDayMode ? 'text-amber-500' : 'text-amber-500'}`}>-</span>
                      <span className={isOverdue ? 'font-semibold text-red-600' : ''}>
                        {isOverdue ? `Overdue (${formatDate(c.follow_up_date)})` : `Due today`}
                      </span>
                      <button
                        onClick={() => openEditModal(c)}
                        className={`ml-auto px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          isDayMode ? 'text-amber-700 bg-amber-100 hover:bg-amber-200' : 'text-amber-300 bg-amber-900/40 hover:bg-amber-900/60'
                        }`}
                      >
                        Update
                      </button>
                    </div>
                  );
                })}
                {followUpDueClaims.length > 5 && (
                  <p className={`text-xs ${isDayMode ? 'text-amber-600' : 'text-amber-400'} mt-1`}>
                    + {followUpDueClaims.length - 5} more...
                  </p>
                )}
              </div>
            </div>
          </div>
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
                    {formatCurrency(collectedTotals.combinedTotal)}
                  </p>
                  <div className={`flex gap-3 mt-1 text-xs ${textMuted}`}>
                    <span>Active: {formatCurrency(collectedTotals.activeTotal)}</span>
                    <span>|</span>
                    <span>Closed: {formatCurrency(collectedTotals.closedTotal)}</span>
                  </div>
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
                  <p className={`text-2xl font-bold ${textPrimary}`}>
                    {formatCurrency(summary.totalOutstanding)}
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
                  { label: 'Waiting for CSD/Moved to IIR', value: summary.statusBreakdown.waitingForInfo, color: 'bg-orange-500' },
                  { label: 'Appeal Filed', value: summary.statusBreakdown.appealFiled, color: 'bg-indigo-500' },
                  { label: 'Lori Review', value: summary.statusBreakdown.loriReview, color: 'bg-purple-500' },
                  { label: 'Paid/EFT Pending', value: summary.statusBreakdown.paidPending, color: 'bg-cyan-500' },
                  { label: 'SEE NOTES', value: summary.statusBreakdown.seeNotes, color: 'bg-gray-500' },
                  { label: 'Denied', value: summary.statusBreakdown.denied, color: 'bg-red-700' },
                  { label: 'Closed/Paid', value: summary.statusBreakdown.closedPaid, color: 'bg-green-500' },
                  { label: 'Closed/Unpaid', value: summary.statusBreakdown.closedUnpaid, color: 'bg-red-500' },
                ].filter((item) => item.value > 0).map((item) => (
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
                        <span className={`font-medium ${textPrimary}`}>{formatCurrency(data.outstanding)}</span>
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
                          <span className={`font-medium ${textPrimary}`}>{formatCurrency(data.outstanding)}</span>
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
              {paginatedClaims.length === 0 ? (
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
                paginatedClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => setSelectedClaimId(selectedClaimId === claim.id ? null : claim.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedClaimId === claim.id
                        ? isDayMode
                          ? 'bg-blue-50 ring-1 ring-inset ring-blue-300'
                          : 'bg-blue-900/30 ring-1 ring-inset ring-blue-700'
                        : hoverRow
                    }`}
                  >
                    <td className={`px-3 py-3 whitespace-nowrap font-medium ${textPrimary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.patient_name}
                        fieldLabel="Patient Name"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'patient_name', v, a)}
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.date_of_service}
                        displayValue={formatDate(claim.date_of_service)}
                        fieldLabel="Date of Service"
                        fieldType="date"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'date_of_service', v, a)}
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.insurance_company}
                        fieldLabel="Insurance Company"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'insurance_company', v, a)}
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.pri_sec}
                        fieldLabel="Pri/Sec"
                        fieldType="select"
                        isDayMode={isDayMode}
                        selectOptions={[{ value: 'Primary', label: 'Primary' }, { value: 'Secondary', label: 'Secondary' }]}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'pri_sec', v, a)}
                        renderDisplay={() => (
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            claim.pri_sec === 'Primary'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {claim.pri_sec}
                          </span>
                        )}
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-right font-medium ${textPrimary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.claim_amount}
                        displayValue={formatCurrency(claim.claim_amount)}
                        fieldLabel="Total Claim"
                        fieldType="currency"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'claim_amount', v, a)}
                        min={0}
                        step="0.01"
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-right ${textSecondary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.collected}
                        displayValue={formatCurrency(claim.collected)}
                        fieldLabel="Collected"
                        fieldType="currency"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'collected', v, a)}
                        min={0}
                        step="0.01"
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-right font-medium ${textPrimary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.outstanding}
                        displayValue={formatCurrency(claim.outstanding)}
                        fieldLabel="Outstanding"
                        fieldType="currency"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'outstanding', v, a)}
                        min={0}
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.status}
                        fieldLabel="Status"
                        fieldType="select"
                        isDayMode={isDayMode}
                        selectOptions={ALL_STATUSES.map((s) => ({ value: s, label: s }))}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'status', v, a)}
                        renderDisplay={() => (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                            {claim.status}
                          </span>
                        )}
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.aging_status}
                        fieldLabel="Aging"
                        fieldType="select"
                        isDayMode={isDayMode}
                        selectOptions={ALL_AGING_STATUSES.map((s) => ({ value: s, label: s }))}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'aging_status', v, a)}
                        renderDisplay={() => claim.aging_status ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getAgingColor(claim.aging_status)}`}>
                            {claim.aging_status}
                          </span>
                        ) : <span>--</span>}
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.assigned_to}
                        fieldLabel="Assigned To"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'assigned_to', v, a)}
                      />
                    </td>
                    <td className={`px-3 py-3 max-w-[160px] ${textSecondary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.procedure_types}
                        fieldLabel="Procedures"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'procedure_types', v, a)}
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textSecondary}`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.rep_name}
                        fieldLabel="Rep Name"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'rep_name', v, a)}
                      />
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${textMuted} text-xs font-mono`} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        value={claim.reference_number}
                        fieldLabel="Reference #"
                        isDayMode={isDayMode}
                        onSave={(v, a) => handleInlineClaimSave(claim, 'reference_number', v, a)}
                      />
                    </td>
                    <td className={`px-3 py-3 ${textMuted} text-xs`}>
                      <div className="flex items-center gap-1.5">
                        <div onClick={(e) => e.stopPropagation()}>
                          <InlineEditableField
                            value={claim.notes}
                            fieldLabel="Notes"
                            fieldType="textarea"
                            isDayMode={isDayMode}
                            onSave={(v, a) => handleInlineClaimSave(claim, 'notes', v, a)}
                            placeholder="Add notes..."
                          />
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDrawerClaimId(claim.id); }}
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
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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

        {/* =====================================================
            SELECTED CLAIM DETAIL PANEL
            ===================================================== */}
        {selectedClaim && (
          <div className={`border-t ${borderColor} px-4 py-4`}>
            <div className={`rounded-lg border ${borderColor} ${bgSecondary} overflow-hidden`}>
              {/* Detail header */}
              <div className={`px-4 py-3 flex items-center justify-between ${isDayMode ? 'bg-blue-50 border-b border-blue-200' : 'bg-blue-900/20 border-b border-blue-800'}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${textPrimary}`}>{selectedClaim.patient_name}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedClaim.status)}`}>
                    {selectedClaim.status}
                  </span>
                  {selectedClaim.aging_status && (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getAgingColor(selectedClaim.aging_status)}`}>
                      {selectedClaim.aging_status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(selectedClaim)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDrawerClaimId(selectedClaim.id); }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isDayMode ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Notes & Audit
                  </button>
                  <button
                    onClick={() => setSelectedClaimId(null)}
                    className={`p-1 rounded-md ${isDayMode ? 'hover:bg-gray-200' : 'hover:bg-gray-600'} transition-colors`}
                  >
                    <X className={`w-4 h-4 ${textMuted}`} />
                  </button>
                </div>
              </div>

              {/* Detail body - horizontal scroll-friendly card grid */}
              <div className="px-4 py-3 overflow-x-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 min-w-0">
                  {[
                    { label: 'Date of Service', value: formatDate(selectedClaim.date_of_service) },
                    { label: 'Insurance Company', value: selectedClaim.insurance_company },
                    { label: 'Pri/Sec', value: selectedClaim.pri_sec || '-' },
                    { label: 'Total Claim', value: formatCurrency(selectedClaim.claim_amount) },
                    { label: 'Collected', value: formatCurrency(selectedClaim.collected) },
                    { label: 'Outstanding', value: formatCurrency(selectedClaim.outstanding) },
                    { label: 'Assigned To', value: selectedClaim.assigned_to || '-' },
                    { label: 'Rep Name', value: selectedClaim.rep_name || '-' },
                    { label: 'Reference #', value: selectedClaim.reference_number || '-' },
                    { label: 'Procedures', value: selectedClaim.procedure_types || '-' },
                    { label: 'Follow-Up Date', value: selectedClaim.follow_up_date ? formatDate(selectedClaim.follow_up_date) : '-' },
                    { label: 'Carrier Phone', value: selectedClaim.carrier_phone || '-' },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-lg p-2.5 ${bgPrimary} border ${borderColor}`}>
                      <p className={`text-[10px] font-medium uppercase tracking-wider ${textMuted} mb-0.5`}>{item.label}</p>
                      <p className={`text-sm font-medium ${textPrimary} truncate`} title={item.value}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {selectedClaim.notes && (
                  <div className={`mt-3 rounded-lg p-3 ${bgPrimary} border ${borderColor}`}>
                    <p className={`text-[10px] font-medium uppercase tracking-wider ${textMuted} mb-1`}>Notes</p>
                    <p className={`text-sm ${textSecondary} whitespace-pre-wrap`}>{selectedClaim.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            PAGINATION
            ===================================================== */}
        {filteredAndSortedClaims.length > 0 && (
          <div className={`border-t ${borderColor} px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3`}>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${textMuted}`}>
                Showing {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, filteredAndSortedClaims.length)} of {filteredAndSortedClaims.length}
              </span>
              <div className="flex items-center gap-1.5">
                <label className={`text-xs ${textMuted}`}>Rows:</label>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className={`px-2 py-1 rounded border ${inputBorder} ${inputBg} ${inputText} text-xs focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  {[10, 15, 25, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'} ${textSecondary}`}
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-1.5 rounded transition-colors disabled:opacity-40 ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
              >
                <ChevronLeft className={`w-4 h-4 ${textSecondary}`} />
              </button>
              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== page - 1) acc.push('ellipsis');
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className={`px-1.5 text-xs ${textMuted}`}>...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`min-w-[28px] h-7 rounded text-xs font-medium transition-colors ${
                        currentPage === item
                          ? 'bg-blue-600 text-white'
                          : `${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'} ${textSecondary}`
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-1.5 rounded transition-colors disabled:opacity-40 ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
              >
                <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'} ${textSecondary}`}
              >
                Last
              </button>
            </div>
          </div>
        )}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>
                    Follow-Up Date {isFollowUpRequired(formData.status as UnifiedClaimStatus) && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => handleFormChange('follow_up_date', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isFollowUpRequired(formData.status as UnifiedClaimStatus) && !formData.follow_up_date
                        ? 'border-red-400 ring-1 ring-red-400'
                        : inputBorder
                    } ${inputBg} ${inputText} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>

              {/* Status-specific inline alerts */}
              {isFollowUpRequired(formData.status as UnifiedClaimStatus) && (
                <div className={`p-3 rounded-lg flex items-start gap-2 ${isDayMode ? 'bg-amber-50 border border-amber-200' : 'bg-amber-900/20 border border-amber-800'}`}>
                  <Calendar className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`} />
                  <p className={`text-xs ${isDayMode ? 'text-amber-700' : 'text-amber-300'}`}>
                    <strong>Follow-up date required.</strong> This status means we're waiting on a response. The app will notify you when this claim is due for follow-up.
                  </p>
                </div>
              )}
              {formData.status === 'Waiting for CSD/Moved to IIR' && (!editingClaim || editingClaim.status !== 'Waiting for CSD/Moved to IIR') && (
                <div className={`p-3 rounded-lg flex items-start gap-2 ${isDayMode ? 'bg-orange-50 border border-orange-200' : 'bg-orange-900/20 border border-orange-800'}`}>
                  <ArrowRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDayMode ? 'text-orange-600' : 'text-orange-400'}`} />
                  <p className={`text-xs ${isDayMode ? 'text-orange-700' : 'text-orange-300'}`}>
                    <strong>This claim will be added to Insurance Issues.</strong> After saving, you'll be prompted to add the In Charge, Issue Type, and Vyne details so the issue appears in the Insurance Issues tracker.
                  </p>
                </div>
              )}
              {PATIENT_AR_TRANSFER_STATUSES.includes(formData.status as UnifiedClaimStatus) && (!editingClaim || !PATIENT_AR_TRANSFER_STATUSES.includes(editingClaim.status)) && (
                <div className={`p-3 rounded-lg flex items-start gap-2 ${isDayMode ? 'bg-purple-50 border border-purple-200' : 'bg-purple-900/20 border border-purple-800'}`}>
                  <UserCheck className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
                  <p className={`text-xs ${isDayMode ? 'text-purple-700' : 'text-purple-300'}`}>
                    <strong>This patient may need to go to Patient A/R.</strong> After saving, you'll be prompted to send this patient to the Patient A/R tab for collections follow-up.
                  </p>
                </div>
              )}

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

      {/* =====================================================
          TRANSFER TO INSURANCE ISSUES MODAL
          ===================================================== */}
      {showTransferModal && transferClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleSkipTransfer} />
          <div className={`relative w-full max-w-md rounded-xl ${bgPrimary} ${cardShadow} border ${borderColor}`}>
            {/* Header */}
            <div className={`border-b ${borderColor} px-6 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-orange-500" />
                <h2 className={`text-lg font-semibold ${textPrimary}`}>Transfer to Insurance Issues</h2>
              </div>
              <button onClick={handleSkipTransfer} className={`p-1.5 rounded-md ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'} transition-colors`}>
                <X className={`w-5 h-5 ${textMuted}`} />
              </button>
            </div>

            {/* Info banner */}
            <div className={`mx-6 mt-4 p-3 rounded-lg ${isDayMode ? 'bg-orange-50 border border-orange-200' : 'bg-orange-900/20 border border-orange-800'}`}>
              <p className={`text-xs ${isDayMode ? 'text-orange-700' : 'text-orange-300'}`}>
                <strong>{transferClaim.claim.patient_name}</strong> has been marked as "Waiting for CSD/Moved to IIR". Add the details below to automatically create an entry in the Insurance Issues tracker.
              </p>
            </div>

            {/* Notes preview - show what notes will carry over */}
            {((transferClaim.claim.notes && transferClaim.claim.notes.trim()) || (transferClaim.claim.structured_notes && transferClaim.claim.structured_notes.length > 0)) && (
              <div className={`mx-6 mt-3 p-3 rounded-lg border ${isDayMode ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-800'}`}>
                <p className={`text-xs font-semibold mb-2 ${isDayMode ? 'text-amber-800' : 'text-amber-300'}`}>
                  Notes that will transfer:
                </p>
                {transferClaim.claim.structured_notes && transferClaim.claim.structured_notes.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {transferClaim.claim.structured_notes.map((note: NoteEntry, idx: number) => (
                      <div key={idx} className={`text-xs ${isDayMode ? 'text-amber-700' : 'text-amber-200'}`}>
                        <span className="font-medium">[{note.source}/{note.author}]</span> {note.text}
                      </div>
                    ))}
                  </div>
                )}
                {transferClaim.claim.notes && transferClaim.claim.notes.trim() && (
                  <p className={`text-xs ${isDayMode ? 'text-amber-700' : 'text-amber-200'}`}>
                    <span className="font-medium">[Plain text]</span> {transferClaim.claim.notes}
                  </p>
                )}
              </div>
            )}

            {/* Form */}
            <div className="px-6 py-4 space-y-4">
              {/* In Charge */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>
                  In Charge <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={transferForm.in_charge}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, in_charge: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select provider...</option>
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                </div>
              </div>

              {/* Issue Type */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Issue Type</label>
                <div className="relative">
                  <select
                    value={transferForm.issue_type}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, issue_type: e.target.value as InsuranceIssueType }))}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBorder} ${inputBg} ${inputText} text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {ISSUE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} pointer-events-none`} />
                </div>
              </div>

              {/* In Vyne */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="transfer-in-vyne"
                  checked={transferForm.in_vyne}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, in_vyne: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="transfer-in-vyne" className={`text-sm ${textSecondary}`}>In Vyne</label>
              </div>
            </div>

            {/* Footer */}
            <div className={`border-t ${borderColor} px-6 py-4 flex items-center justify-between`}>
              <button
                onClick={handleSkipTransfer}
                className={`px-4 py-2 rounded-lg border ${inputBorder} ${textSecondary} text-sm font-medium hover:${bgTertiary} transition-colors`}
              >
                Skip
              </button>
              <button
                onClick={handleTransferToIssues}
                disabled={transferring || !transferForm.in_charge}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                {transferring ? 'Creating Issue...' : 'Transfer to Issues'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TRANSFER TO PATIENT A/R MODAL
          ===================================================== */}
      {showPatientARModal && patientARClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleSkipPatientARTransfer} />
          <div className={`relative w-full max-w-md rounded-xl ${bgPrimary} ${cardShadow} border ${borderColor}`}>
            {/* Header */}
            <div className={`border-b ${borderColor} px-6 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-500" />
                <h2 className={`text-lg font-semibold ${textPrimary}`}>Send to Patient A/R?</h2>
              </div>
              <button onClick={handleSkipPatientARTransfer} className={`p-1.5 rounded-md ${isDayMode ? 'hover:bg-gray-100' : 'hover:bg-gray-700'} transition-colors`}>
                <X className={`w-5 h-5 ${textMuted}`} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className={`p-3 rounded-lg ${isDayMode ? 'bg-purple-50 border border-purple-200' : 'bg-purple-900/20 border border-purple-800'}`}>
                <p className={`text-sm ${isDayMode ? 'text-purple-700' : 'text-purple-300'}`}>
                  <strong>{patientARClaim.patient_name}</strong> has been marked as <strong>"{patientARClaim.status}"</strong>.
                </p>
                <p className={`text-xs mt-1 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`}>
                  Would you like to transfer this patient to the Patient A/R tab for collections follow-up?
                </p>
              </div>

              {/* Summary of what will be transferred */}
              <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
                <div className={`px-4 py-2 ${bgSecondary}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>Transfer Details</p>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={textMuted}>Patient</span>
                    <span className={`font-medium ${textPrimary}`}>{patientARClaim.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={textMuted}>DOS</span>
                    <span className={textSecondary}>{formatDate(patientARClaim.date_of_service)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={textMuted}>Insurance</span>
                    <span className={textSecondary}>{patientARClaim.insurance_company}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={textMuted}>Claim Amount</span>
                    <span className={`font-medium ${textPrimary}`}>{formatCurrency(patientARClaim.claim_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={textMuted}>Collected</span>
                    <span className={textSecondary}>{formatCurrency(patientARClaim.collected)}</span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t ${borderColor}`}>
                    <span className={`font-medium ${textMuted}`}>Balance to Collect</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(Math.max(0, patientARClaim.claim_amount - patientARClaim.collected))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`border-t ${borderColor} px-6 py-4 flex items-center justify-between`}>
              <button
                onClick={handleSkipPatientARTransfer}
                className={`px-4 py-2 rounded-lg border ${inputBorder} ${textSecondary} text-sm font-medium hover:${bgTertiary} transition-colors`}
              >
                No, Skip
              </button>
              <button
                onClick={handleTransferToPatientAR}
                disabled={patientARTransferring}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                {patientARTransferring ? 'Transferring...' : 'Send to Patient A/R'}
              </button>
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
