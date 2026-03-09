import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  X,
  Minus,
  ExternalLink,
  Save,
  PlusCircle,
  Users,
  CreditCard,
  FileText,
  AlertTriangle,
  GripHorizontal,
  DollarSign,
} from 'lucide-react';

// ── Lightweight drag hook ──
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

// ── Tab definitions ──────────────────────────────────────────────
type TabKey = 'patient_ar' | 'credits' | 'insurance_ar' | 'insurance_issues' | 'eft_reconciliation';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'patient_ar', label: 'Patient A/R', icon: Users },
  { key: 'credits', label: 'Credits', icon: CreditCard },
  { key: 'insurance_ar', label: 'Insurance A/R', icon: FileText },
  { key: 'insurance_issues', label: 'Insurance Issues', icon: AlertTriangle },
  { key: 'eft_reconciliation', label: 'EFT Reconciliation', icon: DollarSign },
];

// ── Field schema per tab ─────────────────────────────────────────
type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  required?: boolean;
};

const PATIENT_AR_FIELDS: FieldDef[] = [
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'patient_id', label: 'Patient ID', type: 'text' },
  { key: 'related_family', label: 'Related Family', type: 'text' },
  { key: 'dos', label: 'Date of Service', type: 'date', required: true },
  { key: 'current_balance', label: 'Current Balance', type: 'number', required: true },
  { key: 'original_balance', label: 'Original Balance', type: 'number' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'not_started', label: 'Not Started' },
      { value: '1st_contact_made', label: '1st Contact Made' },
      { value: '2nd_contact_made', label: '2nd Contact Made' },
      { value: 'final_contact_made', label: 'Final Contact Made' },
      { value: 'paid', label: 'Paid' },
      { value: 'pending_writeoff', label: 'Pending Write-Off' },
      { value: 'high_balance_alert', label: 'High Balance Alert' },
      { value: 'completed', label: 'Completed' },
    ],
  },
  { key: 'action_needed', label: 'Action Needed', type: 'textarea' },
  { key: 'background_notes', label: 'Background Notes', type: 'textarea' },
];

