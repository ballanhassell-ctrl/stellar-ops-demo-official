// =====================================================
// Daily A/R Report Email Service
// Sends a daily summary of new accounts added to:
// Patient A/R, Insurance Issues, Credits, Non-Collectible
// Recipients: Daniely and Dr. Gajjar
// =====================================================

import { supabase } from '../lib/supabaseClient';
import { sanitizePatientName } from '../utils/sanitizePatientName';
import { getLocalDateString, toLocalDateString } from '../utils/dateUtils';

// Brand colors matching the EOD report template
const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  gold: '#d97706',
  green: '#059669',
  red: '#dc2626',
  orange: '#ea580c',
  blue: '#2563eb',
  amber: '#d97706',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  white: '#ffffff',
};

export interface DailyARReportItem {
  patient_name: string;
  amount: number;
  date: string;
  category: string;
  status: string;
  notes: string | null;
}

export interface DailyARReportSummary {
  openPatientARCount: number;
  openPatientARBalance: number;
  openInsuranceIssuesCount: number;
  priorDayCollected: number;
}

export interface DailyARReportData {
  reportDate: string;
  newPatientAR: DailyARReportItem[];
  newNonCollectible: DailyARReportItem[];
  newCredits: DailyARReportItem[];
  newInsuranceIssues: DailyARReportItem[];
  summary: DailyARReportSummary;
}

/**
 * Fetches all new records added today across tracked categories
 */
