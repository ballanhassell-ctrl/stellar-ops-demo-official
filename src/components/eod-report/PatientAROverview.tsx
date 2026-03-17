// src/components/eod-report/PatientAROverview.tsx
import type { PatientARMetricsData } from './types';

interface PatientAROverviewProps {
  isDayMode: boolean;
  patientARMetrics: PatientARMetricsData;
  onNavigateToPatientAR: () => void;
}

export default function PatientAROverview({ isDayMode, patientARMetrics, onNavigateToPatientAR }: PatientAROverviewProps) {
  return (
    <div className={`rounded-2xl p-6 mt-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
          Patient A/R Overview
        </h3>
        <button
          onClick={onNavigateToPatientAR}
          className="text-sm text-primary-500 hover:text-primary-600 font-semibold transition-colors"
        >
          View All →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active A/R */}
        <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-blue-200/50' : 'border-blue-400/20'} rounded-xl p-5 hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDayMode ? 'text-blue-700' : 'text-blue-400'}`}>Active A/R</p>
            <p className={`text-3xl font-bold mb-1 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${patientARMetrics.totalActiveBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-blue-600' : 'text-blue-300'}`}>
              {patientARMetrics.totalActive} accounts
            </p>
          </div>
        </div>

        {/* Collections */}
        <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-orange-200/50' : 'border-orange-400/20'} rounded-xl p-5 hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDayMode ? 'text-orange-700' : 'text-orange-400'}`}>In Collections</p>
            <p className={`text-3xl font-bold mb-1 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${patientARMetrics.totalCollectionsBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-orange-600' : 'text-orange-300'}`}>
              {patientARMetrics.totalCollections} accounts
            </p>
          </div>
        </div>

        {/* Pending Write-Offs */}
        <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-red-200/50' : 'border-red-400/20'} rounded-xl p-5 hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDayMode ? 'text-red-700' : 'text-red-400'}`}>Pending Write-Offs</p>
            <p className={`text-3xl font-bold mb-1 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              {patientARMetrics.totalWriteOffSuggested}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-red-600' : 'text-red-300'}`}>
              ${patientARMetrics.totalWriteOffSuggestedBalance.toLocaleString()} balance
            </p>
          </div>
        </div>

        {/* Write-Off Suggestions */}
        <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-purple-200/50' : 'border-purple-400/20'} rounded-xl p-5 hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDayMode ? 'text-purple-700' : 'text-purple-400'}`}>Write-Off Suggestions</p>
            <p className={`text-3xl font-bold mb-1 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              {patientARMetrics.pendingSuggestionsCount}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-purple-600' : 'text-purple-300'}`}>
              Pending review
            </p>
          </div>
        </div>
      </div>

      {/* Aging Breakdown */}
      <div className="mt-6">
        <h4 className={`text-sm font-bold mb-3 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Aging Breakdown</h4>
        <div className="grid grid-cols-4 gap-3">
          <div className={`${isDayMode ? 'bg-green-50' : 'bg-green-900/20'} rounded-lg p-3`}>
            <p className={`text-xs font-semibold ${isDayMode ? 'text-green-700' : 'text-green-400'}`}>0-30 Days</p>
            <p className={`text-xl font-bold ${isDayMode ? 'text-green-900' : 'text-green-300'}`}>{patientARMetrics.agingBuckets['0-30']}</p>
          </div>
          <div className={`${isDayMode ? 'bg-yellow-50' : 'bg-yellow-900/20'} rounded-lg p-3`}>
            <p className={`text-xs font-semibold ${isDayMode ? 'text-yellow-700' : 'text-yellow-400'}`}>31-60 Days</p>
            <p className={`text-xl font-bold ${isDayMode ? 'text-yellow-900' : 'text-yellow-300'}`}>{patientARMetrics.agingBuckets['31-60']}</p>
          </div>
          <div className={`${isDayMode ? 'bg-orange-50' : 'bg-orange-900/20'} rounded-lg p-3`}>
            <p className={`text-xs font-semibold ${isDayMode ? 'text-orange-700' : 'text-orange-400'}`}>61-90 Days</p>
            <p className={`text-xl font-bold ${isDayMode ? 'text-orange-900' : 'text-orange-300'}`}>{patientARMetrics.agingBuckets['61-90']}</p>
          </div>
          <div className={`${isDayMode ? 'bg-red-50' : 'bg-red-900/20'} rounded-lg p-3`}>
            <p className={`text-xs font-semibold ${isDayMode ? 'text-red-700' : 'text-red-400'}`}>90+ Days</p>
            <p className={`text-xl font-bold ${isDayMode ? 'text-red-900' : 'text-red-300'}`}>{patientARMetrics.agingBuckets['90+']}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
