import { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'lucide-react';
// Types used for RecordData field mapping

// ── Lightweight drag hook (replaces react-draggable for React 19 compat) ──
function useDrag(handleRef: React.RefObject<HTMLDivElement | null>) {
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
  }, [handleRef]);

  const resetPos = useCallback(() => setPos({ x: 0, y: 0 }), []);

  return { pos, resetPos };
}

// ── Tab definitions ──────────────────────────────────────────────
type TabKey = 'patient_ar' | 'credits' | 'insurance_ar' | 'insurance_issues';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'patient_ar', label: 'Patient A/R', icon: Users },
  { key: 'credits', label: 'Credits', icon: CreditCard },
  { key: 'insurance_ar', label: 'Insurance A/R', icon: FileText },
  { key: 'insurance_issues', label: 'Insurance Issues', icon: AlertTriangle },
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

const FIELD_MAP: Record<TabKey, FieldDef[]> = {
  patient_ar: PATIENT_AR_FIELDS,
  credits: CREDITS_FIELDS,
  insurance_ar: INSURANCE_AR_FIELDS,
  insurance_issues: INSURANCE_ISSUES_FIELDS,
};

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
  const handleRef = useRef<HTMLDivElement>(null);
  const { pos, resetPos } = useDrag(handleRef);
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

  // Listen for saves from pop-out windows
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'STELLAR_POPOUT_SAVE') {
        onSave(e.data.tab as TabKey, e.data.data, true).catch(() => {});
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSave]);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    // Clear form when switching to a different category (new entry mode)
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

  const handlePopOut = useCallback(() => {
    const fields = FIELD_MAP[activeTab];
    const tabLabel = TABS.find((t) => t.key === activeTab)?.label || activeTab;

    // Build standalone HTML form for the pop-out window
    const fieldRows = fields
      .map((field) => {
        const val = String(formData[field.key] ?? '');
        const escapedVal = val.replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const req = field.required ? '<span style="color:#ef4444;margin-left:2px">*</span>' : '';

        if (field.type === 'select') {
          const opts = (field.options || [])
            .map((o) => `<option value="${o.value}"${o.value === val ? ' selected' : ''}>${o.label}</option>`)
            .join('');
          return `<div><label>${field.label}${req}</label><select name="${field.key}"><option value="">Select...</option>${opts}</select></div>`;
        }
        if (field.type === 'textarea') {
          return `<div class="full"><label>${field.label}${req}</label><textarea name="${field.key}" rows="3">${escapedVal}</textarea></div>`;
        }
        return `<div><label>${field.label}${req}</label><input type="${field.type}" name="${field.key}" value="${escapedVal}" /></div>`;
      })
      .join('');

    // Tab buttons
    const tabButtons = TABS.map(
      (t) =>
        `<button type="button" class="tab-btn${t.key === activeTab ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>`,
    ).join('');

    const html = `<!DOCTYPE html>
<html><head><title>Stellar OPS - ${tabLabel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#111827;color:#e5e7eb;min-height:100vh}
.header{background:linear-gradient(135deg,#6366f1,#4f46e5);padding:12px 16px;display:flex;align-items:center;gap:10px;cursor:default;user-select:none}
.header h1{font-size:14px;font-weight:600;color:#fff}
.tabs{display:flex;background:#1f2937;border-bottom:1px solid rgba(255,255,255,0.1);overflow-x:auto}
.tab-btn{padding:10px 16px;font-size:12px;font-weight:500;color:#9ca3af;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.tab-btn:hover{color:#e5e7eb;background:#374151}
.tab-btn.active{color:#818cf8;border-bottom-color:#818cf8;background:#111827}
.form{padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form .full{grid-column:1/-1}
label{display:block;font-size:11px;font-weight:500;color:#9ca3af;margin-bottom:4px}
input,select,textarea{width:100%;padding:8px 12px;border-radius:8px;border:1px solid #374151;background:#1f2937;color:#e5e7eb;font-size:13px;outline:none;transition:border-color .2s}
input:focus,select:focus,textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
textarea{resize:none}
.actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);margin-top:4px}
.btn{padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:all .2s}
.btn-cancel{background:#374151;color:#9ca3af}.btn-cancel:hover{background:#4b5563}
.btn-save{background:#6366f1;color:#fff}.btn-save:hover{background:#4f46e5}
.toast{position:fixed;top:12px;right:12px;background:#059669;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;opacity:0;transition:opacity .3s;pointer-events:none;z-index:100}
.toast.show{opacity:1}
</style></head><body>
<div class="header"><h1>Stellar OPS - ${tabLabel}</h1></div>
<div class="tabs">${tabButtons}</div>
<form class="form" id="popoutForm">${fieldRows}<div class="actions"><button type="button" class="btn btn-cancel" onclick="window.close()">Cancel</button><button type="submit" class="btn btn-save">Save</button></div></form>
<div class="toast" id="toast">Saved!</div>
<script>
const FIELD_MAP = ${JSON.stringify(Object.fromEntries(Object.entries(FIELD_MAP).map(([k, v]) => [k, v.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options, required: f.required }))])))};
const formData = ${JSON.stringify(formData)};

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const tab = this.dataset.tab;
    const fields = FIELD_MAP[tab] || [];
    const form = document.getElementById('popoutForm');
    const actionsHtml = '<div class="actions"><button type="button" class="btn btn-cancel" onclick="window.close()">Cancel</button><button type="submit" class="btn btn-save">Save</button></div>';
    form.innerHTML = fields.map(f => {
      const val = '';
      const req = f.required ? '<span style="color:#ef4444;margin-left:2px">*</span>' : '';
      if (f.type === 'select') {
        const opts = (f.options||[]).map(o => '<option value="'+o.value+'">'+o.label+'</option>').join('');
        return '<div class="'+(f.type==='textarea'?'full':'')+'"><label>'+f.label+req+'</label><select name="'+f.key+'"><option value="">Select...</option>'+opts+'</select></div>';
      }
      if (f.type === 'textarea') return '<div class="full"><label>'+f.label+req+'</label><textarea name="'+f.key+'" rows="3">'+val+'</textarea></div>';
      return '<div><label>'+f.label+req+'</label><input type="'+f.type+'" name="'+f.key+'" value="'+val+'" /></div>';
    }).join('') + actionsHtml;
    document.querySelector('.header h1').textContent = 'Stellar OPS - ' + this.textContent;
  });
});

document.getElementById('popoutForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const fd = new FormData(this);
  const data = Object.fromEntries(fd.entries());
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: 'STELLAR_POPOUT_SAVE', tab: document.querySelector('.tab-btn.active').dataset.tab, data: data }, '*');
  }
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
});
</script></body></html>`;

    const popup = window.open('', '_blank', 'width=700,height=800,resizable=yes,scrollbars=yes');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
    }
  }, [activeTab, formData]);

  if (!isOpen) return null;

  const fields = FIELD_MAP[activeTab];

  // Theme classes
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Draggable Modal */}
      <div
        className={`fixed z-50 rounded-xl shadow-2xl overflow-hidden ${bgModal}`}
        style={{
          top: `calc(10% + ${pos.y}px)`,
          left: `calc(50% + ${pos.x}px)`,
          transform: 'translateX(-50%)',
          width: 'min(640px, 92vw)',
          maxHeight: minimized ? 'auto' : '82vh',
        }}
      >
        {/* ── Header / Drag Handle ── */}
        <div
          ref={handleRef}
          className={`cursor-grab active:cursor-grabbing px-4 py-3 ${bgHeader} flex items-center justify-between select-none touch-none`}
        >
          <div className="flex items-center gap-3">
            <img
              src="/Stellar2 copy.jpg"
              alt="Stellar OPS"
              className="h-7 w-7 rounded-md object-cover pointer-events-none"
            />
            <span className="text-white font-semibold text-sm tracking-wide">
              Stellar OPS Dashboard
            </span>
            <GripHorizontal size={14} className="text-white/40" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePopOut}
              className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="Pop out to new window"
            >
              <ExternalLink size={15} />
            </button>
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title={minimized ? 'Expand' : 'Minimize'}
            >
              <Minus size={15} />
            </button>
            <button
              onClick={onClose}
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
            <div className={`${bgTabBar} flex gap-0 overflow-x-auto`}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
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
            <div className={`${bgForm} px-5 py-4 overflow-y-auto`} style={{ maxHeight: 'calc(82vh - 160px)' }}>
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
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
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
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          rows={3}
                          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 resize-none ${inputBg}`}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={String(value)}
                          onChange={(e) =>
                            handleFieldChange(
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
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={handleCreateNew}
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
                    onClick={onClose}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isDayMode
                        ? 'text-gray-600 hover:bg-gray-100'
                        : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
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
      </div>
    </>
  );
}

export type { TabKey, RecordData };
