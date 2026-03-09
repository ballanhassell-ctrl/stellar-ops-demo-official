// src/components/eod-report/EODReportHeader.tsx
import { Calendar, Printer, Download, Send, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString } from '../../utils/dateUtils';

interface EODReportHeaderProps {
  isDayMode: boolean;
  dashboardDate: string;
  setDashboardDate: (date: string) => void;
  isAdmin?: boolean;
  onPrint: () => void;
  onExportPDF: () => void;
  onEmailReport: () => void;
}

export default function EODReportHeader({
  isDayMode,
  dashboardDate,
  setDashboardDate,
  isAdmin,
  onPrint,
  onExportPDF,
  onEmailReport,
}: EODReportHeaderProps) {
  const todayStr = getLocalDateString();
  const isToday = dashboardDate === todayStr;

  const formattedDate = (() => {
    const [year, month, day] = dashboardDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  })();

  const navigateDay = (offset: number) => {
    const [year, month, day] = dashboardDate.split('-').map(Number);
    const d = new Date(year, month - 1, day + offset);
    const newDate = getLocalDateString(d);
    // Don't go past today
    if (newDate <= todayStr) {
      setDashboardDate(newDate);
    }
  };

  return (
    <div
      className={`rounded-3xl p-8 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift animate-slide-up`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex-1">
          <h2
            className={`text-3xl font-bold mb-3 ${isDayMode ? 'text-gold-600' : 'text-gold-400'}`}
            style={{
              textShadow: isDayMode
                ? '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(184, 152, 95, 0.4)'
                : '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 30px rgba(184, 152, 95, 0.6), 0 0 50px rgba(218, 165, 50, 0.3)',
              filter: isDayMode ? 'drop-shadow(0 0 8px rgba(184, 152, 95, 0.3))' : 'drop-shadow(0 0 12px rgba(218, 165, 50, 0.4))'
            }}
          >
            End of Day Report
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className={`w-4 h-4 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`} />
            {isAdmin && (
              <button
                onClick={() => navigateDay(-1)}
                className={`p-1.5 rounded-lg transition-colors ${isDayMode ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400'}`}
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <input
              type="date"
              value={dashboardDate}
              max={todayStr}
              onChange={(e) => setDashboardDate(e.target.value)}
              className={`px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/10 border-white/20 text-white'}`}
            />
            {isAdmin && (
              <button
                onClick={() => navigateDay(1)}
                disabled={isToday}
                className={`p-1.5 rounded-lg transition-colors ${isToday ? 'opacity-30 cursor-not-allowed' : isDayMode ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400'}`}
                title="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <span className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-300'}`}>
              {formattedDate}
            </span>
            {isAdmin && !isToday && (
              <button
                onClick={() => setDashboardDate(todayStr)}
                className={`ml-2 px-2 py-1 text-xs rounded-lg font-medium transition-colors ${isDayMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'}`}
              >
                Back to Today
              </button>
            )}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5 mt-2">
              <ShieldCheck className={`w-3.5 h-3.5 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`} />
              <span className={`text-xs ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`}>
                Admin: Use arrows or date picker to view/send reports for prior days
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2.5 btn-purple-glow rounded-xl hover:shadow-glow-primary transition-all shadow-lg hover-lift font-semibold text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all shadow-md hover-lift font-semibold text-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={onEmailReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all shadow-md hover-lift font-semibold text-sm"
          >
            <Send className="w-4 h-4" />
            {!isToday ? `Email Report (${dashboardDate})` : 'Email Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
