// src/components/eod-report/MTDSummary.tsx
import type { EODData } from '../../hooks/useEODMetrics';

interface MTDSummaryProps {
  isDayMode: boolean;
  eodData: EODData;
}

export default function MTDSummary({ isDayMode, eodData }: MTDSummaryProps) {
  return (
    <div className={`rounded-2xl p-6 mt-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
      <h3 className="text-xl font-bold mb-5 bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
        Month-to-Date Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MTD Production */}
        <div className={`text-center p-5 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-primary-200/50' : 'border-primary-400/20'} rounded-xl hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>MTD Production</p>
            <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${eodData.monthToDateSummary.production.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Goal: ${eodData.monthToDateSummary.productionGoal.toLocaleString()}
            </p>
            <div className={`w-full rounded-full h-2 mt-2 ${isDayMode ? 'bg-primary-100/60' : 'bg-primary-950/40'}`}>
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((eodData.monthToDateSummary.production / eodData.monthToDateSummary.productionGoal) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* MTD Collected */}
        <div className={`text-center p-5 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-emerald-200/50' : 'border-emerald-400/20'} rounded-xl hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>MTD Collected</p>
            <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${eodData.monthToDateSummary.collected.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {eodData.monthToDateSummary.collectionRate}% collection rate
            </p>
          </div>
        </div>

        {/* New Patients MTD */}
        <div className={`text-center p-5 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-purple-200/50' : 'border-purple-400/20'} rounded-xl hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>New Patients MTD</p>
            <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              {eodData.monthToDateSummary.newPatients}
            </p>
            <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>This month</p>
          </div>
        </div>

        {/* Avg Daily Production */}
        <div className={`text-center p-5 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-amber-200/50' : 'border-amber-400/20'} rounded-xl hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-sm font-medium mb-1 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Avg Daily Production</p>
            <p className={`text-2xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${Math.round(eodData.monthToDateSummary.production / 10).toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Based on 10 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}
