// src/components/OpenDentalImport.tsx
// Import Open Dental CSV data (Claims and Patient A/R) into Supabase
import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowRight, Trash2 } from 'lucide-react';

interface OpenDentalImportProps {
  isDayMode: boolean;
  onImportComplete?: () => void;
}
type ImportTab = 'claims' | 'patient_ar';
type ImportStatus = 'idle' | 'previewing' | 'importing' | 'success' | 'error';

interface ClaimRow {
  insurance_company: string; carrier_phone: string | null;
  pri_sec: 'Primary' | 'Secondary' | null; created_by: string;
  patient_name: string; date_of_service: string; date_submitted: string;
  date_sent_orig: string | null; status: string; notes: string | null;
  claim_amount: number; patient_id: string; claim_number: null;
  procedure_code: string; claim_detail: string; follow_up_date: string;
  completed_by: string; aging_days: number; archived: boolean;
  collected: number; outstanding: number;
}

interface PatientARRow {
  patient_name: string; patient_id: null;
  dos: string; original_balance: number; current_balance: number;
  created_by: string; updated_by: string; ar_notes: string;
}

// --- Helpers ---
function parseDate(s: string): string {
  if (!s || s.trim() === '-' || s.trim() === '') return '';
  const p = s.trim().split('/');
  if (p.length !== 3) return '';
  const y = p[2].length === 2 ? `20${p[2]}` : p[2];
  return `${y}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`;
}
function isDefaultDate(s: string): boolean { return parseDate(s) === '2001-01-01'; }

