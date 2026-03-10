// src/components/InsuranceIssuesTracker.tsx
// =====================================================
// Insurance Issues Tracker - mirrors "Insurance Issues Report" spreadsheet
// =====================================================

import { getLocalDateString } from '../utils/dateUtils';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  FileWarning,
  MessageSquare,
  Timer,
  Archive,
  History,
  Wrench,
  Zap,
  Send,
  Clock,
} from 'lucide-react';
import type { InsuranceIssue, InsuranceIssueType, InsuranceIssueStatus, NoteEntry, NoteSource, AuditTrailEntry } from '../types/database.types';
import {
  getInsuranceIssues,
  insertInsuranceIssue,
  updateInsuranceIssue,
  deleteInsuranceIssue,
  calculateIssuesSummary,
  RESOLUTION_TARGET_DAYS,
  SUBMITTED_FOLLOW_UP_DAYS,
} from '../services/insuranceIssuesService';
import { sanitizePatientName } from '../utils/sanitizePatientName';
import InsuranceIssuesCSVUpload from './InsuranceIssuesCSVUpload';
import NotesAuditDrawer, { createAuditEntry } from './NotesAuditDrawer';
import SuccessToast from './SuccessToast';
import DraggableEditModal from './DraggableEditModal';
import type { TabKey } from './DraggableEditModal';

// =====================================================
// CONSTANTS
// =====================================================

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

const PROVIDERS = ['DDS1', 'DDS2', 'DMD1', 'HYG2', 'HYG3', 'HYG5', 'Daniely'];

const SUBMITTER_INITIALS = ['BH', 'LP', 'VM', 'DM', 'LM', 'EY', 'MT', 'KM'];

/** Provider-to-color mapping matching the spreadsheet */
const PROVIDER_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  DDS1:    { bg: 'bg-blue-100',    text: 'text-blue-800',    darkBg: 'bg-blue-900/40',    darkText: 'text-blue-300' },
  DDS2:    { bg: 'bg-cyan-100',    text: 'text-cyan-800',    darkBg: 'bg-cyan-900/40',    darkText: 'text-cyan-300' },
  DMD1:    { bg: 'bg-green-100',   text: 'text-green-800',   darkBg: 'bg-green-900/40',   darkText: 'text-green-300' },
  HYG2:    { bg: 'bg-amber-100',   text: 'text-amber-800',   darkBg: 'bg-amber-900/40',   darkText: 'text-amber-300' },
  HYG3:    { bg: 'bg-orange-100',  text: 'text-orange-800',  darkBg: 'bg-orange-900/40',  darkText: 'text-orange-300' },
  HYG5:    { bg: 'bg-purple-100',  text: 'text-purple-800',  darkBg: 'bg-purple-900/40',  darkText: 'text-purple-300' },
  Daniely: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'bg-emerald-900/40', darkText: 'text-emerald-300' },
};

const DEFAULT_PROVIDER_COLOR = { bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'bg-gray-700', darkText: 'text-gray-300' };

type NewIssueForm = Omit<InsuranceIssue, 'id' | 'created_at' | 'updated_at'>;

const EMPTY_FORM: NewIssueForm = {
  patient_id: '',
  patient_name: '',
  date_of_service: '',
  procedure_codes: '',
  in_charge: '',
  issue_type: 'Needs Perio Chart',
  in_vyne: false,
  status: 'Open',
  corrected_at: null,
  corrected_by: null,
  correction_note: null,
  submission_status: null,
  submitted_by: null,
  submitted_at: null,
  resolved_at: null,
  notes: null,
  structured_notes: [],
  audit_trail: [],
  is_pre_auth: false,
};

// =====================================================
// HELPERS
// =====================================================

function isResolved(issue: InsuranceIssue): boolean {
  return issue.status === 'Resolved';
}

function isSubmitted(issue: InsuranceIssue): boolean {
  return issue.status === 'Submitted';
}

/** Returns true if a Submitted issue is past the 15-day follow-up window */
function isSubmittedOverdue(issue: InsuranceIssue): boolean {
  if (issue.status !== 'Submitted' || !issue.submitted_at) return false;
  const submittedDate = new Date(issue.submitted_at).getTime();
  const now = Date.now();
  const daysSinceSubmitted = (now - submittedDate) / (1000 * 60 * 60 * 24);
  return daysSinceSubmitted > SUBMITTED_FOLLOW_UP_DAYS;
}

