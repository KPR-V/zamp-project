import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendVendorEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resend) {
    console.warn('[Mailer] RESEND_API_KEY is not configured. Email simulated.');
    return {
      success: false,
      error: 'RESEND_API_KEY is not configured in .env.local',
    };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text: body,
    });

    if (error) {
      console.error('[Mailer] Resend API error:', error);
      return {
        success: false,
        error: error.message || 'Resend API returned an error',
      };
    }

    console.log(`[Mailer] Email delivered to ${to} with ID: ${data?.id}`);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Mailer] Exception sending email:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

