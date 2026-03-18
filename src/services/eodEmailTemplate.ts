// src/services/eodEmailTemplate.ts
/**
 * Generates a professional HTML email template for the EOD report.
 * Uses inline CSS and table-based layout for maximum email client compatibility.
 */

import type { EODData } from '../hooks/useEODMetrics';

// Brand colors matching the app's design system
const COLORS = {
  primary: '#6366f1',     // indigo/primary
  primaryDark: '#4f46e5',
  gold: '#d97706',
  goldLight: '#f59e0b',
  green: '#059669',
  greenLight: '#10b981',
  red: '#dc2626',
  orange: '#ea580c',
  purple: '#7c3aed',
  blue: '#2563eb',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  white: '#ffffff',
};

export interface BAMCycleData {
  currentRevenue: number;
  targetGoal: number;
  practiceGoal: number;
  cycleStart: string;
  cycleEnd: string;
  daysRemaining: number;
  nextCycleStart: string;
  nextCycleEnd: string;
}

export interface ProcedureItem {
  procedure_code: string;
  procedure_name: string;
  count: number;
  revenue: number;
}

interface EmailTemplateOptions {
  eodData: EODData;
  reportDate: string;
  message?: string;
  template: string;
  logoBaseUrl: string;
  bamCycle?: BAMCycleData;
  topProcedures?: ProcedureItem[];
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}



export function generateEODEmailHTML(options: EmailTemplateOptions): string {
  const { eodData, reportDate, message, template, logoBaseUrl, bamCycle, topProcedures } = options;

  const sdsLogoUrl = `${logoBaseUrl}/stellar-dental-spa-logo.jpg`;

  const includeSections = getTemplateSections(template);

  const productionGoalPct = eodData.dailyProductionGoal > 0
    ? Math.round((eodData.dailyProduction / eodData.dailyProductionGoal) * 100)
    : 0;

  const mtdGoalPct = eodData.monthToDateSummary.productionGoal > 0
    ? Math.round((eodData.monthToDateSummary.production / eodData.monthToDateSummary.productionGoal) * 100)
    : 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EOD Report - Stellar Dental Spa</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray100};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width: 640px; width: 100%; background-color: ${COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.primaryDark} 0%, ${COLORS.primary} 50%, ${COLORS.gold} 100%); padding: 32px 40px; text-align: center;">
              <!-- Logos -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <img src="${sdsLogoUrl}" alt="Stellar Dental Spa" height="48" style="height: 48px; width: auto; display: block; border-radius: 8px;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: ${COLORS.white}; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">End of Day Report</h1>
                    <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 400;">${reportDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

${message ? `
          <!-- Custom Message -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray50}; border-radius: 10px; border: 1px solid ${COLORS.gray200};">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: ${COLORS.gray700}; font-size: 14px; line-height: 1.6;">${message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
` : ''}

${includeSections.dailySummary ? `
          <!-- Daily Summary -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              ${sectionHeading('Daily Summary')}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  ${metricCard('Daily Production', formatCurrency(eodData.dailyProduction), `${productionGoalPct}% of ${formatCurrency(eodData.dailyProductionGoal)} goal`, COLORS.primary)}
                  <td width="16"></td>
                  ${metricCard('Payments Collected', formatCurrency(eodData.paymentsCollected), `${eodData.collectionRate}% collection rate`, COLORS.green)}
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  ${metricCard('Patients Seen', formatNumber(eodData.patientsSeenToday), `${eodData.newPatients} new patients`, COLORS.blue)}
                  <td width="16"></td>
                  ${metricCard('Procedures', formatNumber(eodData.proceduresCompleted), 'Completed today', COLORS.purple)}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Production vs Collections Bar -->
          <tr>
            <td style="padding: 20px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray50}; border-radius: 10px; border: 1px solid ${COLORS.gray200};">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: ${COLORS.gray600}; font-weight: 600;">Insurance Payments</td>
                        <td align="right" style="font-size: 14px; color: ${COLORS.gray900}; font-weight: 700;">${formatCurrency(eodData.insurancePayments)}</td>
                      </tr>
                      <tr><td colspan="2" height="10"></td></tr>
                      <tr>
                        <td style="font-size: 13px; color: ${COLORS.gray600}; font-weight: 600;">Patient Payments</td>
                        <td align="right" style="font-size: 14px; color: ${COLORS.gray900}; font-weight: 700;">${formatCurrency(eodData.patientPayments)}</td>
                      </tr>
                      <tr><td colspan="2" height="10"></td></tr>
                      <tr>
                        <td colspan="2" style="border-top: 1px solid ${COLORS.gray200}; padding-top: 10px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-size: 13px; color: ${COLORS.gray600}; font-weight: 600;">Difference (Prod - Collected)</td>
                              <td align="right" style="font-size: 14px; color: ${eodData.productionCollectedDifference >= 0 ? COLORS.orange : COLORS.green}; font-weight: 700;">${formatCurrency(eodData.productionCollectedDifference)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
` : ''}

