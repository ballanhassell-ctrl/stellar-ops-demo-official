// src/services/emailService.ts
// Email delivery service with Postmark integration
// Falls back to clipboard + mailto when Postmark is not configured

import { supabase } from '../lib/supabaseClient';

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

// Cached Supabase Storage base URL for email logos
let cachedLogoBaseUrl: string | null = null;

const EMAIL_LOGO_FILES = [
  { local: '/Stellar2 copy.jpg', remote: 'Stellar2 copy.jpg' },
  { local: '/Cris Dental Image.jpg', remote: 'Cris Dental Image.jpg' },
];

/**
 * Uploads logo images to Supabase Storage (public bucket) if not already present,
 * and returns the base URL for referencing them in email HTML.
 *
 * This ensures email clients can load the logos from a permanent public CDN URL
 * rather than the app's origin (which may be localhost or blocked by email clients).
 *
 * Requires the `email-assets` bucket to exist (see create_email_assets_bucket.sql).
 * Falls back to window.location.origin if storage is unavailable.
 */
export async function getEmailLogoBaseUrl(): Promise<string> {
  if (cachedLogoBaseUrl) return cachedLogoBaseUrl;

  const BUCKET = 'email-assets';

  try {
    // Check which files already exist in the bucket
    const { data: existing } = await supabase.storage.from(BUCKET).list();
    const existingNames = new Set((existing || []).map(f => f.name));

    // Upload any missing logos
    for (const logo of EMAIL_LOGO_FILES) {
      if (existingNames.has(logo.remote)) continue;

      const response = await fetch(logo.local);
      if (!response.ok) continue;
      const blob = await response.blob();
      await supabase.storage.from(BUCKET).upload(logo.remote, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    }

    // Build the base URL: <supabase-url>/storage/v1/object/public/<bucket>
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    cachedLogoBaseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;
    return cachedLogoBaseUrl;
  } catch (err) {
    console.warn('Could not upload logos to Supabase Storage, falling back to origin:', err);
    return window.location.origin;
  }
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