function getProviderColor(provider: string, isDayMode: boolean) {
  // Handle combo providers like "DDS2 + HYG5"
  if (provider.includes('+')) {
    const parts = provider.split('+').map((p) => p.trim());
    const first = PROVIDER_COLORS[parts[0]] ?? DEFAULT_PROVIDER_COLOR;
    const second = PROVIDER_COLORS[parts[1]] ?? DEFAULT_PROVIDER_COLOR;
    return {
      isCombo: true,
      first: isDayMode ? first : { bg: first.darkBg, text: first.darkText },
      second: isDayMode ? second : { bg: second.darkBg, text: second.darkText },
    } as const;
  }
  const c = PROVIDER_COLORS[provider] ?? DEFAULT_PROVIDER_COLOR;
  return {
    isCombo: false,
    bg: isDayMode ? c.bg : c.darkBg,
    text: isDayMode ? c.text : c.darkText,
  } as const;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// =====================================================
// NOTES POPUP COMPONENT
// =====================================================

function NotesPopup({
  notes,
  isDayMode,
}: {
  notes: NoteEntry[];
  isDayMode: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Sort newest first
  const sorted = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notes]
  );

  if (sorted.length === 0) {
    return <span className={isDayMode ? 'text-gray-400' : 'text-gray-600'}>--</span>;
  }

  const sourceBadge = (source: NoteSource) => {
    if (source === 'office') {
      return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
          isDayMode
            ? 'bg-blue-100 text-blue-700'
            : 'bg-blue-900/40 text-blue-300'
        }`}>
          Office
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
        isDayMode
          ? 'bg-violet-100 text-violet-700'
          : 'bg-violet-900/40 text-violet-300'
      }`}>
        Stellar
      </span>
    );
  };

  return (
    <div ref={popupRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
          isOpen
            ? isDayMode
              ? 'text-blue-800 bg-blue-100 ring-2 ring-blue-300'
              : 'text-blue-200 bg-blue-800/50 ring-2 ring-blue-500'
            : isDayMode
              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
              : 'text-blue-300 bg-blue-900/30 hover:bg-blue-900/50'
        }`}
      >
        <MessageSquare className="w-3 h-3" />
        {sorted.length} note{sorted.length !== 1 ? 's' : ''}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsOpen(false)}
          style={{ animation: 'notesPopupFadeIn 0.15s ease-out' }}
        >
          <div
            className={`w-full max-w-lg mx-4 max-h-[70vh] rounded-xl shadow-2xl border flex flex-col ${
              isDayMode
                ? 'bg-white border-gray-200'
                : 'bg-gray-800 border-gray-600'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3 border-b flex-shrink-0 ${
              isDayMode ? 'border-gray-100' : 'border-gray-700'
            }`}>
              <div className="flex items-center gap-2">
                <MessageSquare className={`w-4 h-4 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
                <p className={`text-sm font-semibold ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>
                  Notes ({sorted.length})
                </p>
                <span className={`text-xs ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  newest first
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded transition-colors ${
                  isDayMode
                    ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable notes list */}
            <div className={`overflow-y-auto flex-1 p-4 space-y-3 notes-popup-scroll ${
              isDayMode ? 'notes-popup-scroll-light' : 'notes-popup-scroll-dark'
            }`}>
              {sorted.map((note, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-3.5 text-sm leading-relaxed ${
                    isDayMode
                      ? 'bg-gray-50 border border-gray-150 shadow-sm'
                      : 'bg-gray-700/60 border border-gray-600 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {sourceBadge(note.source)}
                      {note.author && (
                        <span className={`font-semibold text-xs ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>
                          {note.author}
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] whitespace-nowrap ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatTimestamp(note.created_at)}
                    </span>
                  </div>
                  <p className={`leading-snug ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>{note.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// PROPS
// =====================================================

interface InsuranceIssuesTrackerProps {
  isDayMode: boolean;
}

// =====================================================
// COMPONENT
// =====================================================

export default function InsuranceIssuesTracker({ isDayMode }: InsuranceIssuesTrackerProps) {
  // ----- State -----
  const [issues, setIssues] = useState<InsuranceIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View tabs: open (Active Issues) | submitted | resolved
  type ViewTab = 'open' | 'submitted' | 'resolved';
  const [viewTab, setViewTab] = useState<ViewTab>('open');

  // Confirmation dialog for status transitions
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIssueType, setFilterIssueType] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<NewIssueForm>({ ...EMPTY_FORM });
  const [formSaving, setFormSaving] = useState(false);

  // Add note modal
  const [noteModalIssueId, setNoteModalIssueId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteSource, setNewNoteSource] = useState<NoteSource>('stellar');
  const [newNoteAuthor, setNewNoteAuthor] = useState('');

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InsuranceIssue>>({});

  // Submission toggle popup
  const [submissionPopupIssue, setSubmissionPopupIssue] = useState<InsuranceIssue | null>(null);
  const [submissionInitials, setSubmissionInitials] = useState('');

  // CSV upload
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  // Status change popup (replaces old confirmResolveIssue)
  const [statusPopupIssue, setStatusPopupIssue] = useState<InsuranceIssue | null>(null);
  // Form state for the status change popup
  const [statusFormInitials, setStatusFormInitials] = useState('');
  const [statusFormNote, setStatusFormNote] = useState('');
  const [statusFormDate, setStatusFormDate] = useState('');
  const [statusFormSubmittedBy, setStatusFormSubmittedBy] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  // Notes & Audit drawer
  const [drawerIssueId, setDrawerIssueId] = useState<string | null>(null);

  // Draggable edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalIssue, setEditModalIssue] = useState<InsuranceIssue | null>(null);

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ----- Data loading -----
  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInsuranceIssues();
      setIssues(data);
    } catch (err) {
      console.error('Error loading insurance issues:', err);
      setError('Failed to load insurance issues. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // ----- Summary -----
  const summary = useMemo(() => calculateIssuesSummary(issues), [issues]);

  // ----- Filtering -----
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Tab filter: open | submitted | resolved (3-tab split)
      if (viewTab === 'open' && (isSubmitted(issue) || isResolved(issue))) return false;
      if (viewTab === 'submitted' && !isSubmitted(issue)) return false;
      if (viewTab === 'resolved' && !isResolved(issue)) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const notesText = (issue.structured_notes || []).map((n) => n.text).join(' ');
        const searchable = [
          issue.patient_name,
          issue.patient_id ?? '',
          issue.procedure_codes,
          issue.in_charge,
          issue.issue_type,
          issue.status ?? '',
          issue.submitted_by ?? '',
          notesText,
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      // Issue type
      if (filterIssueType !== 'all' && issue.issue_type !== filterIssueType) return false;
      // Provider
      if (filterProvider !== 'all' && issue.in_charge !== filterProvider) return false;
      return true;
    });
  }, [issues, viewTab, searchQuery, filterIssueType, filterProvider]);

  // Split into regular claims and pre-auth
  const regularIssues = useMemo(() => filteredIssues.filter((i) => !i.is_pre_auth), [filteredIssues]);
  const preAuthIssues = useMemo(() => filteredIssues.filter((i) => i.is_pre_auth), [filteredIssues]);

  // Counts for tab badges (Open tab shows Open + Corrected; Submitted tab; Resolved tab)
  const openCount = useMemo(() => issues.filter((i) => i.status === 'Open' || i.status === 'Corrected').length, [issues]);
  const correctedCount = useMemo(() => issues.filter((i) => i.status === 'Corrected').length, [issues]);
  const submittedCount = useMemo(() => issues.filter((i) => isSubmitted(i)).length, [issues]);
  const submittedOverdueCount = useMemo(() => issues.filter((i) => isSubmittedOverdue(i)).length, [issues]);
  const resolvedCount = useMemo(() => issues.filter((i) => isResolved(i)).length, [issues]);

  // ----- CRUD handlers -----
  const handleAddIssue = async () => {
    if (!formData.patient_name || !formData.date_of_service || !formData.procedure_codes) return;
    try {
      setFormSaving(true);
      const issueToInsert = {
        ...formData,
        patient_name: sanitizePatientName(formData.patient_name),
        // Sanitize empty strings to null for nullable fields
        patient_id: formData.patient_id?.trim() || null,
        submitted_by: formData.submitted_by?.trim() || null,
        notes: formData.notes?.trim() || null,
        // Auto-log submitted_at if marking as Submitted
        submitted_at: formData.submission_status === 'Submitted' ? new Date().toISOString() : null,
        // Auto-log corrected_at/resolved_at based on status
        corrected_at: (formData.status === 'Corrected' || formData.status === 'Resolved') ? new Date().toISOString() : null,
        corrected_by: null,
        correction_note: null,
        resolved_at: formData.status === 'Resolved' ? new Date().toISOString() : null,
        audit_trail: [createAuditEntry('created', formData.submitted_by || 'staff', { notes: 'Issue created' })],
      };
      const created = await insertInsuranceIssue(issueToInsert);
      setIssues((prev) => [created, ...prev]);
      setShowAddModal(false);
      setFormData({ ...EMPTY_FORM });
      setToastMessage('Insurance issue added successfully');
    } catch (err) {
      console.error('Error adding issue:', err);
    } finally {
      setFormSaving(false);
    }
  };

  const handleStartEdit = (issue: InsuranceIssue) => {
    setEditingId(issue.id);
    setEditData({
      status: issue.status,
      submission_status: issue.submission_status,
      submitted_by: issue.submitted_by,
      in_vyne: issue.in_vyne,
      in_charge: issue.in_charge,
      issue_type: issue.issue_type,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const currentIssue = issues.find((i) => i.id === id);
      const updates = { ...editData };

      // Auto-log timestamps based on status transitions
      if (updates.status === 'Corrected' && currentIssue?.status === 'Open') {
        updates.corrected_at = new Date().toISOString();
      }
      if (updates.status === 'Submitted' && currentIssue?.status !== 'Submitted' && currentIssue?.status !== 'Resolved') {
        updates.submission_status = 'Submitted';
        updates.submitted_at = new Date().toISOString();
        if (!currentIssue?.corrected_at) {
          updates.corrected_at = new Date().toISOString();
        }
      }
      if (updates.status === 'Resolved' && currentIssue?.status !== 'Resolved') {
        updates.resolved_at = new Date().toISOString();
        if (!currentIssue?.corrected_at) {
          updates.corrected_at = new Date().toISOString();
        }
        if (!currentIssue?.submitted_at) {
          updates.submission_status = 'Submitted';
          updates.submitted_at = new Date().toISOString();
        }
      }
      // Clear timestamps when going back to Open
      if (updates.status === 'Open') {
        updates.corrected_at = null;
        updates.corrected_by = null;
        updates.correction_note = null;
        updates.submission_status = null;
        updates.submitted_at = null;
        updates.submitted_by = null;
        updates.resolved_at = null;
      }
      // Auto-log submitted_at when marking as Submitted for the first time
      if (updates.submission_status === 'Submitted' && !currentIssue?.submitted_at) {
        updates.submitted_at = new Date().toISOString();
      }

      // Build audit entries for each changed field
      const newAuditEntries: AuditTrailEntry[] = [];
      if (currentIssue) {
        const changedBy = updates.submitted_by || currentIssue.submitted_by || 'staff';
        if (updates.status && updates.status !== currentIssue.status) {
          newAuditEntries.push(createAuditEntry('status_changed', changedBy, {
            field: 'status', oldValue: currentIssue.status, newValue: updates.status as string,
          }));
        }
        if (updates.in_charge && updates.in_charge !== currentIssue.in_charge) {
          newAuditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'in_charge', oldValue: currentIssue.in_charge, newValue: updates.in_charge,
          }));
        }
        if (updates.issue_type && updates.issue_type !== currentIssue.issue_type) {
          newAuditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'issue_type', oldValue: currentIssue.issue_type, newValue: updates.issue_type,
          }));
        }
        if (updates.submission_status !== undefined && updates.submission_status !== currentIssue.submission_status) {
          newAuditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'submission_status', oldValue: currentIssue.submission_status || 'Not Submitted', newValue: updates.submission_status || 'Not Submitted',
          }));
        }
        if (updates.in_vyne !== undefined && updates.in_vyne !== currentIssue.in_vyne) {
          newAuditEntries.push(createAuditEntry('updated', changedBy, {
            field: 'in_vyne', oldValue: String(currentIssue.in_vyne), newValue: String(updates.in_vyne),
          }));
        }
      }

      if (newAuditEntries.length > 0) {
        updates.audit_trail = [...(currentIssue?.audit_trail || []), ...newAuditEntries];
      }

      const updated = await updateInsuranceIssue(id, updates);
      setIssues((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setEditingId(null);
      setEditData({});
    } catch (err) {
      console.error('Error updating issue:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    try {
      await deleteInsuranceIssue(id);
      setIssues((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Error deleting issue:', err);
    }
  };

  // ----- Status click handler → opens status popup -----
  const handleStatusClick = (issue: InsuranceIssue) => {
    setStatusPopupIssue(issue);
    setStatusFormInitials(issue.corrected_by || '');
    setStatusFormNote('');
    setStatusFormDate(issue.corrected_at ? issue.corrected_at.split('T')[0] : getLocalDateString());
    setStatusFormSubmittedBy(issue.submitted_by || '');
    setStatusSaving(false);
  };

  const closeStatusPopup = () => {
    setStatusPopupIssue(null);
    setStatusFormInitials('');
    setStatusFormNote('');
    setStatusFormDate('');
    setStatusFormSubmittedBy('');
  };

  // Open → Corrected (in-charge completed their edits)
  const handleMarkCorrected = async () => {
    if (!statusPopupIssue || !statusFormInitials.trim()) return;
    setStatusSaving(true);
    try {
      const now = new Date().toISOString();
      const correctedDate = statusFormDate ? new Date(statusFormDate + 'T12:00:00').toISOString() : now;

      const newAuditEntries: AuditTrailEntry[] = [
        createAuditEntry('status_changed', statusFormInitials.trim(), {
          field: 'status', oldValue: 'Open', newValue: 'Corrected',
          notes: statusFormNote.trim() || undefined,
        }),
      ];

      // Also add note to structured_notes if provided
      const updatedNotes = [...(statusPopupIssue.structured_notes || [])];
      if (statusFormNote.trim()) {
        updatedNotes.push({
          text: statusFormNote.trim(),
          source: 'office' as NoteSource,
          author: statusFormInitials.trim(),
          created_at: now,
        });
      }

      const updates: Partial<InsuranceIssue> = {
        status: 'Corrected',
        corrected_at: correctedDate,
        corrected_by: statusFormInitials.trim(),
        correction_note: statusFormNote.trim() || null,
        structured_notes: updatedNotes,
        audit_trail: [...(statusPopupIssue.audit_trail || []), ...newAuditEntries],
      };

      const updated = await updateInsuranceIssue(statusPopupIssue.id, updates);
      setIssues((prev) => prev.map((i) => (i.id === statusPopupIssue.id ? updated : i)));
      setToastMessage(`Marked as Corrected by ${statusFormInitials.trim()}`);
      closeStatusPopup();
    } catch (err) {
      console.error('Error marking corrected:', err);
    } finally {
      setStatusSaving(false);
    }
  };

  // Corrected → Submitted (claim resubmitted, awaiting payment)
  const handleMarkSubmitted = async () => {
    if (!statusPopupIssue || !statusFormSubmittedBy.trim()) return;

    const doSubmit = async () => {
      setStatusSaving(true);
      try {
        const now = new Date().toISOString();

        const newAuditEntries: AuditTrailEntry[] = [
          createAuditEntry('status_changed', statusFormSubmittedBy.trim(), {
            field: 'status', oldValue: statusPopupIssue.status, newValue: 'Submitted',
          }),
        ];

        const updates: Partial<InsuranceIssue> = {
          status: 'Submitted',
          submission_status: 'Submitted',
          submitted_by: statusFormSubmittedBy.trim(),
          submitted_at: now,
          audit_trail: [...(statusPopupIssue.audit_trail || []), ...newAuditEntries],
        };

        // If going straight from Open → Submitted (bypass correction), set corrected fields too
        if (statusPopupIssue.status === 'Open') {
          updates.corrected_at = now;
          updates.corrected_by = statusFormSubmittedBy.trim();
        }

        const updated = await updateInsuranceIssue(statusPopupIssue.id, updates);
        setIssues((prev) => prev.map((i) => (i.id === statusPopupIssue.id ? updated : i)));
        setToastMessage(`Marked as Submitted by ${statusFormSubmittedBy.trim()}`);
        closeStatusPopup();
      } catch (err) {
        console.error('Error marking submitted:', err);
      } finally {
        setStatusSaving(false);
      }
    };

    // Show confirmation dialog
    setConfirmDialog({
      title: 'Move to Submitted',
      message: `Are you sure you want to move "${statusPopupIssue.patient_name}" from Active Issues to Submitted? This indicates the claim has been resubmitted and is now awaiting payment.`,
      onConfirm: () => {
        setConfirmDialog(null);
        doSubmit();
      },
    });
  };

  // Submitted → Resolved (payment received, fully resolved)
  const handleMarkResolved = async () => {
    if (!statusPopupIssue || !statusFormSubmittedBy.trim()) return;

    const doResolve = async () => {
      setStatusSaving(true);
      try {
        const now = new Date().toISOString();

        const newAuditEntries: AuditTrailEntry[] = [
          createAuditEntry('status_changed', statusFormSubmittedBy.trim(), {
            field: 'status', oldValue: statusPopupIssue.status, newValue: 'Resolved',
          }),
        ];

        const updates: Partial<InsuranceIssue> = {
          status: 'Resolved',
          resolved_at: now,
          audit_trail: [...(statusPopupIssue.audit_trail || []), ...newAuditEntries],
        };

        // If coming from Open/Corrected directly, fill in the gaps
        if (!statusPopupIssue.corrected_at) {
          updates.corrected_at = now;
          updates.corrected_by = statusFormSubmittedBy.trim();
        }
        if (!statusPopupIssue.submitted_at) {
          updates.submission_status = 'Submitted';
          updates.submitted_by = statusFormSubmittedBy.trim();
          updates.submitted_at = now;
        }

        const updated = await updateInsuranceIssue(statusPopupIssue.id, updates);
        setIssues((prev) => prev.map((i) => (i.id === statusPopupIssue.id ? updated : i)));
        setToastMessage(`Issue resolved by ${statusFormSubmittedBy.trim()}`);
        closeStatusPopup();
      } catch (err) {
        console.error('Error resolving issue:', err);
      } finally {
        setStatusSaving(false);
      }
    };

    // Show confirmation dialog
    setConfirmDialog({
      title: 'Mark as Resolved',
      message: `Are you sure you want to mark "${statusPopupIssue.patient_name}" as Resolved? This confirms that payment has been received from the insurance company.`,
      onConfirm: () => {
        setConfirmDialog(null);
        doResolve();
      },
    });
  };

  // Reopen: Corrected/Resolved → Open
  const handleReopenIssue = async () => {
    if (!statusPopupIssue) return;
    setStatusSaving(true);
    try {
      const auditEntry = createAuditEntry('status_changed', 'staff', {
        field: 'status', oldValue: statusPopupIssue.status, newValue: 'Open',
      });
      const updates: Partial<InsuranceIssue> = {
        status: 'Open',
        corrected_at: null,
        corrected_by: null,
        correction_note: null,
        submission_status: null,
        submitted_by: null,
        submitted_at: null,
        resolved_at: null,
        audit_trail: [...(statusPopupIssue.audit_trail || []), auditEntry],
      };
      const updated = await updateInsuranceIssue(statusPopupIssue.id, updates);
      setIssues((prev) => prev.map((i) => (i.id === statusPopupIssue.id ? updated : i)));
      setToastMessage('Issue reopened');
      closeStatusPopup();
    } catch (err) {
      console.error('Error reopening issue:', err);
    } finally {
      setStatusSaving(false);
    }
  };

  // ----- Toggle submission status (inline click) -----
  const handleToggleSubmission = async (issue: InsuranceIssue, initials?: string) => {
    const now = new Date().toISOString();
    const isCurrentlySubmitted = issue.submission_status === 'Submitted';

    if (isCurrentlySubmitted) {
      // Un-submit: clear submission fields
      const auditEntry = createAuditEntry('status_changed', 'staff', {
        field: 'submission_status', oldValue: 'Submitted', newValue: 'Not Submitted',
      });
      const updates: Partial<InsuranceIssue> = {
        submission_status: null,
        submitted_by: null,
        submitted_at: null,
        audit_trail: [...(issue.audit_trail || []), auditEntry],
      };
      // If the main status was 'Submitted', move back to 'Corrected' (or 'Open' if never corrected)
      if (issue.status === 'Submitted') {
        updates.status = issue.corrected_at ? 'Corrected' : 'Open';
      }
      const updated = await updateInsuranceIssue(issue.id, updates);
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? updated : i)));
      setToastMessage('Submission status cleared');
    } else {
      // Mark as submitted with initials
      const by = initials?.trim() || '';
      if (!by) return;
      const auditEntry = createAuditEntry('status_changed', by, {
        field: 'submission_status', oldValue: 'Not Submitted', newValue: 'Submitted',
      });
      const updates: Partial<InsuranceIssue> = {
        submission_status: 'Submitted',
        submitted_by: by,
        submitted_at: now,
        audit_trail: [...(issue.audit_trail || []), auditEntry],
      };
      const updated = await updateInsuranceIssue(issue.id, updates);
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? updated : i)));
      setToastMessage(`Marked as Submitted by ${by}`);
    }
    setSubmissionPopupIssue(null);
    setSubmissionInitials('');
  };

  // ----- Add note handler -----
  const handleAddNote = async () => {
    if (!noteModalIssueId || !newNoteText.trim()) return;
    const issue = issues.find((i) => i.id === noteModalIssueId);
    if (!issue) return;

    const newNote: NoteEntry = {
      text: newNoteText.trim(),
      source: newNoteSource,
      author: newNoteAuthor,
      created_at: new Date().toISOString(),
    };

    const updatedNotes = [...(issue.structured_notes || []), newNote];
    const auditEntry = createAuditEntry('note_added', newNoteAuthor || 'staff', {
      notes: `Note added by ${newNoteAuthor || 'staff'} (${newNoteSource})`,
    });
    const updatedTrail = [...(issue.audit_trail || []), auditEntry];

    try {
      const updated = await updateInsuranceIssue(noteModalIssueId, {
        structured_notes: updatedNotes,
        audit_trail: updatedTrail,
      });
      setIssues((prev) => prev.map((i) => (i.id === noteModalIssueId ? updated : i)));
      setNoteModalIssueId(null);
      setNewNoteText('');
      setNewNoteAuthor('');
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleCSVImportComplete = (imported: InsuranceIssue[]) => {
    setIssues((prev) => [...imported, ...prev]);
    setToastMessage(`${imported.length} issue${imported.length !== 1 ? 's' : ''} imported successfully`);
  };

  // Drawer note handler
  const drawerIssue = useMemo(
    () => issues.find((i) => i.id === drawerIssueId) || null,
    [issues, drawerIssueId],
  );

  const handleDrawerAddNote = async (note: NoteEntry) => {
    if (!drawerIssueId) return;
    const issue = issues.find((i) => i.id === drawerIssueId);
    if (!issue) return;

    const updatedNotes = [...(issue.structured_notes || []), note];
    const auditEntry = createAuditEntry('note_added', note.author || 'staff', {
      notes: `Note added by ${note.author || 'staff'} (${note.source})`,
    });
    const updatedTrail = [...(issue.audit_trail || []), auditEntry];

    try {
      const updated = await updateInsuranceIssue(drawerIssueId, {
        structured_notes: updatedNotes,
        audit_trail: updatedTrail,
      });
      setIssues((prev) => prev.map((i) => (i.id === drawerIssueId ? updated : i)));
    } catch (err) {
      console.error('Error adding note via drawer:', err);
    }
  };

  // ----- Style helpers -----
  const card = isDayMode
    ? 'bg-white border border-gray-200 shadow-sm'
    : 'bg-gray-800 border border-gray-700 shadow-sm';

  const headerText = isDayMode ? 'text-gray-900' : 'text-white';
  const subText = isDayMode ? 'text-gray-600' : 'text-gray-400';
  const inputCls = isDayMode
    ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
    : 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400 focus:border-blue-400';
  const tableBorder = isDayMode ? 'border-gray-200' : 'border-gray-700';
  const rowHover = isDayMode ? 'stellar-row-hover' : 'stellar-row-hover-dark';
  const thBg = isDayMode ? 'bg-gray-50 text-gray-700' : 'bg-gray-900 text-gray-300';
  const modalOverlay = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60';
  const modalCard = isDayMode
    ? 'bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'
    : 'bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto';

  // ----- Render: provider badge -----
  const renderProviderBadge = (provider: string) => {
    if (!provider) return <span className={subText}>--</span>;
    const color = getProviderColor(provider, isDayMode);
    if (color.isCombo) {
      const parts = provider.split('+').map((p) => p.trim());
      return (
        <span className="inline-flex gap-1">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${color.first.bg} ${color.first.text}`}>
            {parts[0]}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${color.second.bg} ${color.second.text}`}>
            {parts[1]}
          </span>
        </span>
      );
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${color.bg} ${color.text}`}>
        {provider}
      </span>
    );
  };

  // ----- Render: in_vyne badge -----
  const renderVyneBadge = (inVyne: boolean) => {
    if (inVyne) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
          Yes
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
        No
      </span>
    );
  };

  // ----- Render: status badge (clickable → opens status popup) -----
  const renderStatusBadge = (issue: InsuranceIssue) => {
    const s = issue.status;
    let badgeCls = '';
    let icon = null;
    let label = '';

    if (s === 'Open') {
      badgeCls = isDayMode
        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
        : 'bg-amber-900/40 text-amber-300 hover:bg-amber-900/60';
      icon = <AlertTriangle className="w-3 h-3" />;
      label = 'Open';
    } else if (s === 'Corrected') {
      badgeCls = isDayMode
        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        : 'bg-blue-900/40 text-blue-300 hover:bg-blue-900/60';
      icon = <Wrench className="w-3 h-3" />;
      label = 'Corrected';
    } else if (s === 'Submitted') {
      const overdue = isSubmittedOverdue(issue);
      badgeCls = overdue
        ? isDayMode
          ? 'bg-red-100 text-red-700 hover:bg-red-200 ring-1 ring-red-300'
          : 'bg-red-900/40 text-red-300 hover:bg-red-900/60 ring-1 ring-red-600'
        : isDayMode
          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          : 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60';
      icon = overdue ? <Clock className="w-3 h-3" /> : <Send className="w-3 h-3" />;
      label = overdue ? 'Submitted (Overdue)' : 'Submitted';
    } else {
      badgeCls = isDayMode
        ? 'bg-green-100 text-green-700 hover:bg-green-200'
        : 'bg-green-900/40 text-green-300 hover:bg-green-900/60';
      icon = <CheckCircle className="w-3 h-3" />;
      label = 'Resolved';
    }

    return (
      <button
        onClick={() => handleStatusClick(issue)}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${badgeCls}`}
        title="Click to change status"
      >
        {icon}
        {label}
      </button>
    );
  };

  // ----- Render: table row -----
  const renderRow = (issue: InsuranceIssue) => {
    const overdue = isSubmittedOverdue(issue);
    const rowBg = overdue
      ? isDayMode ? 'bg-red-50 border-l-4 border-l-red-400' : 'bg-red-900/20 border-l-4 border-l-red-500'
      : issue.status === 'Resolved'
        ? isDayMode ? 'bg-green-50/50' : 'bg-green-900/10'
        : issue.status === 'Submitted'
          ? isDayMode ? 'bg-purple-50/30' : 'bg-purple-900/10'
          : issue.status === 'Corrected'
            ? isDayMode ? 'bg-blue-50/30' : 'bg-blue-900/10'
            : '';

    return (
      <tr
        key={issue.id}
        className={`${rowBg} ${rowHover} cursor-pointer transition-colors`}
        onDoubleClick={() => { setEditModalIssue(issue); setEditModalOpen(true); }}
      >
        {/* Patient ID */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} whitespace-nowrap`}>
          {issue.patient_id ?? '--'}
        </td>

        {/* Patient Name (clickable → opens edit modal) */}
        <td className={`px-3 py-2 text-sm font-medium border-b ${tableBorder} whitespace-nowrap`}>
          <button
            onClick={() => handleStartEdit(issue)}
            className={`text-left font-medium underline decoration-dotted underline-offset-2 cursor-pointer transition-colors ${
              isDayMode
                ? 'text-blue-700 hover:text-blue-900'
                : 'text-blue-400 hover:text-blue-200'
            }`}
            title={`Edit ${issue.patient_name}`}
          >
            {issue.patient_name}
          </button>
        </td>

        {/* Date of Service */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} whitespace-nowrap ${subText}`}>
          {formatDate(issue.date_of_service)}
        </td>

        {/* Procedure */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} whitespace-nowrap font-mono`}>
          {issue.procedure_codes}
        </td>

        {/* In Charge */}
        <td className={`px-3 py-2 border-b ${tableBorder} whitespace-nowrap`}>
          {renderProviderBadge(issue.in_charge)}
        </td>

        {/* Issue Type */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} max-w-[180px]`}>
          <span className="truncate block" title={issue.issue_type}>
            {issue.issue_type}
          </span>
        </td>

        {/* In Vyne? */}
        <td className={`px-3 py-2 border-b ${tableBorder} text-center`}>
          {renderVyneBadge(issue.in_vyne)}
        </td>

        {/* Status Badge */}
        <td className={`px-3 py-2 border-b ${tableBorder}`}>
          {renderStatusBadge(issue)}
        </td>

        {/* Submitted + Submitted By (clickable toggle) */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} whitespace-nowrap`}>
          <button
            onClick={() => {
              if (issue.submission_status === 'Submitted') {
                // Directly un-submit (no initials needed)
                handleToggleSubmission(issue);
              } else {
                // Open popup to pick initials
                setSubmissionPopupIssue(issue);
                setSubmissionInitials('');
              }
            }}
            className={`text-left transition-colors rounded px-1.5 py-0.5 ${
              issue.submission_status === 'Submitted'
                ? isDayMode
                  ? 'hover:bg-green-50'
                  : 'hover:bg-green-900/20'
                : isDayMode
                  ? 'hover:bg-gray-100'
                  : 'hover:bg-gray-700/50'
            }`}
            title={issue.submission_status === 'Submitted' ? 'Click to un-submit' : 'Click to mark as submitted'}
          >
            {issue.submission_status === 'Submitted' ? (
              <div className="flex flex-col">
                <span className={`font-medium ${isDayMode ? 'text-green-700' : 'text-green-400'}`}>
                  Submitted
                </span>
                {issue.submitted_by && (
                  <span className={`text-[10px] ${subText}`}>
                    By: {issue.submitted_by}
                  </span>
                )}
                {issue.submitted_at && (
                  <span className={`text-[10px] ${subText}`}>
                    {formatTimestamp(issue.submitted_at)}
                  </span>
                )}
              </div>
            ) : (
              <span className={`${subText} hover:underline`}>--</span>
            )}
          </button>
        </td>

        {/* Notes (hover popup) */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder}`}>
          <div className="flex items-center gap-1">
            <NotesPopup notes={issue.structured_notes || []} isDayMode={isDayMode} />
            <button
              onClick={() => {
                setNoteModalIssueId(issue.id);
                setNewNoteText('');
                setNewNoteSource('stellar');
                setNewNoteAuthor('');
              }}
              className={`p-0.5 rounded transition-colors ${
                isDayMode
                  ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                  : 'text-gray-500 hover:text-blue-400 hover:bg-blue-900/30'
              }`}
              title="Add note"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>

        {/* Audit Trail */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} text-center`}>
          <button
            onClick={() => setDrawerIssueId(issue.id)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isDayMode
                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                : 'text-emerald-300 bg-emerald-900/30 hover:bg-emerald-900/50'
            }`}
            title="View notes & audit trail"
          >
            <History className="w-3 h-3" />
            {(issue.audit_trail || []).length > 0 && (
              <span>{(issue.audit_trail || []).length}</span>
            )}
          </button>
        </td>

        {/* Actions */}
        <td className={`px-3 py-2 border-b ${tableBorder} whitespace-nowrap`}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setEditModalIssue(issue); setEditModalOpen(true); }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${isDayMode ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40'}`}
              title="Edit in modal"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => handleDelete(issue.id)}
              className={`p-1 rounded ${isDayMode ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/30'}`}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ----- Render: table -----
  const renderTable = (rows: InsuranceIssue[], title: string) => {
    if (rows.length === 0) return null;
    return (
      <div className={`rounded-lg overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b ${tableBorder}`}>
          <h3 className={`text-sm font-semibold ${headerText}`}>{title}</h3>
        </div>
        <div className="overflow-x-auto insurance-table-scroll" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table className="w-full text-left" style={{ minWidth: '1100px' }}>
            <thead className="sticky top-0 z-10">
              <tr className={thBg}>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Patient ID</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Name</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>DOS</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Procedure</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>In Charge</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Issue Type</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder} text-center`}>Vyne</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Status</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder} min-w-[100px]`}>Submitted</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder} min-w-[90px]`}>Notes</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder} text-center`}>Audit</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Actions</th>
              </tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      </div>
    );
  };

  // ----- Render: loading -----
  if (loading) {
    return (
      <div className={`rounded-lg p-8 ${card}`}>
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ----- Render: error -----
  if (error) {
    return (
      <div className={`rounded-lg p-8 ${card}`}>
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <FileWarning className="w-10 h-10 text-red-500" />
          <p className={`text-sm ${isDayMode ? 'text-red-700' : 'text-red-400'}`}>{error}</p>
          <button
            onClick={loadIssues}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ----- MAIN RENDER -----
  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-2xl font-bold ${headerText}`}>Insurance Issues Tracker</h2>
          <p className={`text-sm mt-1 ${subText}`}>
            Tracking {issues.length} issue{issues.length !== 1 ? 's' : ''} from the Insurance Issues Report
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCSVUpload(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium border ${
              isDayMode
                ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                : 'border-blue-600 text-blue-300 hover:bg-blue-900/30'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => {
              setFormData({ ...EMPTY_FORM });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Issue
          </button>
        </div>
      </div>

      {/* ===== Summary Stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
        {/* Total */}
        <div className={`rounded-lg p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <FileWarning className={`w-4 h-4 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>Total Issues</span>
          </div>
          <span className={`text-2xl font-bold ${headerText}`}>{summary.totalIssues}</span>
        </div>

        {/* Open */}
        <div className={`rounded-lg p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>Open</span>
          </div>
          <span className={`text-2xl font-bold ${isDayMode ? 'text-amber-700' : 'text-amber-400'}`}>
            {summary.openIssues}
          </span>
        </div>

        {/* Corrected */}
        <div className={`rounded-lg p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Wrench className={`w-4 h-4 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>Corrected</span>
          </div>
          <span className={`text-2xl font-bold ${isDayMode ? 'text-blue-700' : 'text-blue-400'}`}>
            {summary.correctedIssues}
          </span>
        </div>

        {/* Submitted */}
        <div className={`rounded-lg p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Send className={`w-4 h-4 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>Submitted</span>
          </div>
          <span className={`text-2xl font-bold ${isDayMode ? 'text-purple-700' : 'text-purple-400'}`}>
            {summary.submittedIssues}
          </span>
        </div>

        {/* Resolved */}
        <div className={`rounded-lg p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className={`w-4 h-4 ${isDayMode ? 'text-green-600' : 'text-green-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>Resolved</span>
          </div>
          <span className={`text-2xl font-bold ${isDayMode ? 'text-green-700' : 'text-green-400'}`}>
            {summary.resolvedIssues}
          </span>
        </div>

        {/* Avg Days on List */}
        <div className={`rounded-lg p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Timer className={`w-4 h-4 ${isDayMode ? 'text-indigo-600' : 'text-indigo-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>Avg Days on List</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${
              summary.avgDaysOnList !== null && summary.avgDaysOnList > RESOLUTION_TARGET_DAYS
                ? isDayMode ? 'text-red-600' : 'text-red-400'
                : isDayMode ? 'text-green-700' : 'text-green-400'
            }`}>
              {summary.avgDaysOnList !== null ? `${summary.avgDaysOnList}d` : '--'}
            </span>
            <span className={`text-[10px] ${subText}`}>/ {RESOLUTION_TARGET_DAYS}d target</span>
          </div>
        </div>

        {/* By Issue Type (top 3) */}
        <div className={`rounded-lg p-4 col-span-2 md:col-span-1 ${card}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${isDayMode ? 'text-orange-600' : 'text-orange-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>By Issue Type</span>
          </div>
          <div className="space-y-1">
            {Object.entries(summary.byIssueType)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className={`truncate mr-2 ${subText}`} title={type}>
                    {type}
                  </span>
                  <span className={`font-semibold ${headerText}`}>{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* By Provider */}
        <div className={`rounded-lg p-4 col-span-2 ${card}`}>
          <div className="flex items-center gap-2 mb-2">
            <Filter className={`w-4 h-4 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>By Provider</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.byProvider)
              .sort(([, a], [, b]) => b - a)
              .map(([provider, count]) => (
                <div key={provider} className="flex items-center gap-1">
                  {renderProviderBadge(provider || 'Unassigned')}
                  <span className={`text-xs font-semibold ${headerText}`}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ===== Active Issues / Submitted / Resolved Tabs ===== */}
      <div className={`rounded-lg overflow-hidden ${card}`}>
        <div className={`flex border-b ${tableBorder}`}>
          {/* Active Issues Tab */}
          <button
            onClick={() => setViewTab('open')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              viewTab === 'open'
                ? isDayMode
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-b-2 border-blue-400 text-blue-300 bg-blue-900/20'
                : isDayMode
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Active Issues
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              viewTab === 'open'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : isDayMode ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-400'
            }`}>
              {openCount}
            </span>
            {correctedCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                viewTab === 'open'
                  ? isDayMode ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/40 text-blue-300'
                  : isDayMode ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-400'
              }`}>
                {correctedCount} corrected
              </span>
            )}
          </button>

          {/* Submitted Tab */}
          <button
            onClick={() => setViewTab('submitted')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              viewTab === 'submitted'
                ? isDayMode
                  ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-b-2 border-purple-400 text-purple-300 bg-purple-900/20'
                : isDayMode
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <Send className="w-4 h-4" />
            Submitted
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              viewTab === 'submitted'
                ? isDayMode ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/40 text-purple-300'
                : isDayMode ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-400'
            }`}>
              {submittedCount}
            </span>
            {submittedOverdueCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                viewTab === 'submitted'
                  ? isDayMode ? 'bg-red-100 text-red-700' : 'bg-red-900/40 text-red-300'
                  : isDayMode ? 'bg-red-50 text-red-600' : 'bg-red-900/30 text-red-400'
              }`}>
                {submittedOverdueCount} overdue
              </span>
            )}
          </button>

          {/* Resolved Tab */}
          <button
            onClick={() => setViewTab('resolved')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              viewTab === 'resolved'
                ? isDayMode
                  ? 'border-b-2 border-green-600 text-green-700 bg-green-50/50'
                  : 'border-b-2 border-green-400 text-green-300 bg-green-900/20'
                : isDayMode
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <Archive className="w-4 h-4" />
            Resolved
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              viewTab === 'resolved'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : isDayMode ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-400'
            }`}>
              {resolvedCount}
            </span>
          </button>
        </div>

        {/* Search & Filters inside the tab card */}
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subText}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient, procedure, provider, notes..."
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-md border ${inputCls}`}
              />
            </div>

            {/* Toggle filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors ${
                showFilters
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isDayMode
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
              {/* Issue type */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>Issue Type</label>
                <select
                  value={filterIssueType}
                  onChange={(e) => setFilterIssueType(e.target.value)}
                  className={`w-full text-sm rounded-md border px-2 py-1.5 ${inputCls}`}
                >
                  <option value="all">All Types</option>
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Provider */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>Provider</label>
                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  className={`w-full text-sm rounded-md border px-2 py-1.5 ${inputCls}`}
                >
                  <option value="all">All Providers</option>
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Regular Claim Issues Table ===== */}
      {renderTable(regularIssues, `Claim Issues (${regularIssues.length})`)}

      {/* ===== Pre-Auth Section ===== */}
      {renderTable(preAuthIssues, `Pre-Auth Items (${preAuthIssues.length})`)}

      {/* Empty state */}
      {filteredIssues.length === 0 && (
        <div className={`rounded-lg p-8 text-center ${card}`}>
          <FileWarning className={`w-10 h-10 mx-auto mb-3 ${subText}`} />
          <p className={`text-sm ${subText}`}>
            {issues.length === 0
              ? 'No insurance issues recorded yet.'
              : 'No issues match the current filters.'}
          </p>
        </div>
      )}

      {/* ===== CSV Upload Modal ===== */}
      {showCSVUpload && (
        <InsuranceIssuesCSVUpload
          isDayMode={isDayMode}
          onClose={() => setShowCSVUpload(false)}
          onImportComplete={handleCSVImportComplete}
        />
      )}

      {/* ===== Add Note Modal ===== */}
      {noteModalIssueId && (
        <div className={modalOverlay} onClick={() => setNoteModalIssueId(null)}>
          <div
            className={isDayMode
              ? 'bg-white rounded-xl shadow-xl max-w-md w-full mx-4'
              : 'bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-6 py-4 border-b ${tableBorder}`}>
              <h3 className={`text-lg font-semibold ${headerText}`}>Add Note</h3>
              <button
                onClick={() => setNoteModalIssueId(null)}
                className={`p-1 rounded ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-700 text-gray-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Source */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>Source</label>
                <select
                  value={newNoteSource}
                  onChange={(e) => setNewNoteSource(e.target.value as NoteSource)}
                  className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                >
                  <option value="stellar">Stellar Team</option>
                  <option value="office">Court Street Dental Team</option>
                </select>
              </div>
              {/* Author initials */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>Author Initials</label>
                <input
                  type="text"
                  value={newNoteAuthor}
                  onChange={(e) => setNewNoteAuthor(e.target.value)}
                  placeholder="Enter initials..."
                  className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                />
              </div>
              {/* Note text */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>Note</label>
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Enter your note..."
                  rows={3}
                  className={`w-full text-sm rounded-md border px-3 py-2 resize-y ${inputCls}`}
                />
              </div>
            </div>
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${tableBorder}`}>
              <button
                onClick={() => setNoteModalIssueId(null)}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  isDayMode
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!newNoteText.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Issue Modal ===== */}
      {editingId && (
        <div className={modalOverlay} onClick={handleCancelEdit}>
          <div
            className={isDayMode
              ? 'bg-white rounded-xl shadow-xl max-w-lg w-full mx-4'
              : 'bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4'
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${tableBorder}`}>
              <div>
                <h3 className={`text-lg font-semibold ${headerText}`}>Edit Issue</h3>
                {(() => {
                  const editIssue = issues.find((i) => i.id === editingId);
                  return editIssue ? (
                    <p className={`text-xs mt-0.5 ${subText}`}>
                      {editIssue.patient_name} — {formatDate(editIssue.date_of_service)}
                    </p>
                  ) : null;
                })()}
              </div>
              <button
                onClick={handleCancelEdit}
                className={`p-1 rounded ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-700 text-gray-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Row 1: In Charge + Issue Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>In Charge</label>
                  <select
                    value={editData.in_charge ?? ''}
                    onChange={(e) => setEditData((d) => ({ ...d, in_charge: e.target.value }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    <option value="">-- Select --</option>
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Issue Type</label>
                  <select
                    value={editData.issue_type ?? ''}
                    onChange={(e) => setEditData((d) => ({ ...d, issue_type: e.target.value as InsuranceIssueType }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    {ISSUE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Status + Submitted By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Status</label>
                  <select
                    value={(editData.status as string) ?? ''}
                    onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value as InsuranceIssueStatus }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    <option value="Open">Open / Needs Fix</option>
                    <option value="Corrected">Corrected</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Submission Status</label>
                  <select
                    value={editData.submission_status ?? ''}
                    onChange={(e) => setEditData((d) => ({ ...d, submission_status: e.target.value || null }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    <option value="">Not Submitted</option>
                    <option value="Submitted">Submitted</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Submitted By + In Vyne */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Submitted By</label>
                  <select
                    value={editData.submitted_by ?? ''}
                    onChange={(e) => setEditData((d) => ({ ...d, submitted_by: e.target.value || null }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    <option value="">-- Select --</option>
                    {SUBMITTER_INITIALS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.in_vyne ?? false}
                      onChange={(e) => setEditData((d) => ({ ...d, in_vyne: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${headerText}`}>In Vyne</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${tableBorder}`}>
              <button
                onClick={handleCancelEdit}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  isDayMode
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingId)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Add Issue Modal ===== */}
      {showAddModal && (
        <div className={modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={modalCard} onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${tableBorder}`}>
              <h3 className={`text-lg font-semibold ${headerText}`}>Add New Issue</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className={`p-1 rounded ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-700 text-gray-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 space-y-4">
              {/* Row 1: Patient ID + Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Patient ID</label>
                  <input
                    type="text"
                    value={formData.patient_id ?? ''}
                    onChange={(e) => setFormData((d) => ({ ...d, patient_id: e.target.value || null }))}
                    placeholder="e.g. 4188570569"
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => setFormData((d) => ({ ...d, patient_name: e.target.value }))}
                    placeholder="Last, First"
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  />
                </div>
              </div>

              {/* Row 2: DOS + Procedure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>
                    Date of Service <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_service}
                    onChange={(e) => setFormData((d) => ({ ...d, date_of_service: e.target.value }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>
                    Procedure Code(s) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.procedure_codes}
                    onChange={(e) => setFormData((d) => ({ ...d, procedure_codes: e.target.value }))}
                    placeholder="e.g. D4342, D2392"
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  />
                </div>
              </div>

              {/* Row 3: In Charge + Issue Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>In Charge</label>
                  <select
                    value={formData.in_charge}
                    onChange={(e) => setFormData((d) => ({ ...d, in_charge: e.target.value }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    <option value="">-- Select --</option>
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Issue Type</label>
                  <select
                    value={formData.issue_type}
                    onChange={(e) => setFormData((d) => ({ ...d, issue_type: e.target.value as InsuranceIssueType }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    {ISSUE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Status + Submitted */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((d) => ({ ...d, status: e.target.value as InsuranceIssueStatus }))}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    <option value="Open">Open / Needs Fix</option>
                    <option value="Corrected">Corrected</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Submitted By</label>
                  <select
                    value={formData.submitted_by ?? ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setFormData((d) => ({
                        ...d,
                        submitted_by: val,
                        submission_status: val ? 'Submitted' : null,
                      }));
                    }}
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  >
                    <option value="">Not Submitted</option>
                    {SUBMITTER_INITIALS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: In Vyne + Pre-Auth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.in_vyne}
                      onChange={(e) => setFormData((d) => ({ ...d, in_vyne: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${headerText}`}>In Vyne</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_pre_auth}
                      onChange={(e) => setFormData((d) => ({ ...d, is_pre_auth: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${headerText}`}>Pre-Auth Item</span>
                  </label>
                </div>
              </div>

              {/* Row 6: Initial Note */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>Initial Note (optional)</label>
                <textarea
                  value={formData.notes ?? ''}
                  onChange={(e) => {
                    const text = e.target.value || null;
                    setFormData((d) => ({
                      ...d,
                      notes: text,
                      structured_notes: text
                        ? [{ text, source: 'stellar' as NoteSource, author: formData.submitted_by || '', created_at: new Date().toISOString() }]
                        : [],
                    }));
                  }}
                  placeholder="Additional notes..."
                  rows={3}
                  className={`w-full text-sm rounded-md border px-3 py-2 resize-y ${inputCls}`}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${tableBorder}`}>
              <button
                onClick={() => setShowAddModal(false)}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  isDayMode
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddIssue}
                disabled={formSaving || !formData.patient_name || !formData.date_of_service || !formData.procedure_codes}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formSaving ? 'Saving...' : 'Add Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Status Change Popup ===== */}
      {statusPopupIssue && (
        <div
          className={modalOverlay}
          onClick={closeStatusPopup}
        >
          <div
            className={`${isDayMode ? 'bg-white' : 'bg-gray-800'} rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'notesPopupFadeIn 0.15s ease-out' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${tableBorder}`}>
              <div>
                <h3 className={`text-lg font-semibold ${headerText}`}>Update Status</h3>
                <p className={`text-xs mt-0.5 ${subText}`}>
                  {statusPopupIssue.patient_name} &middot; {formatDate(statusPopupIssue.date_of_service)}
                </p>
              </div>
              <button
                onClick={closeStatusPopup}
                className={`p-1 rounded ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-700 text-gray-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current status indicator - 4 step flow */}
            <div className="px-6 pt-4">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${isDayMode ? 'bg-gray-50 border border-gray-100' : 'bg-gray-700/50 border border-gray-600'}`}>
                <span className={`text-xs font-medium ${subText}`}>Current:</span>
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  {/* Open */}
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    statusPopupIssue.status === 'Open'
                      ? isDayMode ? 'text-amber-700' : 'text-amber-300'
                      : isDayMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Open
                  </div>
                  <span className={subText}>&rarr;</span>
                  {/* Corrected */}
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    statusPopupIssue.status === 'Corrected'
                      ? isDayMode ? 'text-blue-700' : 'text-blue-300'
                      : isDayMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <Wrench className="w-3.5 h-3.5" />
                    Corrected
                  </div>
                  <span className={subText}>&rarr;</span>
                  {/* Submitted */}
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    statusPopupIssue.status === 'Submitted'
                      ? isDayMode ? 'text-purple-700' : 'text-purple-300'
                      : isDayMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <Send className="w-3.5 h-3.5" />
                    Submitted
                  </div>
                  <span className={subText}>&rarr;</span>
                  {/* Resolved */}
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    statusPopupIssue.status === 'Resolved'
                      ? isDayMode ? 'text-green-700' : 'text-green-300'
                      : isDayMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Resolved
                  </div>
                </div>
              </div>
            </div>

            {/* PART 1: Mark as Corrected (shown when status is Open) */}
            {statusPopupIssue.status === 'Open' && (
              <div className="px-6 py-4">
                <div className={`p-4 rounded-lg border ${isDayMode ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-800'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className={`w-4 h-4 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
                    <h4 className={`text-sm font-semibold ${isDayMode ? 'text-blue-800' : 'text-blue-200'}`}>
                      Mark as Corrected
                    </h4>
                  </div>
                  <p className={`text-xs mb-3 ${isDayMode ? 'text-blue-600' : 'text-blue-300'}`}>
                    The person in charge has completed their edits/corrections.
                  </p>

                  <div className="space-y-3">
                    {/* Correction date */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-blue-700' : 'text-blue-300'}`}>
                        Correction Date
                      </label>
                      <input
                        type="date"
                        value={statusFormDate}
                        onChange={(e) => setStatusFormDate(e.target.value)}
                        className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                      />
                    </div>

                    {/* Initials */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-blue-700' : 'text-blue-300'}`}>
                        Initials (who corrected) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={statusFormInitials}
                        onChange={(e) => setStatusFormInitials(e.target.value.toUpperCase())}
                        placeholder="e.g. DG, BH"
                        maxLength={10}
                        className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                      />
                    </div>

                    {/* Optional note */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-blue-700' : 'text-blue-300'}`}>
                        Note (optional)
                      </label>
                      <textarea
                        value={statusFormNote}
                        onChange={(e) => setStatusFormNote(e.target.value)}
                        placeholder="Brief description of what was corrected..."
                        rows={2}
                        className={`w-full text-sm rounded-md border px-3 py-2 resize-y ${inputCls}`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleMarkCorrected}
                    disabled={statusSaving || !statusFormInitials.trim()}
                    className="mt-3 w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    {statusSaving ? 'Saving...' : 'Mark as Corrected'}
                  </button>
                </div>

                {/* Divider with bypass option */}
                <div className="relative my-4">
                  <div className={`absolute inset-0 flex items-center`}>
                    <div className={`w-full border-t ${isDayMode ? 'border-gray-200' : 'border-gray-600'}`} />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className={`px-3 ${isDayMode ? 'bg-white text-gray-500' : 'bg-gray-800 text-gray-400'}`}>
                      or skip correction step
                    </span>
                  </div>
                </div>

                {/* Bypass: go straight to Submitted */}
                <div className={`p-4 rounded-lg border ${isDayMode ? 'bg-purple-50 border-purple-200' : 'bg-purple-900/20 border-purple-800'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className={`w-4 h-4 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
                    <h4 className={`text-sm font-semibold ${isDayMode ? 'text-purple-800' : 'text-purple-200'}`}>
                      Submit Directly
                    </h4>
                  </div>
                  <p className={`text-xs mb-3 ${isDayMode ? 'text-purple-600' : 'text-purple-300'}`}>
                    Skip correction step and mark as resubmitted directly.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-purple-700' : 'text-purple-300'}`}>
                        Submitted By (initials) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={statusFormSubmittedBy}
                        onChange={(e) => setStatusFormSubmittedBy(e.target.value.toUpperCase())}
                        placeholder="e.g. BH, LP"
                        maxLength={10}
                        className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleMarkSubmitted}
                    disabled={statusSaving || !statusFormSubmittedBy.trim()}
                    className="mt-3 w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {statusSaving ? 'Saving...' : 'Submit Directly'}
                  </button>
                </div>
              </div>
            )}

            {/* PART 2: Corrected → Submitted (shown when status is Corrected) */}
            {statusPopupIssue.status === 'Corrected' && (
              <div className="px-6 py-4 space-y-4">
                {/* Show correction info */}
                {statusPopupIssue.corrected_by && (
                  <div className={`p-3 rounded-lg ${isDayMode ? 'bg-blue-50 border border-blue-100' : 'bg-blue-900/20 border border-blue-800'}`}>
                    <p className={`text-xs ${isDayMode ? 'text-blue-700' : 'text-blue-300'}`}>
                      Corrected by <strong>{statusPopupIssue.corrected_by}</strong>
                      {statusPopupIssue.corrected_at && <> on {formatDate(statusPopupIssue.corrected_at.split('T')[0])}</>}
                      {statusPopupIssue.correction_note && <> &mdash; "{statusPopupIssue.correction_note}"</>}
                    </p>
                  </div>
                )}

                {/* Submit form */}
                <div className={`p-4 rounded-lg border ${isDayMode ? 'bg-purple-50 border-purple-200' : 'bg-purple-900/20 border-purple-800'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Send className={`w-4 h-4 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
                    <h4 className={`text-sm font-semibold ${isDayMode ? 'text-purple-800' : 'text-purple-200'}`}>
                      Mark as Submitted
                    </h4>
                  </div>
                  <p className={`text-xs mb-3 ${isDayMode ? 'text-purple-600' : 'text-purple-300'}`}>
                    Claim has been resubmitted to insurance. Track until payment is received.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-purple-700' : 'text-purple-300'}`}>
                        Submitted By (initials) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={statusFormSubmittedBy}
                        onChange={(e) => setStatusFormSubmittedBy(e.target.value.toUpperCase())}
                        placeholder="e.g. BH, LP"
                        maxLength={10}
                        className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleMarkSubmitted}
                    disabled={statusSaving || !statusFormSubmittedBy.trim()}
                    className="mt-3 w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {statusSaving ? 'Saving...' : 'Mark as Submitted'}
                  </button>
                </div>

                {/* Reopen option */}
                <button
                  onClick={handleReopenIssue}
                  disabled={statusSaving}
                  className={`w-full px-4 py-2 text-sm rounded-md border transition-colors font-medium inline-flex items-center justify-center gap-2 ${
                    isDayMode
                      ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      : 'border-gray-600 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Reopen Issue
                </button>
              </div>
            )}

            {/* PART 2b: Submitted → Resolved (shown when status is Submitted) */}
            {statusPopupIssue.status === 'Submitted' && (
              <div className="px-6 py-4 space-y-4">
                {/* Show submitted info */}
                <div className={`p-3 rounded-lg ${isDayMode ? 'bg-purple-50 border border-purple-100' : 'bg-purple-900/20 border border-purple-800'}`}>
                  <p className={`text-xs ${isDayMode ? 'text-purple-700' : 'text-purple-300'}`}>
                    Submitted by <strong>{statusPopupIssue.submitted_by}</strong>
                    {statusPopupIssue.submitted_at && <> on {formatTimestamp(statusPopupIssue.submitted_at)}</>}
                  </p>
                  {isSubmittedOverdue(statusPopupIssue) && (
                    <p className={`text-xs mt-2 font-semibold ${isDayMode ? 'text-red-600' : 'text-red-400'}`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      Overdue! This item has been in Submitted for more than {SUBMITTED_FOLLOW_UP_DAYS} days. Follow up required.
                    </p>
                  )}
                </div>

                {/* Resolve form */}
                <div className={`p-4 rounded-lg border ${isDayMode ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-800'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className={`w-4 h-4 ${isDayMode ? 'text-green-600' : 'text-green-400'}`} />
                    <h4 className={`text-sm font-semibold ${isDayMode ? 'text-green-800' : 'text-green-200'}`}>
                      Mark as Resolved
                    </h4>
                  </div>
                  <p className={`text-xs mb-3 ${isDayMode ? 'text-green-600' : 'text-green-300'}`}>
                    Payment has been received from the insurance company. Issue is fully resolved.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-green-700' : 'text-green-300'}`}>
                        Resolved By (initials) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={statusFormSubmittedBy}
                        onChange={(e) => setStatusFormSubmittedBy(e.target.value.toUpperCase())}
                        placeholder="e.g. BH, LP"
                        maxLength={10}
                        className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleMarkResolved}
                    disabled={statusSaving || !statusFormSubmittedBy.trim()}
                    className="mt-3 w-full px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {statusSaving ? 'Saving...' : 'Mark as Resolved'}
                  </button>
                </div>

                {/* Move back to Active Issues */}
                <button
                  onClick={handleReopenIssue}
                  disabled={statusSaving}
                  className={`w-full px-4 py-2 text-sm rounded-md border transition-colors font-medium inline-flex items-center justify-center gap-2 ${
                    isDayMode
                      ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      : 'border-gray-600 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Reopen Issue
                </button>
              </div>
            )}

            {/* PART 3: Resolved → Reopen (shown when status is Resolved) */}
            {statusPopupIssue.status === 'Resolved' && (
              <div className="px-6 py-4 space-y-4">
                {/* Resolved info */}
                <div className={`p-3 rounded-lg ${isDayMode ? 'bg-green-50 border border-green-100' : 'bg-green-900/20 border border-green-800'}`}>
                  <p className={`text-xs ${isDayMode ? 'text-green-700' : 'text-green-300'}`}>
                    This issue has been resolved.
                    {statusPopupIssue.submitted_by && <> Submitted by <strong>{statusPopupIssue.submitted_by}</strong></>}
                    {statusPopupIssue.submitted_at && <> on {formatDate(statusPopupIssue.submitted_at.split('T')[0])}</>}
                  </p>
                </div>

                <button
                  onClick={handleReopenIssue}
                  disabled={statusSaving}
                  className={`w-full px-4 py-2 text-sm rounded-md border transition-colors font-medium inline-flex items-center justify-center gap-2 ${
                    isDayMode
                      ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                      : 'border-amber-600 text-amber-300 hover:bg-amber-900/30'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  {statusSaving ? 'Reopening...' : 'Reopen Issue'}
                </button>
              </div>
            )}

            {/* Footer */}
            <div className={`flex items-center justify-end px-6 py-3 border-t ${tableBorder}`}>
              <button
                onClick={closeStatusPopup}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  isDayMode
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes & Audit Trail Drawer */}
      <NotesAuditDrawer
        isOpen={!!drawerIssueId}
        onClose={() => setDrawerIssueId(null)}
        isDayMode={isDayMode}
        entityType="Insurance Issue"
        entityLabel={drawerIssue?.patient_name || ''}
        notes={drawerIssue?.structured_notes || []}
        auditTrail={drawerIssue?.audit_trail || []}
        onAddNote={handleDrawerAddNote}
      />

      {/* Success Toast */}
      <SuccessToast
        message={toastMessage || ''}
        isVisible={!!toastMessage}
        onClose={() => setToastMessage(null)}
        isDayMode={isDayMode}
      />

      {/* ===== Confirmation Dialog ===== */}
      {confirmDialog && (
        <div className={modalOverlay} onClick={() => setConfirmDialog(null)}>
          <div
            className={`${isDayMode ? 'bg-white' : 'bg-gray-800'} rounded-xl shadow-xl max-w-sm w-full mx-4`}
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'notesPopupFadeIn 0.15s ease-out' }}
          >
            <div className={`px-6 py-4 border-b ${tableBorder}`}>
              <h3 className={`text-lg font-semibold ${headerText}`}>{confirmDialog.title}</h3>
            </div>
            <div className="px-6 py-4">
              <p className={`text-sm ${subText}`}>{confirmDialog.message}</p>
            </div>
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${tableBorder}`}>
              <button
                onClick={() => setConfirmDialog(null)}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  isDayMode
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Toggle Popup (pick initials to mark as submitted) */}
      {submissionPopupIssue && (
        <div
          className={modalOverlay}
          onClick={() => { setSubmissionPopupIssue(null); setSubmissionInitials(''); }}
        >
          <div
            className={`${isDayMode ? 'bg-white' : 'bg-gray-800'} rounded-xl shadow-xl max-w-sm w-full mx-4`}
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'notesPopupFadeIn 0.15s ease-out' }}
          >
            <div className={`flex items-center justify-between px-5 py-3 border-b ${tableBorder}`}>
              <div>
                <h3 className={`text-sm font-semibold ${headerText}`}>Mark as Submitted</h3>
                <p className={`text-xs mt-0.5 ${subText}`}>
                  {submissionPopupIssue.patient_name}
                </p>
              </div>
              <button
                onClick={() => { setSubmissionPopupIssue(null); setSubmissionInitials(''); }}
                className={`p-1 rounded ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-700 text-gray-400'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDayMode ? 'text-purple-700' : 'text-purple-300'}`}>
                  Submitted By (initials) <span className="text-red-500">*</span>
                </label>
                <select
                  value={submissionInitials}
                  onChange={(e) => setSubmissionInitials(e.target.value)}
                  className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  autoFocus
                >
                  <option value="">-- Select --</option>
                  {SUBMITTER_INITIALS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleToggleSubmission(submissionPopupIssue, submissionInitials)}
                disabled={!submissionInitials}
                className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Mark as Submitted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draggable Edit Modal */}
      <DraggableEditModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditModalIssue(null); }}
        onSave={async (_tab: TabKey, data: Record<string, unknown>, isNewEntry: boolean) => {
          const auditEntry = createAuditEntry(isNewEntry ? 'created' : 'updated', 'staff');
          const submissionStatus = String(data.submission_status || '') || null;
          const submittedBy = String(data.submitted_by || '') || null;
          const now = new Date().toISOString();
          const issueData = {
            patient_name: sanitizePatientName(String(data.patient_name || '')),
            patient_id: String(data.patient_id || '') || null,
            date_of_service: String(data.date_of_service || ''),
            procedure_codes: String(data.procedure_codes || ''),
            in_charge: String(data.in_charge || ''),
            issue_type: (String(data.issue_type) || 'Other') as InsuranceIssue['issue_type'],
            status: (String(data.status) || 'Open') as InsuranceIssue['status'],
            submission_status: submissionStatus,
            submitted_by: submittedBy,
            notes: String(data.notes || '') || null,
          };
          if (isNewEntry) {
            await insertInsuranceIssue({
              ...issueData,
              in_vyne: false,
              is_pre_auth: false,
              corrected_at: issueData.status === 'Corrected' || issueData.status === 'Submitted' || issueData.status === 'Resolved' ? now : null,
              corrected_by: null,
              correction_note: null,
              submitted_at: submissionStatus === 'Submitted' ? now : null,
              resolved_at: issueData.status === 'Resolved' ? now : null,
              structured_notes: [],
              audit_trail: [auditEntry],
            });
          } else {
            const id = String(data.id);
            const issue = issues.find((i) => i.id === id);
            const existingTrail = issue?.audit_trail || [];
            const updates: Record<string, unknown> = {
              ...issueData,
              audit_trail: [...existingTrail, auditEntry],
            };
            // Auto-log timestamps on status transitions
            if (issueData.status === 'Submitted' && issue?.status !== 'Submitted') {
              if (!issue?.corrected_at) updates.corrected_at = now;
              updates.submitted_at = now;
              updates.submission_status = 'Submitted';
            }
            if (issueData.status === 'Resolved' && issue?.status !== 'Resolved') {
              if (!issue?.corrected_at) updates.corrected_at = now;
              if (!issue?.submitted_at) { updates.submitted_at = now; updates.submission_status = 'Submitted'; }
              updates.resolved_at = now;
            }
            if (issueData.status === 'Open') {
              updates.corrected_at = null;
              updates.corrected_by = null;
              updates.correction_note = null;
              updates.submission_status = null;
              updates.submitted_at = null;
              updates.submitted_by = null;
              updates.resolved_at = null;
            }
            // If submission_status toggled to Submitted and no submitted_at yet
            if (submissionStatus === 'Submitted' && !issue?.submitted_at) {
              updates.submitted_at = now;
            }
            // If submission_status cleared, clear submission fields
            if (!submissionStatus && issue?.submission_status === 'Submitted') {
              updates.submitted_at = null;
              updates.submitted_by = null;
            }
            await updateInsuranceIssue(id, updates);
          }
          await loadIssues();
          setEditModalOpen(false);
          setEditModalIssue(null);
        }}
        initialTab="insurance_issues"
        initialData={editModalIssue}
        isDayMode={isDayMode}
      />
    </div>
  );
}