${includeSections.bamCycle && bamCycle ? `
          <!-- BAM Cycle Revenue -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              ${sectionHeading('BAM Cycle Revenue')}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border-radius: 12px; border: 1px solid #a7f3d0;">
                <tr>
                  <td style="padding: 24px;">
                    <!-- Cycle date range -->
                    <p style="margin: 0 0 4px 0; font-size: 11px; color: ${COLORS.green}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Current Cycle</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: ${COLORS.gray600};">${bamCycle.cycleStart} &ndash; ${bamCycle.cycleEnd}</p>

                    <!-- Revenue & Goals -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="50%" valign="top">
                          <p style="margin: 0; font-size: 12px; color: ${COLORS.gray500}; font-weight: 600;">Current Revenue</p>
                          <p style="margin: 4px 0 0 0; font-size: 28px; color: ${COLORS.green}; font-weight: 800; letter-spacing: -0.5px;">${formatCurrency(bamCycle.currentRevenue)}</p>
                        </td>
                        <td width="50%" valign="top">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding-bottom: 6px;">
                                <p style="margin: 0; font-size: 12px; color: ${COLORS.gray500}; font-weight: 600;">BAM Target</p>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: ${COLORS.gray900}; font-weight: 700;">${formatCurrency(bamCycle.targetGoal)}</p>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <p style="margin: 0; font-size: 12px; color: ${COLORS.gray500}; font-weight: 600;">Practice Goal</p>
                                <p style="margin: 2px 0 0 0; font-size: 16px; color: ${COLORS.gray900}; font-weight: 700;">${formatCurrency(bamCycle.practiceGoal)}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Progress bar -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                      <tr>
                        <td>
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #d1fae5; border-radius: 6px; overflow: hidden;">
                            <tr>
                              <td style="background: linear-gradient(90deg, ${COLORS.green}, ${COLORS.greenLight}); height: 10px; width: ${Math.min(Math.round((bamCycle.currentRevenue / bamCycle.targetGoal) * 100), 100)}%; border-radius: 6px;"></td>
                              ${Math.round((bamCycle.currentRevenue / bamCycle.targetGoal) * 100) < 100 ? `<td style="height: 10px;"></td>` : ''}
                            </tr>
                          </table>
                          <p style="margin: 6px 0 0 0; font-size: 12px; color: ${COLORS.gray500}; text-align: right;">${Math.round((bamCycle.currentRevenue / bamCycle.targetGoal) * 100)}% of BAM target</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Days remaining & next cycle -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px; border-top: 1px solid #a7f3d0; padding-top: 12px;">
                      <tr>
                        <td style="font-size: 13px; color: ${COLORS.gray600}; font-weight: 600;">Days Remaining</td>
                        <td align="right" style="font-size: 13px; color: ${COLORS.gray900}; font-weight: 700;">${bamCycle.daysRemaining} business days</td>
                      </tr>
                      <tr><td colspan="2" height="6"></td></tr>
                      <tr>
                        <td style="font-size: 12px; color: ${COLORS.gray500};">Next Cycle</td>
                        <td align="right" style="font-size: 12px; color: ${COLORS.gray500};">${bamCycle.nextCycleStart} &ndash; ${bamCycle.nextCycleEnd}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
` : ''}

