// src/components/NotesAuditDrawer.tsx
// =====================================================
// Reusable Notes & Audit Trail Drawer
// Shows two tabs: Team Notes (add/view) and Audit Trail
// Used across all dashboard sections that support notes
// =====================================================

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MessageSquare,
  History,
  Plus,
  Clock,
  ArrowRight,
  FileText,
  User,
  AlertTriangle,
  GripHorizontal,
} from 'lucide-react';
import type { NoteEntry, NoteSource, AuditTrailEntry } from '../types/database.types';

// =====================================================
// HELPERS
// =====================================================

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

function getActionLabel(action: AuditTrailEntry['action']): string {
  switch (action) {
    case 'created': return 'Created';
    case 'updated': return 'Updated';
    case 'status_changed': return 'Status Changed';
    case 'note_added': return 'Note Added';
    case 'deleted': return 'Deleted';
    case 'archived': return 'Archived';
    case 'unarchived': return 'Unarchived';
    case 'moved': return 'Moved';
    default: return action;
  }
}

function getActionColor(action: AuditTrailEntry['action'], isDayMode: boolean): string {
  switch (action) {
    case 'created':
      return isDayMode ? 'bg-green-100 text-green-800' : 'bg-green-900/40 text-green-300';
    case 'updated':
      return isDayMode ? 'bg-blue-100 text-blue-800' : 'bg-blue-900/40 text-blue-300';
    case 'status_changed':
      return isDayMode ? 'bg-amber-100 text-amber-800' : 'bg-amber-900/40 text-amber-300';
    case 'note_added':
      return isDayMode ? 'bg-purple-100 text-purple-800' : 'bg-purple-900/40 text-purple-300';
    case 'deleted':
      return isDayMode ? 'bg-red-100 text-red-800' : 'bg-red-900/40 text-red-300';
    case 'archived':
    case 'unarchived':
      return isDayMode ? 'bg-orange-100 text-orange-800' : 'bg-orange-900/40 text-orange-300';
    case 'moved':
      return isDayMode ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-900/40 text-cyan-300';
    default:
      return isDayMode ? 'bg-gray-100 text-gray-800' : 'bg-gray-700 text-gray-300';
  }
}

function getTimelineDotColor(action: AuditTrailEntry['action']): string {
  switch (action) {
    case 'created': return 'bg-green-500';
    case 'updated': return 'bg-blue-500';
    case 'status_changed': return 'bg-amber-500';
    case 'note_added': return 'bg-purple-500';
    case 'deleted': return 'bg-red-500';
    case 'archived':
    case 'unarchived': return 'bg-orange-500';
    case 'moved': return 'bg-cyan-500';
    default: return 'bg-gray-500';
  }
}

// =====================================================
// DRAG HOOK (allows the drawer to be repositioned)
// =====================================================

function useDrag(handleRef: React.RefObject<HTMLDivElement | null>, isVisible: boolean) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      dragging.current = true;
      start.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      setPos({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
    };

    const onPointerUp = () => {
      dragging.current = false;
    };

    handle.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [handleRef, isVisible]);

  const resetPos = useCallback(() => setPos({ x: 0, y: 0 }), []);

  return { pos, resetPos };
}

// =====================================================
// PROPS
// =====================================================

interface NotesAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDayMode: boolean;
  entityType: string; // e.g. "Patient A/R", "Insurance Issue", "Claim"
  entityLabel: string; // e.g. patient name
  notes: NoteEntry[];
  auditTrail: AuditTrailEntry[];
  onAddNote: (note: NoteEntry) => void;
}

// =====================================================
// COMPONENT
// =====================================================

