// src/components/eod-report/PaymentBreakdown.tsx
import type { EODData } from '../../hooks/useEODMetrics';

interface PaymentBreakdownProps {
  isDayMode: boolean;
  eodData: EODData;
}

function PaymentRow({ label, amount, isDayMode, borderColor, glowColor, textColor }: {
  label: string;
  amount: number;
  isDayMode: boolean;
  borderColor: string;
  glowColor: string;
  textColor: string;
}) {
  return (
    <div className={`flex justify-between items-center p-3 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${borderColor} rounded-xl hover-lift relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${glowColor} to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></div>
      <span className={`text-sm font-medium relative z-10 ${textColor}`}>{label}</span>
      <span className={`text-lg font-bold relative z-10 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
        ${(amount || 0).toLocaleString()}
      </span>
    </div>
  );
}

export default function PaymentBreakdown({ isDayMode, eodData }: PaymentBreakdownProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Payment Sources */}
      <div className={`rounded-2xl p-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
        <h3 className="text-xl font-bold mb-5 bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
          Payment Sources
        </h3>
        <div className="space-y-3">
          <div className={`flex justify-between items-center p-4 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-primary-200/50' : 'border-primary-400/20'} rounded-xl hover-lift relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            <span className={`text-sm font-medium relative z-10 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Insurance Payments</span>
            <span className={`text-lg font-bold relative z-10 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${eodData.insurancePayments.toLocaleString()}
            </span>
          </div>
          <div className={`flex justify-between items-center p-4 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-emerald-200/50' : 'border-emerald-400/20'} rounded-xl hover-lift relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            <span className={`text-sm font-medium relative z-10 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Patient Payments</span>
            <span className={`text-lg font-bold relative z-10 ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
              ${eodData.patientPayments.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className={`rounded-2xl p-6 ${isDayMode ? 'glass-card' : 'glass-card-dark'} border ${isDayMode ? 'border-white/40' : 'border-white/10'} hover-lift`}>
        <h3 className="text-xl font-bold mb-5 bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
          Payment Methods
        </h3>

        {/* Credit Cards */}
        <div className="mb-6">
          <h4 className={`text-sm font-bold mb-3 uppercase tracking-wide ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Credit Cards</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PaymentRow label="Visa" amount={eodData.paymentMethods.visa} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-primary-200/50' : 'border-primary-400/20'}
              glowColor="from-primary-400/10"
              textColor={isDayMode ? 'text-primary-700' : 'text-primary-400'} />
            <PaymentRow label="MasterCard" amount={eodData.paymentMethods.mastercard} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-orange-200/50' : 'border-orange-400/20'}
              glowColor="from-orange-400/10"
              textColor={isDayMode ? 'text-orange-700' : 'text-orange-400'} />
            <PaymentRow label="American Express" amount={eodData.paymentMethods.americanExpress} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-teal-200/50' : 'border-teal-400/20'}
              glowColor="from-teal-400/10"
              textColor={isDayMode ? 'text-teal-700' : 'text-teal-400'} />
            <PaymentRow label="Discover" amount={eodData.paymentMethods.discover} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-amber-200/50' : 'border-amber-400/20'}
              glowColor="from-amber-400/10"
              textColor={isDayMode ? 'text-amber-700' : 'text-amber-400'} />
          </div>
        </div>

        {/* Patient Financing */}
        <div className="mb-6">
          <h4 className={`text-sm font-bold mb-3 uppercase tracking-wide ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Patient Financing</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <PaymentRow label="Cherry" amount={eodData.paymentMethods.cherry} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-pink-200/50' : 'border-pink-400/20'}
              glowColor="from-pink-400/10"
              textColor={isDayMode ? 'text-pink-700' : 'text-pink-400'} />
            <PaymentRow label="CareCredit" amount={eodData.paymentMethods.careCredit} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-rose-200/50' : 'border-rose-400/20'}
              glowColor="from-rose-400/10"
              textColor={isDayMode ? 'text-rose-700' : 'text-rose-400'} />
            <PaymentRow label="Weave" amount={eodData.paymentMethods.weave} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-violet-200/50' : 'border-violet-400/20'}
              glowColor="from-violet-400/10"
              textColor={isDayMode ? 'text-violet-700' : 'text-violet-400'} />
          </div>
        </div>

        {/* Check Payments */}
        <div className="mb-6">
          <h4 className={`text-sm font-bold mb-3 uppercase tracking-wide ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Check Payments</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PaymentRow label="Insurance Checks" amount={eodData.paymentMethods.insuranceCheck} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-purple-200/50' : 'border-purple-400/20'}
              glowColor="from-purple-400/10"
              textColor={isDayMode ? 'text-purple-700' : 'text-purple-400'} />
            <PaymentRow label="Other Checks" amount={eodData.paymentMethods.otherCheck} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-indigo-200/50' : 'border-indigo-400/20'}
              glowColor="from-indigo-400/10"
              textColor={isDayMode ? 'text-indigo-700' : 'text-indigo-400'} />
          </div>
        </div>

        {/* Other Methods */}
        <div>
          <h4 className={`text-sm font-bold mb-3 uppercase tracking-wide ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Other Methods</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PaymentRow label="Cash" amount={eodData.paymentMethods.cash} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-emerald-200/50' : 'border-emerald-400/20'}
              glowColor="from-emerald-400/10"
              textColor={isDayMode ? 'text-emerald-700' : 'text-emerald-400'} />
            <PaymentRow label="EFT" amount={eodData.paymentMethods.eft} isDayMode={isDayMode}
              borderColor={isDayMode ? 'border-slate-200/50' : 'border-slate-400/20'}
              glowColor="from-slate-400/10"
              textColor={isDayMode ? 'text-slate-700' : 'text-slate-400'} />
          </div>
        </div>
      </div>
    </div>
  );
}