export async function fetchDailyARReportData(reportDate?: string): Promise<DailyARReportData> {
  const today = reportDate || getLocalDateString();
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  // Fetch new Patient A/R records (collectible) added today
  const { data: patientARData } = await supabase
    .from('patient_ar')
    .select('patient_name, current_balance, dos, status, background_notes, is_collectible, created_at')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .eq('is_collectible', true);

  // Fetch new Non-Collectible records added today
  const { data: nonCollectibleData } = await supabase
    .from('patient_ar')
    .select('patient_name, current_balance, dos, status, background_notes, is_collectible, created_at')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .eq('is_collectible', false);

  // Fetch new Credits added today
  const { data: creditsData } = await supabase
    .from('patient_credits')
    .select('patient_name, credit_amount, credit_date, status, notes, created_at')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  // Fetch new Insurance Issues added today (only Open items)
  const { data: issuesData } = await supabase
    .from('insurance_issues')
    .select('patient_name, date_of_service, issue_type, status, notes, created_at')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .eq('status', 'Open');

  // --- Summary queries: open counts & prior-day collected ---

  // Open (active, non-completed) Patient A/R accounts
  const { count: openARCount } = await supabase
    .from('patient_ar')
    .select('*', { count: 'exact', head: true })
    .eq('is_collectible', true)
    .not('status', 'in', '("paid","completed")');

  // Sum of current_balance for open A/R
  const { data: openARBalanceData } = await supabase
    .from('patient_ar')
    .select('current_balance')
    .eq('is_collectible', true)
    .not('status', 'in', '("paid","completed")');

  const openARBalance = (openARBalanceData || []).reduce(
    (sum, r) => sum + (Number(r.current_balance) || 0),
    0,
  );

  // Open Insurance Issues
  const { count: openIssuesCount } = await supabase
    .from('insurance_issues')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Open');

  // Prior-day collected from Patient A/R (collected_amount updated yesterday)
  const yesterday = new Date(today + 'T00:00:00');
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = toLocalDateString(yesterday);
  const yStart = `${yStr}T00:00:00.000Z`;
  const yEnd = `${yStr}T23:59:59.999Z`;

  const { data: priorDayData } = await supabase
    .from('patient_ar')
    .select('collected_amount')
    .eq('status', 'paid')
    .gte('updated_at', yStart)
    .lte('updated_at', yEnd);

  const priorDayCollected = (priorDayData || []).reduce(
    (sum, r) => sum + (Number(r.collected_amount) || 0),
    0,
  );

  return {
    reportDate: today,
    newPatientAR: (patientARData || []).map((r) => ({
      patient_name: sanitizePatientName(r.patient_name),
      amount: r.current_balance,
      date: r.dos,
      category: 'Patient A/R',
      status: r.status,
      notes: r.background_notes,
    })),
    newNonCollectible: (nonCollectibleData || []).map((r) => ({
      patient_name: sanitizePatientName(r.patient_name),
      amount: r.current_balance,
      date: r.dos,
      category: 'Non-Collectible',
      status: r.status,
      notes: r.background_notes,
    })),
    newCredits: (creditsData || []).map((r) => ({
      patient_name: sanitizePatientName(r.patient_name),
      amount: r.credit_amount,
      date: r.credit_date,
      category: 'Credits',
      status: r.status,
      notes: r.notes,
    })),
    newInsuranceIssues: (issuesData || []).map((r) => ({
      patient_name: sanitizePatientName(r.patient_name),
      amount: 0,
      date: r.date_of_service,
      category: 'Insurance Issues',
      status: r.status,
      notes: r.notes,
    })),
    summary: {
      openPatientARCount: openARCount || 0,
      openPatientARBalance: openARBalance,
      openInsuranceIssuesCount: openIssuesCount || 0,
      priorDayCollected,
    },
  };
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Generates the HTML email for the daily A/R report
 */
export function generateDailyARReportHTML(data: DailyARReportData, logoBaseUrl: string): string {
  const stellarLogoUrl = `${logoBaseUrl}/Stellar2%20copy.jpg`;
  const totalNewItems =
    data.newPatientAR.length +
    data.newNonCollectible.length +
    data.newCredits.length +
    data.newInsuranceIssues.length;

  const renderSection = (
    title: string,
    items: DailyARReportItem[],
    color: string,
    showAmount: boolean = true,
  ) => {
    if (items.length === 0) return '';

    const rows = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.gray200}; font-size: 13px; color: ${COLORS.gray800};">${item.patient_name}</td>
        ${showAmount ? `<td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.gray200}; font-size: 13px; color: ${COLORS.gray800}; text-align: right; font-weight: 600;">${formatCurrency(item.amount)}</td>` : ''}
        <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.gray200}; font-size: 13px; color: ${COLORS.gray600};">${formatDate(item.date)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.gray200}; font-size: 13px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${color}20; color: ${color};">${item.status}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.gray200}; font-size: 12px; color: ${COLORS.gray500}; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${item.notes || '--'}</td>
      </tr>`,
      )
      .join('');

    return `
    <tr>
      <td style="padding: 24px 40px 0 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom: 12px;">
              <h2 style="margin: 0; color: ${COLORS.gray800}; font-size: 16px; font-weight: 700;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; margin-right: 8px; vertical-align: middle;"></span>
                ${title}
                <span style="color: ${COLORS.gray500}; font-weight: 400; font-size: 14px; margin-left: 8px;">(${items.length} new)</span>
              </h2>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.gray200}; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: ${COLORS.gray50};">
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.gray500}; font-weight: 600; border-bottom: 1px solid ${COLORS.gray200};">Patient</th>
                  ${showAmount ? `<th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.gray500}; font-weight: 600; border-bottom: 1px solid ${COLORS.gray200};">Amount</th>` : ''}
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.gray500}; font-weight: 600; border-bottom: 1px solid ${COLORS.gray200};">Date</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.gray500}; font-weight: 600; border-bottom: 1px solid ${COLORS.gray200};">Status</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.gray500}; font-weight: 600; border-bottom: 1px solid ${COLORS.gray200};">Notes</th>
                </tr>
                ${rows}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily A/R Report - Court Street Dental</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray100};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="700" style="max-width: 700px; width: 100%; background-color: ${COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.primaryDark} 0%, ${COLORS.primary} 50%, ${COLORS.gold} 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <img src="${stellarLogoUrl}" alt="Stellar Consults" height="48" style="height: 48px; width: auto; display: block; border-radius: 8px;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: ${COLORS.white}; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Daily A/R Activity Report</h1>
                    <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 400;">${formatDate(data.reportDate)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Banner -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.gray50}; border-radius: 10px; border: 1px solid ${COLORS.gray200};">
                <tr>
                  <td style="padding: 16px 20px; text-align: center;">
                    <p style="margin: 0; color: ${COLORS.gray700}; font-size: 14px; line-height: 1.6;">
                      <strong>${totalNewItems}</strong> new item${totalNewItems !== 1 ? 's' : ''} added today across all categories.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Cards -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="25%" style="padding: 0 4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.blue}10; border-radius: 8px; border: 1px solid ${COLORS.blue}30;">
                      <tr><td style="padding: 12px; text-align: center;">
                        <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${COLORS.blue};">${data.newPatientAR.length}</p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: ${COLORS.gray600}; text-transform: uppercase; letter-spacing: 0.5px;">Patient A/R</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="25%" style="padding: 0 4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.amber}10; border-radius: 8px; border: 1px solid ${COLORS.amber}30;">
                      <tr><td style="padding: 12px; text-align: center;">
                        <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${COLORS.amber};">${data.newCredits.length}</p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: ${COLORS.gray600}; text-transform: uppercase; letter-spacing: 0.5px;">Credits</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="25%" style="padding: 0 4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.orange}10; border-radius: 8px; border: 1px solid ${COLORS.orange}30;">
                      <tr><td style="padding: 12px; text-align: center;">
                        <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${COLORS.orange};">${data.newInsuranceIssues.length}</p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: ${COLORS.gray600}; text-transform: uppercase; letter-spacing: 0.5px;">Ins. Issues</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="25%" style="padding: 0 4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.red}10; border-radius: 8px; border: 1px solid ${COLORS.red}30;">
                      <tr><td style="padding: 12px; text-align: center;">
                        <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${COLORS.red};">${data.newNonCollectible.length}</p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: ${COLORS.gray600}; text-transform: uppercase; letter-spacing: 0.5px;">Non-Collect.</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Detail Sections -->
          ${renderSection('New Patient A/R Accounts', data.newPatientAR, COLORS.blue)}
          ${renderSection('New Credits', data.newCredits, COLORS.amber)}
          ${renderSection('New Insurance Issues', data.newInsuranceIssues, COLORS.orange, false)}
          ${renderSection('New Non-Collectible Accounts', data.newNonCollectible, COLORS.red)}

          ${totalNewItems === 0 ? `
          <tr>
            <td style="padding: 40px; text-align: center;">
              <p style="margin: 0; color: ${COLORS.gray500}; font-size: 14px;">No new items were added today.</p>
            </td>
          </tr>
          ` : ''}

          <!-- End-of-Day Summary -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <h2 style="margin: 0; color: ${COLORS.gray800}; font-size: 16px; font-weight: 700;">
                      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${COLORS.primary}; margin-right: 8px; vertical-align: middle;"></span>
                      Outstanding Reports Snapshot
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.gray200}; border-radius: 8px; overflow: hidden;">
                      <tr style="background-color: ${COLORS.gray50};">
                        <td style="padding: 14px 16px; border-bottom: 1px solid ${COLORS.gray200}; width: 50%;">
                          <p style="margin: 0; font-size: 11px; color: ${COLORS.gray500}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Open Patient A/R Accounts</p>
                          <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 700; color: ${COLORS.blue};">${data.summary.openPatientARCount}</p>
                          <p style="margin: 2px 0 0 0; font-size: 12px; color: ${COLORS.gray500};">Total balance: ${formatCurrency(data.summary.openPatientARBalance)}</p>
                        </td>
                        <td style="padding: 14px 16px; border-bottom: 1px solid ${COLORS.gray200}; border-left: 1px solid ${COLORS.gray200}; width: 50%;">
                          <p style="margin: 0; font-size: 11px; color: ${COLORS.gray500}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Open Insurance Issues</p>
                          <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 700; color: ${COLORS.orange};">${data.summary.openInsuranceIssuesCount}</p>
                          <p style="margin: 2px 0 0 0; font-size: 12px; color: ${COLORS.gray500};">Still unresolved</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 14px 16px; text-align: center;">
                          <p style="margin: 0; font-size: 11px; color: ${COLORS.gray500}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Prior Day A/R Collected</p>
                          <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: ${COLORS.green};">${formatCurrency(data.summary.priorDayCollected)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; text-align: center; border-top: 1px solid ${COLORS.gray200}; margin-top: 24px;">
              <p style="margin: 0; color: ${COLORS.gray500}; font-size: 12px;">
                This is an automated daily report from the Stellar Dashboard.
              </p>
              <p style="margin: 4px 0 0 0; color: ${COLORS.gray500}; font-size: 11px;">
                Patient information has been sanitized for security.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the daily A/R report email via Supabase Edge Function
 */
export async function sendDailyARReport(
  recipients: string[],
  data: DailyARReportData,
  logoBaseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const htmlBody = generateDailyARReportHTML(data, logoBaseUrl);
    const totalNew =
      data.newPatientAR.length +
      data.newNonCollectible.length +
      data.newCredits.length +
      data.newInsuranceIssues.length;

    const { data: result, error } = await supabase.functions.invoke('send-eod-email', {
      body: {
        to: recipients,
        subject: `Daily A/R Report - ${formatDate(data.reportDate)} (${totalNew} new item${totalNew !== 1 ? 's' : ''})`,
        htmlBody,
        reportDate: data.reportDate,
      },
    });

    if (error) {
      console.warn('Edge function error for daily AR report:', error.message);
      return { success: false, error: 'Email service not configured. Set up Postmark Edge Function for direct delivery.' };
    }

    if (result?.success) {
      return { success: true };
    }

    return { success: false, error: result?.error || 'Unknown error' };
  } catch (err) {
    console.warn('Daily AR report send failed:', err);
    return { success: false, error: 'Email service unavailable.' };
  }
}