${includeSections.paymentMethods ? `
          <!-- Payment Methods -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              ${sectionHeading('Payment Methods Breakdown')}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; border-radius: 10px; border: 1px solid ${COLORS.gray200}; overflow: hidden;">
                ${paymentMethodRow('Visa', eodData.paymentMethods.visa, false)}
                ${paymentMethodRow('Mastercard', eodData.paymentMethods.mastercard, true)}
                ${paymentMethodRow('American Express', eodData.paymentMethods.americanExpress, false)}
                ${paymentMethodRow('Discover', eodData.paymentMethods.discover, true)}
                ${paymentMethodRow('Cherry', eodData.paymentMethods.cherry, false)}
                ${paymentMethodRow('CareCredit', eodData.paymentMethods.careCredit, true)}
                ${paymentMethodRow('Weave', eodData.paymentMethods.weave, false)}
                ${paymentMethodRow('Insurance Check', eodData.paymentMethods.insuranceCheck, true)}
                ${paymentMethodRow('Other Check', eodData.paymentMethods.otherCheck, false)}
                ${paymentMethodRow('Cash', eodData.paymentMethods.cash, true)}
                ${paymentMethodRow('EFT', eodData.paymentMethods.eft, false)}
                <tr style="background-color: ${COLORS.gray800};">
                  <td style="padding: 12px 20px; font-size: 13px; color: ${COLORS.white}; font-weight: 700;">Total</td>
                  <td align="right" style="padding: 12px 20px; font-size: 14px; color: ${COLORS.white}; font-weight: 700;">${formatCurrency(eodData.paymentsCollected)}</td>
                </tr>
              </table>
            </td>
          </tr>
` : ''}

${includeSections.actionItems ? `
          <!-- Action Items -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              ${sectionHeading('Action Items')}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  ${actionItemCard('Denied Claims', eodData.actionItems.deniedClaimsToResubmit, 'Need follow-up', COLORS.orange)}
                  <td width="16"></td>
                  ${actionItemCard('Pre-Auths Approved', eodData.actionItems.preAuthsApproved, 'Ready for treatment', COLORS.goldLight)}
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  ${actionItemCard('Patients Due for Recall', eodData.actionItems.patientsDueForRecall, '6+ months', COLORS.blue)}
                  <td width="16"></td>
                  ${actionItemCard('Missed Appointments', eodData.actionItems.missedAppointments, 'Reschedule needed', COLORS.purple)}
                </tr>
              </table>
            </td>
          </tr>
` : ''}

${includeSections.mtdSummary ? `
          <!-- Month-to-Date Summary -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              ${sectionHeading('Month-to-Date Summary')}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  ${metricCard('MTD Production', formatCurrency(eodData.monthToDateSummary.production), `${mtdGoalPct}% of ${formatCurrency(eodData.monthToDateSummary.productionGoal)} goal`, COLORS.primary)}
                  <td width="16"></td>
                  ${metricCard('MTD Collected', formatCurrency(eodData.monthToDateSummary.collected), `${eodData.monthToDateSummary.collectionRate}% collection rate`, COLORS.green)}
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  ${metricCard('New Patients MTD', formatNumber(eodData.monthToDateSummary.newPatients), 'This month', COLORS.purple)}
                  <td width="16"></td>
                  ${metricCard('Avg Daily Production', formatCurrency(Math.round(eodData.monthToDateSummary.production / 10)), 'Based on 10 days', COLORS.goldLight)}
                </tr>
              </table>

              <!-- MTD Progress Bar -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; background-color: ${COLORS.gray50}; border-radius: 10px; border: 1px solid ${COLORS.gray200};">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: ${COLORS.gray600}; font-weight: 600;">Production Goal Progress</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray200}; border-radius: 6px; overflow: hidden;">
                      <tr>
                        <td style="background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.gold}); height: 10px; width: ${Math.min(mtdGoalPct, 100)}%; border-radius: 6px;"></td>
                        ${mtdGoalPct < 100 ? `<td style="height: 10px;"></td>` : ''}
                      </tr>
                    </table>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: ${COLORS.gray500}; text-align: right;">${mtdGoalPct}% of monthly goal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
` : ''}

