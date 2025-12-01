// src/components/TopProceduresModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Award } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Procedure {
  id?: string;
  procedure_name: string;
  procedure_code: string;
  count: number;
  revenue: number;
}

interface TopProceduresModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  currentDate: string;
  isDayMode: boolean;
}

export const TopProceduresModal: React.FC<TopProceduresModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentDate,
  isDayMode
}) => {
  const [procedures, setProcedures] = useState<Procedure[]>([
    { procedure_name: '', procedure_code: '', count: 0, revenue: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing procedures when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProcedures();
    }
  }, [isOpen, currentDate]);

  const loadProcedures = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('top_procedures_daily')
        .select('*')
        .eq('procedure_date', currentDate)
        .order('revenue', { ascending: false });

      if (error) {
        console.error('Error loading procedures:', error);
      } else if (data && data.length > 0) {
        setProcedures(data.map(p => ({
          id: p.id,
          procedure_name: p.procedure_name,
          procedure_code: p.procedure_code,
          count: p.count,
          revenue: p.revenue
        })));
      } else {
        // Start with one empty row if no data
        setProcedures([{ procedure_name: '', procedure_code: '', count: 0, revenue: 0 }]);
      }
    } catch (err) {
      console.error('Error loading procedures:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addProcedure = () => {
    setProcedures([...procedures, { procedure_name: '', procedure_code: '', count: 0, revenue: 0 }]);
  };

  const removeProcedure = async (index: number) => {
    const procedure = procedures[index];

    // If it has an ID, delete from database
    if (procedure.id) {
      try {
        await supabase
          .from('top_procedures_daily')
          .delete()
          .eq('id', procedure.id);
      } catch (err) {
        console.error('Error deleting procedure:', err);
      }
    }

    const newProcedures = procedures.filter((_, i) => i !== index);
    setProcedures(newProcedures.length > 0 ? newProcedures : [{ procedure_name: '', procedure_code: '', count: 0, revenue: 0 }]);
  };

  const updateProcedure = (index: number, field: keyof Procedure, value: string | number) => {
    const newProcedures = [...procedures];
    newProcedures[index] = { ...newProcedures[index], [field]: value };
    setProcedures(newProcedures);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Filter out empty procedures
      const validProcedures = procedures.filter(p =>
        p.procedure_name.trim() !== '' && p.count > 0
      );

      if (validProcedures.length === 0) {
        setError('Please add at least one procedure with a name and count');
        setIsSaving(false);
        return;
      }

      // Delete all existing procedures for this date first
      await supabase
        .from('top_procedures_daily')
        .delete()
        .eq('procedure_date', currentDate);

      // Insert new procedures
      const proceduresToInsert = validProcedures.map(p => ({
        procedure_date: currentDate,
        procedure_name: p.procedure_name,
        procedure_code: p.procedure_code,
        count: p.count,
        revenue: p.revenue
      }));

      const { error: insertError } = await supabase
        .from('top_procedures_daily')
        .insert(proceduresToInsert);

      if (insertError) {
        throw new Error(`Failed to save procedures: ${insertError.message}`);
      }

      console.log('Top procedures saved successfully');
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving procedures:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const totalCount = procedures.reduce((sum, p) => sum + (p.count || 0), 0);
  const totalRevenue = procedures.reduce((sum, p) => sum + (p.revenue || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDayMode ? 'bg-purple-100' : 'bg-purple-900/30'}`}>
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                  Top Procedures Today
                </h3>
                <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(currentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
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

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-8">
              <p className={isDayMode ? 'text-gray-600' : 'text-gray-400'}>Loading procedures...</p>
            </div>
          ) : (
            <>
              {/* Procedures Table */}
              <div className="mb-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b-2 ${isDayMode ? 'border-gray-300 bg-gray-50' : 'border-gray-600 bg-gray-700'}`}>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                        Procedure Name
                      </th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                        Code
                      </th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                        Count
                      </th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                        Revenue
                      </th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {procedures.map((procedure, index) => (
                      <tr key={index} className={`border-b ${isDayMode ? 'border-gray-200' : 'border-gray-700'}`}>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={procedure.procedure_name}
                            onChange={(e) => updateProcedure(index, 'procedure_name', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-gray-100'}`}
                            placeholder="e.g., Crown Placement"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={procedure.procedure_code}
                            onChange={(e) => updateProcedure(index, 'procedure_code', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-gray-100'}`}
                            placeholder="D2740"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={procedure.count}
                            onChange={(e) => updateProcedure(index, 'count', parseInt(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-gray-100'}`}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={procedure.revenue}
                            onChange={(e) => updateProcedure(index, 'revenue', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-gray-100'}`}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeProcedure(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove procedure"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 ${isDayMode ? 'border-gray-300 bg-gray-50' : 'border-gray-600 bg-gray-700'}`}>
                      <td className={`px-4 py-3 text-sm font-semibold ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`} colSpan={2}>
                        Total
                      </td>
                      <td className={`px-4 py-3 text-sm font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                        {totalCount}
                      </td>
                      <td className={`px-4 py-3 text-sm font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                        ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Add Procedure Button */}
              <button
                onClick={addProcedure}
                className="mb-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Procedure
              </button>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${isDayMode ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Procedures'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
