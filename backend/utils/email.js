const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

exports.sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"TaskFlow" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`Email delivery failure to ${to}:`, err);
    throw err;
  }
};

// Reusable premium HTML template builder
const buildBaseTemplate = ({ headerTitle, heading, salutation, message, ctaLink, ctaText, footerWarning }) => `
  <div style="background-color:#f3f4f6;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;">
    <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1);border:1px solid #e5e7eb;">
      <!-- Brand Header Banner -->
      <div style="background:linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);padding:36px 32px;text-align:center;">
        <!-- Logo -->
        <div style="display:inline-block;background-color:rgba(255,255,255,0.15);padding:12px;border-radius:12px;margin-bottom:12px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.03em;margin:0;">TaskFlow</div>
      </div>
      
      <!-- Content Area -->
      <div style="padding:40px 32px 36px 32px;">
        <h1 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 20px 0;line-height:28px;letter-spacing:-0.01em;">${heading}</h1>
        <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 16px 0;font-weight:500;">Hi ${salutation},</p>
        <p style="color:#4b5563;font-size:15px;line-height:24px;margin:0 0 28px 0;">${message}</p>
        
        <!-- CTA Action Button -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${ctaLink}" style="background-color:#4f46e5;color:#ffffff;padding:14px 32px;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 4px 6px -1px rgba(79,70,229,0.2),0 2px 4px -1px rgba(79,70,229,0.1);transition:background-color 0.2s;">
            ${ctaText}
          </a>
        </div>
        
        ${footerWarning ? `<p style="color:#9ca3af;font-size:12px;line-height:18px;margin:28px 0 0 0;text-align:center;font-style:italic;">${footerWarning}</p>` : ''}
      </div>
      
      <!-- Footer Brand Area -->
      <div style="background-color:#f9fafb;padding:24px 32px;border-top:1px solid #f3f4f6;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0 0 6px 0;">This email was sent by TaskFlow, a role-based task collaboration platform.</p>
        <p style="color:#d1d5db;font-size:11px;margin:0;">&copy; 2026 TaskFlow. All rights reserved.</p>
      </div>
    </div>
  </div>
`;

exports.emailTemplates = {
  verifyEmail: (name, link) => buildBaseTemplate({
    heading: 'Verify Your Email Address',
    salutation: name,
    message: 'Welcome to TaskFlow! To start using the platform and organizing your project workflows, please click the button below to verify your email address.',
    ctaLink: link,
    ctaText: 'Verify Email',
    footerWarning: 'This link is secure and will expire in 24 hours. If you did not register for this account, please ignore this email.'
  }),

  resetPassword: (name, link) => buildBaseTemplate({
    heading: 'Reset Your Password',
    salutation: name,
    message: 'We received a request to reset your password. Click the button below to specify a new password for your account.',
    ctaLink: link,
    ctaText: 'Reset Password',
    footerWarning: 'This link is secure and will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.'
  }),

  taskAssigned: (assigneeName, taskTitle, taskLink) => buildBaseTemplate({
    heading: 'New Task Assigned',
    salutation: assigneeName,
    message: `You have been assigned a new task: <strong>${taskTitle}</strong>. Please click the button below to view the task details, attachments, and update progress.`,
    ctaLink: taskLink,
    ctaText: 'View Task Details'
  }),
};
