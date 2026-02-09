// src/components/InsuranceIssuesCSVUpload.tsx
// =====================================================
// CSV Upload modal for bulk-importing insurance issues
// =====================================================

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';
import type { InsuranceIssue, InsuranceIssueType } from '../types/database.types';
import { bulkInsertInsuranceIssues } from '../services/insuranceIssuesService';
import { sanitizePatientName } from '../utils/sanitizePatientName';

// =====================================================
// TYPES
// =====================================================

type ParsedRow = Omit<InsuranceIssue, 'id' | 'created_at' | 'updated_at'>;

type ValidationWarning = {
  row: number;
  field: string;
  message: string;
};

interface InsuranceIssuesCSVUploadProps {
  isDayMode: boolean;
  onClose: () => void;
  onImportComplete: (imported: InsuranceIssue[]) => void;
}

// =====================================================
// ISSUE TYPE MAPPING
// =====================================================

const ISSUE_TYPE_MAP: Record<string, InsuranceIssueType> = {
  'needs perio chart': 'Needs Perio Chart',
  'need perio chart': 'Needs Perio Chart',
  'needs perio chart & narrative': 'Needs Perio Chart',
  'needs perio chart & na': 'Needs Perio Chart',
  'needs perio chart, needs narrative': 'Needs Perio Chart',
  'needs perio chart, needs narrrrative': 'Needs Perio Chart',
  'invalid tooth code for carrier': 'Invalid Tooth Code for Carrier',
  'invalid tooth code for c': 'Invalid Tooth Code for Carrier',
  'invalid number of surfaces': 'Invalid Number of Surfaces',
  'invalid number of surfa': 'Invalid Number of Surfaces',
  'invalid number of surface': 'Invalid Number of Surfaces',
  'invalid surface code for carrier': 'Invalid Surface Code for Carrier',
  'tooth code required by carrier': 'Tooth Code Required by Carrier',
  'tooth code required': 'Tooth Code Required by Carrier',
  'oral cavity code required by carrier': 'Oral Cavity Code Required by Carrier',
  'oral cavity code required': 'Oral Cavity Code Required by Carrier',
  'needs narrative': 'Needs Narrative',
  'need provider change': 'Need Provider Change',
  'need provider change': 'Need Provider Change',
  'invalid tooth/surface code': 'Invalid Tooth/Surface Code',
  'invalid tooth/surface code for carrier': 'Invalid Tooth/Surface Code',
  'invalid tooth surface': 'Invalid Tooth/Surface Code',
  'invalid tooth/surface': 'Invalid Tooth/Surface Code',
  'invalid surface code for c': 'Invalid Surface Code for Carrier',
  'invalid carrier/ invalid surface code for carrier': 'Invalid Surface Code for Carrier',
  'invalid tooth code for carrier/ invalid surface code for carrier': 'Invalid Tooth/Surface Code',
  'pre-auth required': 'Pre-Auth Required',
};