export default function NotesAuditDrawer({
  isOpen,
  onClose,
  isDayMode,
  entityType,
  entityLabel,
  notes,
  auditTrail,
  onAddNote,
}: NotesAuditDrawerProps) {
  type Tab = 'notes' | 'audit';
  const [activeTab, setActiveTab] = useState<Tab>('notes');

  // Add note form state
  const [noteText, setNoteText] = useState('');
  const [noteSource, setNoteSource] = useState<NoteSource>('stellar');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { pos, resetPos } = useDrag(dragHandleRef, isOpen);

  // Track whether the user has unsaved content in the note form
  const hasUnsavedChanges = showAddForm && (noteText.trim() !== '' || noteAuthor.trim() !== '');

  // Attempt to close — shows confirmation if there are unsaved changes
  const attemptClose = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  // Sort notes newest first
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notes],
  );

  // Sort audit trail newest first
  const sortedAudit = useMemo(
    () => [...auditTrail].sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()),
    [auditTrail],
  );

  // Close on Escape (with unsaved-changes guard)
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') attemptClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, attemptClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus textarea when showing add form
  useEffect(() => {
    if (showAddForm && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showAddForm]);

  // Reset form and position when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setNoteText('');
      setNoteAuthor('');
      setShowAddForm(false);
      setShowCloseConfirm(false);
      resetPos();
    }
  }, [isOpen, resetPos]);

  if (!isOpen) return null;

  const handleSubmitNote = () => {
    if (!noteText.trim()) return;
    const newNote: NoteEntry = {
      text: noteText.trim(),
      source: noteSource,
      author: noteAuthor,
      created_at: new Date().toISOString(),
    };
    onAddNote(newNote);
    setNoteText('');
    setNoteAuthor('');
    setShowAddForm(false);
  };

  // Style helpers
  const bgPrimary = isDayMode ? 'bg-white' : 'bg-gray-800';
  const textPrimary = isDayMode ? 'text-gray-900' : 'text-white';
  const textSecondary = isDayMode ? 'text-gray-600' : 'text-gray-400';
  const textMuted = isDayMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDayMode ? 'border-gray-200' : 'border-gray-700';
  const inputCls = isDayMode
    ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
    : 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400 focus:border-blue-400';

  const sourceBadge = (source: NoteSource) => {
    if (source === 'office') {
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
            isDayMode ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/40 text-blue-300'
          }`}
        >
          Office
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
          isDayMode ? 'bg-violet-100 text-violet-700' : 'bg-violet-900/40 text-violet-300'
        }`}
      >
        Stellar
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ animation: 'notesPopupFadeIn 0.15s ease-out' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={attemptClose}
      />

      {/* Draggable Drawer */}
      <div
        ref={drawerRef}
        className={`fixed z-50 w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl border flex flex-col ${bgPrimary} ${borderColor}`}
        style={{
          top: `calc(8% + ${pos.y}px)`,
          left: `calc(50% + ${pos.x}px)`,
          transform: 'translateX(-50%)',
          width: 'min(672px, calc(100vw - 2rem))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Invisible drag handle — covers header area except buttons */}
        <div
          ref={dragHandleRef}
          className="absolute top-0 left-0 right-[56px] h-[60px] cursor-grab active:cursor-grabbing z-10 touch-none"
          style={{ pointerEvents: 'auto' }}
        />

        {/* ===== Header ===== */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${borderColor} select-none`}
        >
          <div className="flex items-center gap-3">
            <div>
              <h3 className={`text-lg font-bold ${textPrimary}`}>Notes & Audit Trail</h3>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                {entityType} &mdash; {entityLabel}
              </p>
            </div>
            <GripHorizontal className={`w-4 h-4 ${textMuted}`} />
          </div>
          <button
            onClick={attemptClose}
            className={`p-1.5 rounded-lg transition-colors relative z-20 ${
              isDayMode ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===== Tabs ===== */}
        <div className={`flex border-b ${borderColor} flex-shrink-0`}>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === 'notes'
                ? isDayMode
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-b-2 border-blue-400 text-blue-300 bg-blue-900/20'
                : isDayMode
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Team Notes
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                activeTab === 'notes'
                  ? 'bg-blue-100 text-blue-700'
                  : isDayMode
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-700 text-gray-400'
              }`}
            >
              {notes.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === 'audit'
                ? isDayMode
                  ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-b-2 border-emerald-400 text-emerald-300 bg-emerald-900/20'
                : isDayMode
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Trail
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                activeTab === 'audit'
                  ? 'bg-emerald-100 text-emerald-700'
                  : isDayMode
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-700 text-gray-400'
              }`}
            >
              {auditTrail.length}
            </span>
          </button>
        </div>

        {/* ===== Content ===== */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'notes' ? (
            <div className="p-5 space-y-4">
              {/* Add Note Button / Form */}
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed text-sm font-medium transition-colors ${
                    isDayMode
                      ? 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                      : 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-900/20'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Add Team Note
                </button>
              ) : (
                <div
                  className={`rounded-lg border p-4 space-y-3 ${
                    isDayMode ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-900/10 border-blue-800'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Source</label>
                      <select
                        value={noteSource}
                        onChange={(e) => setNoteSource(e.target.value as NoteSource)}
                        className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                      >
                        <option value="stellar">Stellar Team</option>
                        <option value="office">Court Street Dental Team</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
                        Author Initials
                      </label>
                      <input
                        type="text"
                        value={noteAuthor}
                        onChange={(e) => setNoteAuthor(e.target.value)}
                        placeholder="Enter initials..."
                        className={`w-full text-sm rounded-md border px-3 py-2 ${inputCls}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Note</label>
                    <textarea
                      ref={textareaRef}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Enter your note..."
                      rows={3}
                      className={`w-full text-sm rounded-md border px-3 py-2 resize-y ${inputCls}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSubmitNote();
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] ${textMuted}`}>Ctrl+Enter to submit</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNoteText('');
                          setNoteAuthor('');
                        }}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                          isDayMode
                            ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitNote}
                        disabled={!noteText.trim()}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {sortedNotes.length === 0 ? (
                <div className={`text-center py-10 ${textMuted}`}>
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No notes yet</p>
                  <p className="text-xs mt-1">Add a team note to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedNotes.map((note, idx) => (
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
                            <span
                              className={`font-semibold text-xs ${
                                isDayMode ? 'text-gray-800' : 'text-gray-200'
                              }`}
                            >
                              {note.author}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] whitespace-nowrap ${
                            isDayMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {formatTimestamp(note.created_at)}
                        </span>
                      </div>
                      <p className={isDayMode ? 'text-gray-700' : 'text-gray-300'}>
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ===== Audit Trail Tab ===== */
            <div className="p-5">
              {sortedAudit.length === 0 ? (
                <div className={`text-center py-10 ${textMuted}`}>
                  <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No audit history yet</p>
                  <p className="text-xs mt-1">Changes to this record will appear here</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {sortedAudit.map((entry, idx) => (
                    <div
                      key={entry.id || idx}
                      className={`relative pl-8 pb-5 ${
                        idx < sortedAudit.length - 1
                          ? `border-l-2 ${isDayMode ? 'border-gray-200' : 'border-gray-700'}`
                          : ''
                      }`}
                      style={{ marginLeft: '7px' }}
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full ${getTimelineDotColor(entry.action)} border-2 ${
                          isDayMode ? 'border-white' : 'border-gray-800'
                        }`}
                      />

                      {/* Entry card */}
                      <div
                        className={`rounded-lg p-3 ${
                          isDayMode
                            ? 'bg-gray-50 border border-gray-150'
                            : 'bg-gray-700/40 border border-gray-600'
                        }`}
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${getActionColor(entry.action, isDayMode)}`}
                            >
                              {getActionLabel(entry.action)}
                            </span>
                            {entry.changed_by && (
                              <span className="flex items-center gap-1">
                                <User className={`w-3 h-3 ${textMuted}`} />
                                <span
                                  className={`text-xs font-medium ${
                                    isDayMode ? 'text-gray-700' : 'text-gray-300'
                                  }`}
                                >
                                  {entry.changed_by}
                                </span>
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] whitespace-nowrap flex items-center gap-1 ${textMuted}`}>
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(entry.changed_at)}
                          </span>
                        </div>

                        {/* Field change details */}
                        {entry.field && (
                          <div className={`text-xs mt-1 ${textSecondary}`}>
                            <span className="font-medium">{entry.field}:</span>
                            {entry.old_value !== undefined && entry.new_value !== undefined ? (
                              <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    isDayMode ? 'bg-red-50 text-red-700 line-through' : 'bg-red-900/20 text-red-400 line-through'
                                  }`}
                                >
                                  {entry.old_value || '(empty)'}
                                </span>
                                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    isDayMode ? 'bg-green-50 text-green-700' : 'bg-green-900/20 text-green-400'
                                  }`}
                                >
                                  {entry.new_value || '(empty)'}
                                </span>
                              </span>
                            ) : entry.new_value ? (
                              <span className="ml-1">{entry.new_value}</span>
                            ) : null}
                          </div>
                        )}

                        {/* Additional notes */}
                        {entry.notes && (
                          <p className={`text-xs mt-1 ${textSecondary}`}>{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Unsaved Changes Confirmation Dialog ===== */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCloseConfirm(false); }}
        >
          <div
            className={`rounded-xl p-6 w-[min(380px,90vw)] shadow-2xl ${
              isDayMode ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                isDayMode ? 'bg-amber-50 text-amber-600' : 'bg-amber-900/20 text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className={`font-bold text-base mb-1.5 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              Unsaved Note
            </h3>
            <p className={`text-sm leading-relaxed mb-5 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
              You have an unsaved note in progress. Closing now will discard your changes.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isDayMode ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                Keep Editing
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// UTILITY: Generate audit trail entry
// =====================================================

let _auditCounter = 0;

export function createAuditEntry(
  action: AuditTrailEntry['action'],
  changedBy: string,
  options?: {
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
    notes?: string;
  },
): AuditTrailEntry {
  return {
    id: `audit-${Date.now()}-${++_auditCounter}`,
    action,
    field: options?.field,
    old_value: options?.oldValue,
    new_value: options?.newValue,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    notes: options?.notes,
  };
}
