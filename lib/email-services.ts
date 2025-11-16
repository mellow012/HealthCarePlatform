// lib/email-services.ts
import nodemailer from 'nodemailer';

// === EMAIL TRANSPORTER ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter config error:', error);
  } else {
    console.log('Email server ready');
  }
});

// === SEND INVITATION EMAIL ===
export async function sendInvitationEmail(
  email: string,
  hospitalName: string,
  resetLink: string,
  hospitalId: string
): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials missing');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: `Complete Your ${hospitalName} Account Setup`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Account Setup</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      Welcome to Our Healthcare Platform
                    </h1>
                  </td>
                </tr>
               
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 22px;">
                      Hello Hospital Administrator,
                    </h2>
                   
                    <p style="margin: 0 0 15px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                      Your hospital <strong style="color: #667eea;">${hospitalName}</strong> has been successfully registered on our platform!
                    </p>
                   
                    <p style="margin: 0 0 15px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                      As the Hospital Administrator, you have been granted access to manage your hospital's operations, staff, and patient records.
                    </p>
                   
                    <p style="margin: 0 0 30px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                      To get started, please click the button below to set your password and complete your account setup:
                    </p>
                   
                    <!-- CTA Button -->
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                          <a href="${resetLink}"
                             style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px;">
                            Set Up Your Account
                          </a>
                        </td>
                      </tr>
                    </table>
                   
                    <p style="margin: 30px 0 15px 0; color: #888888; font-size: 14px; line-height: 1.6;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                   
                    <p style="margin: 0 0 30px 0; word-break: break-all;">
                      <a href="${resetLink}" style="color: #667eea; text-decoration: none; font-size: 13px;">
                        ${resetLink}
                      </a>
                    </p>
                   
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px;">
                      <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px; font-weight: bold;">
                        Important Security Information:
                      </p>
                      <ul style="margin: 0; padding-left: 20px; color: #555555; font-size: 14px; line-height: 1.6;">
                        <li style="margin-bottom: 8px;">This link will expire in <strong>24 hours</strong> for security purposes</li>
                        <li style="margin-bottom: 8px;">If you didn't request this account, please ignore this email</li>
                        <li>Never share this link with anyone</li>
                      </ul>
                    </div>
                   
                    <p style="margin: 20px 0 0 0; color: #555555; font-size: 14px; line-height: 1.6;">
                      If you have any questions or need assistance, please don't hesitate to contact our support team.
                    </p>
                  </td>
                </tr>
               
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0 0 10px 0; color: #888888; font-size: 12px;">
                      Hospital ID: <strong>${hospitalId}</strong>
                    </p>
                    <p style="margin: 0; color: #888888; font-size: 12px;">
                      © ${new Date().getFullYear()} Healthcare Platform. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Welcome to Our Healthcare Platform!
Your hospital "${hospitalName}" has been successfully registered.

Please set your password and complete setup:
${resetLink}

Hospital ID: ${hospitalId}
This link expires in 24 hours.

© ${new Date().getFullYear()} Healthcare Platform. All rights reserved.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Invitation email sent:', info.messageId);
  } catch (error: any) {
    console.error('Failed to send invitation email:', error);
    throw new Error(`Email failed: ${error.message}`);
  }
}