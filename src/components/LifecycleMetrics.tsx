// src/components/LifecycleMetrics.tsx
import { useEffect, useState } from 'react';
import { TrendingUp, Users, Clock, DollarSign, Award } from 'lucide-react';
import { getLatestLifecycleMetrics, calculateLifecycleMetrics, saveLifecycleMetrics } from '../services/patientService';
import type { LifecycleMetrics as LifecycleMetricsType } from '../types/database.types';

export default function LifecycleMetrics() {
  const [metrics, setMetrics] = useState<LifecycleMetricsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const latestMetrics = await getLatestLifecycleMetrics();

      if (latestMetrics) {
        setMetrics(latestMetrics);
        setLastUpdated(latestMetrics.calculation_date);
      } else {
        // No metrics found, calculate them
        const calculatedMetrics = await calculateLifecycleMetrics();
        await saveLifecycleMetrics(calculatedMetrics);
        setMetrics(calculatedMetrics);
        setLastUpdated(calculatedMetrics.calculation_date);
      }
    } catch (error) {
      console.error('Error loading lifecycle metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const calculatedMetrics = await calculateLifecycleMetrics();
      await saveLifecycleMetrics(calculatedMetrics);
      setMetrics(calculatedMetrics);
      setLastUpdated(calculatedMetrics.calculation_date);
    } catch (error) {
      console.error('Error refreshing metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-600">
          <p>No lifecycle metrics available.</p>
          <p className="text-sm mt-2">Upload patient data to generate metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Lifecycle Metrics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {lastUpdated ? formatDate(lastUpdated) : 'Never'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          Refresh Metrics
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Patient Lifecycle Duration */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-blue-900">Patient Lifecycle</h3>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {metrics.avg_patient_lifecycle_months.toFixed(1)}m / {metrics.avg_patient_lifecycle_years.toFixed(1)}y
              </div>
              <p className="text-sm text-blue-700">Average duration</p>
            </div>
          </div>
        </div>

        {/* Active Patients Prior Month */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-medium text-green-900">Active Pts (Prior Month)</h3>
              </div>
              <div className="text-3xl font-bold text-green-900 mb-1">
                {metrics.active_patients_prior_month.toLocaleString()}
              </div>
              <p className="text-sm text-green-700">Beginning of last month</p>
            </div>
          </div>
        </div>

        {/* Average Retention Period */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-medium text-purple-900">Avg Retention Period</h3>
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {metrics.avg_retention_period_months.toFixed(1)}
              </div>
              <p className="text-sm text-purple-700">Months</p>
            </div>
          </div>
        </div>

        {/* Average Revenue Per Client */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-medium text-orange-900">Average Revenue Per Client</h3>
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-1">
                {formatCurrency(metrics.average_revenue_per_client)}
              </div>
              <p className="text-sm text-orange-700">ARPC</p>
            </div>
          </div>
        </div>

        {/* Lifetime Value */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-medium text-indigo-900">Lifetime Value (LTV)</h3>
              </div>
              <div className="text-3xl font-bold text-indigo-900 mb-1">
                {formatCurrency(metrics.lifetime_value)}
              </div>
              <p className="text-sm text-indigo-700">ARPC × Avg Retention Period</p>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-900">Patient Summary</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total Active:</span>
                  <span className="font-semibold text-gray-900">{metrics.total_active_patients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Total Churned:</span>
                  <span className="font-semibold text-gray-900">{metrics.total_churned_patients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Churn Rate:</span>
                  <span className="font-semibold text-gray-900">{metrics.churn_rate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