${includeSections.topProcedures && topProcedures && topProcedures.length > 0 ? (() => {
    const hygieneRecareCodesArray = ['D1110', 'D1120', 'D4910', 'D1206', 'D1351', 'D4341', 'D4342', 'D4000'];
    const excludedCodesArray = ['D0150', 'D0180', 'D0140', 'D0277', 'D0274', 'D0220', 'D0230', 'D0210', 'D0120', 'D9987', 'D9986', 'D9150'];

    const hygieneProcedures = topProcedures
      .filter(p => {
        const code = (p.procedure_code || '').toUpperCase().trim();
        return hygieneRecareCodesArray.includes(code) && !excludedCodesArray.includes(code);
      })
      .slice(0, 8);

    const operativeProcedures = topProcedures
      .filter(p => {
        const code = (p.procedure_code || '').toUpperCase().trim();
        return !hygieneRecareCodesArray.includes(code) && !excludedCodesArray.includes(code);
      })
      .slice(0, 8);

    const buildProcTable = (procs: ProcedureItem[], accentColor: string, label: string) => {
      if (procs.length === 0) return `
        <td width="50%" valign="top">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray50}; border-radius: 10px; border: 1px solid ${COLORS.gray200};">
            <tr><td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: ${accentColor};">${label}</td></tr>
            <tr><td style="padding: 12px 16px; font-size: 12px; color: ${COLORS.gray500}; text-align: center;">No procedures this month</td></tr>
          </table>
        </td>`;

      const maxRevenue = Math.max(...procs.map(p => p.revenue));
      const rows = procs.map((p, i) => {
        const barPct = maxRevenue > 0 ? Math.round((p.revenue / maxRevenue) * 100) : 0;
        const bgColor = i % 2 === 0 ? COLORS.white : COLORS.gray50;
        return `
          <tr style="background-color: ${bgColor};">
            <td style="padding: 8px 16px; font-size: 12px; color: ${COLORS.gray700}; font-weight: 600; white-space: nowrap;">${p.procedure_code}</td>
            <td style="padding: 8px 4px; width: 100%;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: ${barPct}%; min-width: 4px;">
                <tr><td style="background-color: ${accentColor}; height: 18px; border-radius: 4px; text-align: right; padding-right: 6px; font-size: 10px; color: ${COLORS.white}; font-weight: 700;">${p.count}</td></tr>
              </table>
            </td>
            <td align="right" style="padding: 8px 16px; font-size: 12px; color: ${COLORS.gray900}; font-weight: 700; white-space: nowrap;">$${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
          </tr>`;
      }).join('');

      return `
        <td width="50%" valign="top">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray50}; border-radius: 10px; border: 1px solid ${COLORS.gray200}; overflow: hidden;">
            <tr><td colspan="3" style="padding: 12px 16px 8px 16px; font-size: 12px; font-weight: 700; color: ${accentColor};">${label}</td></tr>
            ${rows}
          </table>
        </td>`;
    };

    return `
          <!-- Top Procedures Monthly -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              ${sectionHeading('Top Procedures Monthly')}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  ${buildProcTable(hygieneProcedures, COLORS.blue, 'Hygiene / Recare')}
                  <td width="16"></td>
                  ${buildProcTable(operativeProcedures, COLORS.purple, 'Operative / Major Treatment')}
                </tr>
              </table>
            </td>
          </tr>
`;
  })() : ''}

