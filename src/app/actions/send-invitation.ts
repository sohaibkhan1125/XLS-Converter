'use server';

import { Resend } from 'resend';
import InvitationEmail from '@/components/emails/invitation-email';
import { getGeneralSettings } from '@/lib/firebase-settings-service';
import type { User } from 'firebase/auth';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.EMAIL_FROM || 'noreply@yourdomain.com';

interface SendInvitationResult {
  success: boolean;
  message: string;
}

export async function sendInvitationEmail(
  inviteeEmail: string,
  inviter: User,
  inviterProfile: { firstName?: string; lastName?: string } | null
): Promise<SendInvitationResult> {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API key is not configured.');
    return { success: false, message: 'Email service is not configured.' };
  }

  if (!inviteeEmail) {
    return { success: false, message: 'Recipient email address is required.' };
  }

  try {
    const settings = await getGeneralSettings();
    const siteTitle = settings.siteTitle || 'XLSConvert';
    const inviterName = inviterProfile?.firstName ? `${inviterProfile.firstName} ${inviterProfile.lastName}` : inviter.email || 'A user';
    
    // In a real app, you would generate a unique, single-use invitation link
    // and store it in your database with the invitee's email.
    // For this example, we'll just link to the signup page.
    const invitationLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signup`;

    const { data, error } = await resend.emails.send({
      from: `${siteTitle} <${fromEmail}>`,
      to: [inviteeEmail],
      subject: `You're invited to join ${siteTitle}`,
      react: InvitationEmail({
        invitedByUsername: inviterName,
        teamName: `${inviterName}'s Team on ${siteTitle}`,
        inviteLink: invitationLink,
        siteName: siteTitle,
      }),
      text: `You have been invited to join ${siteTitle} by ${inviterName}. Click here to accept: ${invitationLink}`,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, message: `Failed to send email: ${error.message}` };
    }

    console.log('Invitation email sent successfully:', data);
    return { success: true, message: `Invitation sent to ${inviteeEmail}.` };
  } catch (exception) {
    console.error('An exception occurred while sending the email:', exception);
    const errorMessage = exception instanceof Error ? exception.message : 'An unknown error occurred.';
    return { success: false, message: `An unexpected error occurred: ${errorMessage}` };
  }
}
