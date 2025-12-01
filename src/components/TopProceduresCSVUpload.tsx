// src/components/TopProceduresCSVUpload.tsx
import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Procedure {
  procedure_name: string;
  procedure_code: string;
  count: number;
  revenue: number;
}

interface TopProceduresCSVUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentDate: string;
}

export const TopProceduresCSVUpload: React.FC<TopProceduresCSVUploadProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentDate
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Procedure[]>([]);
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

      const nameIndex = headers.findIndex(h =>
        h.includes('procedure') && h.includes('name') || h.includes('description')
      );
      const codeIndex = headers.findIndex(h =>
        h.includes('code') || h.includes('cpt') || h.includes('ada')
      );
      const countIndex = headers.findIndex(h =>
        h.includes('count') || h.includes('quantity') || h.includes('qty')
      );
      const revenueIndex = headers.findIndex(h =>
        h.includes('revenue') || h.includes('amount') || h.includes('total')
      );

      if (nameIndex === -1 || codeIndex === -1 || countIndex === -1 || revenueIndex === -1) {
        setError('CSV must contain columns for: Procedure Name, Code, Count, and Revenue');
        setIsProcessing(false);
        return;
      }

      // Parse data rows
      const procedures: Procedure[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));

        if (values.length >= 4) {
          const procedure: Procedure = {
            procedure_name: values[nameIndex] || '',
            procedure_code: values[codeIndex] || '',
            count: parseInt(values[countIndex]) || 0,
            revenue: parseFloat(values[revenueIndex].replace(/[$,]/g, '')) || 0
          };

          if (procedure.procedure_name && procedure.count > 0) {
            procedures.push(procedure);
          }
        }
      }

      if (procedures.length === 0) {
        setError('No valid procedure data found in CSV');
        setIsProcessing(false);
        return;
      }

      setParsedData(procedures);
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
      // Get current month's date range
      const date = new Date(currentDate);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      console.log(`Uploading procedures for month: ${monthStartStr} to ${monthEndStr}`);

      // First, fetch existing procedures for this month to aggregate
      const { data: existingData, error: fetchError } = await supabase
        .from('top_procedures_daily')
        .select('*')
        .gte('procedure_date', monthStartStr)
        .lte('procedure_date', monthEndStr);

      if (fetchError) {
        console.error('Error fetching existing procedures:', fetchError);
        setError('Failed to fetch existing data');
        setIsProcessing(false);
        return;
      }

      // Aggregate existing data by procedure code
      const aggregatedMap = new Map<string, Procedure>();

      // Add existing monthly data
      if (existingData) {
        existingData.forEach(proc => {
          const key = proc.procedure_code;
          if (aggregatedMap.has(key)) {
            const existing = aggregatedMap.get(key)!;
            existing.count += proc.count;
            existing.revenue += proc.revenue;
          } else {
            aggregatedMap.set(key, {
              procedure_name: proc.procedure_name,
              procedure_code: proc.procedure_code,
              count: proc.count,
              revenue: proc.revenue
            });
          }
        });
      }

      // Add new CSV data
      parsedData.forEach(proc => {
        const key = proc.procedure_code;
        if (aggregatedMap.has(key)) {
          const existing = aggregatedMap.get(key)!;
          existing.count += proc.count;
          existing.revenue += proc.revenue;
        } else {
          aggregatedMap.set(key, { ...proc });
        }
      });

      // Convert to array and sort by revenue
      const aggregatedProcedures = Array.from(aggregatedMap.values())
        .sort((a, b) => b.revenue - a.revenue);

      // Delete existing data for current date to avoid duplicates
      await supabase
        .from('top_procedures_daily')
        .delete()
        .eq('procedure_date', currentDate);

      // Insert new aggregated data for current date
      const insertData = aggregatedProcedures.map(proc => ({
        procedure_date: currentDate,
        procedure_name: proc.procedure_name,
        procedure_code: proc.procedure_code,
        count: proc.count,
        revenue: proc.revenue
      }));

      const { error: insertError } = await supabase
        .from('top_procedures_daily')
        .insert(insertData);

      if (insertError) {
        console.error('Error inserting procedures:', insertError);
        setError('Failed to save procedures to database');
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
      console.error('Error uploading procedures:', err);
      setError('Failed to upload procedures');
      setIsProcessing(false);
    }
  };

  const totalCount = parsedData.reduce((sum, p) => sum + p.count, 0);
  const totalRevenue = parsedData.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Top Procedures CSV</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a CSV file with procedure data for {new Date(currentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
              <li>• Header row must include: <code className="bg-blue-100 px-1 rounded">Procedure Name</code>, <code className="bg-blue-100 px-1 rounded">Code</code>, <code className="bg-blue-100 px-1 rounded">Count</code>, <code className="bg-blue-100 px-1 rounded">Revenue</code></li>
              <li>• Data will be aggregated with existing monthly data</li>
              <li>• Procedures with the same code will be combined</li>
            </ul>
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
              <p className="text-sm text-green-800">Procedures uploaded successfully!</p>
            </div>
          )}

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Preview ({parsedData.length} procedures)
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Procedure</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Code</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Count</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.map((proc, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{proc.procedure_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{proc.procedure_code}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{proc.count}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            ${proc.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-purple-50 border-t-2 border-purple-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-sm font-semibold text-purple-900">
                          Total
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-purple-900 text-right">
                          {totalCount}
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-purple-900 text-right">
                          ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
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
                Upload & Aggregate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
