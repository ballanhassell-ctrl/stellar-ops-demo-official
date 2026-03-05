// src/services/emailService.ts
// Email delivery service with Postmark integration
// Falls back to clipboard + mailto when Postmark is not configured

import { supabase } from '../lib/supabaseClient';

interface InlineAttachment {
  Name: string;
  Content: string;
  ContentType: string;
  ContentID: string;
}

interface SendEmailRequest {
  to: string[];
  subject: string;
  htmlBody: string;
  reportDate: string;
  template?: string;
  sentBy?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  method: 'postmark' | 'fallback';
}

async function fetchLogoAsBase64(path: string): Promise<string | null> {
  try {
    const response = await fetch(`${window.location.origin}${path}`);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Strip the data:image/...;base64, prefix to get raw base64
        resolve(dataUrl.split(',')[1] || null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildLogoAttachments(): Promise<InlineAttachment[]> {
  const [stellarB64, csdB64] = await Promise.all([
    fetchLogoAsBase64('/Stellar2 copy.jpg'),
    fetchLogoAsBase64('/Cris Dental Image.jpg'),
  ]);
  const attachments: InlineAttachment[] = [];
  if (stellarB64) {
    attachments.push({ Name: 'stellar-logo.jpg', Content: stellarB64, ContentType: 'image/jpeg', ContentID: 'cid:stellar-logo' });
  }
  if (csdB64) {
    attachments.push({ Name: 'csd-logo.jpg', Content: csdB64, ContentType: 'image/jpeg', ContentID: 'cid:csd-logo' });
  }
  return attachments;
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
    // Fetch logo images and encode as base64 for CID inline attachments
    const attachments = await buildLogoAttachments();

    // Attempt to send via Supabase Edge Function (Postmark)
    const { data, error } = await supabase.functions.invoke('send-eod-email', {
      body: {
        to: request.to,
        subject: request.subject,
        htmlBody: request.htmlBody,
        reportDate: request.reportDate,
        attachments,
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
      template: request.template || 'full',
      sent_by: request.sentBy || 'system',
      sent_at: new Date().toISOString(),
      delivery_method: 'postmark',
    });
  } catch (err) {
    // Non-critical — don't fail the email send if logging fails
    console.warn('Failed to log report send:', err);
  }
}
