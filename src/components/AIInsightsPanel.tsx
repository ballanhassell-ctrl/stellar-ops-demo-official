// src/components/AIInsightsPanel.tsx
import { X, RefreshCw, Filter } from 'lucide-react';
import { Insight, InsightType, getInsightCounts } from '../services/aiInsights';
import { InsightCard } from './InsightCard';
import { useState } from 'react';

interface AIInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  insights: Insight[];
  isDayMode: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const AIInsightsPanel = ({
  isOpen,
  onClose,
  insights,
  isDayMode,
  onRefresh,
  isRefreshing,
}: AIInsightsPanelProps) => {
  const [filterType, setFilterType] = useState<InsightType | 'all'>('all');

  const counts = getInsightCounts(insights);
  const filteredInsights = filterType === 'all'
    ? insights
    : insights.filter(i => i.type === filterType);

  // Filter buttons configuration
  const filters: Array<{ type: InsightType | 'all'; label: string; count?: number; color: string }> = [
    { type: 'all', label: 'All', count: insights.length, color: 'bg-gray-600' },
    { type: 'positive', label: 'Positive', count: counts.positive, color: 'bg-green-600' },
    { type: 'warning', label: 'Warning', count: counts.warning, color: 'bg-amber-600' },
    { type: 'critical', label: 'Critical', count: counts.critical, color: 'bg-red-600' },
    { type: 'info', label: 'Info', count: counts.info, color: 'bg-blue-600' },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[500px] ${
          isDayMode ? 'bg-white' : 'bg-gray-800'
        } shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className={`p-6 border-b ${isDayMode ? 'border-gray-200' : 'border-gray-700'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                  AI Insights
                </h2>
                <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {insights.length} insight{insights.length !== 1 ? 's' : ''} generated
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-lg ${
                  isDayMode
                    ? 'hover:bg-gray-100 text-gray-600'
                    : 'hover:bg-gray-700 text-gray-300'
                } transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Refresh insights"
                title="Refresh insights"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${
                  isDayMode
                    ? 'hover:bg-gray-100 text-gray-600'
                    : 'hover:bg-gray-700 text-gray-300'
                } transition-colors`}
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Last updated timestamp */}
          <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'} mt-2`}>
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Filter buttons */}
        <div className={`px-6 py-3 border-b ${isDayMode ? 'border-gray-200' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Filter className={`w-4 h-4 ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <span className={`text-xs font-medium ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
              Filter by type:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(filter => (
              <button
                key={filter.type}
                onClick={() => setFilterType(filter.type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterType === filter.type
                    ? `${filter.color} text-white shadow-md`
                    : isDayMode
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filter.label} {filter.count !== undefined && filter.count > 0 && (
                  <span className="ml-1">({filter.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Insights list - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredInsights.length === 0 ? (
            <div className="text-center py-12">
              <div className={`text-6xl mb-4 ${isDayMode ? 'opacity-20' : 'opacity-10'}`}>
                💡
              </div>
              <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {filterType === 'all'
                  ? 'No insights available for the current data.'
                  : `No ${filterType} insights at this time.`}
              </p>
            </div>
          ) : (
            <>
              {filteredInsights.map(insight => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  isDayMode={isDayMode}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer with summary */}
        <div className={`p-4 border-t ${isDayMode ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-900'}`}>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Positive</p>
              <p className="text-lg font-bold text-green-600">{counts.positive}</p>
            </div>
            <div>
              <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Warning</p>
              <p className="text-lg font-bold text-amber-600">{counts.warning}</p>
            </div>
            <div>
              <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Critical</p>
              <p className="text-lg font-bold text-red-600">{counts.critical}</p>
            </div>
            <div>
              <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Info</p>
              <p className="text-lg font-bold text-blue-600">{counts.info}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