const VALID_ISSUE_TYPES: InsuranceIssueType[] = [
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

// =====================================================
// HELPERS
// =====================================================

function parseCSV(text: string): string[][] {
  const lines = text.split('\n').filter((line) => line.trim());
  return lines.map((line) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

/** Parse date from various formats to YYYY-MM-DD */
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD//YYYY (typo with double slash)
  const doubleSlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/\/(\d{4})$/);
  if (doubleSlash) {
    const [, m, d, y] = doubleSlash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

/** Normalize an issue type string to a valid InsuranceIssueType */
function normalizeIssueType(raw: string): InsuranceIssueType {
  if (!raw) return 'Other';
  const lower = raw.trim().toLowerCase();

  // Direct match
  const mapped = ISSUE_TYPE_MAP[lower];
  if (mapped) return mapped;

  // Partial / fuzzy match - check if any key is a prefix of the raw value or vice versa
  for (const [key, value] of Object.entries(ISSUE_TYPE_MAP)) {
    if (lower.startsWith(key) || key.startsWith(lower)) return value;
  }

  // Check if it's a valid type already (case-insensitive)
  const exactMatch = VALID_ISSUE_TYPES.find(
    (t) => t.toLowerCase() === lower
  );
  if (exactMatch) return exactMatch;

  return 'Other';
}

/** Normalize provider names - handles multi-provider like "DDS2 HYG5" or "DDS1  HYG2" */
function normalizeProvider(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Known single providers
  const KNOWN = ['DDS1', 'DDS2', 'DMD1', 'HYG2', 'HYG3', 'HYG5', 'Daniely'];

  // Check for combo: split on whitespace and see if multiple known providers
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const matched = parts.filter((p) =>
    KNOWN.some((k) => k.toLowerCase() === p.toLowerCase())
  );

  if (matched.length >= 2) {
    // Normalize case to match KNOWN list
    return matched
      .map((m) => KNOWN.find((k) => k.toLowerCase() === m.toLowerCase()) || m)
      .join(' + ');
  }

  if (matched.length === 1) {
    return KNOWN.find((k) => k.toLowerCase() === matched[0].toLowerCase()) || matched[0];
  }

  // Check if the raw value is a known provider (case-insensitive)
  const found = KNOWN.find((k) => k.toLowerCase() === trimmed.toLowerCase());
  return found || trimmed;
}

/** Map CSV header to our internal field name */
function mapHeader(header: string): string | null {
  const h = header.toLowerCase().trim().replace(/[^a-z0-9_\s]/g, '');
  if (h.includes('patient') && h.includes('id')) return 'patient_id';
  if (h === 'name' || h === 'patient name' || h === 'patient_name') return 'patient_name';
  if (h.includes('date') && h.includes('service') || h === 'dos' || h === 'date_of_service') return 'date_of_service';
  if (h.includes('procedure') || h === 'procedure codes' || h === 'procedure_codes') return 'procedure_codes';
  if (h.includes('in charge') || h === 'in_charge' || h === 'provider') return 'in_charge';
  if (h === 'issue' || h === 'issue type' || h === 'issue_type') return 'issue_type';
  if (h.includes('vyne') || h === 'in vyne' || h === 'in_vyne') return 'in_vyne';
  if (h === 'status' && !h.includes('submission')) return 'status';
  if (h.includes('submission') || h.includes('submitted')) return 'submission_status';
  if (h === 'notes' || h === 'note' || h === 'comments') return 'notes';
  return null;
}

// =====================================================
// COMPONENT
// =====================================================

export default function InsuranceIssuesCSVUpload({
  isDayMode,
  onClose,
  onImportComplete,
}: InsuranceIssuesCSVUploadProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----- Style helpers -----
  const headerText = isDayMode ? 'text-gray-900' : 'text-white';
  const subText = isDayMode ? 'text-gray-600' : 'text-gray-400';
  const tableBorder = isDayMode ? 'border-gray-200' : 'border-gray-700';
  const thBg = isDayMode ? 'bg-gray-50 text-gray-700' : 'bg-gray-900 text-gray-300';
  const rowHover = isDayMode ? 'hover:bg-gray-50' : 'hover:bg-gray-700/50';
  const modalCard = isDayMode
    ? 'bg-white rounded-xl shadow-xl'
    : 'bg-gray-800 rounded-xl shadow-xl';

  // ----- Parse CSV file -----
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        setErrorMessage('CSV must have a header row and at least one data row.');
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Map headers to field names
      const fieldMap: (string | null)[] = headers.map(mapHeader);

      // Check we have at minimum patient_name
      if (!fieldMap.includes('patient_name')) {
        setErrorMessage(
          'Could not find a "Name" or "Patient Name" column in the CSV headers. ' +
          `Found headers: ${headers.join(', ')}`
        );
        return;
      }

      const parsed: ParsedRow[] = [];
      const warns: ValidationWarning[] = [];

      dataRows.forEach((row, rowIndex) => {
        // Build a keyed object from the row
        const obj: Record<string, string> = {};
        fieldMap.forEach((field, colIndex) => {
          if (field && row[colIndex] !== undefined) {
            obj[field] = row[colIndex].trim();
          }
        });

        // Skip completely empty rows
        if (!obj.patient_name && !obj.patient_id && !obj.procedure_codes) return;

        const patientName = obj.patient_name || '';
        if (!patientName) {
          warns.push({ row: rowIndex + 2, field: 'patient_name', message: 'Missing patient name, row skipped' });
          return;
        }

        // Date handling
        const rawDate = obj.date_of_service || '';
        const isPreAuth = rawDate.toLowerCase().includes('pre-auth') || rawDate.toLowerCase().includes('preauth');
        let dateOfService: string;

        if (isPreAuth) {
          // Use today's date as placeholder for pre-auth items
          dateOfService = new Date().toISOString().split('T')[0];
        } else {
          const parsed = parseDate(rawDate);
          if (!parsed) {
            warns.push({
              row: rowIndex + 2,
              field: 'date_of_service',
              message: `Could not parse date "${rawDate}", using today's date`,
            });
            dateOfService = new Date().toISOString().split('T')[0];
          } else {
            dateOfService = parsed;
          }
        }

        // Issue type
        const issueType = normalizeIssueType(obj.issue_type || '');
        if (issueType === 'Other' && obj.issue_type) {
          warns.push({
            row: rowIndex + 2,
            field: 'issue_type',
            message: `"${obj.issue_type}" mapped to "Other"`,
          });
        }

        // Provider
        const inCharge = normalizeProvider(obj.in_charge || '');

        // In Vyne
        const inVyne = (obj.in_vyne || '').toLowerCase() === 'yes' ||
                        (obj.in_vyne || '').toLowerCase() === 'true' ||
                        (obj.in_vyne || '') === '1';

        const record: ParsedRow = {
          patient_id: obj.patient_id || null,
          patient_name: sanitizePatientName(patientName),
          date_of_service: dateOfService,
          procedure_codes: obj.procedure_codes || '',
          in_charge: inCharge,
          issue_type: issueType,
          in_vyne: inVyne,
          status: obj.status || null,
          submission_status: obj.submission_status || null,
          notes: obj.notes || null,
          is_pre_auth: isPreAuth,
        };

        parsed.push(record);
      });

      if (parsed.length === 0) {
        setErrorMessage('No valid data rows found in the CSV.');
        return;
      }

      setParsedRows(parsed);
      setWarnings(warns);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setErrorMessage(`Error parsing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Reset file input
    event.target.value = '';
  };

  // ----- Import to Supabase -----
  const handleImport = async () => {
    setStep('importing');
    setErrorMessage(null);

    try {
      const inserted = await bulkInsertInsuranceIssues(parsedRows);
      setImportResult({ success: inserted.length, failed: parsedRows.length - inserted.length });
      setStep('done');
      onImportComplete(inserted);
    } catch (err) {
      console.error('Error importing issues:', err);
      setErrorMessage(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStep('preview'); // Go back to preview so they can retry
    }
  };

  // ----- Download CSV template -----
  const handleDownloadTemplate = () => {
    const headers = [
      'Patient ID',
      'Name',
      'Date of Service',
      'Procedure',
      'In Charge',
      'Issue',
      'In Vyne?',
      'Status',
      'Submission Status',
      'Notes',
    ];
    const sampleRow = [
      '4188570569',
      'Nagel, Caitlin E',
      '10/28/2025',
      'D4342',
      'DDS2',
      'Needs Perio Chart',
      'Yes',
      '',
      'Submitted - BH/LP',
      '',
    ];
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'insurance_issues_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`${modalCard} max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${tableBorder}`}>
          <div className="flex items-center gap-3">
            <Upload className={`w-5 h-5 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
            <h3 className={`text-lg font-semibold ${headerText}`}>Import Insurance Issues from CSV</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded ${isDayMode ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* === STEP: Upload === */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <FileText className={`w-12 h-12 mx-auto mb-3 ${subText}`} />
                <p className={`text-sm mb-4 ${subText}`}>
                  Upload a CSV file with your insurance issues data.
                  The file should have columns for Patient ID, Name, Date of Service, Procedure, In Charge, Issue, In Vyne?, Status, Submission Status, and Notes.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm">
                      <Upload className="w-4 h-4" />
                      Choose CSV File
                    </div>
                  </label>
                  <button
                    onClick={handleDownloadTemplate}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-md border transition-colors ${
                      isDayMode
                        ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                </div>
              </div>

              {/* Column mapping guide */}
              <div className={`rounded-lg p-4 ${isDayMode ? 'bg-gray-50' : 'bg-gray-900/50'}`}>
                <h4 className={`text-sm font-semibold mb-2 ${headerText}`}>Expected CSV Columns</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className={subText}>Patient ID</span>
                  <span className={headerText}>Optional (e.g. 4188570569)</span>
                  <span className={subText}>Name</span>
                  <span className={headerText}>Required (e.g. Nagel, Caitlin E)</span>
                  <span className={subText}>Date of Service</span>
                  <span className={headerText}>MM/DD/YYYY or "Pre-Auth"</span>
                  <span className={subText}>Procedure</span>
                  <span className={headerText}>Codes like D4342, D2392</span>
                  <span className={subText}>In Charge</span>
                  <span className={headerText}>DDS1, DDS2, DMD1, HYG2, etc.</span>
                  <span className={subText}>Issue</span>
                  <span className={headerText}>e.g. Needs Perio Chart</span>
                  <span className={subText}>In Vyne?</span>
                  <span className={headerText}>Yes / No</span>
                  <span className={subText}>Status</span>
                  <span className={headerText}>e.g. corrected & rebatched</span>
                  <span className={subText}>Submission Status</span>
                  <span className={headerText}>e.g. Submitted - BH</span>
                  <span className={subText}>Notes</span>
                  <span className={headerText}>Any additional notes</span>
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* === STEP: Preview === */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className={`text-sm ${subText}`}>
                  Found <strong className={headerText}>{parsedRows.length}</strong> records to import.
                  {parsedRows.filter((r) => r.is_pre_auth).length > 0 && (
                    <span>
                      {' '}({parsedRows.filter((r) => r.is_pre_auth).length} pre-auth items)
                    </span>
                  )}
                </p>
                <button
                  onClick={() => {
                    setStep('upload');
                    setParsedRows([]);
                    setWarnings([]);
                  }}
                  className={`text-sm ${isDayMode ? 'text-blue-600 hover:text-blue-800' : 'text-blue-400 hover:text-blue-300'}`}
                >
                  Choose Different File
                </button>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className={`rounded-lg p-3 ${isDayMode ? 'bg-amber-50 border border-amber-200' : 'bg-amber-900/20 border border-amber-800'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-amber-800' : 'text-amber-300'}`}>
                    {warnings.length} warning{warnings.length !== 1 ? 's' : ''}:
                  </p>
                  <ul className="text-xs space-y-0.5 max-h-24 overflow-y-auto">
                    {warnings.map((w, i) => (
                      <li key={i} className={isDayMode ? 'text-amber-700' : 'text-amber-400'}>
                        Row {w.row}: {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className={`sticky top-0 ${thBg}`}>
                    <tr>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>#</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>Patient ID</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>Name</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>DOS</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>Procedure</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>In Charge</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>Issue</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>Vyne</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>Pre-Auth</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>Status</th>
                      <th className={`px-2 py-1.5 font-semibold border-b ${tableBorder}`}>Submission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className={rowHover}>
                        <td className={`px-2 py-1 border-b ${tableBorder} ${subText}`}>{i + 1}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder}`}>{row.patient_id || '--'}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder} font-medium ${headerText}`}>{row.patient_name}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder}`}>{row.date_of_service}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder} font-mono`}>{row.procedure_codes}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder}`}>{row.in_charge || '--'}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder}`}>{row.issue_type}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder}`}>{row.in_vyne ? 'Yes' : 'No'}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder}`}>{row.is_pre_auth ? 'Yes' : '--'}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder} max-w-[120px] truncate`}>{row.status || '--'}</td>
                        <td className={`px-2 py-1 border-b ${tableBorder}`}>{row.submission_status || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 50 && (
                  <p className={`text-xs text-center py-2 ${subText}`}>
                    Showing first 50 of {parsedRows.length} rows...
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* === STEP: Importing === */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className={`text-sm ${subText}`}>
                Importing {parsedRows.length} records to Supabase...
              </p>
            </div>
          )}

          {/* === STEP: Done === */}
          {step === 'done' && importResult && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <p className={`text-lg font-semibold mb-2 ${headerText}`}>Import Complete</p>
              <p className={`text-sm ${subText}`}>
                Successfully imported {importResult.success} insurance issue{importResult.success !== 1 ? 's' : ''}.
                {importResult.failed > 0 && (
                  <span className="text-red-500"> ({importResult.failed} failed)</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${tableBorder}`}>
          {step === 'done' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  isDayMode
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Import {parsedRows.length} Records
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
