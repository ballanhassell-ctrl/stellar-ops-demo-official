// src/components/eod-report/EmailReportModal.tsx
import { useState } from 'react';
import { Mail, X, ExternalLink, Send, CheckCircle, Repeat, Loader2, ShieldCheck } from 'lucide-react';
import type { EODData } from '../../hooks/useEODMetrics';
import type { DashboardData, TopProcedure } from './types';
import { REPORT_TEMPLATES } from './types';
import { generateEODEmailHTML, type BAMCycleData } from '../../services/eodEmailTemplate';
import { sendEODReportEmail } from '../../services/emailService';
import { getLocalDateString } from '../../utils/dateUtils';

interface EmailReportModalProps {
  isDayMode: boolean;
  dashboardDate: string;
  eodData: EODData;
  dashboardData: DashboardData;
  topProcedures: TopProcedure[];
  isAdmin?: boolean;
  onClose: () => void;
  onRefreshActionItems?: () => Promise<EODData | null>;
}

export default function EmailReportModal({
  isDayMode,
  dashboardDate,
  eodData,
  dashboardData,
  topProcedures,
  isAdmin,
  onClose,
  onRefreshActionItems,
}: EmailReportModalProps) {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('EOD Report - Court Street Dental');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('full');
  const [scheduleEmail, setScheduleEmail] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('17:00');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  // Admin-only: override report date to send prior-day reports
  const [reportDateOverride, setReportDateOverride] = useState(dashboardDate);

  const effectiveDate = isAdmin ? reportDateOverride : dashboardDate;

  const formattedDate = (() => {
    const [year, month, day] = effectiveDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  const buildBAMCycleData = (): BAMCycleData => ({
    currentRevenue: dashboardData.bamCurrentRevenue,
    targetGoal: dashboardData.bamTargetGoal,
    practiceGoal: dashboardData.practiceGoal,
    cycleStart: dashboardData.bamCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cycleEnd: dashboardData.bamCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    daysRemaining: dashboardData.bamDaysRemaining,
    nextCycleStart: dashboardData.bamNextCycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    nextCycleEnd: dashboardData.bamNextCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  });

  const generateHTML = (freshData?: EODData) => {
    const dataToUse = freshData || eodData;
    // Use effectiveDate for the report header (allows admin to override)
    const [ey, em, ed] = effectiveDate.split('-').map(Number);
    const reportDateStr = new Date(ey, em - 1, ed).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    return generateEODEmailHTML({
      eodData: dataToUse,
      reportDate: reportDateStr,
      message: message || undefined,
      template: selectedTemplate,
      logoBaseUrl: window.location.origin,
      bamCycle: buildBAMCycleData(),
      topProcedures,
    });
  };

  const handlePreview = () => {
    const html = generateHTML();
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(html);
      previewWindow.document.close();
    }
  };

  const handleSend = async () => {
    if (!recipients) {
      alert('Please enter at least one email recipient');
      return;
    }

    // Refresh action items before sending to ensure resolved items are excluded
    let freshData: EODData | null = null;
    if (onRefreshActionItems) {
      try {
        freshData = await onRefreshActionItems();
      } catch (err) {
        console.warn('[EOD Email] Could not refresh action items before send:', err);
      }
    }

    const html = generateHTML(freshData || undefined);
    const recipientList = recipients.split(',').map((e: string) => e.trim()).filter(Boolean);

    setSending(true);
    setSendResult(null);

    try {
      const result = await sendEODReportEmail({
        to: recipientList,
        subject,
        htmlBody: html,
        reportDate: effectiveDate,
        template: selectedTemplate,
        sentBy: isAdmin ? 'admin' : 'team',
      });

      if (result.success) {
        setSendResult({ success: true, message: `Report sent successfully to ${recipientList.length} recipient(s)` });
        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // Fallback to clipboard + mailto
        setSendResult({ success: false, message: result.error || 'Postmark not configured. Using fallback method.' });
        navigator.clipboard.writeText(html).catch(() => {});
        const mailtoUrl = `mailto:${recipientList.join(',')}?subject=${encodeURIComponent(subject)}`;
        window.open(mailtoUrl, '_blank');
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
          previewWindow.document.write(html);
          previewWindow.document.close();
        }
      }
    } catch {
      // Fallback to clipboard + mailto
      navigator.clipboard.writeText(html).catch(() => {});
      const mailtoUrl = `mailto:${recipientList.join(',')}?subject=${encodeURIComponent(subject)}`;
      window.open(mailtoUrl, '_blank');
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(html);
        previewWindow.document.close();
      }
      setSendResult({ success: false, message: 'Email service unavailable. Report opened in new tab and copied to clipboard.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDayMode ? 'bg-white' : 'bg-gray-800'}`}>
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDayMode ? 'bg-green-100' : 'bg-green-900/30'}`}>
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>Email EOD Report</h3>
                <p className={`text-sm ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Send report for {formattedDate}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`transition-colors ${isDayMode ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Send Result Banner */}
          {sendResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${sendResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {sendResult.message}
            </div>
          )}

          {/* Email Form */}
          <div className="space-y-4">
            {/* Recipients */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                Recipients <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email@example.com, another@example.com"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-white'}`}
              />
              <p className={`text-xs mt-1 ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>Separate multiple emails with commas</p>
            </div>

            {/* Subject */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-white'}`}
              />
            </div>

            {/* Admin-only: Report Date Override */}
            {isAdmin && (
              <div className={`p-4 rounded-lg border ${isDayMode ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-700'}`}>
                <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDayMode ? 'text-amber-800' : 'text-amber-300'}`}>
                  <ShieldCheck className="w-4 h-4" />
                  Admin: Report Date Override
                </label>
                <p className={`text-xs mb-2 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`}>
                  Send an EOD report for a prior day. The report will pull data for the selected date.
                </p>
                <input
                  type="date"
                  value={reportDateOverride}
                  max={getLocalDateString()}
                  onChange={(e) => setReportDateOverride(e.target.value)}
                  className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm ${isDayMode ? 'border-amber-300 bg-white' : 'border-amber-600 bg-gray-700 text-white'}`}
                />
                {reportDateOverride !== dashboardDate && (
                  <span className={`ml-3 text-xs font-semibold ${isDayMode ? 'text-amber-700' : 'text-amber-400'}`}>
                    Sending for: {formattedDate}
                  </span>
                )}
              </div>
            )}

            {/* Message */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                Additional Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Add any notes or comments to include with the report..."
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-white'}`}
              />
            </div>

            {/* Report Template Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                Report Template
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(REPORT_TEMPLATES).map(([key, template]) => (
                  <div
                    key={key}
                    onClick={() => setSelectedTemplate(key)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate === key
                        ? isDayMode ? 'border-green-500 bg-green-50' : 'border-green-500 bg-green-900/20'
                        : isDayMode ? 'border-gray-200 hover:border-green-300' : 'border-gray-600 hover:border-green-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className={`font-semibold text-sm ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>{template.name}</h4>
                      {selectedTemplate === key && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <p className={`text-xs ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>{template.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Email Option */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className={`text-sm font-medium flex items-center gap-2 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                    <Repeat className="w-4 h-4" />
                    Schedule Automatic Delivery
                  </span>
                </label>
              </div>

              {scheduleEmail && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-4 rounded-lg border ${isDayMode ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700'}`}>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                      Frequency
                    </label>
                    <select
                      value={scheduleFrequency}
                      onChange={(e) => setScheduleFrequency(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-white'}`}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly (Monday)</option>
                      <option value="monthly">Monthly (1st of month)</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                      Send Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${isDayMode ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700 text-white'}`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className={`p-3 rounded border ${isDayMode ? 'bg-white border-blue-300' : 'bg-gray-700 border-blue-700'}`}>
                      <p className={`text-xs ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        <strong>Note:</strong> Scheduled reports will be sent automatically {scheduleFrequency} at {scheduleTime} to the specified recipients using the {REPORT_TEMPLATES[selectedTemplate as keyof typeof REPORT_TEMPLATES]?.name} template.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Report Preview Summary */}
            <div className={`rounded-lg p-4 border ${isDayMode ? 'bg-gray-50 border-gray-200' : 'bg-gray-700 border-gray-600'}`}>
              <h4 className={`text-sm font-semibold mb-2 ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>Report Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className={isDayMode ? 'text-gray-500' : 'text-gray-400'}>Daily Production</p>
                  <p className={`font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>${eodData.dailyProduction.toLocaleString()}</p>
                </div>
                <div>
                  <p className={isDayMode ? 'text-gray-500' : 'text-gray-400'}>Payments Collected</p>
                  <p className={`font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>${eodData.paymentsCollected.toLocaleString()}</p>
                </div>
                <div>
                  <p className={isDayMode ? 'text-gray-500' : 'text-gray-400'}>Patients Seen</p>
                  <p className={`font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>{eodData.patientsSeenToday}</p>
                </div>
                <div>
                  <p className={isDayMode ? 'text-gray-500' : 'text-gray-400'}>Action Items</p>
                  <p className={`font-bold ${isDayMode ? 'text-gray-900' : 'text-white'}`}>
                    {eodData.actionItems.deniedClaimsToResubmit +
                     eodData.actionItems.preAuthsApproved +
                     eodData.actionItems.accountsNeedingFollowUp +
                     eodData.actionItems.missedAppointments +
                     eodData.actionItems.patientsDueForRecall}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className={`px-4 py-2 border rounded-lg transition-all font-medium ${isDayMode ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
            >
              Cancel
            </button>
            <button
              onClick={handlePreview}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all font-medium shadow-md flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
