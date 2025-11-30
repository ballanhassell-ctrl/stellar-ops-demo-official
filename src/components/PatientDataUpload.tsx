// src/components/PatientDataUpload.tsx
import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Users, DollarSign, Calendar } from 'lucide-react';
import { insertPatients, insertAppointments, insertRevenue, recalculatePatientTotals, calculateLifecycleMetrics, saveLifecycleMetrics } from '../services/patientService';
import type { Patient, Appointment, PatientRevenue } from '../types/database.types';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type UploadResult = {
  type: 'patients' | 'appointments' | 'revenue';
  status: UploadStatus;
  message: string;
  recordsProcessed?: number;
};

export default function PatientDataUpload() {
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // Simple CSV parser - handles basic cases
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
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
  };

  const handlePatientsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const newResult: UploadResult = {
      type: 'patients',
      status: 'uploading',
      message: 'Processing patients data...',
    };
    setResults(prev => [...prev, newResult]);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const patients: Patient[] = dataRows.map(row => {
        const patient: any = {};
        headers.forEach((header, index) => {
          patient[header] = row[index]?.trim() || null;
        });

        return {
          patient_id: patient.patient_id || patient.patientid || patient.id,
          first_visit_date: patient.first_visit_date || patient.firstvisit || patient.first_visit,
          last_visit_date: patient.last_visit_date || patient.lastvisit || patient.last_visit || null,
          status: (patient.status || 'active').toLowerCase() as 'active' | 'inactive' | 'churned',
          total_lifetime_revenue: parseFloat(patient.total_lifetime_revenue || patient.total_revenue || patient.revenue || '0'),
          total_visits: parseInt(patient.total_visits || patient.visits || '0'),
        };
      });

      await insertPatients(patients);

      setResults(prev => prev.map(r =>
        r.type === 'patients' && r.status === 'uploading'
          ? { ...r, status: 'success', message: `Successfully uploaded ${patients.length} patients`, recordsProcessed: patients.length }
          : r
      ));
    } catch (error) {
      console.error('Error uploading patients:', error);
      setResults(prev => prev.map(r =>
        r.type === 'patients' && r.status === 'uploading'
          ? { ...r, status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : r
      ));
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const handleAppointmentsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const newResult: UploadResult = {
      type: 'appointments',
      status: 'uploading',
      message: 'Processing appointments data...',
    };
    setResults(prev => [...prev, newResult]);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const appointments: Appointment[] = dataRows.map(row => {
        const appt: any = {};
        headers.forEach((header, index) => {
          appt[header] = row[index]?.trim() || null;
        });

        return {
          patient_id: appt.patient_id || appt.patientid || appt.patient,
          appointment_date: appt.appointment_date || appt.date || appt.appt_date,
          provider_name: appt.provider_name || appt.provider || appt.doctor || null,
          production_amount: parseFloat(appt.production_amount || appt.production || appt.amount || '0'),
          status: (appt.status || 'completed').toLowerCase() as 'completed' | 'no_show' | 'cancelled' | 'scheduled',
          procedure_codes: appt.procedure_codes || appt.procedures || null,
        };
      });

      await insertAppointments(appointments);

      setResults(prev => prev.map(r =>
        r.type === 'appointments' && r.status === 'uploading'
          ? { ...r, status: 'success', message: `Successfully uploaded ${appointments.length} appointments`, recordsProcessed: appointments.length }
          : r
      ));
    } catch (error) {
      console.error('Error uploading appointments:', error);
      setResults(prev => prev.map(r =>
        r.type === 'appointments' && r.status === 'uploading'
          ? { ...r, status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : r
      ));
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const handleRevenueUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const newResult: UploadResult = {
      type: 'revenue',
      status: 'uploading',
      message: 'Processing revenue data...',
    };
    setResults(prev => [...prev, newResult]);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const revenue: PatientRevenue[] = dataRows.map(row => {
        const rev: any = {};
        headers.forEach((header, index) => {
          rev[header] = row[index]?.trim() || null;
        });

        return {
          patient_id: rev.patient_id || rev.patientid || rev.patient,
          transaction_date: rev.transaction_date || rev.date || rev.trans_date,
          amount: parseFloat(rev.amount || rev.payment || '0'),
          transaction_type: (rev.transaction_type || rev.type || 'payment').toLowerCase() as 'payment' | 'adjustment' | 'writeoff' | 'production',
          payment_method: rev.payment_method || rev.method || null,
          notes: rev.notes || null,
        };
      });

      await insertRevenue(revenue);

      setResults(prev => prev.map(r =>
        r.type === 'revenue' && r.status === 'uploading'
          ? { ...r, status: 'success', message: `Successfully uploaded ${revenue.length} revenue records`, recordsProcessed: revenue.length }
          : r
      ));
    } catch (error) {
      console.error('Error uploading revenue:', error);
      setResults(prev => prev.map(r =>
        r.type === 'revenue' && r.status === 'uploading'
          ? { ...r, status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : r
      ));
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const handleRecalculateMetrics = async () => {
    setIsProcessing(true);
    const newResult: UploadResult = {
      type: 'patients',
      status: 'uploading',
      message: 'Recalculating patient totals and lifecycle metrics...',
    };
    setResults(prev => [...prev, newResult]);

    try {
      // Recalculate patient totals
      await recalculatePatientTotals();

      // Calculate lifecycle metrics
      const metrics = await calculateLifecycleMetrics();

      // Save metrics to database
      await saveLifecycleMetrics(metrics);

      setResults(prev => prev.map(r =>
        r.status === 'uploading'
          ? { ...r, status: 'success', message: 'Successfully recalculated all metrics!' }
          : r
      ));
    } catch (error) {
      console.error('Error recalculating metrics:', error);
      setResults(prev => prev.map(r =>
        r.status === 'uploading'
          ? { ...r, status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : r
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => setResults([]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Patient Data Upload</h2>

      <div className="space-y-6">
        {/* Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Patients Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
            <div className="flex flex-col items-center text-center">
              <Users className="w-12 h-12 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Upload Patients</h3>
              <p className="text-sm text-gray-600 mb-4">
                CSV with patient records
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handlePatientsUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
                <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose File</span>
                </div>
              </label>
              <div className="mt-3 text-xs text-gray-500">
                Required: patient_id, first_visit_date, status
              </div>
            </div>
          </div>

          {/* Appointments Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-500 transition-colors">
            <div className="flex flex-col items-center text-center">
              <Calendar className="w-12 h-12 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Upload Appointments</h3>
              <p className="text-sm text-gray-600 mb-4">
                CSV with appointment history
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleAppointmentsUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
                <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose File</span>
                </div>
              </label>
              <div className="mt-3 text-xs text-gray-500">
                Required: patient_id, appointment_date
              </div>
            </div>
          </div>

          {/* Revenue Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-500 transition-colors">
            <div className="flex flex-col items-center text-center">
              <DollarSign className="w-12 h-12 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Upload Revenue</h3>
              <p className="text-sm text-gray-600 mb-4">
                CSV with payment records
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleRevenueUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
                <div className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose File</span>
                </div>
              </label>
              <div className="mt-3 text-xs text-gray-500">
                Required: patient_id, transaction_date, amount
              </div>
            </div>
          </div>
        </div>

        {/* Recalculate Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleRecalculateMetrics}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FileText className="w-5 h-5" />
            <span>Recalculate All Metrics</span>
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">Upload Results</h3>
              <button
                onClick={clearResults}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-md ${
                    result.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : result.status === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  {result.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : result.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      result.status === 'success'
                        ? 'text-green-900'
                        : result.status === 'error'
                        ? 'text-red-900'
                        : 'text-blue-900'
                    }`}>
                      {result.message}
                    </p>
                    {result.recordsProcessed && (
                      <p className="text-xs text-gray-600 mt-1">
                        {result.recordsProcessed} records processed
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CSV Format Guide */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">CSV Format Guide</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Patients CSV Format:</h4>
              <code className="block bg-white p-2 rounded border text-xs overflow-x-auto">
                patient_id,first_visit_date,last_visit_date,status,total_lifetime_revenue,total_visits
                <br />
                P001,2023-01-15,2025-11-25,active,3500.00,12
              </code>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Appointments CSV Format:</h4>
              <code className="block bg-white p-2 rounded border text-xs overflow-x-auto">
                patient_id,appointment_date,provider_name,production_amount,status,procedure_codes
                <br />
                P001,2025-11-25,Dr. Smith,250.00,completed,D0120,D0274
              </code>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Revenue CSV Format:</h4>
              <code className="block bg-white p-2 rounded border text-xs overflow-x-auto">
                patient_id,transaction_date,amount,transaction_type,payment_method,notes
                <br />
                P001,2025-11-25,250.00,payment,insurance,Claim paid
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
