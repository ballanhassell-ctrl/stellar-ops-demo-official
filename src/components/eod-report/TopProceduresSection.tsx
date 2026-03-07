// src/components/eod-report/TopProceduresSection.tsx
import { useState } from 'react';
import { Upload, Award, ChevronDown, ChevronUp } from 'lucide-react';
import type { TopProcedure } from './types';

interface TopProceduresSectionProps {
  isDayMode: boolean;
  topProcedures: TopProcedure[];
  onOpenTopProceduresModal: () => void;
}

const HYGIENE_RECARE_CODES = ['D1110', 'D1120', 'D4910', 'D1206', 'D1351', 'D4341', 'D4342', 'D4000'];
const EXCLUDED_CODES = ['D0150', 'D0180', 'D0140', 'D0277', 'D0274', 'D0220', 'D0230', 'D0210', 'D0120', 'D9987', 'D9986', 'D9150'];

function ProcedureBarChart({ procedures, isDayMode, barColor }: {
  procedures: TopProcedure[];
  isDayMode: boolean;
  barColor: string;
}) {
  if (procedures.length === 0) return null;
  const maxRevenue = Math.max(...procedures.map((p) => p.revenue));

  return (
    <div className="space-y-3">
      {procedures.map((procedure, index) => {
        const heightPercent = (procedure.revenue / maxRevenue) * 100;
        return (
          <div key={index}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-medium truncate max-w-[60%] ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                {procedure.procedure_code || procedure.procedure_name}
              </span>
              <span className={`font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                ${procedure.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className={`w-full rounded-full h-6 ${isDayMode ? 'bg-gray-200' : 'bg-gray-600'} overflow-hidden`}>
              <div
                className={`${barColor} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${heightPercent}%` }}
              >
                <span className="text-xs font-semibold text-white">{procedure.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProcedureDetailList({ procedures, isDayMode, borderColor, glowColor, badgeClasses, numberColor }: {
  procedures: TopProcedure[];
  isDayMode: boolean;
  borderColor: string;
  glowColor: string;
  badgeClasses: string;
  numberColor: string;
}) {
  return (
    <div className="space-y-2">
      {procedures.map((procedure, index) => (
        <div key={index} className={`flex items-center justify-between p-4 rounded-xl ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${borderColor} hover-lift relative overflow-hidden group`}>
          <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${glowColor} to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></div>
          <div className="flex items-center space-x-4 relative z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badgeClasses}`}>
              <span className={`text-sm font-bold ${numberColor}`}>{index + 1}</span>
            </div>
            <div>
              <p className={`font-medium ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                {procedure.procedure_name}
                {procedure.procedure_code && <span className={`text-xs ml-2 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>({procedure.procedure_code})</span>}
              </p>
              <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>{procedure.count} procedure{procedure.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <p className={`text-lg font-bold relative z-10 ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
            ${procedure.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function TopProceduresSection({ isDayMode, topProcedures, onOpenTopProceduresModal }: TopProceduresSectionProps) {
  const [showDetails, setShowDetails] = useState(false);

  const hygieneProcedures = topProcedures
    .filter((p) => {
      const code = (p.procedure_code || '').toUpperCase().trim();
      return HYGIENE_RECARE_CODES.includes(code) && !EXCLUDED_CODES.includes(code);
    })
    .slice(0, 10);

  const operativeProcedures = topProcedures
    .filter((p) => {
      const code = (p.procedure_code || '').toUpperCase().trim();
      return !HYGIENE_RECARE_CODES.includes(code) && !EXCLUDED_CODES.includes(code);
    })
    .slice(0, 10);

  return (
    <div className={`rounded-2xl p-6 mt-6 mb-8 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
          Top Procedures Monthly
        </h3>
        <button
          onClick={onOpenTopProceduresModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-primary text-gold-400 rounded-xl hover:shadow-glow-primary transition-all shadow-lg hover-lift font-semibold text-sm"
        >
          <Upload className="w-4 h-4" />
          Upload CSV
        </button>
      </div>

      {topProcedures.length > 0 ? (
        <>
          {/* Two Column Chart Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Hygiene/Recare Chart */}
            <div className={`p-5 rounded-xl ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-blue-200/50' : 'border-blue-400/20'}`}>
              <h4 className={`text-sm font-bold mb-4 ${isDayMode ? 'text-blue-700' : 'text-blue-400'} flex items-center gap-2`}>
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Hygiene/Recare Procedures
              </h4>
              {hygieneProcedures.length > 0 ? (
                <ProcedureBarChart procedures={hygieneProcedures} isDayMode={isDayMode} barColor="bg-blue-500" />
              ) : (
                <p className={`text-xs text-center py-4 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  No hygiene/recare procedures this month
                </p>
              )}
            </div>

            {/* Operative/Major Treatment Chart */}
            <div className={`p-5 rounded-xl ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-purple-200/50' : 'border-purple-400/20'}`}>
              <h4 className={`text-sm font-bold mb-4 ${isDayMode ? 'text-purple-700' : 'text-purple-400'} flex items-center gap-2`}>
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                Operative/Major Treatment
              </h4>
              {operativeProcedures.length > 0 ? (
                <ProcedureBarChart procedures={operativeProcedures} isDayMode={isDayMode} barColor="bg-purple-500" />
              ) : (
                <p className={`text-xs text-center py-4 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  No operative procedures this month
                </p>
              )}
            </div>
          </div>

          {/* Toggle Details */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all ${isDayMode ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            >
              <span className="text-sm font-medium">
                {showDetails ? 'Hide Details' : 'See Details'}
              </span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Collapsible Detail List */}
          {showDetails && (
            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
              {hygieneProcedures.length > 0 && (
                <div>
                  <h4 className={`text-sm font-bold mb-3 ${isDayMode ? 'text-blue-700' : 'text-blue-400'}`}>
                    Hygiene/Recare Procedures ({hygieneProcedures.length})
                  </h4>
                  <ProcedureDetailList
                    procedures={hygieneProcedures}
                    isDayMode={isDayMode}
                    borderColor={isDayMode ? 'border-blue-200/50' : 'border-blue-400/20'}
                    glowColor="from-blue-400/10"
                    badgeClasses={isDayMode ? 'bg-blue-500/20 border border-blue-300/50' : 'bg-blue-500/20 border border-blue-500/30'}
                    numberColor={isDayMode ? 'text-blue-700' : 'text-blue-400'}
                  />
                </div>
              )}
              {operativeProcedures.length > 0 && (
                <div>
                  <h4 className={`text-sm font-bold mb-3 ${isDayMode ? 'text-purple-700' : 'text-purple-400'}`}>
                    Operative/Major Treatment ({operativeProcedures.length})
                  </h4>
                  <ProcedureDetailList
                    procedures={operativeProcedures}
                    isDayMode={isDayMode}
                    borderColor={isDayMode ? 'border-purple-200/50' : 'border-purple-400/20'}
                    glowColor="from-purple-400/10"
                    badgeClasses={isDayMode ? 'bg-purple-500/20 border border-purple-300/50' : 'bg-purple-500/20 border border-purple-500/30'}
                    numberColor={isDayMode ? 'text-purple-700' : 'text-purple-400'}
                  />
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className={`text-center py-8 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No procedures recorded for this month</p>
          <button
            onClick={onOpenTopProceduresModal}
            className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            Upload CSV file
          </button>
        </div>
      )}
    </div>
  );
}
