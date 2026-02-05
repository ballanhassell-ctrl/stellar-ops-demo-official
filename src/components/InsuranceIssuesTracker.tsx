// src/components/InsuranceIssuesTracker.tsx
// =====================================================
// Insurance Issues Tracker - mirrors "Insurance Issues Report" spreadsheet
// =====================================================

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileWarning,
} from 'lucide-react';
import type { InsuranceIssue, InsuranceIssueType } from '../types/database.types';
import {
  getInsuranceIssues,
  insertInsuranceIssue,
  updateInsuranceIssue,
  deleteInsuranceIssue,
  calculateIssuesSummary,
} from '../services/insuranceIssuesService';

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

type StatusFilter = 'all' | 'open' | 'resolved';

type NewIssueForm = Omit<InsuranceIssue, 'id' | 'created_at' | 'updated_at'>;

const EMPTY_FORM: NewIssueForm = {
  patient_id: '',
  patient_name: '',
  date_of_service: '',
  procedure_codes: '',
  in_charge: '',
  issue_type: 'Needs Perio Chart',
  in_vyne: false,
  status: null,
  submission_status: null,
  notes: null,
  is_pre_auth: false,
};

// =====================================================
// HELPERS
// =====================================================

function isResolved(issue: InsuranceIssue): boolean {
  return !!issue.status && issue.status.toLowerCase().includes('corrected');
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

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIssueType, setFilterIssueType] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<NewIssueForm>({ ...EMPTY_FORM });
  const [formSaving, setFormSaving] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InsuranceIssue>>({});

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
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          issue.patient_name,
          issue.patient_id ?? '',
          issue.procedure_codes,
          issue.in_charge,
          issue.issue_type,
          issue.status ?? '',
          issue.submission_status ?? '',
          issue.notes ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      // Issue type
      if (filterIssueType !== 'all' && issue.issue_type !== filterIssueType) return false;
      // Provider
      if (filterProvider !== 'all' && issue.in_charge !== filterProvider) return false;
      // Status
      if (filterStatus === 'open' && isResolved(issue)) return false;
      if (filterStatus === 'resolved' && !isResolved(issue)) return false;
      return true;
    });
  }, [issues, searchQuery, filterIssueType, filterProvider, filterStatus]);

  // Split into regular claims and pre-auth
  const regularIssues = useMemo(() => filteredIssues.filter((i) => !i.is_pre_auth), [filteredIssues]);
  const preAuthIssues = useMemo(() => filteredIssues.filter((i) => i.is_pre_auth), [filteredIssues]);

  // ----- CRUD handlers -----
  const handleAddIssue = async () => {
    if (!formData.patient_name || !formData.date_of_service || !formData.procedure_codes) return;
    try {
      setFormSaving(true);
      const created = await insertInsuranceIssue(formData);
      setIssues((prev) => [created, ...prev]);
      setShowAddModal(false);
      setFormData({ ...EMPTY_FORM });
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
      notes: issue.notes,
      in_vyne: issue.in_vyne,
      in_charge: issue.in_charge,
      issue_type: issue.issue_type,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const updated = await updateInsuranceIssue(id, editData);
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
  const rowHover = isDayMode ? 'hover:bg-gray-50' : 'hover:bg-gray-750 hover:bg-gray-700/50';
  const thBg = isDayMode ? 'bg-gray-50 text-gray-700' : 'bg-gray-900 text-gray-300';
  const modalOverlay = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
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

  // ----- Render: status icon -----
  const renderStatusIcon = (issue: InsuranceIssue) => {
    if (isResolved(issue)) {
      return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />;
    }
    return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  };

  // ----- Render: table row -----
  const renderRow = (issue: InsuranceIssue) => {
    const isEditing = editingId === issue.id;
    const resolved = isResolved(issue);
    const rowBg = resolved
      ? isDayMode
        ? 'bg-green-50/50'
        : 'bg-green-900/10'
      : '';

    return (
      <tr key={issue.id} className={`${rowBg} ${rowHover} transition-colors`}>
        {/* Patient ID */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} whitespace-nowrap`}>
          {issue.patient_id ?? '--'}
        </td>

        {/* Patient Name */}
        <td className={`px-3 py-2 text-sm font-medium border-b ${tableBorder} whitespace-nowrap ${headerText}`}>
          {issue.patient_name}
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
          {isEditing ? (
            <select
              value={editData.in_charge ?? issue.in_charge}
              onChange={(e) => setEditData((d) => ({ ...d, in_charge: e.target.value }))}
              className={`text-xs rounded border px-1 py-0.5 ${inputCls}`}
            >
              <option value="">--</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            renderProviderBadge(issue.in_charge)
          )}
        </td>

        {/* Issue Type */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} max-w-[180px]`}>
          {isEditing ? (
            <select
              value={editData.issue_type ?? issue.issue_type}
              onChange={(e) => setEditData((d) => ({ ...d, issue_type: e.target.value as InsuranceIssueType }))}
              className={`text-xs rounded border px-1 py-0.5 w-full ${inputCls}`}
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          ) : (
            <span className="truncate block" title={issue.issue_type}>
              {issue.issue_type}
            </span>
          )}
        </td>

        {/* In Vyne? */}
        <td className={`px-3 py-2 border-b ${tableBorder} text-center`}>
          {isEditing ? (
            <input
              type="checkbox"
              checked={editData.in_vyne ?? issue.in_vyne}
              onChange={(e) => setEditData((d) => ({ ...d, in_vyne: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          ) : (
            renderVyneBadge(issue.in_vyne)
          )}
        </td>

        {/* Status */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} max-w-[220px]`}>
          {isEditing ? (
            <input
              type="text"
              value={editData.status ?? ''}
              onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value || null }))}
              placeholder="e.g. corrected & rebatched"
              className={`text-xs rounded border px-1 py-0.5 w-full ${inputCls}`}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              {renderStatusIcon(issue)}
              <span className="truncate" title={issue.status ?? 'Open'}>
                {issue.status || 'Open'}
              </span>
            </div>
          )}
        </td>

        {/* Submission Status */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} whitespace-nowrap`}>
          {isEditing ? (
            <input
              type="text"
              value={editData.submission_status ?? ''}
              onChange={(e) => setEditData((d) => ({ ...d, submission_status: e.target.value || null }))}
              placeholder="e.g. Submitted - BH"
              className={`text-xs rounded border px-1 py-0.5 w-full ${inputCls}`}
            />
          ) : (
            issue.submission_status ?? '--'
          )}
        </td>

        {/* Notes */}
        <td className={`px-3 py-2 text-xs border-b ${tableBorder} max-w-[200px]`}>
          {isEditing ? (
            <input
              type="text"
              value={editData.notes ?? ''}
              onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value || null }))}
              placeholder="Notes"
              className={`text-xs rounded border px-1 py-0.5 w-full ${inputCls}`}
            />
          ) : (
            <span className="truncate block" title={issue.notes ?? ''}>
              {issue.notes ?? '--'}
            </span>
          )}
        </td>

        {/* Actions */}
        <td className={`px-3 py-2 border-b ${tableBorder} whitespace-nowrap`}>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSaveEdit(issue.id)}
                className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                title="Save"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleStartEdit(issue)}
                className={`p-1 rounded ${isDayMode ? 'text-blue-600 hover:bg-blue-50' : 'text-blue-400 hover:bg-blue-900/30'}`}
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(issue.id)}
                className={`p-1 rounded ${isDayMode ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/30'}`}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
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
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={thBg}>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Patient ID</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Name</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Date of Service</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Procedure</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>In Charge</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Issue Type</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder} text-center`}>In Vyne?</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Status</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Submission Status</th>
                <th className={`px-3 py-2 text-xs font-semibold border-b ${tableBorder}`}>Notes</th>
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

      {/* ===== Summary Stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <Clock className={`w-4 h-4 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`} />
            <span className={`text-xs font-medium ${subText}`}>Open Issues</span>
          </div>
          <span className={`text-2xl font-bold ${isDayMode ? 'text-amber-700' : 'text-amber-400'}`}>
            {summary.openIssues}
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

      {/* ===== Search & Filters ===== */}
      <div className={`rounded-lg p-4 ${card}`}>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
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

            {/* Status */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${subText}`}>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                className={`w-full text-sm rounded-md border px-2 py-1.5 ${inputCls}`}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        )}
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

              {/* Row 4: In Vyne + Pre-Auth */}
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

              {/* Row 5: Status + Submission Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Status</label>
                  <input
                    type="text"
                    value={formData.status ?? ''}
                    onChange={(e) => setFormData((d) => ({ ...d, status: e.target.value || null }))}
                    placeholder="e.g. corrected & rebatched"
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Submission Status</label>
                  <input
                    type="text"
                    value={formData.submission_status ?? ''}
                    onChange={(e) => setFormData((d) => ({ ...d, submission_status: e.target.value || null }))}
                    placeholder="e.g. Submitted - BH"
                    className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                  />
                </div>
              </div>

              {/* Row 6: Notes */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>Notes</label>
                <textarea
                  value={formData.notes ?? ''}
                  onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value || null }))}
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
    </div>
  );
}
