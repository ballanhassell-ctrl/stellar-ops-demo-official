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

// ── Inline SVG icons for pop-out (Lucide isn't available there) ──
const SVG_PLUS = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>';
const SVG_SAVE = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>';
const SVG_GRIP = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
const SVG_USERS = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
const SVG_CREDIT = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>';
const SVG_FILE = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
const SVG_ALERT = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const SVG_MINUS = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>';
const SVG_X = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const SVG_ALERT_TRI = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const TAB_ICONS: Record<string, string> = { patient_ar: SVG_USERS, credits: SVG_CREDIT, insurance_ar: SVG_FILE, insurance_issues: SVG_ALERT };

// ── Standalone pop-out HTML builder ──────────────────────────────
function buildPopoutHTML(activeTab: TabKey, formData: Record<string, unknown>, isDayMode: boolean): string {
  const fields = FIELD_MAP[activeTab];

  const renderField = (field: FieldDef, val: string): string => {
    const escapedVal = val.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const req = field.required ? '<span class="req">*</span>' : '';
    const cls = field.type === 'textarea' ? ' class="full"' : '';

    if (field.type === 'select') {
      const opts = (field.options || [])
        .map((o) => `<option value="${o.value}"${o.value === val ? ' selected' : ''}>${o.label}</option>`)
        .join('');
      return `<div${cls}><label>${field.label}${req}</label><select name="${field.key}"><option value="">Select...</option>${opts}</select></div>`;
    }
    if (field.type === 'textarea') {
      return `<div class="full"><label>${field.label}${req}</label><textarea name="${field.key}" rows="3">${escapedVal}</textarea></div>`;
    }
    return `<div${cls}><label>${field.label}${req}</label><input type="${field.type}" name="${field.key}" value="${escapedVal}" /></div>`;
  };

  const fieldRows = fields.map((f) => renderField(f, String(formData[f.key] ?? ''))).join('');

  const tabButtons = TABS.map(
    (t) => `<button type="button" class="tab-btn${t.key === activeTab ? ' active' : ''}" data-tab="${t.key}"><span class="tab-icon">${TAB_ICONS[t.key]}</span>${t.label}</button>`,
  ).join('');

  const fieldMapJSON = JSON.stringify(
    Object.fromEntries(
      Object.entries(FIELD_MAP).map(([k, v]) => [
        k,
        v.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options, required: f.required })),
      ]),
    ),
  );

  // Color tokens matching the Tailwind theme in tailwind.config.js
  const c = isDayMode
    ? {
        pageBg: '#f3f4f6',
        modalBg: '#ffffff', modalBorder: '#e5e7eb', modalShadow: '0 25px 60px -12px rgba(0,0,0,0.15)',
        headerFrom: '#0066FF', headerTo: '#0052CC',
        tabBarBg: '#f9fafb', tabBarBorder: '#e5e7eb',
        tabText: '#6b7280', tabHoverText: '#374151', tabHoverBg: '#f3f4f6',
        tabActiveText: '#0066FF', tabActiveBorder: '#0066FF', tabActiveBg: '#ffffff',
        formBg: '#ffffff',
        labelText: '#4b5563',
        inputBg: '#ffffff', inputBorder: '#d1d5db', inputText: '#111827',
        inputFocus: '#0066FF', inputFocusRing: 'rgba(0,102,255,0.15)',
        divider: '#e5e7eb',
        newBtnText: '#0066FF', newBtnHover: '#E6F0FF',
        cancelText: '#4b5563', cancelHover: '#f3f4f6',
        saveBg: '#0066FF', saveHover: '#0052CC',
        // Close confirm dialog
        dialogBg: '#ffffff', dialogBorder: '#e5e7eb', dialogText: '#111827', dialogSub: '#6b7280',
        dialogOverlay: 'rgba(0,0,0,0.3)',
        checkBorder: '#d1d5db', checkBg: '#ffffff', checkText: '#374151',
        dangerBg: '#dc2626', dangerHover: '#b91c1c',
        secondaryBg: '#f3f4f6', secondaryText: '#374151', secondaryHover: '#e5e7eb',
        alertIconBg: '#fef2f2', alertIconColor: '#dc2626',
      }
    : {
        pageBg: '#0b0f1a',
        modalBg: '#111827', modalBorder: 'rgba(255,255,255,0.1)', modalShadow: '0 25px 60px -12px rgba(0,0,0,0.5)',
        headerFrom: '#003D99', headerTo: '#002966',
        tabBarBg: 'rgba(31,41,55,0.6)', tabBarBorder: 'rgba(255,255,255,0.1)',
        tabText: '#9ca3af', tabHoverText: '#e5e7eb', tabHoverBg: 'rgba(55,65,81,0.4)',
        tabActiveText: '#3385FF', tabActiveBorder: '#3385FF', tabActiveBg: '#111827',
        formBg: '#111827',
        labelText: '#9ca3af',
        inputBg: '#1f2937', inputBorder: '#374151', inputText: '#f9fafb',
        inputFocus: '#3385FF', inputFocusRing: 'rgba(51,133,255,0.15)',
        divider: 'rgba(255,255,255,0.1)',
        newBtnText: '#3385FF', newBtnHover: 'rgba(0,20,51,0.3)',
        cancelText: '#9ca3af', cancelHover: 'rgba(31,41,55,0.8)',
        saveBg: '#0066FF', saveHover: '#0052CC',
        dialogBg: '#1f2937', dialogBorder: 'rgba(255,255,255,0.1)', dialogText: '#f9fafb', dialogSub: '#9ca3af',
        dialogOverlay: 'rgba(0,0,0,0.5)',
        checkBorder: '#4b5563', checkBg: '#111827', checkText: '#d1d5db',
        dangerBg: '#dc2626', dangerHover: '#b91c1c',
        secondaryBg: 'rgba(55,65,81,0.5)', secondaryText: '#d1d5db', secondaryHover: 'rgba(55,65,81,0.8)',
        alertIconBg: 'rgba(220,38,38,0.15)', alertIconColor: '#ef4444',
      };

  return `<!DOCTYPE html>
<html><head><title>Stellar OPS Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:${c.pageBg};color:${c.inputText};min-height:100vh;display:flex;justify-content:center;padding:16px}

/* ── Floating card container (mirrors the in-app modal) ── */
.modal-card{
  width:100%;max-width:640px;border-radius:12px;overflow:hidden;
  background:${c.modalBg};border:1px solid ${c.modalBorder};
  box-shadow:${c.modalShadow};
  display:flex;flex-direction:column;max-height:calc(100vh - 32px);
  transition:max-height .3s ease;
}
.modal-card.minimized{max-height:48px;overflow:hidden}

/* ── Header ── */
.header{
  background:linear-gradient(to right,${c.headerFrom},${c.headerTo});
  padding:0 16px;height:48px;min-height:48px;
  display:flex;align-items:center;justify-content:space-between;user-select:none;
}
.header-left{display:flex;align-items:center;gap:12px}
.header h1{font-size:14px;font-weight:600;color:#fff;letter-spacing:0.025em}
.header .grip{color:rgba(255,255,255,0.4);display:flex;align-items:center}
.header-controls{display:flex;align-items:center;gap:4px}
.hdr-btn{
  display:flex;align-items:center;justify-content:center;
  width:28px;height:28px;border-radius:6px;border:none;
  background:transparent;color:rgba(255,255,255,0.7);cursor:pointer;
  transition:all .15s;
}
.hdr-btn:hover{background:rgba(255,255,255,0.2);color:#fff}

/* ── Tabs ── */
.tabs{display:flex;gap:0;background:${c.tabBarBg};border-bottom:1px solid ${c.tabBarBorder};overflow-x:auto;flex-shrink:0}
.tab-btn{
  display:inline-flex;align-items:center;gap:6px;padding:10px 16px;
  font-size:12px;font-weight:500;color:${c.tabText};
  background:none;border:none;border-bottom:2px solid transparent;
  cursor:pointer;white-space:nowrap;transition:all .15s;
}
.tab-btn:hover{color:${c.tabHoverText};background:${c.tabHoverBg}}
.tab-btn.active{color:${c.tabActiveText};border-bottom-color:${c.tabActiveBorder};background:${c.tabActiveBg}}
.tab-icon{display:inline-flex;align-items:center}

/* ── Form ── */
.form-body{background:${c.formBg};padding:20px;overflow-y:auto;flex:1}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}
.form-grid .full{grid-column:1/-1}
label{display:block;font-size:12px;font-weight:500;color:${c.labelText};margin-bottom:4px}
.req{color:#ef4444;margin-left:2px}
input,select,textarea{
  width:100%;padding:8px 12px;border-radius:8px;
  border:1px solid ${c.inputBorder};background:${c.inputBg};color:${c.inputText};
  font-size:13px;outline:none;transition:border-color .2s,box-shadow .2s;
}
input:focus,select:focus,textarea:focus{border-color:${c.inputFocus};box-shadow:0 0 0 3px ${c.inputFocusRing}}
textarea{resize:none}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M2 5l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px}

/* ── Actions bar ── */
.actions{
  grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;
  padding-top:16px;border-top:1px solid ${c.divider};margin-top:8px;
}
.actions-right{display:flex;gap:8px}
.btn{
  display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;
  font-size:12px;font-weight:600;border:none;cursor:pointer;transition:all .15s;
}
.btn-new{background:none;color:${c.newBtnText};font-weight:500}
.btn-new:hover{background:${c.newBtnHover}}
.btn-cancel{background:none;color:${c.cancelText}}
.btn-cancel:hover{background:${c.cancelHover}}
.btn-save{background:${c.saveBg};color:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
.btn-save:hover{background:${c.saveHover};box-shadow:0 4px 12px rgba(0,0,0,0.25)}

/* ── Toast ── */
.toast{
  position:fixed;top:12px;right:12px;
  background:#059669;color:#fff;padding:10px 16px;border-radius:8px;
  font-size:13px;font-weight:500;
  opacity:0;transform:translateY(-8px);
  transition:opacity .3s,transform .3s;pointer-events:none;z-index:200;
}
.toast.show{opacity:1;transform:translateY(0)}

/* ── Close confirmation dialog ── */
.dialog-overlay{
  position:fixed;inset:0;background:${c.dialogOverlay};
  display:none;align-items:center;justify-content:center;z-index:300;
  animation:fadeIn .15s ease;
}
.dialog-overlay.open{display:flex}
.dialog-box{
  background:${c.dialogBg};border:1px solid ${c.dialogBorder};
  border-radius:12px;padding:24px;width:min(380px,90vw);
  box-shadow:0 20px 50px rgba(0,0,0,0.3);animation:slideUp .2s ease;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.dialog-icon{
  width:40px;height:40px;border-radius:10px;
  background:${c.alertIconBg};color:${c.alertIconColor};
  display:flex;align-items:center;justify-content:center;margin-bottom:16px;
}
.dialog-title{font-size:16px;font-weight:600;color:${c.dialogText};margin-bottom:6px}
.dialog-sub{font-size:13px;color:${c.dialogSub};line-height:1.5;margin-bottom:20px}
.dialog-check{display:flex;align-items:center;gap:8px;margin-bottom:20px;cursor:pointer}
.dialog-check input[type=checkbox]{
  width:16px;height:16px;accent-color:${c.saveBg};cursor:pointer;
  border:1px solid ${c.checkBorder};border-radius:4px;background:${c.checkBg};
}
.dialog-check span{font-size:12px;color:${c.checkText}}
.dialog-actions{display:flex;gap:8px;justify-content:flex-end}
.dialog-btn{
  padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;
  border:none;cursor:pointer;transition:all .15s;
}
.dialog-btn-cancel{background:${c.secondaryBg};color:${c.secondaryText}}
.dialog-btn-cancel:hover{background:${c.secondaryHover}}
.dialog-btn-close{background:${c.dangerBg};color:#fff}
.dialog-btn-close:hover{background:${c.dangerHover}}
</style></head><body>

<div class="modal-card" id="modalCard">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>Stellar OPS Dashboard</h1>
      <span class="grip">${SVG_GRIP}</span>
    </div>
    <div class="header-controls">
      <button class="hdr-btn" id="minimizeBtn" title="Minimize">${SVG_MINUS}</button>
      <button class="hdr-btn" id="closeBtn" title="Close">${SVG_X}</button>
    </div>
  </div>
  <!-- Tabs -->
  <div class="tabs" id="tabsBar">${tabButtons}</div>
  <!-- Form -->
  <div class="form-body">
    <form id="popoutForm">
      <div class="form-grid" id="formGrid">
        ${fieldRows}
        <div class="actions">
          <button type="button" class="btn btn-new" id="newEntryBtn">${SVG_PLUS} Create New Entry</button>
          <div class="actions-right">
            <button type="button" class="btn btn-cancel" id="cancelBtn">Cancel</button>
            <button type="submit" class="btn btn-save">${SVG_SAVE} Save</button>
          </div>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast">Saved!</div>

<!-- Close confirmation dialog -->
<div class="dialog-overlay" id="closeDialog">
  <div class="dialog-box">
    <div class="dialog-icon">${SVG_ALERT_TRI}</div>
    <div class="dialog-title">Close this window?</div>
    <div class="dialog-sub">Any unsaved changes will be lost. Are you sure you want to close?</div>
    <label class="dialog-check">
      <input type="checkbox" id="dontShowAgain" />
      <span>Don&apos;t show this warning again</span>
    </label>
    <div class="dialog-actions">
      <button class="dialog-btn dialog-btn-cancel" id="dialogCancel">Go Back</button>
      <button class="dialog-btn dialog-btn-close" id="dialogConfirm">Close Window</button>
    </div>
  </div>
</div>

<script>
var FIELD_MAP=${fieldMapJSON};
var TAB_ICONS=${JSON.stringify(TAB_ICONS)};
var STORAGE_KEY='stellar_popout_skip_close_warn';

/* ── Build fields HTML ── */
function buildFieldsHTML(fields){
  var h='';
  for(var i=0;i<fields.length;i++){
    var f=fields[i];
    var req=f.required?'<span class="req">*</span>':'';
    var cls=f.type==='textarea'?' class="full"':'';
    if(f.type==='select'){
      var opts=(f.options||[]).map(function(o){return '<option value="'+o.value+'">'+o.label+'</option>';}).join('');
      h+='<div'+cls+'><label>'+f.label+req+'</label><select name="'+f.key+'"><option value="">Select...</option>'+opts+'</select></div>';
    }else if(f.type==='textarea'){
      h+='<div class="full"><label>'+f.label+req+'</label><textarea name="'+f.key+'" rows="3"></textarea></div>';
    }else{
      h+='<div'+cls+'><label>'+f.label+req+'</label><input type="'+f.type+'" name="'+f.key+'" value="" /></div>';
    }
  }
  h+='<div class="actions"><button type="button" class="btn btn-new" id="newEntryBtn">${SVG_PLUS} Create New Entry</button><div class="actions-right"><button type="button" class="btn btn-cancel" id="cancelBtn">Cancel</button><button type="submit" class="btn btn-save">${SVG_SAVE} Save</button></div></div>';
  return h;
}

/* ── Clear form ── */
function clearForm(){
  var els=document.querySelectorAll('#popoutForm input[type],#popoutForm select,#popoutForm textarea');
  els.forEach(function(el){if(el.type!=='submit'&&el.type!=='button')el.value='';});
}

/* ── Attempt close (with optional confirmation) ── */
function attemptClose(){
  var skip=false;
  try{skip=localStorage.getItem(STORAGE_KEY)==='true';}catch(e){}
  if(skip){window.close();return;}
  document.getElementById('closeDialog').classList.add('open');
}

/* ── Minimize / expand ── */
document.getElementById('minimizeBtn').addEventListener('click',function(){
  var card=document.getElementById('modalCard');
  card.classList.toggle('minimized');
  this.title=card.classList.contains('minimized')?'Expand':'Minimize';
});

/* ── Close button ── */
document.getElementById('closeBtn').addEventListener('click',attemptClose);

/* ── Cancel button in form ── */
document.addEventListener('click',function(e){
  if(e.target.closest('#cancelBtn')) attemptClose();
  if(e.target.closest('#newEntryBtn')) clearForm();
});

/* ── Dialog: Go Back ── */
document.getElementById('dialogCancel').addEventListener('click',function(){
  document.getElementById('closeDialog').classList.remove('open');
});

/* ── Dialog: Confirm Close ── */
document.getElementById('dialogConfirm').addEventListener('click',function(){
  var cb=document.getElementById('dontShowAgain');
  if(cb.checked){try{localStorage.setItem(STORAGE_KEY,'true');}catch(e){}}
  window.close();
});

/* ── Close dialog on overlay click ── */
document.getElementById('closeDialog').addEventListener('click',function(e){
  if(e.target===this) this.classList.remove('open');
});

/* ── Tab switching ── */
document.querySelectorAll('.tab-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    var tab=this.dataset.tab;
    var fields=FIELD_MAP[tab]||[];
    document.getElementById('formGrid').innerHTML=buildFieldsHTML(fields);
  });
});

/* ── Form submit ── */
document.getElementById('popoutForm').addEventListener('submit',function(e){
  e.preventDefault();
  var fd=new FormData(this);
  var data={};
  fd.forEach(function(v,k){data[k]=v;});
  try{
    if(window.opener&&!window.opener.closed){
      window.opener.postMessage({type:'STELLAR_POPOUT_SAVE',tab:document.querySelector('.tab-btn.active').dataset.tab,data:data},'*');
    }
  }catch(ex){}
  var t=document.getElementById('toast');
  t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2500);
});

/* ── Intercept browser close (Ctrl+W, X button) ── */
window.addEventListener('beforeunload',function(e){
  var skip=false;
  try{skip=localStorage.getItem(STORAGE_KEY)==='true';}catch(ex){}
  if(!skip){e.preventDefault();e.returnValue='';}
});
</script></body></html>`;
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
  const handleRef = useRef<HTMLDivElement>(null);
  const { pos, resetPos } = useDrag(handleRef, isOpen);
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

  const handlePopOut = useCallback(async () => {
    const html = buildPopoutHTML(activeTab, formData, isDayMode);

    // Try Document Picture-in-Picture API first (Chrome 116+)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docPiP = (window as any).documentPictureInPicture;
    if (docPiP) {
      try {
        const pipWindow = await docPiP.requestWindow({ width: 560, height: 680 });
        pipWindow.document.write(html);
        pipWindow.document.close();
        onClose();
        return;
      } catch {
        // User denied or API failed — fall through to window.open
      }
    }

    // Fallback: regular popup window
    const popup = window.open('', '_blank', 'popup=true,width=560,height=680,resizable=yes,scrollbars=yes');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      onClose();
    }
  }, [activeTab, formData, isDayMode, onClose]);

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
              title="Pop out to floating window (stays on top)"
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