${includeSections.importantNotes ? `
          <!-- Important Notes -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              ${sectionHeading('Important Notes')}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; background-color: #fffbeb; border-radius: 10px; border: 1px solid #fde68a;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 13px; color: ${COLORS.orange}; font-weight: 700;">Daily Goal:</span>
                          <span style="font-size: 13px; color: ${COLORS.gray700}; margin-left: 8px;">${productionGoalPct}% of daily production goal achieved</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 13px; color: ${COLORS.orange}; font-weight: 700;">Collection Rate:</span>
                          <span style="font-size: 13px; color: ${COLORS.gray700}; margin-left: 8px;">${eodData.collectionRate}% of production collected today</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size: 13px; color: ${COLORS.orange}; font-weight: 700;">Denied Claims:</span>
                          <span style="font-size: 13px; color: ${COLORS.gray700}; margin-left: 8px;">${eodData.actionItems.deniedClaimsToResubmit} claims need follow-up</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid ${COLORS.gray200}; padding-top: 24px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 13px; color: ${COLORS.gray500}; font-weight: 500;">Stellar Dental Spa &mdash; RCM Dashboard</p>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: ${COLORS.gray500};">Powered by <span style="color: ${COLORS.primary}; font-weight: 600;">Stellar Consults</span></p>
                    <p style="margin: 10px 0 0 0; font-size: 11px; color: ${COLORS.gray300};">This report was generated automatically from your practice management data.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Main Container -->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Helper: section heading
function sectionHeading(title: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td>
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: ${COLORS.gray900}; border-bottom: 3px solid ${COLORS.gold}; padding-bottom: 8px; display: inline-block;">${title}</h2>
        </td>
      </tr>
    </table>`;
}

// Helper: metric card (2-column layout)
function metricCard(label: string, value: string, subtitle: string, accentColor: string): string {
  return `
    <td width="50%" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray50}; border-radius: 10px; border: 1px solid ${COLORS.gray200};">
        <tr>
          <td style="padding: 18px 20px;">
            <p style="margin: 0; font-size: 12px; color: ${COLORS.gray500}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
            <p style="margin: 6px 0 0 0; font-size: 24px; color: ${accentColor}; font-weight: 800; letter-spacing: -0.5px;">${value}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${COLORS.gray500};">${subtitle}</p>
          </td>
        </tr>
      </table>
    </td>`;
}

// Helper: action item card
function actionItemCard(label: string, count: number, subtitle: string, accentColor: string): string {
  return `
    <td width="50%" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray50}; border-radius: 10px; border: 1px solid ${COLORS.gray200};">
        <tr>
          <td style="padding: 16px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <p style="margin: 0; font-size: 12px; color: ${COLORS.gray600}; font-weight: 600;">${label}</p>
                  <p style="margin: 2px 0 0 0; font-size: 11px; color: ${COLORS.gray500};">${subtitle}</p>
                </td>
                <td align="right" valign="middle">
                  <span style="font-size: 28px; font-weight: 800; color: ${accentColor};">${count}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>`;
}

// Helper: payment method row
function paymentMethodRow(label: string, amount: number, isAlt: boolean): string {
  const bgColor = isAlt ? COLORS.gray50 : COLORS.white;
  return `
    <tr style="background-color: ${bgColor};">
      <td style="padding: 10px 20px; font-size: 13px; color: ${COLORS.gray700}; font-weight: 500;">${label}</td>
      <td align="right" style="padding: 10px 20px; font-size: 13px; color: ${COLORS.gray900}; font-weight: 600;">${formatCurrency(amount)}</td>
    </tr>`;
}

// Template section mapping
function getTemplateSections(template: string): Record<string, boolean> {
  switch (template) {
    case 'executive':
      return { dailySummary: true, bamCycle: true, paymentMethods: false, actionItems: true, mtdSummary: true, topProcedures: false, importantNotes: false };
    case 'financial':
      return { dailySummary: true, bamCycle: true, paymentMethods: true, actionItems: false, mtdSummary: true, topProcedures: true, importantNotes: false };
    case 'actionItems':
      return { dailySummary: false, bamCycle: false, paymentMethods: false, actionItems: true, mtdSummary: false, topProcedures: false, importantNotes: true };
    case 'full':
    default:
      return { dailySummary: true, bamCycle: true, paymentMethods: true, actionItems: true, mtdSummary: true, topProcedures: true, importantNotes: true };
  }
}
