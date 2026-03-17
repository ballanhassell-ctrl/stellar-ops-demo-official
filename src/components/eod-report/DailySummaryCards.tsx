// src/components/eod-report/DailySummaryCards.tsx
import { TrendingUp, DollarSign, Users, Activity } from 'lucide-react';
import type { EODData } from '../../hooks/useEODMetrics';

interface DailySummaryCardsProps {
  isDayMode: boolean;
  eodData: EODData;
}

export default function DailySummaryCards({ isDayMode, eodData }: DailySummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Daily Production */}
      <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-emerald-200/50' : 'border-emerald-400/20'} rounded-xl p-6 hover-lift relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className={`text-sm font-bold mb-1 ${isDayMode ? 'text-emerald-700' : 'text-emerald-400'}`}>Daily Production</p>
            <p className={`text-3xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${eodData.dailyProduction.toLocaleString()}
            </p>
            <p className={`text-xs mt-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
              Goal: ${eodData.dailyProductionGoal.toLocaleString()}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/20">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
        <div className={`w-full rounded-full h-2 mt-3 ${isDayMode ? 'bg-emerald-100/60' : 'bg-emerald-950/40'}`}>
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((eodData.dailyProduction / eodData.dailyProductionGoal) * 100, 100)}%`
            }}
          ></div>
        </div>
      </div>

      {/* Payments Collected */}
      <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-primary-200/50' : 'border-primary-400/20'} rounded-xl p-6 hover-lift relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className={`text-sm font-bold mb-1 ${isDayMode ? 'text-primary-700' : 'text-primary-400'}`}>Payments Collected</p>
            <p className={`text-3xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${eodData.paymentsCollected.toLocaleString()}
            </p>
            <p className={`text-xs mt-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
              Collection Rate: {eodData.collectionRate}%
            </p>
          </div>
          <div className="p-2 rounded-xl bg-primary-500/20">
            <DollarSign className="w-6 h-6 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Patients Seen */}
      <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-purple-200/50' : 'border-purple-400/20'} rounded-xl p-6 hover-lift relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className={`text-sm font-bold mb-1 ${isDayMode ? 'text-purple-700' : 'text-purple-400'}`}>Patients Seen</p>
            <p className={`text-3xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              {eodData.patientsSeenToday}
            </p>
            <p className={`text-xs mt-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
              New Patients: {eodData.newPatients}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/20">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Procedures Completed */}
      <div className={`${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-amber-200/50' : 'border-amber-400/20'} rounded-xl p-6 hover-lift relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className={`text-sm font-bold mb-1 ${isDayMode ? 'text-amber-700' : 'text-amber-400'}`}>Procedures</p>
            <p className={`text-3xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              {eodData.proceduresCompleted}
            </p>
            <p className={`text-xs mt-2 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>Completed today</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/20">
            <Activity className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
