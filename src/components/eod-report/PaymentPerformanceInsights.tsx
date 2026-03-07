// src/components/eod-report/PaymentPerformanceInsights.tsx
import {
  TrendingUp, AlertCircle, CheckCircle, XCircle,
  Activity, Shield, Users, Clock, DollarSign,
  ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import type { PaymentInsight } from '../../services/paymentInsights';

interface PaymentPerformanceInsightsProps {
  isDayMode: boolean;
  paymentInsights: PaymentInsight[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  TrendingDown: TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Shield,
  Users,
  Clock,
  DollarSign,
  ArrowDownCircle,
};

const colorSchemes = {
  positive: (isDayMode: boolean) => ({
    bg: isDayMode ? 'glass-card' : 'glass-card-dark',
    border: isDayMode ? 'border-emerald-200/50' : 'border-emerald-400/20',
    glow: 'from-emerald-400/10',
    icon: isDayMode ? 'text-emerald-600' : 'text-emerald-400',
    title: isDayMode ? 'text-emerald-900' : 'text-emerald-300',
    text: isDayMode ? 'text-gray-700' : 'text-gray-300',
    badge: isDayMode ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-300/50' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  }),
  warning: (isDayMode: boolean) => ({
    bg: isDayMode ? 'glass-card' : 'glass-card-dark',
    border: isDayMode ? 'border-amber-200/50' : 'border-amber-400/20',
    glow: 'from-amber-400/10',
    icon: isDayMode ? 'text-amber-600' : 'text-amber-400',
    title: isDayMode ? 'text-amber-900' : 'text-amber-300',
    text: isDayMode ? 'text-gray-700' : 'text-gray-300',
    badge: isDayMode ? 'bg-amber-500/20 text-amber-700 border border-amber-300/50' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  }),
  info: (isDayMode: boolean) => ({
    bg: isDayMode ? 'glass-card' : 'glass-card-dark',
    border: isDayMode ? 'border-primary-200/50' : 'border-primary-400/20',
    glow: 'from-primary-400/10',
    icon: isDayMode ? 'text-primary-600' : 'text-primary-400',
    title: isDayMode ? 'text-primary-900' : 'text-primary-300',
    text: isDayMode ? 'text-gray-700' : 'text-gray-300',
    badge: isDayMode ? 'bg-primary-500/20 text-primary-700 border border-primary-300/50' : 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
  }),
  critical: (isDayMode: boolean) => ({
    bg: isDayMode ? 'glass-card' : 'glass-card-dark',
    border: isDayMode ? 'border-red-200/50' : 'border-red-400/20',
    glow: 'from-red-400/10',
    icon: isDayMode ? 'text-red-600' : 'text-red-400',
    title: isDayMode ? 'text-red-900' : 'text-red-300',
    text: isDayMode ? 'text-gray-700' : 'text-gray-300',
    badge: isDayMode ? 'bg-red-500/20 text-red-700 border border-red-300/50' : 'bg-red-500/20 text-red-300 border border-red-500/30',
  }),
};

export default function PaymentPerformanceInsights({ isDayMode, paymentInsights }: PaymentPerformanceInsightsProps) {
  return (
    <div className={`rounded-2xl p-6 mt-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
          Payment Performance Insights
        </h3>
        <span className="text-xs text-gray-500">
          {paymentInsights.length} actionable insight{paymentInsights.length !== 1 ? 's' : ''}
        </span>
      </div>

      {paymentInsights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentInsights.map((insight) => {
            const IconComponent = iconMap[insight.icon] || Activity;
            const getScheme = colorSchemes[insight.type as keyof typeof colorSchemes] || colorSchemes.info;
            const cs = getScheme(isDayMode);

            return (
              <div
                key={insight.id}
                className={`${cs.bg} border ${cs.border} rounded-xl p-4 hover-lift relative overflow-hidden group`}
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${cs.glow} to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></div>
                <div className="flex items-start gap-3 relative z-10">
                  <IconComponent className={`w-6 h-6 ${cs.icon} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`font-semibold text-sm ${cs.title}`}>
                        {insight.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${cs.badge} flex-shrink-0`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className={`text-sm ${cs.text} mb-2`}>
                      {insight.message}
                    </p>
                    {insight.action && (
                      <div className={`text-xs font-medium ${cs.text} flex items-start gap-1.5 mt-2 pt-2 border-t ${cs.border}`}>
                        <ArrowUpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{insight.action}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No payment insights available for this date</p>
          <p className="text-sm mt-1">Insights will appear as payment data is collected</p>
        </div>
      )}
    </div>
  );
}
