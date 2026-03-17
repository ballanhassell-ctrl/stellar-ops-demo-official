// src/components/eod-report/ImportantNotes.tsx
import { AlertCircle } from 'lucide-react';
import type { EODData } from '../../hooks/useEODMetrics';

interface ImportantNotesProps {
  isDayMode: boolean;
  eodData: EODData;
}

export default function ImportantNotes({ isDayMode, eodData }: ImportantNotesProps) {
  return (
    <div className={`rounded-2xl p-6 mt-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-amber-200/50' : 'border-amber-400/20'} hover-lift relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
      <div className="relative z-10">
        <h3 className={`text-lg font-bold mb-4 flex items-center ${isDayMode ? 'text-amber-700' : 'text-amber-400'}`}>
          <AlertCircle className="w-5 h-5 mr-2" />
          Important Notes
        </h3>
        <ul className={`space-y-3 text-sm ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
          <li className="flex items-start">
            <span className={`mr-2 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`}>•</span>
            <span><strong className={isDayMode ? 'text-amber-900' : 'text-amber-300'}>Daily Goal:</strong> {((eodData.dailyProduction / eodData.dailyProductionGoal) * 100).toFixed(1)}% of daily production goal achieved</span>
          </li>
          <li className="flex items-start">
            <span className={`mr-2 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`}>•</span>
            <span><strong className={isDayMode ? 'text-amber-900' : 'text-amber-300'}>Collection Rate:</strong> {eodData.collectionRate}% of production collected today</span>
          </li>
          <li className="flex items-start">
            <span className={`mr-2 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`}>•</span>
            <span><strong className={isDayMode ? 'text-amber-900' : 'text-amber-300'}>Denied Claims:</strong> {eodData.actionItems.deniedClaimsToResubmit} claims need follow-up</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
