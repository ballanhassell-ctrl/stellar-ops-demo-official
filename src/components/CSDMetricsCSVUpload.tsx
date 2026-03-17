// src/components/CSDMetricsCSVUpload.tsx
import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface MetricValue {
  as_of_date: string;
  field_key: string;
  value: number;
  notes?: string;
}

interface CSDMetricsCSVUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CSDMetricsCSVUpload: React.FC<CSDMetricsCSVUploadProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<MetricValue[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a valid CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setError('CSV file must contain at least a header row and one data row');
        setIsProcessing(false);
        return;
      }

      // Parse header to find column indices
      const header = lines[0].toLowerCase();
      const headers = header.split(',').map(h => h.trim());

      console.log('CSV Headers found:', headers);

      const dateIndex = headers.findIndex(h => h.includes('date') || h === 'as_of_date');
      const keyIndex = headers.findIndex(h => h.includes('field_key') || h.includes('key') || h === 'metric');
      const valueIndex = headers.findIndex(h => h === 'value' || h.includes('amount'));
      const notesIndex = headers.findIndex(h => h.includes('notes') || h.includes('comment'));

      console.log('Column detection:', {
        dateIndex,
        keyIndex,
        valueIndex,
        notesIndex,
        headers
      });

      // Validate required columns
      if (dateIndex === -1 || keyIndex === -1 || valueIndex === -1) {
        const missing = [];
        if (dateIndex === -1) missing.push('as_of_date (or date)');
        if (keyIndex === -1) missing.push('field_key (or metric)');
        if (valueIndex === -1) missing.push('value (or amount)');

        setError(`CSV is missing required columns: ${missing.join(', ')}. Found headers: ${headers.join(', ')}`);
        setIsProcessing(false);
        return;
      }

      // Parse data rows
      const metrics: MetricValue[] = [];
      const requiredLength = Math.max(dateIndex, keyIndex, valueIndex) + 1;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));

        if (values.length >= requiredLength) {
          const metric: MetricValue = {
            as_of_date: values[dateIndex] || '',
            field_key: values[keyIndex] || '',
            value: parseFloat(values[valueIndex]?.replace(/[$,]/g, '') || '0') || 0,
            notes: notesIndex !== -1 ? values[notesIndex] : undefined
          };

          // Validate required fields
          if (metric.as_of_date && metric.field_key) {
            metrics.push(metric);
          }
        }
      }

      console.log('Parsed metrics:', metrics);

      if (metrics.length === 0) {
        setError('No valid metric data found in CSV');
        setIsProcessing(false);
        return;
      }

      setParsedData(metrics);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setError('Failed to parse CSV file. Please check the format.');
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      setError('No data to upload');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Prepare data for upsert
      const insertData = parsedData.map(metric => ({
        as_of_date: metric.as_of_date,
        field_key: metric.field_key,
        value: metric.value,
        notes: metric.notes || null,
        source: 'csv_upload'
      }));

      // Use upsert to handle existing records
      const { error: upsertError } = await supabase
        .from('csd_metric_values')
        .upsert(insertData, {
          onConflict: 'as_of_date,field_key',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error upserting metrics:', upsertError);
        setError(`Failed to save metrics to database: ${upsertError.message}`);
        setIsProcessing(false);
        return;
      }

      setSuccess(true);
      setIsProcessing(false);

      // Call success callback after short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error uploading metrics:', err);
      setError('Failed to upload metrics');
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvContent = `as_of_date,field_key,value,notes
${today},bam_current_revenue,0,
${today},collection_rate,0,
${today},active_patients,0,
${today},active_claims,0,
${today},eod_daily_production,0,
${today},eod_payments_collected,0,
${today},eod_insurance_payments,0,
${today},eod_patient_payments,0,
${today},eod_patients_seen,0,
${today},eod_new_patients,0,
${today},eod_procedures_completed,0,
${today},eod_payment_visa,0,
${today},eod_payment_mastercard,0,
${today},eod_payment_amex,0,
${today},eod_payment_discover,0,
${today},eod_payment_cherry,0,
${today},eod_payment_carecredit,0,
${today},eod_payment_insurance_check,0,
${today},eod_payment_other_check,0,
${today},eod_payment_cash,0,
${today},eod_payment_eft,0,
${today},provider_dr_gajjar,0,
${today},provider_dr_judge,0,
${today},provider_dr_strachan,0,
${today},provider_farah,0,
${today},provider_olga,0,
${today},provider_jissel,0,
${today},provider_temp_hyg,0,
${today},eod_mtd_production,0,
${today},eod_mtd_collected,0,
${today},eod_mtd_new_patients,0,
${today},todays_payments,0,
${today},insurance_payments,0,
${today},patient_payments,0,
${today},unapplied_credits,0,
${today},patients_with_balance,0,
${today},total_patient_ar,0,
${today},past_due_accounts,0,
${today},patient_ar_0_30,0,
${today},patient_ar_31_60,0,
${today},patient_ar_61_90,0,
${today},patient_ar_90_plus,0,
${today},insurance_ar_0_30_amount,0,
${today},insurance_ar_31_60_amount,0,
${today},insurance_ar_61_90_amount,0,
${today},insurance_ar_90_plus_amount,0,
${today},insurance_ar_0_30_count,0,
${today},insurance_ar_31_60_count,0,
${today},insurance_ar_61_90_count,0,
${today},insurance_ar_90_plus_count,0,
${today},total_pre_auths,0,
${today},eod_claims_to_submit,0,
${today},scorecard_production_actual,0,
${today},scorecard_collection_actual,0,
${today},scorecard_new_patients_actual,0,
${today},scorecard_show_rate_dr,0,
${today},scorecard_show_rate_hyg,0,
${today},new_pts_per_day,0,
${today},new_pts_per_week,0,
${today},new_pts_per_month,0,
${today},new_pts_quarterly,0,`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csd-metrics-template-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload CSD Metrics CSV</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a CSV file with daily metric values for your practice
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* CSV Format Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              CSV Format Requirements
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Required columns: <code className="bg-blue-100 px-1 rounded">as_of_date</code>, <code className="bg-blue-100 px-1 rounded">field_key</code>, <code className="bg-blue-100 px-1 rounded">value</code></li>
              <li>• Optional column: <code className="bg-blue-100 px-1 rounded">notes</code></li>
              <li>• Date format: YYYY-MM-DD (e.g., 2025-12-04)</li>
              <li>• field_key must match existing metric keys in the catalog</li>
              <li>• Existing records will be updated, new records will be inserted</li>
            </ul>
          </div>

          {/* Download Template Button */}
          <div className="mb-6">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template CSV
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {file ? file.name : 'Click to select CSV file'}
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Metrics uploaded successfully!</p>
            </div>
          )}

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Preview ({parsedData.length} metrics)
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Metric Key</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.map((metric, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{metric.as_of_date}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 font-mono text-xs">{metric.field_key}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {metric.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 truncate max-w-xs">{metric.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={parsedData.length === 0 || isProcessing || success}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Uploaded!
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Metrics
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
