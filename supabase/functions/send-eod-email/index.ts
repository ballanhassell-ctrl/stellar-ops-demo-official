// Supabase Edge Function: send-eod-email
// Sends EOD report emails via Postmark transactional email API
//
// Required Supabase secrets:
//   POSTMARK_SERVER_TOKEN - Your Postmark Server API Token
//   POSTMARK_FROM_EMAIL   - Verified sender email (e.g., reports@stellarconsults.io)
//
// To deploy:
//   supabase functions deploy send-eod-email --no-verify-jwt
//
// To set secrets:
//   supabase secrets set POSTMARK_SERVER_TOKEN=your-token-here
//   supabase secrets set POSTMARK_FROM_EMAIL=reports@stellarconsults.io

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InlineAttachment {
  Name: string;
  Content: string;
  ContentType: string;
  ContentID: string;
}

interface EmailRequest {
  to: string[];
  subject: string;
  htmlBody: string;
  reportDate: string;
  attachments?: InlineAttachment[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const POSTMARK_TOKEN = Deno.env.get('POSTMARK_SERVER_TOKEN');
    const FROM_EMAIL = Deno.env.get('POSTMARK_FROM_EMAIL') || 'reports@stellarconsults.io';

    if (!POSTMARK_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'POSTMARK_SERVER_TOKEN not configured. Please set this secret in your Supabase project.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, subject, htmlBody, reportDate, attachments }: EmailRequest = await req.json();

    if (!to || to.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No recipients specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Postmark supports sending to multiple recipients in a single API call
    // For more than 50 recipients, batch into multiple calls
    const postmarkResponse = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: to.join(','),
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: 'outbound',
        Tag: 'eod-report',
        Metadata: {
          reportDate,
          source: 'stellar-ops-dashboard',
        },
        ...(attachments && attachments.length > 0 ? { Attachments: attachments } : {}),
      }),
    });

    const postmarkData = await postmarkResponse.json();

    if (postmarkResponse.ok && postmarkData.ErrorCode === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          messageId: postmarkData.MessageID,
          submittedAt: postmarkData.SubmittedAt,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Postmark error:', postmarkData);
      return new Response(
        JSON.stringify({
          success: false,
          error: postmarkData.Message || 'Failed to send via Postmark',
          errorCode: postmarkData.ErrorCode,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