const CREDITS_FIELDS: FieldDef[] = [
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'patient_id', label: 'Patient ID', type: 'text' },
  { key: 'credit_amount', label: 'Credit Amount', type: 'number', required: true },
  { key: 'credit_date', label: 'Credit Date', type: 'date', required: true },
  {
    key: 'credit_source',
    label: 'Credit Source',
    type: 'select',
    options: [
      { value: 'overpayment', label: 'Patient Overpayment' },
      { value: 'insurance_overpayment', label: 'Insurance Overpayment' },
      { value: 'refund_pending', label: 'Refund Pending' },
      { value: 'adjustment', label: 'Adjustment' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'unapplied', label: 'Unapplied' },
      { value: 'applied', label: 'Applied' },
      { value: 'pending_refund', label: 'Pending Refund' },
      { value: 'refunded', label: 'Refunded' },
    ],
  },
  { key: 'applied_to', label: 'Applied To', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const INSURANCE_AR_FIELDS: FieldDef[] = [
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'patient_id', label: 'Patient ID', type: 'text' },
  { key: 'insurance_company', label: 'Insurance Company', type: 'text', required: true },
  { key: 'date_of_service', label: 'Date of Service', type: 'date', required: true },
  { key: 'claim_number', label: 'Claim Number', type: 'text' },
  { key: 'claim_amount', label: 'Claim Amount', type: 'number', required: true },
  { key: 'collected', label: 'Collected', type: 'number' },
  { key: 'outstanding', label: 'Outstanding', type: 'number' },
  {
    key: 'pri_sec',
    label: 'Primary/Secondary',
    type: 'select',
    options: [
      { value: 'Primary', label: 'Primary' },
      { value: 'Secondary', label: 'Secondary' },
    ],
  },
  { key: 'procedure_code', label: 'Procedure Code', type: 'text' },
  { key: 'assigned_to', label: 'Assigned To', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const INSURANCE_ISSUES_FIELDS: FieldDef[] = [
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'patient_id', label: 'Patient ID', type: 'text' },
  { key: 'date_of_service', label: 'Date of Service', type: 'date', required: true },
  { key: 'procedure_codes', label: 'Procedure Codes', type: 'text', required: true },
  { key: 'in_charge', label: 'Provider (In-Charge)', type: 'text' },
  {
    key: 'issue_type',
    label: 'Issue Type',
    type: 'select',
    options: [
      { value: 'Needs Perio Chart', label: 'Needs Perio Chart' },
      { value: 'Invalid Tooth Code for Carrier', label: 'Invalid Tooth Code for Carrier' },
      { value: 'Invalid Number of Surfaces', label: 'Invalid Number of Surfaces' },
      { value: 'Invalid Surface Code for Carrier', label: 'Invalid Surface Code for Carrier' },
      { value: 'Tooth Code Required by Carrier', label: 'Tooth Code Required by Carrier' },
      { value: 'Oral Cavity Code Required by Carrier', label: 'Oral Cavity Code Required by Carrier' },
      { value: 'Needs Narrative', label: 'Needs Narrative' },
      { value: 'Need Provider Change', label: 'Need Provider Change' },
      { value: 'Invalid Tooth/Surface Code', label: 'Invalid Tooth/Surface Code' },
      { value: 'Pre-Auth Required', label: 'Pre-Auth Required' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'Open', label: 'Open' },
      { value: 'Corrected', label: 'Corrected' },
      { value: 'Resolved', label: 'Resolved' },
    ],
  },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const EFT_RECONCILIATION_FIELDS: FieldDef[] = [
  { key: 'insurance_company', label: 'Insurance Company', type: 'text', required: true },
  { key: 'payment_date', label: 'Payment Date', type: 'date', required: true },
  { key: 'trn_number', label: 'TRN #', type: 'text', required: true },
  { key: 'date_posted', label: 'Date Posted', type: 'date' },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'None' },
      { value: 'posted', label: 'Posted' },
      { value: 'pending', label: 'Pending' },
      { value: 'posted already by via', label: 'Posted Already' },
      { value: 'exception', label: 'Exception' },
      { value: 'reconciled', label: 'Reconciled' },
    ],
  },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const FIELD_MAP: Record<TabKey, FieldDef[]> = {
  patient_ar: PATIENT_AR_FIELDS,
  credits: CREDITS_FIELDS,
  insurance_ar: INSURANCE_AR_FIELDS,
  insurance_issues: INSURANCE_ISSUES_FIELDS,
  eft_reconciliation: EFT_RECONCILIATION_FIELDS,
};

// ── Popout Portal ────────────────────────────────────────────────
// Uses the Document Picture-in-Picture API (Chrome/Edge 116+) to create a true
// always-on-top floating window. Falls back to window.open for other browsers.
const CLOSE_WARN_KEY = 'stellar_popout_skip_close_warn';

