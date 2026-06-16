const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

exports.sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"Task Manager" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };
  return transporter.sendMail(mailOptions);
};

exports.emailTemplates = {
  verifyEmail: (name, link) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
      <h2 style="color:#4f46e5;">Verify Your Email</h2>
      <p>Hi ${name},</p>
      <p>Please click the button below to verify your email address.</p>
      <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    </div>`,
  resetPassword: (name, link) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
      <h2 style="color:#4f46e5;">Reset Your Password</h2>
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click below to set a new password.</p>
      <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>`,
  taskAssigned: (assigneeName, taskTitle, taskLink) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
      <h2 style="color:#4f46e5;">New Task Assigned</h2>
      <p>Hi ${assigneeName},</p>
      <p>You have been assigned a new task: <strong>${taskTitle}</strong></p>
      <a href="${taskLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">View Task</a>
    </div>`,
};
