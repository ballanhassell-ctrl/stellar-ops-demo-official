// src/components/InlineEditableField.tsx
// =====================================================
// Reusable inline editable field with:
// - Light highlight on all editable cells
// - Click-to-edit inline (no popup)
// - Confirmation dialog before overriding previous data
// - Automatic audit trail entry generation
// =====================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { createAuditEntry } from './NotesAuditDrawer';
import type { AuditTrailEntry } from '../types/database.types';

// =====================================================
// TYPES
// =====================================================

export type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'select' | 'currency' | 'checkbox';

export interface SelectOption {
  value: string;
  label: string;
}

export interface InlineEditableFieldProps {
  value: string | number | boolean | null;
  displayValue?: string;
  fieldLabel: string;
  fieldType?: FieldType;
  isDayMode: boolean;
  onSave: (newValue: string | number | boolean | null, auditEntry: AuditTrailEntry) => void | Promise<void>;
  selectOptions?: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  changedBy?: string;
  // For number/currency fields
  min?: number;
  max?: number;
  step?: string;
  // Render slot for custom display
  renderDisplay?: (value: string | number | boolean | null) => React.ReactNode;
}

// =====================================================
// CONFIRMATION MODAL
// =====================================================

function ConfirmationModal({
  isDayMode,
  fieldLabel,
  oldValue,
  newValue,
  onConfirm,
  onCancel,
}: {
  isDayMode: boolean;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className={`mx-4 w-full max-w-sm rounded-xl shadow-2xl border p-5 ${
          isDayMode ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className={`w-5 h-5 ${isDayMode ? 'text-amber-500' : 'text-amber-400'}`} />
          <h4 className={`text-sm font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
            Confirm Change
          </h4>
        </div>
        <p className={`text-xs mb-3 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
          You are about to update <span className="font-semibold">{fieldLabel}</span>:
        </p>
        <div className={`rounded-lg p-3 space-y-2 text-xs ${isDayMode ? 'bg-gray-50' : 'bg-gray-700/50'}`}>
          <div className="flex items-start gap-2">
            <span className={`font-medium min-w-[40px] ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>From:</span>
            <span className={`px-2 py-0.5 rounded ${isDayMode ? 'bg-red-50 text-red-700 line-through' : 'bg-red-900/20 text-red-400 line-through'}`}>
              {oldValue || '(empty)'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className={`font-medium min-w-[40px] ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>To:</span>
            <span className={`px-2 py-0.5 rounded ${isDayMode ? 'bg-green-50 text-green-700' : 'bg-green-900/20 text-green-400'}`}>
              {newValue || '(empty)'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isDayMode
                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function InlineEditableField({
  value,
  displayValue,
  fieldLabel,
  fieldType = 'text',
  isDayMode,
  onSave,
  selectOptions,
  placeholder,
  className,
  disabled = false,
  changedBy = 'staff',
  min,
  max,
  step,
  renderDisplay,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingValue, setPendingValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format value for display
  const formatDisplayValue = useCallback(() => {
    if (displayValue !== undefined) return displayValue;
    if (value === null || value === undefined || value === '') return null;
    if (fieldType === 'currency' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    if (fieldType === 'date' && typeof value === 'string' && value) {
      const d = new Date(value + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (fieldType === 'select' && selectOptions) {
      const opt = selectOptions.find((o) => o.value === String(value));
      return opt ? opt.label : String(value);
    }
    if (fieldType === 'checkbox') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }, [value, displayValue, fieldType, selectOptions]);

  // Start editing
  const startEditing = useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
    if (fieldType === 'checkbox') {
      // For checkboxes, toggle immediately
      const newVal = !value;
      setPendingValue(String(newVal));
      setShowConfirmation(true);
      return;
    }
    const strValue = value === null || value === undefined ? '' : String(value);
    setEditValue(strValue);
  }, [disabled, value, fieldType]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current && fieldType !== 'checkbox') {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement && fieldType === 'text') {
        inputRef.current.select();
      }
    }
  }, [isEditing, fieldType]);

  // Click outside to cancel
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        cancelEditing();
      }
    };
    // Delay to avoid catching the initial click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValue('');
    setShowConfirmation(false);
    setPendingValue('');
  };

  const attemptSave = () => {
    let processedValue = editValue;

    // Validate and process
    if (fieldType === 'number' || fieldType === 'currency') {
      const num = parseFloat(editValue);
      if (isNaN(num)) {
        cancelEditing();
        return;
      }
      processedValue = String(num);
    }

    // Check if value actually changed
    const oldStr = value === null || value === undefined ? '' : String(value);
    if (processedValue === oldStr) {
      cancelEditing();
      return;
    }

    // If there was a previous value, show confirmation
    if (oldStr && oldStr.trim()) {
      setPendingValue(processedValue);
      setShowConfirmation(true);
    } else {
      // No previous value, save directly
      performSave(processedValue);
    }
  };

  const performSave = async (newValueStr: string) => {
    setSaving(true);
    try {
      const oldStr = value === null || value === undefined ? '' : String(value);
      let finalValue: string | number | boolean | null;

      if (fieldType === 'number' || fieldType === 'currency') {
        finalValue = parseFloat(newValueStr);
      } else if (fieldType === 'checkbox') {
        finalValue = newValueStr === 'true';
      } else {
        finalValue = newValueStr.trim() || null;
      }

      // Determine display values for the audit entry
      let auditOldDisplay = oldStr;
      let auditNewDisplay = newValueStr;
      if (fieldType === 'select' && selectOptions) {
        const oldOpt = selectOptions.find((o) => o.value === oldStr);
        const newOpt = selectOptions.find((o) => o.value === newValueStr);
        auditOldDisplay = oldOpt ? oldOpt.label : oldStr;
        auditNewDisplay = newOpt ? newOpt.label : newValueStr;
      }
      if (fieldType === 'checkbox') {
        auditOldDisplay = oldStr === 'true' ? 'Yes' : 'No';
        auditNewDisplay = newValueStr === 'true' ? 'Yes' : 'No';
      }
      if (fieldType === 'currency') {
        if (oldStr) auditOldDisplay = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(oldStr));
        auditNewDisplay = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(newValueStr));
      }

      const auditEntry = createAuditEntry('updated', changedBy, {
        field: fieldLabel,
        oldValue: auditOldDisplay || null,
        newValue: auditNewDisplay || null,
      });

      await onSave(finalValue, auditEntry);
    } finally {
      setSaving(false);
      setIsEditing(false);
      setEditValue('');
      setShowConfirmation(false);
      setPendingValue('');
    }
  };

  const handleConfirm = () => {
    performSave(pendingValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      attemptSave();
    }
    if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Style classes
  const highlightClass = isDayMode
    ? 'bg-amber-50/60 hover:bg-amber-100/80 border-amber-200/50'
    : 'bg-amber-900/10 hover:bg-amber-900/20 border-amber-700/30';

  const editInputClass = isDayMode
    ? 'bg-white border-blue-300 text-gray-900 focus:ring-2 focus:ring-blue-400 focus:border-blue-400'
    : 'bg-gray-700 border-blue-500/50 text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

  const shown = renderDisplay ? renderDisplay(value) : formatDisplayValue();

  // Editing mode
  if (isEditing && fieldType !== 'checkbox') {
    return (
      <div ref={containerRef} className="relative">
        <div className={`flex items-center gap-1 ${className || ''}`}>
          {fieldType === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  attemptSave();
                }
                if (e.key === 'Escape') cancelEditing();
              }}
              rows={2}
              className={`w-full px-2 py-1 rounded-md border text-xs resize-none focus:outline-none ${editInputClass}`}
            />
          ) : fieldType === 'select' && selectOptions ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                // Auto-save selects after selection
                const oldStr = value === null || value === undefined ? '' : String(value);
                if (e.target.value !== oldStr && oldStr && oldStr.trim()) {
                  setPendingValue(e.target.value);
                  setShowConfirmation(true);
                } else if (e.target.value !== oldStr) {
                  setEditValue(e.target.value);
                  // perform save directly
                  const auditEntry = createAuditEntry('updated', changedBy, {
                    field: fieldLabel,
                    oldValue: oldStr || null,
                    newValue: e.target.value || null,
                  });
                  onSave(e.target.value || null, auditEntry);
                  setIsEditing(false);
                  setEditValue('');
                }
              }}
              className={`w-full px-2 py-1 rounded-md border text-xs focus:outline-none ${editInputClass}`}
            >
              <option value="">-- Select --</option>
              {selectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={fieldType === 'currency' ? 'number' : fieldType}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              min={min}
              max={max}
              step={fieldType === 'currency' ? '0.01' : step}
              placeholder={placeholder}
              className={`w-full px-2 py-1 rounded-md border text-xs focus:outline-none ${editInputClass}`}
            />
          )}
          <button
            onClick={attemptSave}
            disabled={saving}
            className="p-0.5 rounded text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 flex-shrink-0 transition-colors"
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cancelEditing}
            className="p-0.5 rounded text-red-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {showConfirmation && (
          <ConfirmationModal
            isDayMode={isDayMode}
            fieldLabel={fieldLabel}
            oldValue={
              fieldType === 'select' && selectOptions
                ? selectOptions.find((o) => o.value === String(value))?.label || String(value ?? '')
                : fieldType === 'currency' && value
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
                  : String(value ?? '')
            }
            newValue={
              fieldType === 'select' && selectOptions
                ? selectOptions.find((o) => o.value === pendingValue)?.label || pendingValue
                : fieldType === 'currency'
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(pendingValue))
                  : pendingValue
            }
            onConfirm={handleConfirm}
            onCancel={cancelEditing}
          />
        )}
      </div>
    );
  }

  // Display mode - with highlight
  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={startEditing}
        className={`${
          disabled ? 'cursor-default' : 'cursor-pointer'
        } min-h-[24px] px-1.5 py-0.5 rounded text-xs leading-snug border transition-all ${
          disabled ? (isDayMode ? 'bg-transparent border-transparent' : 'bg-transparent border-transparent') : highlightClass
        } ${shown ? '' : 'italic opacity-50'} ${className || ''}`}
        title={disabled ? undefined : 'Click to edit'}
      >
        {shown || placeholder || '--'}
      </div>

      {showConfirmation && (
        <ConfirmationModal
          isDayMode={isDayMode}
          fieldLabel={fieldLabel}
          oldValue={String(value ?? '')}
          newValue={pendingValue === 'true' ? 'Yes' : pendingValue === 'false' ? 'No' : pendingValue}
          onConfirm={handleConfirm}
          onCancel={cancelEditing}
        />
      )}
    </div>
  );
}