// Copies stylesheets from the parent document into a popup/pip window
function copyStylesToWindow(targetDoc: Document) {
  const parentHead = document.head;
  const targetHead = targetDoc.head;

  // Copy <link> stylesheets
  parentHead.querySelectorAll('link[rel="stylesheet"], link[href*="fonts"]').forEach((link) => {
    const clone = targetDoc.createElement('link');
    clone.rel = 'stylesheet';
    clone.href = (link as HTMLLinkElement).href;
    if ((link as HTMLLinkElement).crossOrigin) clone.crossOrigin = (link as HTMLLinkElement).crossOrigin;
    targetHead.appendChild(clone);
  });

  // Copy <style> tags (Vite injects Tailwind here in dev mode)
  parentHead.querySelectorAll('style').forEach((style) => {
    const clone = targetDoc.createElement('style');
    clone.textContent = style.textContent;
    targetHead.appendChild(clone);
  });

  // Copy preconnect links for Google Fonts
  parentHead.querySelectorAll('link[rel="preconnect"]').forEach((link) => {
    const clone = targetDoc.createElement('link');
    clone.rel = 'preconnect';
    clone.href = (link as HTMLLinkElement).href;
    if ((link as HTMLLinkElement).crossOrigin) clone.crossOrigin = (link as HTMLLinkElement).crossOrigin;
    targetHead.appendChild(clone);
  });

  // Base styles for popup/PiP windows.
  // Uses !important to guarantee these can't be overridden by copied
  // Tailwind/custom styles from the parent document.
  const baseStyle = targetDoc.createElement('style');
  baseStyle.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      overscroll-behavior: none !important;
    }
    body {
      font-family: 'Nunito Sans', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    #popout-root {
      position: fixed !important;
      inset: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      min-height: 0 !important;
    }
    /* Chromium flexbox fix: flex column children need min-height:0 to allow
       overflow:auto to actually constrain and scroll instead of expanding. */
    #popout-root > * {
      min-height: 0 !important;
    }
    /* The PiP window is 600px wide, which triggers the @media (max-width:640px)
       rule in index.css that adds scroll-behavior:smooth to .overflow-x-auto.
       This causes accumulated/delayed scrolling. Force it back to auto. */
    .overflow-x-auto {
      scroll-behavior: auto !important;
    }
    /* CSS-level scroll isolation for the form body */
    .overflow-y-auto {
      overscroll-behavior: contain;
    }
  `;
  targetHead.appendChild(baseStyle);
}

// Check if Document Picture-in-Picture API is available
function hasDocPip(): boolean {
  return 'documentPictureInPicture' in window;
}

// Open a Document PiP window (async, must be called from click handler)
async function openDocPipWindow(): Promise<Window> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pip = (window as any).documentPictureInPicture;
  const pipWindow: Window = await pip.requestWindow({ width: 600, height: 700 });
  return pipWindow;
}

// Fallback: open a regular popup window (synchronous, from click handler)
function openFallbackPopup(): Window | null {
  const w = 600, h = 700;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  return window.open('', '', `popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`);
}

function PopoutPortal({
  children,
  popupWindow,
  onClose,
}: {
  children: React.ReactNode;
  popupWindow: Window;
  onClose: () => void;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const popup = popupWindow;
    if (popup.closed) { onClose(); return; }

    copyStylesToWindow(popup.document);

    // Create mount point
    const root = popup.document.createElement('div');
    root.id = 'popout-root';
    popup.document.body.appendChild(root);
    setContainer(root);

    // Handle the pip window closing (works for both PiP 'pagehide' and regular popup)
    const handleClose = () => onClose();
    popup.addEventListener('pagehide', handleClose);

    // Poll as fallback for regular popups
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        onClose();
      }
    }, 500);

    return () => {
      clearInterval(checkClosed);
      popup.removeEventListener('pagehide', handleClose);
      if (!popup.closed) popup.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!container) return null;
  return createPortal(children, container);
}

// ── Shared Modal Content (used by both in-app modal and pop-out) ──
function ModalContent({
  activeTab,
  onTabChange,
  formData,
  onFieldChange,
  onSave,
  onCreateNew,
  onClose,
  saving,
  isNew,
  isDayMode,
  isPopout,
  minimized,
  onMinimize,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  formData: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onCreateNew: () => void;
  onClose: () => void;
  saving: boolean;
  isNew: boolean;
  isDayMode: boolean;
  isPopout: boolean;
  minimized: boolean;
  onMinimize: () => void;
}) {
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const fields = FIELD_MAP[activeTab];

  const bgModal = isDayMode
    ? 'bg-white border border-gray-200'
    : 'bg-gray-900 border border-white/10';
  const bgHeader = isDayMode
    ? 'bg-gradient-to-r from-primary-500 to-primary-600'
    : 'bg-gradient-to-r from-primary-700 to-primary-800';
  const bgTabBar = isDayMode ? 'bg-gray-50 border-b border-gray-200' : 'bg-gray-800/60 border-b border-white/10';
  const bgForm = isDayMode ? 'bg-white' : 'bg-gray-900';
  const textSecondary = isDayMode ? 'text-gray-600' : 'text-gray-400';
  const inputBg = isDayMode
    ? 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-500/20'
    : 'bg-gray-800 border-gray-600 text-white focus:border-primary-400 focus:ring-primary-400/20';

  const attemptClose = useCallback(() => {
    if (!isPopout) {
      onClose();
      return;
    }
    let skip = false;
    try { skip = localStorage.getItem(CLOSE_WARN_KEY) === 'true'; } catch { /* ignore */ }
    if (skip) {
      onClose();
      return;
    }
    setShowCloseDialog(true);
  }, [isPopout, onClose]);

  const confirmClose = useCallback(() => {
    if (dontShowAgain) {
      try { localStorage.setItem(CLOSE_WARN_KEY, 'true'); } catch { /* ignore */ }
    }
    setShowCloseDialog(false);
    onClose();
  }, [dontShowAgain, onClose]);

  return (
    <div className={`${isPopout ? 'flex-1 min-h-0 overflow-hidden' : 'rounded-xl shadow-2xl overflow-hidden'} flex flex-col ${bgModal}`}>
      {/* ── Header ── */}
      <div className={`px-4 py-3 ${bgHeader} flex items-center justify-between select-none flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <img
            src="/Stellar2 copy.jpg"
            alt="Stellar OPS"
            className="h-7 w-7 rounded-md object-cover pointer-events-none"
          />
          <span className="text-white font-semibold text-sm tracking-wide font-display">
            Stellar OPS Dashboard
          </span>
          {!isPopout && <GripHorizontal size={14} className="text-white/40" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            <Minus size={15} />
          </button>
          <button
            onClick={attemptClose}
            className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* ── Tab Navigation ── */}
          <div
            className={`${bgTabBar} flex gap-0 overflow-x-auto flex-shrink-0`}
            style={{ overscrollBehavior: 'none', scrollbarWidth: 'none' }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? isDayMode
                        ? 'border-primary-500 text-primary-600 bg-white'
                        : 'border-primary-400 text-primary-300 bg-gray-900'
                      : isDayMode
                        ? 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Form Body ── */}
          <div
            className={`${bgForm} px-5 py-4 overflow-y-auto flex-1 min-h-0`}
            style={{ overscrollBehavior: 'contain' }}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {fields.map((field) => {
                const value = formData[field.key] ?? '';
                const isFullWidth = field.type === 'textarea';
                return (
                  <div key={field.key} className={isFullWidth ? 'col-span-2' : ''}>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
                      {field.label}
                      {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={String(value)}
                        onChange={(e) => onFieldChange(field.key, e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 ${inputBg}`}
                      >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={String(value)}
                        onChange={(e) => onFieldChange(field.key, e.target.value)}
                        rows={3}
                        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 resize-none ${inputBg}`}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={String(value)}
                        onChange={(e) =>
                          onFieldChange(
                            field.key,
                            field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value,
                          )
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 ${inputBg}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Actions ── */}
            <div className={`flex items-center justify-between mt-5 pt-4 border-t ${isDayMode ? 'border-gray-200' : 'border-white/10'}`}>
              <button
                onClick={onCreateNew}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isDayMode
                    ? 'text-primary-600 hover:bg-primary-50'
                    : 'text-primary-400 hover:bg-primary-900/30'
                }`}
              >
                <PlusCircle size={14} />
                Create New Entry
              </button>
              <div className="flex gap-2">
                <button
                  onClick={attemptClose}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isDayMode
                      ? 'text-gray-600 hover:bg-gray-100'
                      : 'text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all ${
                    saving
                      ? 'bg-primary-400 cursor-not-allowed opacity-70'
                      : 'bg-primary-500 hover:bg-primary-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Close confirmation dialog (pop-out only) ── */}
      {showCloseDialog && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCloseDialog(false); }}
        >
          <div className={`rounded-xl p-6 w-[min(380px,90vw)] shadow-2xl ${isDayMode ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-white/10'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${isDayMode ? 'bg-red-50 text-red-600' : 'bg-red-900/20 text-red-400'}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 className={`font-display font-bold text-base mb-1.5 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              Close this window?
            </h3>
            <p className={`text-sm leading-relaxed mb-5 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Any unsaved changes will be lost. Are you sure you want to close?
            </p>
            <label className={`flex items-center gap-2 mb-5 cursor-pointer text-xs ${isDayMode ? 'text-gray-600' : 'text-gray-300'}`}>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-500"
              />
              Don&apos;t show this warning again
            </label>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCloseDialog(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isDayMode ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              >
                Go Back
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecordData = Record<string, any> | null;

interface DraggableEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tab: TabKey, data: Record<string, unknown>, isNew: boolean) => Promise<void>;
  initialTab?: TabKey;
  initialData?: RecordData;
  isDayMode: boolean;
}

export default function DraggableEditModal({
  isOpen,
  onClose,
  onSave,
  initialTab = 'patient_ar',
  initialData = null,
  isDayMode,
}: DraggableEditModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const { pos, resetPos } = useDrag(handleRef, isOpen && !popupWindow);
  const isNew = !initialData?.id;

  // Sync initial data when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFormData(initialData ? { ...initialData } : {});
      setMinimized(false);
      resetPos();
    }
  }, [isOpen, initialTab, initialData, resetPos]);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setFormData({});
  }, []);

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(activeTab, formData, isNew);
      toast.success('Entry Saved Successfully', {
        description: `${TABS.find((t) => t.key === activeTab)?.label} record ${isNew ? 'created' : 'updated'}.`,
      });
    } catch (err) {
      toast.error('Save Failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }, [activeTab, formData, isNew, onSave]);

  const handleCreateNew = useCallback(() => {
    setFormData({});
  }, []);

  // Open floating window from click handler — uses Document PiP when available
  const handlePopOut = useCallback(async () => {
    try {
      if (hasDocPip()) {
        const pip = await openDocPipWindow();
        setPopupWindow(pip);
      } else {
        const popup = openFallbackPopup();
        if (popup) setPopupWindow(popup);
      }
    } catch {
      // PiP request can fail if not triggered by user gesture or denied
      const popup = openFallbackPopup();
      if (popup) setPopupWindow(popup);
    }
  }, []);

  const handlePopoutClose = useCallback(() => {
    setPopupWindow(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  // ── Pop-out mode: render via portal into a new browser window ──
  if (popupWindow) {
    return (
      <PopoutPortal popupWindow={popupWindow} onClose={handlePopoutClose}>
        <ModalContent
          activeTab={activeTab}
          onTabChange={handleTabChange}
          formData={formData}
          onFieldChange={handleFieldChange}
          onSave={handleSave}
          onCreateNew={handleCreateNew}
          onClose={handlePopoutClose}
          saving={saving}
          isNew={isNew}
          isDayMode={isDayMode}
          isPopout={true}
          minimized={minimized}
          onMinimize={() => setMinimized(!minimized)}
        />
      </PopoutPortal>
    );
  }

  // ── In-app modal mode ──
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Draggable Modal */}
      <div
        className="fixed z-50"
        style={{
          top: `calc(10% + ${pos.y}px)`,
          left: `calc(50% + ${pos.x}px)`,
          transform: 'translateX(-50%)',
          width: 'min(640px, 92vw)',
          maxHeight: minimized ? 'auto' : '82vh',
        }}
      >
        {/* Invisible drag handle layered on header area only */}
        <div
          ref={handleRef}
          className="absolute top-0 left-0 right-0 h-[48px] cursor-grab active:cursor-grabbing z-10 touch-none"
          style={{ pointerEvents: 'auto' }}
        />

        <ModalContent
          activeTab={activeTab}
          onTabChange={handleTabChange}
          formData={formData}
          onFieldChange={handleFieldChange}
          onSave={handleSave}
          onCreateNew={handleCreateNew}
          onClose={onClose}
          saving={saving}
          isNew={isNew}
          isDayMode={isDayMode}
          isPopout={false}
          minimized={minimized}
          onMinimize={() => setMinimized(!minimized)}
        />

        {/* Pop-out button overlaid on header */}
        <button
          onClick={handlePopOut}
          className="absolute top-3 right-[88px] z-20 p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          title="Pop out to floating window"
        >
          <ExternalLink size={15} />
        </button>
      </div>
    </>
  );
}

export type { TabKey, RecordData };
