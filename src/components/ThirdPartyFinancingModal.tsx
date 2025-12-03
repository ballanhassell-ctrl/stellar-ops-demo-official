// src/components/ThirdPartyFinancingModal.tsx
import React, { useState } from 'react';
import { X, DollarSign, Users, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ThirdPartyFinancingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  currentDate: string;
  isDayMode: boolean;
}

export const ThirdPartyFinancingModal: React.FC<ThirdPartyFinancingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentDate,
  isDayMode
}) => {
  const [cherryPatients, setCherryPatients] = useState<number>(0);
  const [cherryAmount, setCherryAmount] = useState<number>(0);
  const [careCreditPatients, setCareCreditPatients] = useState<number>(0);
  const [careCreditAmount, setCareCreditAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const metricsToSave = [
        { field_key: 'financing_cherry_patients', value: cherryPatients },
        { field_key: 'financing_cherry_amount', value: cherryAmount },
        { field_key: 'financing_carecredit_patients', value: careCreditPatients },
        { field_key: 'financing_carecredit_amount', value: careCreditAmount },
      ];

      for (const metric of metricsToSave) {
        const { error: upsertError } = await supabase
          .from('csd_metric_values')
          .upsert({
            as_of_date: currentDate,
            field_key: metric.field_key,
            value: metric.value,
            source: 'manual_entry',
            notes: 'Entered via Third Party Financing modal',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'as_of_date,field_key'
          });

        if (upsertError) {
          throw new Error(`Failed to save ${metric.field_key}: ${upsertError.message}`);
        }
      }

      console.log('Third party financing data saved successfully');
      onSave();
      onClose();

      // Reset form
      setCherryPatients(0);
      setCherryAmount(0);
      setCareCreditPatients(0);
      setCareCreditAmount(0);
    } catch (err) {
      console.error('Error saving financing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-2xl max-w-2xl w-full ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-xl font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                Update Third Party Financing
              </h3>
              <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Enter financing data for {new Date(currentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`transition-colors ${isDayMode ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            {/* Cherry Financing */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-300 rounded-lg p-6">
              <h4 className="text-lg font-bold text-pink-900 mb-4">Cherry Financing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-pink-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Number of Patients
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cherryPatients}
                    onChange={(e) => setCherryPatients(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-pink-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Total Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cherryAmount}
                    onChange={(e) => setCherryAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* CareCredit Financing */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-300 rounded-lg p-6">
              <h4 className="text-lg font-bold text-teal-900 mb-4">CareCredit Financing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-teal-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Number of Patients
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={careCreditPatients}
                    onChange={(e) => setCareCreditPatients(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Total Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={careCreditAmount}
                    onChange={(e) => setCareCreditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className={`border-2 rounded-lg p-4 ${isDayMode ? 'bg-gray-50 border-gray-300' : 'bg-gray-700 border-gray-600'}`}>
              <h4 className={`text-sm font-semibold mb-2 ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Total Patients</p>
                  <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                    {cherryPatients + careCreditPatients}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Total Financed</p>
                  <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                    ${(cherryAmount + careCreditAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${isDayMode ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
