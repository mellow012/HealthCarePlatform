// lib/email-services.ts
import nodemailer from 'nodemailer';

// CORRECT WAY in Nodemailer v7+
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

export async function sendStaffInvitationEmail(
  toEmail: string,
  role: string,
  link: string
): Promise<void> {
  const displayRole = role
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 12px;">
      <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
        <h2 style="color: #1e40af;">You're Invited to Heal-E!</h2>
        <p style="font-size: 16px; color: #374151;">
          You've been added as a <strong>${displayRole}</strong> to the hospital team.
        </p>
        <p style="margin: 32px 0;">
          <a href="${link}" style="background: #10b981; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Set Up Your Account
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          This link expires in 24 hours.<br>
          Questions? Contact your hospital administrator.
        </p>
      </div>
    </div>
  `;

  await sendEmail(toEmail, `Invitation: ${displayRole} Role`, html);
}

export async function sendInvitationEmail(
  toEmail: string,
  hospitalName: string,
  resetLink: string,
  hospitalId: string
): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h2 style="color: #1e40af;">Welcome to Heal-E</h2>
        <p>Your hospital <strong>${hospitalName}</strong> is now on the platform.</p>
        <p><a href="${resetLink}" style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Complete Setup
        </a></p>
        <p><small>Hospital ID: ${hospitalId}</small></p>
      </div>
    </div>
  `;

  await sendEmail(toEmail, 'Complete Your Hospital Setup', html);
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Heal-E" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Email sent:', info.messageId);
  } catch (error: any) {
    console.error('Email failed:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}