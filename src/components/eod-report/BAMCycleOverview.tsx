// src/components/eod-report/BAMCycleOverview.tsx
import type { DashboardData } from './types';

interface BAMCycleOverviewProps {
  isDayMode: boolean;
  dashboardData: DashboardData;
}

export default function BAMCycleOverview({ isDayMode, dashboardData }: BAMCycleOverviewProps) {
  return (
    <div className={`rounded-2xl p-6 mt-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
      <h3 className="text-xl font-bold mb-5 bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
        BAM Cycle Overview
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Cycle */}
        <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-emerald-200/50' : 'border-emerald-400/20'} rounded-xl p-5 hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDayMode ? 'text-emerald-700' : 'text-emerald-400'}`}>Current Cycle</p>
            <p className={`text-sm mb-2 ${isDayMode ? 'text-emerald-600' : 'text-emerald-300'}`}>
              {dashboardData.bamCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p className={`text-2xl font-bold mb-1 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${dashboardData.bamCurrentRevenue.toLocaleString()}
            </p>
            <p className={`text-xs mb-2 ${isDayMode ? 'text-emerald-700' : 'text-emerald-400'}`}>
              Goal: ${dashboardData.bamTargetGoal.toLocaleString()}
            </p>
            <div className={`w-full rounded-full h-2 ${isDayMode ? 'bg-emerald-100/60' : 'bg-emerald-950/40'}`}>
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100, 100)}%`
                }}
              ></div>
            </div>
            <p className={`text-xs mt-1 ${isDayMode ? 'text-emerald-600' : 'text-emerald-300'}`}>
              {((dashboardData.bamCurrentRevenue / dashboardData.bamTargetGoal) * 100).toFixed(1)}% of goal
            </p>
          </div>
        </div>

        {/* Days Remaining */}
        <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-primary-200/50' : 'border-primary-400/20'} rounded-xl p-5 hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDayMode ? 'text-primary-700' : 'text-primary-400'}`}>Days Remaining</p>
            <p className={`text-4xl font-bold mt-6 mb-2 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              {dashboardData.bamDaysRemaining}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-primary-700' : 'text-primary-400'}`}>Business days left in current cycle</p>
          </div>
        </div>

        {/* Next Cycle */}
        <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-purple-200/50' : 'border-purple-400/20'} rounded-xl p-5 hover-lift relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          <div className="relative z-10">
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDayMode ? 'text-purple-700' : 'text-purple-400'}`}>Next Cycle</p>
            <p className={`text-sm mt-4 mb-2 ${isDayMode ? 'text-purple-600' : 'text-purple-300'}`}>
              {dashboardData.bamNextCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dashboardData.bamNextCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p className={`text-xs ${isDayMode ? 'text-purple-700' : 'text-purple-400'}`}>
              19 business days | Goal: ${dashboardData.bamTargetGoal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
