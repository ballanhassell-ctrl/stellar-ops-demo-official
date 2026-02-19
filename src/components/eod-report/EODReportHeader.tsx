// src/components/eod-report/EODReportHeader.tsx
import { Calendar, Printer, Download, Send } from 'lucide-react';

interface EODReportHeaderProps {
  isDayMode: boolean;
  dashboardDate: string;
  setDashboardDate: (date: string) => void;
  onPrint: () => void;
  onExportPDF: () => void;
  onEmailReport: () => void;
}

export default function EODReportHeader({
  isDayMode,
  dashboardDate,
  setDashboardDate,
  onPrint,
  onExportPDF,
  onEmailReport,
}: EODReportHeaderProps) {
  const formattedDate = (() => {
    const [year, month, day] = dashboardDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  })();

  return (
    <div
      className={`rounded-3xl p-8 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift animate-slide-up`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
            End of Day Report
          </h2>
          <div className="flex items-center gap-3">
            <Calendar className={`w-4 h-4 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="date"
              value={dashboardDate}
              onChange={(e) => setDashboardDate(e.target.value)}
              className={`px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${isDayMode ? 'bg-white/60 border-gray-300 text-gray-900' : 'bg-white/10 border-white/20 text-white'}`}
            />
            <span className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-300'}`}>
              {formattedDate}
            </span>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-primary text-gold-400 rounded-xl hover:shadow-glow-primary transition-all shadow-lg hover-lift font-semibold text-sm"
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
            Email Report
          </button>
        </div>
      </div>
    </div>
  );
}
