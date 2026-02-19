// src/components/eod-report/ActionItems.tsx
import { Users, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import type { EODData } from '../../hooks/useEODMetrics';

interface ActionItemsProps {
  isDayMode: boolean;
  eodData: EODData;
}

export default function ActionItems({ isDayMode, eodData }: ActionItemsProps) {
  const items = [
    {
      icon: Users,
      label: 'Patients Due for Recall',
      subtitle: '6+ months',
      value: eodData.actionItems.patientsDueForRecall,
      borderColor: isDayMode ? 'border-blue-200/50' : 'border-blue-400/20',
      glowColor: 'from-blue-400/10',
      iconColor: isDayMode ? 'text-blue-600' : 'text-blue-400',
    },
    {
      icon: XCircle,
      label: 'Fully Denied Claims',
      subtitle: 'Need follow-up',
      value: eodData.actionItems.deniedClaimsToResubmit,
      borderColor: isDayMode ? 'border-orange-200/50' : 'border-orange-400/20',
      glowColor: 'from-orange-400/10',
      iconColor: isDayMode ? 'text-orange-600' : 'text-orange-400',
    },
    {
      icon: CheckCircle,
      label: 'Pre-Auths Approved #',
      subtitle: 'Currently approved',
      value: eodData.actionItems.preAuthsApproved,
      borderColor: isDayMode ? 'border-yellow-200/50' : 'border-yellow-400/20',
      glowColor: 'from-yellow-400/10',
      iconColor: isDayMode ? 'text-yellow-600' : 'text-yellow-400',
    },
    {
      icon: AlertCircle,
      label: 'Missed Appointments',
      subtitle: 'Reschedule needed',
      value: eodData.actionItems.missedAppointments,
      borderColor: isDayMode ? 'border-purple-200/50' : 'border-purple-400/20',
      glowColor: 'from-purple-400/10',
      iconColor: isDayMode ? 'text-purple-600' : 'text-purple-400',
    },
  ];

  return (
    <div className={`rounded-2xl p-6 mt-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
      <h3 className="text-xl font-bold mb-5 bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
        Action Items for Tomorrow
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex items-center justify-between p-4 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${item.borderColor} rounded-xl hover-lift relative overflow-hidden group`}
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${item.glowColor} to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></div>
              <div className="flex items-center space-x-3 relative z-10">
                <Icon className={`w-6 h-6 ${item.iconColor}`} />
                <div>
                  <p className={`text-sm font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>{item.label}</p>
                  <p className={`text-xs ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.subtitle}</p>
                </div>
              </div>
              <p className={`text-2xl font-bold relative z-10 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                {item.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
