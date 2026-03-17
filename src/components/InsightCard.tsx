// src/components/InsightCard.tsx
import { Insight } from '../services/aiInsights';

interface InsightCardProps {
  insight: Insight;
  isDayMode: boolean;
}

export const InsightCard = ({ insight, isDayMode }: InsightCardProps) => {
  // Color schemes based on insight type
  const getColorClasses = () => {
    switch (insight.type) {
      case 'positive':
        return {
          border: 'border-green-300',
          bg: isDayMode ? 'bg-green-50' : 'bg-green-900/20',
          titleText: isDayMode ? 'text-green-800' : 'text-green-300',
          messageText: isDayMode ? 'text-green-700' : 'text-green-400',
          actionBg: isDayMode ? 'bg-green-100' : 'bg-green-800/40',
          actionText: isDayMode ? 'text-green-800' : 'text-green-300',
        };
      case 'warning':
        return {
          border: 'border-amber-300',
          bg: isDayMode ? 'bg-amber-50' : 'bg-amber-900/20',
          titleText: isDayMode ? 'text-amber-800' : 'text-amber-300',
          messageText: isDayMode ? 'text-amber-700' : 'text-amber-400',
          actionBg: isDayMode ? 'bg-amber-100' : 'bg-amber-800/40',
          actionText: isDayMode ? 'text-amber-800' : 'text-amber-300',
        };
      case 'critical':
        return {
          border: 'border-red-300',
          bg: isDayMode ? 'bg-red-50' : 'bg-red-900/20',
          titleText: isDayMode ? 'text-red-800' : 'text-red-300',
          messageText: isDayMode ? 'text-red-700' : 'text-red-400',
          actionBg: isDayMode ? 'bg-red-100' : 'bg-red-800/40',
          actionText: isDayMode ? 'text-red-800' : 'text-red-300',
        };
      default: // info
        return {
          border: 'border-blue-300',
          bg: isDayMode ? 'bg-blue-50' : 'bg-blue-900/20',
          titleText: isDayMode ? 'text-blue-800' : 'text-blue-300',
          messageText: isDayMode ? 'text-blue-700' : 'text-blue-400',
          actionBg: isDayMode ? 'bg-blue-100' : 'bg-blue-800/40',
          actionText: isDayMode ? 'text-blue-800' : 'text-blue-300',
        };
    }
  };

  const colors = getColorClasses();

  // Priority indicator
  const getPriorityDot = () => {
    const dotColors = {
      high: 'bg-red-500',
      medium: 'bg-amber-500',
      low: 'bg-blue-500',
    };

    return (
      <div className={`w-2 h-2 rounded-full ${dotColors[insight.priority]}`} title={`${insight.priority} priority`} />
    );
  };

  return (
    <div className={`rounded-lg border-l-4 ${colors.border} ${colors.bg} p-4 mb-3 transition-all hover:shadow-md`}>
      {/* Header with icon and title */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-2xl" role="img" aria-label={insight.type}>
            {insight.icon}
          </span>
          <div className="flex-1">
            <h4 className={`font-semibold text-sm ${colors.titleText}`}>
              {insight.title}
            </h4>
          </div>
        </div>
        {getPriorityDot()}
      </div>

      {/* Message */}
      <p className={`text-sm ${colors.messageText} ml-8 mb-2`}>
        {insight.message}
      </p>

      {/* Action (if provided) */}
      {insight.action && (
        <div className={`ml-8 mt-3 p-2 rounded ${colors.actionBg}`}>
          <p className={`text-xs font-medium ${colors.actionText} flex items-center gap-1`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Action: {insight.action}
          </p>
        </div>
      )}

      {/* Timestamp */}
      <p className={`text-xs mt-2 ml-8 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {new Date(insight.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
};