function mapTrackStatus(s: string): string {
  const v = s.trim();
  if (v === '-' || v === '') return 'Sent';
  if (v.toUpperCase() === 'CLAIM SUBMISSION ON HOLD') return 'Pending';
  return 'Pending Review';
}
function parseAmount(v: string): number {
  if (!v || v.trim() === '-' || v.trim() === '') return 0;
  const n = parseFloat(v.replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Strip BOM (Byte Order Mark) that some exports include
function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

// Auto-detect delimiter: tab, comma, or pipe
function detectDelimiter(headerLine: string): string {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const pipeCount = (headerLine.match(/\|/g) || []).length;

  if (tabCount >= 2 && tabCount >= commaCount) return '\t';
  if (commaCount >= 2) return ',';
  if (pipeCount >= 2) return '|';
  // Default: try tab first, then comma
  return tabCount > 0 ? '\t' : ',';
}

// Split a line respecting quoted fields (handles commas inside quotes)
function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    // Tab-separated: simple split (quotes rarely used with TSV)
    return line.split('\t').map(v => v.trim());
  }

  // CSV-aware split that handles quoted fields
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function calculateAgingDays(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function calculateAgingStatus(days: number): string {
  if (days <= 30) return '0-30 Days';
  if (days <= 60) return '31-60 Days';
  if (days <= 90) return '61-90 Days';
  if (days <= 120) return '91-120 Days';
  return '121+ Days';
}

const CLAIMS_MAP = [
  { from: 'Carrier', to: 'insurance_company' }, { from: 'Phone', to: 'carrier_phone' },
  { from: 'Type (Pri/Sec)', to: 'pri_sec' }, { from: 'User', to: 'created_by' },
  { from: 'PatName', to: 'patient_name' }, { from: 'DateService', to: 'date_of_service' },
  { from: 'DateSent', to: 'date_submitted' }, { from: 'DateSentOrig', to: 'date_sent_orig' },
  { from: 'TrackStat', to: 'status' }, { from: 'Error', to: 'notes' },
  { from: 'Amount', to: 'claim_amount / outstanding' },
];
const AR_MAP = [
  { from: 'Guarantor', to: 'patient_name' },
  { from: 'Total', to: 'original_balance / current_balance' },
  { from: '-W/O Est, -Ins Est, Last Pay', to: 'notes (combined)' },
  { from: '0-30 / 31-60 / 61-90 / >90', to: 'aging info in notes' },
];

export default function OpenDentalImport({ isDayMode, onImportComplete }: OpenDentalImportProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('claims');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [claimsPreview, setClaimsPreview] = useState<ClaimRow[]>([]);
  const [arPreview, setARPreview] = useState<PatientARRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [allClaimsData, setAllClaimsData] = useState<ClaimRow[]>([]);
  const [allARData, setAllARData] = useState<PatientARRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState<'claims' | 'patient_ar' | null>(null);
  const [clearing, setClearing] = useState(false);

  // --- Clear Data ---
  const handleClearData = async (table: 'claims' | 'patient_ar') => {
    setClearing(true);
    try {
      // Delete all records from the specified table
      // Supabase requires a filter for delete, so we use a condition that matches all rows
      if (table === 'claims') {
        const { error } = await supabase.from('claims').delete().gte('created_at', '1970-01-01');
        if (error) throw error;
      } else {
        const { error } = await supabase.from('patient_ar').delete().gte('created_at', '1970-01-01');
        if (error) throw error;
      }
      setShowClearConfirm(null);
      setSuccessMsg(`All ${table === 'claims' ? 'claims' : 'patient A/R records'} have been cleared.`);
      setStatus('success');
      onImportComplete?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : `Failed to clear ${table} data.`);
      setStatus('error');
      setShowClearConfirm(null);
    } finally {
      setClearing(false);
    }
  };

  // Style helpers
  const d = isDayMode;
  const cardBg = d ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700';
  const txt = d ? 'text-gray-900' : 'text-gray-100';
  const txt2 = d ? 'text-gray-600' : 'text-gray-400';
  const txtM = d ? 'text-gray-500' : 'text-gray-500';
  const brd = d ? 'border-gray-200' : 'border-gray-700';
  const hvr = d ? 'hover:bg-gray-50' : 'hover:bg-gray-700';
  const tblBg = d ? 'bg-gray-50' : 'bg-gray-700';
  const tabAct = d ? 'bg-white text-purple-700 border-purple-500 shadow-sm' : 'bg-gray-700 text-purple-300 border-purple-400 shadow-sm';
  const tabOff = d ? 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100' : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700';

  const resetState = useCallback(() => {
    setFile(null); setStatus('idle'); setErrorMsg(''); setSuccessMsg('');
    setProgress(0); setClaimsPreview([]); setARPreview([]);
    setAllClaimsData([]); setAllARData([]); setTotalRows(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleTabChange = (tab: ImportTab) => { resetState(); setActiveTab(tab); };

  const processFile = useCallback((f: File) => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!['.csv', '.tsv', '.txt'].includes(ext)) {
      setErrorMsg('Please select a valid file (.csv, .tsv, .txt)'); setStatus('error'); return;
    }
    setFile(f); setErrorMsg(''); setSuccessMsg(''); setStatus('idle');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      activeTab === 'claims' ? parseClaims(text) : parsePatientAR(text);
    };
    reader.onerror = () => { setErrorMsg('Failed to read the file.'); setStatus('error'); };
    reader.readAsText(f);
  }, [activeTab]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  };

  // --- Claims Parsing ---
  const parseClaims = (text: string) => {
    try {
      const cleanText = stripBOM(text);
      const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setErrorMsg('File must have a header and at least one data row.'); setStatus('error'); return; }

      const delimiter = detectDelimiter(lines[0]);
      const hdr = splitLine(lines[0], delimiter);
      const idx = (name: string) => hdr.findIndex(h => h.toLowerCase() === name.toLowerCase());
      const ci = idx('Carrier'), phi = idx('Phone'), ti = idx('Type'), ui = idx('User');
      const pni = idx('PatName'), dsi = idx('DateService'), dti = idx('DateSent');
      const doi = idx('DateSentOrig'), tsi = idx('TrackStat'), dsti = idx('DateStat');
      const ei = idx('Error'), ai = idx('Amount');

      if (ci === -1 || pni === -1 || ai === -1) {
        const foundCols = hdr.filter(h => h).join(', ');
        setErrorMsg(`Missing required columns: Carrier, PatName, or Amount. Found columns: ${foundCols || '(none detected)'}. Detected delimiter: ${delimiter === '\t' ? 'tab' : delimiter === ',' ? 'comma' : delimiter}.`);
        setStatus('error'); return;
      }

      const rows: ClaimRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const c = splitLine(lines[i], delimiter);
        if (c.length < 3 || !c[ci]) continue;
        const dosF = parseDate(dsi >= 0 ? c[dsi] : '');
        const sentF = parseDate(dti >= 0 ? c[dti] : '');
        const origF = parseDate(doi >= 0 ? c[doi] : '');
        const amt = parseAmount(c[ai] || '0');
        const errVal = ei >= 0 ? c[ei] || '' : '';
        const dStat = dsti >= 0 ? c[dsti] || '' : '';
        let notes: string | null = (errVal && errVal !== '-') ? errVal : null;
        if (dStat && !isDefaultDate(dStat) && dStat !== '-') {
          const n = `Status date: ${dStat}`;
          notes = notes ? `${notes}; ${n}` : n;
        }
        const agingSource = dosF || sentF;
        const agingDays = calculateAgingDays(agingSource);
        rows.push({
          insurance_company: c[ci], carrier_phone: phi >= 0 ? c[phi] || null : null,
          pri_sec: (ti >= 0 && c[ti]?.trim().toLowerCase() === 'sec') ? 'Secondary' : 'Primary',
          created_by: ui >= 0 ? c[ui] || '' : '', patient_name: c[pni] || '',
          date_of_service: dosF, date_submitted: sentF, date_sent_orig: origF || null,
          status: mapTrackStatus(tsi >= 0 ? c[tsi] || '' : ''), notes, claim_amount: amt,
          patient_id: '', claim_number: null, procedure_code: '', claim_detail: '',
          follow_up_date: sentF, completed_by: '', aging_days: agingDays, archived: false,
          collected: 0, outstanding: amt,
        });
      }
      if (!rows.length) { setErrorMsg('No valid data rows found after parsing. Check that your file has data rows below the header.'); setStatus('error'); return; }
      setAllClaimsData(rows); setClaimsPreview(rows.slice(0, 10)); setTotalRows(rows.length); setStatus('previewing');
    } catch { setErrorMsg('Failed to parse claims file.'); setStatus('error'); }
  };

  // --- Patient A/R Parsing ---
  const parsePatientAR = (text: string) => {
    try {
      const cleanText = stripBOM(text);
      const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setErrorMsg('File must have a header and at least one data row.'); setStatus('error'); return; }

      // Detect delimiter from first line
      const delimiter = detectDelimiter(lines[0]);
      let si = 0;
      const ff = splitLine(lines[0], delimiter);
      if (ff.length <= 2 && ff[0].toLowerCase().startsWith('date')) si = 1;
      else if (lines[0].toLowerCase().startsWith('date ') && !lines[0].includes(delimiter)) si = 1;
      if (si >= lines.length - 1) { setErrorMsg('File must have headers and data rows.'); setStatus('error'); return; }

      const hdr = splitLine(lines[si], delimiter);
      const fi = (test: (h: string) => boolean) => hdr.findIndex(h => test(h.toLowerCase()));
      const gi = fi(h => h.includes('guarantor'));
      const d030 = fi(h => h.includes('0-30'));
      const d3160 = fi(h => h.includes('31-60'));
      const d6190 = fi(h => h.includes('61-90'));
      const d90p = hdr.findIndex(h => h.includes('> 90') || h.includes('>90') || h.toLowerCase().includes('90+'));
      const toti = hdr.findIndex(h => h.toLowerCase() === 'total');
      const woi = fi(h => h.includes('w/o') || h.includes('wo est'));
      const insi = fi(h => h.includes('ins est') || h.includes('-ins'));
      const pati = fi(h => h.includes('=patient') || h === 'patient');
      const lpi = fi(h => h.includes('last pay'));

      if (gi === -1 || toti === -1) {
        const foundCols = hdr.filter(h => h).join(', ');
        setErrorMsg(`Missing required columns: Guarantor or Total. Found columns: ${foundCols || '(none detected)'}. Detected delimiter: ${delimiter === '\t' ? 'tab' : delimiter === ',' ? 'comma' : delimiter}.`);
        setStatus('error'); return;
      }

      const today = new Date().toISOString().split('T')[0];
      const rows: PatientARRow[] = [];
      for (let i = si + 1; i < lines.length; i++) {
        const c = splitLine(lines[i], delimiter);
        if (c.length < 2) continue;
        const guar = c[gi]?.trim() || '';
        if (!guar || guar.toLowerCase() === 'total' || guar.toLowerCase() === 'totals') continue;
        const total = toti >= 0 ? parseAmount(c[toti]) : 0;
        if (total === 0) continue;

        const np: string[] = [];
        const addAmt = (idx: number, lbl: string) => {
          if (idx >= 0) { const v = parseAmount(c[idx]); if (v !== 0) np.push(`${lbl}: $${v.toFixed(2)}`); }
        };
        addAmt(d030, '0-30'); addAmt(d3160, '31-60'); addAmt(d6190, '61-90'); addAmt(d90p, '>90');
        addAmt(woi, 'W/O Est'); addAmt(insi, 'Ins Est'); addAmt(pati, 'Patient Resp');
        if (lpi >= 0 && c[lpi]?.trim() && c[lpi].trim() !== '-') np.push(`Last Pay: ${c[lpi].trim()}`);

        rows.push({
          patient_name: guar, patient_id: null,
          dos: today, original_balance: total, current_balance: total,
          created_by: 'Open Dental Import', updated_by: 'Open Dental Import',
          ar_notes: np.join(' | '),
        });
      }
      if (!rows.length) { setErrorMsg('No valid patient A/R rows found after parsing. Check that your file has data rows below the header.'); setStatus('error'); return; }
      setAllARData(rows); setARPreview(rows.slice(0, 10)); setTotalRows(rows.length); setStatus('previewing');
    } catch { setErrorMsg('Failed to parse Patient A/R file.'); setStatus('error'); }
  };

  // --- Import to Supabase ---
  const handleImport = async () => {
    setStatus('importing'); setErrorMsg(''); setProgress(0);
    try {
      if (activeTab === 'claims') await importClaims(); else await importPatientAR();
      setStatus('success');
      setSuccessMsg(activeTab === 'claims'
        ? `Successfully imported ${allClaimsData.length} claims.`
        : `Successfully imported ${allARData.length} patient A/R records.`);
      onImportComplete?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed. Please try again.');
      setStatus('error');
    }
  };

  const importClaims = async () => {
    const BS = 50, total = allClaimsData.length;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < total; i += BS) {
      const batch = allClaimsData.slice(i, i + BS).map(r => {
        const dos = r.date_of_service || today;
        const submitted = r.date_submitted || dos;
        const agingDays = calculateAgingDays(dos);
        return {
          patient_id: r.patient_id, patient_name: r.patient_name,
          insurance_company: r.insurance_company, carrier_phone: r.carrier_phone,
          claim_number: r.claim_number, procedure_code: r.procedure_code,
          claim_detail: r.claim_detail, claim_amount: r.claim_amount, status: r.status,
          date_submitted: submitted, date_of_service: dos,
          follow_up_date: r.follow_up_date || submitted, date_sent_orig: r.date_sent_orig,
          created_by: r.created_by, completed_by: r.completed_by, notes: r.notes,
          aging_days: agingDays, archived: r.archived, collected: r.collected,
          outstanding: r.outstanding, pri_sec: r.pri_sec,
          aging_status: calculateAgingStatus(agingDays),
        };
      });
      const { error } = await supabase.from('claims').insert(batch);
      if (error) throw new Error(`Batch ${Math.floor(i / BS) + 1} error: ${error.message}`);
      setProgress(Math.min(100, Math.round(((i + batch.length) / total) * 100)));
    }
  };

  const importPatientAR = async () => {
    const BS = 50, total = allARData.length;
    for (let i = 0; i < total; i += BS) {
      const batch = allARData.slice(i, i + BS).map(r => ({
        patient_name: r.patient_name, patient_id: r.patient_id,
        dos: r.dos, original_balance: r.original_balance, current_balance: r.current_balance,
        status: 'not_started' as const, created_by: r.created_by, updated_by: r.updated_by,
        is_collectible: true, collected_amount: 0,
        background_notes: r.ar_notes || null,
      }));
      const { error } = await supabase.from('patient_ar').insert(batch);
      if (error) throw new Error(`Batch ${Math.floor(i / BS) + 1} error: ${error.message}`);
      setProgress(Math.min(100, Math.round(((i + batch.length) / total) * 100)));
    }
  };

  // --- Render ---
  const mapping = activeTab === 'claims' ? CLAIMS_MAP : AR_MAP;

  return (
    <div className={`rounded-xl border ${cardBg} shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 py-5 border-b ${brd}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${d ? 'bg-purple-100' : 'bg-purple-900/30'}`}>
              <FileText className={`w-5 h-5 ${d ? 'text-purple-600' : 'text-purple-400'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${txt}`}>Open Dental Import</h2>
              <p className={`text-sm ${txt2}`}>Import CSV or tab-separated data from Open Dental</p>
            </div>
          </div>
          {file && (
            <button onClick={resetState} title="Clear and start over"
              className={`p-2 rounded-lg transition-colors ${d ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-gray-700 text-gray-500'}`}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`px-6 pt-4 border-b ${brd}`}>
        <div className="flex gap-1">
          {([{ key: 'claims' as ImportTab, label: 'Claims Import' },
             { key: 'patient_ar' as ImportTab, label: 'Patient A/R Import' }]).map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)} disabled={status === 'importing'}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === tab.key ? tabAct : tabOff}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Field Mapping */}
        <div className={`rounded-lg p-4 ${d ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-800'}`}>
          <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${d ? 'text-blue-900' : 'text-blue-300'}`}>
            <FileText className="w-4 h-4" /> Field Mapping
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {mapping.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`font-mono ${d ? 'text-blue-700' : 'text-blue-400'}`}>{m.from}</span>
                <ArrowRight className={`w-3 h-3 flex-shrink-0 ${d ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`font-mono ${d ? 'text-blue-900' : 'text-blue-200'}`}>{m.to}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clear Data Section */}
        {(status === 'idle' || status === 'error') && !showClearConfirm && (
          <div className={`rounded-lg p-4 ${d ? 'bg-amber-50 border border-amber-200' : 'bg-amber-900/20 border border-amber-800'}`}>
            <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${d ? 'text-amber-900' : 'text-amber-300'}`}>
              <Trash2 className="w-4 h-4" /> Clear Existing Data (Fresh Start)
            </h3>
            <p className={`text-xs mb-3 ${d ? 'text-amber-700' : 'text-amber-400'}`}>
              Clear all existing records before importing new data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowClearConfirm('claims')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  d ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-red-700 text-red-400 hover:bg-red-900/30'}`}>
                Clear All Claims
              </button>
              <button onClick={() => setShowClearConfirm('patient_ar')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  d ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-red-700 text-red-400 hover:bg-red-900/30'}`}>
                Clear All Patient A/R
              </button>
            </div>
          </div>
        )}

        {/* Clear Confirmation */}
        {showClearConfirm && (
          <div className={`rounded-lg p-4 ${d ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-800'}`}>
            <p className={`text-sm font-semibold mb-3 ${d ? 'text-red-800' : 'text-red-300'}`}>
              Are you sure you want to delete ALL {showClearConfirm === 'claims' ? 'claims' : 'patient A/R records'}? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleClearData(showClearConfirm)} disabled={clearing}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                {clearing ? 'Clearing...' : 'Yes, Delete All'}
              </button>
              <button onClick={() => setShowClearConfirm(null)} disabled={clearing}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  d ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        {(status === 'idle' || status === 'error') && (
          <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)} onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? d ? 'border-purple-400 bg-purple-50' : 'border-purple-500 bg-purple-900/20'
                : d ? 'border-gray-300 hover:border-purple-300 hover:bg-purple-50/50'
                    : 'border-gray-600 hover:border-purple-500 hover:bg-purple-900/10'
            }`}>
            <Upload className={`w-10 h-10 mx-auto mb-3 ${d ? 'text-gray-400' : 'text-gray-500'}`} />
            <p className={`text-sm font-medium ${txt}`}>{file ? file.name : 'Drop your file here or click to browse'}</p>
            <p className={`text-xs mt-1 ${txtM}`}>Accepts .csv, .tsv, or .txt files (comma or tab separated)</p>
            <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileSelect} className="hidden" />
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && errorMsg && (
          <div className={`rounded-lg p-4 flex items-start gap-3 ${d ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-800'}`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${d ? 'text-red-600' : 'text-red-400'}`} />
            <p className={`text-sm ${d ? 'text-red-800' : 'text-red-300'}`}>{errorMsg}</p>
          </div>
        )}

        {/* Success Message */}
        {status === 'success' && (
          <div className={`rounded-lg p-4 flex items-start gap-3 ${d ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-800'}`}>
            <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${d ? 'text-green-600' : 'text-green-400'}`} />
            <p className={`text-sm ${d ? 'text-green-800' : 'text-green-300'}`}>{successMsg}</p>
          </div>
        )}

        {/* Preview Table */}
        {status === 'previewing' && (claimsPreview.length > 0 || arPreview.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${txt}`}>
                Preview (showing {activeTab === 'claims' ? claimsPreview.length : arPreview.length} of {totalRows} rows)
              </h3>
              <span className={`text-xs px-2 py-1 rounded-full ${d ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/30 text-purple-300'}`}>
                {totalRows} total records
              </span>
            </div>
            <div className={`border rounded-lg overflow-hidden ${brd}`}>
              <div className="max-h-80 overflow-auto">
                {activeTab === 'claims' ? (
                  <table className="min-w-full text-xs divide-y divide-gray-200">
                    <thead className={`sticky top-0 ${tblBg}`}>
                      <tr>
                        {['Patient', 'Insurance', 'Type', 'DOS', 'Submitted', 'Status', 'Amount'].map(h => (
                          <th key={h} className={`px-3 py-2 text-left font-semibold ${txt2}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${brd}`}>
                      {claimsPreview.map((r, i) => (
                        <tr key={i} className={hvr}>
                          <td className={`px-3 py-2 ${txt} whitespace-nowrap`}>{r.patient_name}</td>
                          <td className={`px-3 py-2 ${txt2} whitespace-nowrap`}>{r.insurance_company}</td>
                          <td className={`px-3 py-2 ${txt2}`}>{r.pri_sec === 'Secondary' ? 'Sec' : 'Pri'}</td>
                          <td className={`px-3 py-2 ${txt2} whitespace-nowrap`}>{r.date_of_service}</td>
                          <td className={`px-3 py-2 ${txt2} whitespace-nowrap`}>{r.date_submitted}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'Sent' ? d ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-300'
                              : r.status === 'Pending' ? d ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-300'
                              : d ? 'bg-orange-100 text-orange-700' : 'bg-orange-900/30 text-orange-300'
                            }`}>{r.status}</span>
                          </td>
                          <td className={`px-3 py-2 text-right font-mono ${txt}`}>
                            ${r.claim_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full text-xs divide-y divide-gray-200">
                    <thead className={`sticky top-0 ${tblBg}`}>
                      <tr>
                        {['Patient', 'Balance', 'Status', 'Notes'].map(h => (
                          <th key={h} className={`px-3 py-2 text-left font-semibold ${txt2}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${brd}`}>
                      {arPreview.map((r, i) => (
                        <tr key={i} className={hvr}>
                          <td className={`px-3 py-2 ${txt} whitespace-nowrap`}>{r.patient_name}</td>
                          <td className={`px-3 py-2 text-right font-mono ${txt}`}>
                            ${r.original_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              d ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-300'}`}>Active</span>
                          </td>
                          <td className={`px-3 py-2 ${txtM} max-w-xs truncate`} title={r.ar_notes}>{r.ar_notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {status === 'importing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${txt}`}>Importing records...</span>
              <span className={`text-sm font-mono ${txt2}`}>{progress}%</span>
            </div>
            <div className={`w-full h-2.5 rounded-full overflow-hidden ${d ? 'bg-gray-200' : 'bg-gray-700'}`}>
              <div className="h-full rounded-full bg-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {status === 'previewing' && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={resetState}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                d ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
              Cancel
            </button>
            <button onClick={handleImport}
              className="px-6 py-2.5 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm">
              <Upload className="w-4 h-4" />
              Import {totalRows} {activeTab === 'claims' ? 'Claims' : 'Patient Records'}
            </button>
          </div>
        )}
        {status === 'success' && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={resetState}
              className="px-6 py-2.5 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2">
              Import Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
