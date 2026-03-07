// src/components/eod-report/EODReport.tsx
// Main EOD Report component - assembles all sub-sections
// Extracted from App.tsx as part of the MSO platform architecture evolution

import { useState } from 'react';
import type { EODReportProps } from './types';
import EODReportHeader from './EODReportHeader';
import ExecutiveSummary from './ExecutiveSummary';
import DailySummaryCards from './DailySummaryCards';
import PatientAROverview from './PatientAROverview';
import BAMCycleOverview from './BAMCycleOverview';
import PaymentBreakdown from './PaymentBreakdown';
import PaymentPerformanceInsights from './PaymentPerformanceInsights';
import ActionItems from './ActionItems';
import TopProceduresSection from './TopProceduresSection';
import MTDSummary from './MTDSummary';
import ImportantNotes from './ImportantNotes';
import EmailReportModal from './EmailReportModal';

const CSD_GOLD = '#B8985F';

export default function EODReport({
  isDayMode,
  dashboardDate,
  setDashboardDate,
  eodData,
  dashboardData,
  patientARMetrics,
  paymentInsights,
  topProcedures,
  onNavigateToPatientAR,
  onOpenTopProceduresModal,
  isAdmin,
  onRefreshActionItems,
}: EODReportProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const printContent = document.getElementById('eod-report-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>EOD Report - ${dashboardDate}</title>
              <style>
                @media print {
                  @page { margin: 0.5in; }
                  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                }
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  padding: 20px;
                  color: #1f2937;
                  background: white;
                }
                .report-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                  border-bottom: 3px solid #B8985F;
                }
                .report-header > div:first-child {
                  display: flex;
                  align-items: center;
                  gap: 15px;
                }
                .report-header h1 {
                  color: #B8985F;
                  font-size: 28px;
                  font-weight: bold;
                  margin: 0;
                }
                .report-header h2 {
                  font-size: 20px;
                  font-weight: 600;
                  margin: 0;
                  color: #1f2937;
                }
                .report-header p {
                  margin: 5px 0 0 0;
                  font-size: 14px;
                  color: #6b7280;
                }
                .report-header > div:first-child > div:first-child {
                  width: 64px;
                  height: 64px;
                  background-color: #B8985F;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                }
                .report-header > div:first-child > div:first-child span {
                  color: white;
                  font-size: 24px;
                  font-weight: bold;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                  font-size: 14px;
                }
                th, td {
                  border: 1px solid #e5e7eb;
                  padding: 10px;
                  text-align: left;
                }
                th {
                  background-color: #f9fafb;
                  font-weight: 600;
                  color: #374151;
                }
                .header {
                  color: #B8985F;
                  font-size: 20px;
                  font-weight: 600;
                  margin: 25px 0 15px 0;
                }
                .section {
                  margin: 20px 0;
                  page-break-inside: avoid;
                }
                .metric {
                  display: inline-block;
                  margin: 10px;
                  padding: 15px;
                  border: 2px solid #e5e7eb;
                  border-radius: 8px;
                  min-width: 200px;
                }
                .grid {
                  display: grid;
                  gap: 15px;
                  margin: 20px 0;
                }
                [class*="bg-gradient"] {
                  border: 2px solid #e5e7eb;
                  padding: 15px;
                  border-radius: 8px;
                  margin-bottom: 10px;
                  page-break-inside: avoid;
                }
                button, .no-print {
                  display: none !important;
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Picker and Action Buttons */}
      <EODReportHeader
        isDayMode={isDayMode}
        dashboardDate={dashboardDate}
        setDashboardDate={setDashboardDate}
        isAdmin={isAdmin}
        onPrint={handlePrint}
        onExportPDF={handleExportPDF}
        onEmailReport={() => setShowEmailModal(true)}
      />

      {/* Wrap the entire report in a div with id for PDF export */}
      <div id="eod-report-content">
        {/* Report Header with Logo - prints on export */}
        <div className="report-header mb-6 pb-4 border-b-2" style={{ borderColor: CSD_GOLD }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full" style={{ backgroundColor: CSD_GOLD }}>
                <span className="text-2xl font-bold text-white">SC</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: CSD_GOLD }}>
                  Stellar Consults
                </h1>
                <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Dental Revenue Cycle Management
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className={`text-xl font-semibold ${isDayMode ? 'text-gray-900' : 'text-gray-100'}`}>
                End of Day Report
              </h2>
              <p className={`text-sm ${isDayMode ? 'text-gray-600' : 'text-gray-400'}`}>
                {eodData.reportDate}
              </p>
            </div>
          </div>
        </div>

        {/* NEW: Executive Summary - the "intelligence layer" */}
        <ExecutiveSummary
          isDayMode={isDayMode}
          eodData={eodData}
          dashboardData={dashboardData}
          patientARMetrics={patientARMetrics}
        />

        {/* Daily Summary Cards */}
        <div className="mt-6">
          <DailySummaryCards isDayMode={isDayMode} eodData={eodData} />
        </div>

        {/* Patient A/R Overview */}
        {patientARMetrics && (
          <PatientAROverview
            isDayMode={isDayMode}
            patientARMetrics={patientARMetrics}
            onNavigateToPatientAR={onNavigateToPatientAR}
          />
        )}

        {/* BAM Cycle Summary */}
        <BAMCycleOverview isDayMode={isDayMode} dashboardData={dashboardData} />

        {/* Payment Breakdown */}
        <PaymentBreakdown isDayMode={isDayMode} eodData={eodData} />

        {/* Payment Performance Insights */}
        <PaymentPerformanceInsights isDayMode={isDayMode} paymentInsights={paymentInsights} />

        {/* Action Items for Tomorrow */}
        <ActionItems isDayMode={isDayMode} eodData={eodData} />

        {/* Top Procedures */}
        <TopProceduresSection
          isDayMode={isDayMode}
          topProcedures={topProcedures}
          onOpenTopProceduresModal={onOpenTopProceduresModal}
        />

        {/* Month-to-Date Summary */}
        <MTDSummary isDayMode={isDayMode} eodData={eodData} />

        {/* Important Notes */}
        <ImportantNotes isDayMode={isDayMode} eodData={eodData} />
      </div>
      {/* End of eod-report-content div */}

      {/* Email Modal */}
      {showEmailModal && (
        <EmailReportModal
          isDayMode={isDayMode}
          dashboardDate={dashboardDate}
          eodData={eodData}
          dashboardData={dashboardData}
          topProcedures={topProcedures}
          isAdmin={isAdmin}
          onClose={() => setShowEmailModal(false)}
          onRefreshActionItems={onRefreshActionItems}
        />
      )}
    </div>
  );
}
