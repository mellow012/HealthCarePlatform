
export function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function sendInvitationEmail(
  email: string,
  firstName: string,
  resetLink: string
): Promise<void> {
  // In production, use a proper email service like SendGrid, AWS SES, or Resend
  // For now, we'll log the details
  console.log('=== INVITATION EMAIL ===');
  console.log('To:', email);
  console.log('Subject: Welcome to HealthCare Platform - Set Your Password');
  console.log('Body:');
  console.log(`
    Hi ${firstName},

    You've been invited to join our HealthCare Platform as a Hospital Administrator.

    To get started, please set your password by clicking the link below:
    ${resetLink}

    This link will expire in 24 hours.

    Once you've set your password, you'll be able to:
    1. Set up your hospital profile
    2. Manage patient check-ins and check-outs
    3. Access patient medical records (with consent)
    4. Create and manage medical records

    If you have any questions, please contact our support team.

    Best regards,
    HealthCare Platform Team
  `);
  console.log('========================');

  // TODO: Implement actual email sending
  // Example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: email,
    from: 'noreply@healthcare.com',
    subject: 'Welcome to HealthCare Platform - Set Your Password',
    html: `...`,
  };
  
  await sgMail.send(msg);
  */
}