// src/services/emailService.ts
// Email delivery service with Postmark integration
// Falls back to clipboard + mailto when Postmark is not configured

import { supabase } from '../lib/supabaseClient';

interface SendEmailRequest {
  to: string[];
  subject: string;
  htmlBody: string;
  reportDate: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  method: 'postmark' | 'fallback';
}

/**
 * Sends an EOD report email via Postmark (through Supabase Edge Function)
 * or falls back to clipboard+mailto if Postmark is not configured.
 *
 * To enable Postmark:
 * 1. Create a Postmark account and get a Server API Token
 * 2. Create a Supabase Edge Function at `supabase/functions/send-eod-email/index.ts`
 * 3. Set the POSTMARK_SERVER_TOKEN secret in your Supabase project
 * 4. The edge function handles the actual Postmark API call
 */
export async function sendEODReportEmail(request: SendEmailRequest): Promise<SendEmailResult> {
  try {
    // Attempt to send via Supabase Edge Function (Postmark)
    const { data, error } = await supabase.functions.invoke('send-eod-email', {
      body: {
        to: request.to,
        subject: request.subject,
        htmlBody: request.htmlBody,
        reportDate: request.reportDate,
      },
    });

    if (error) {
      console.warn('Edge function not available, using fallback:', error.message);
      return {
        success: false,
        error: 'Email service not configured. Set up Postmark Edge Function for direct delivery.',
        method: 'fallback',
      };
    }

    if (data?.success) {
      // Log the successful send to eod_report_history
      await logReportSend(request);

      return {
        success: true,
        messageId: data.messageId,
        method: 'postmark',
      };
    }

    return {
      success: false,
      error: data?.error || 'Unknown error from email service',
      method: 'postmark',
    };
  } catch (err) {
    console.warn('Email service unavailable:', err);
    return {
      success: false,
      error: 'Email service unavailable. Report will be opened in a new tab.',
      method: 'fallback',
    };
  }
}

/**
 * Logs a report send to the eod_report_history table for audit purposes.
 */
async function logReportSend(request: SendEmailRequest): Promise<void> {
  try {
    await supabase.from('eod_report_history').insert({
      report_date: request.reportDate,
      recipients: request.to,
      subject: request.subject,
      sent_at: new Date().toISOString(),
      delivery_method: 'postmark',
    });
  } catch (err) {
    // Non-critical — don't fail the email send if logging fails
    console.warn('Failed to log report send:', err);
  }
}
