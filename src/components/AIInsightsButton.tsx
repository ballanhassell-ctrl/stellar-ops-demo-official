// src/components/AIInsightsButton.tsx
import { Sparkles } from 'lucide-react';

interface AIInsightsButtonProps {
  onClick: () => void;
  insightCount: number;
  hasHighPriority: boolean;
}

export const AIInsightsButton = ({ onClick, insightCount, hasHighPriority }: AIInsightsButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-gray-900 p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group z-50"
      aria-label="Open AI Insights"
      title="View AI-powered insights"
    >
      {/* Icon with rotation animation on hover */}
      <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />

      {/* Text label */}
      <span className="font-semibold text-sm">AI Insights</span>

      {/* Badge showing insight count */}
      {insightCount > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          hasHighPriority
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-gray-900 text-white'
        }`}>
          {insightCount}
        </span>
      )}
    </button>
  );
};
