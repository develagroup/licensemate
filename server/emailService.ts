import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
export const smtpFromEmail = process.env.SMTP_FROM_EMAIL;
const localPostfix = ['127.0.0.1', 'localhost', '::1', 'mail.develadigital.com'].includes(smtpHost || '') && smtpPort === 25;
const smtpAuthenticated = Boolean(smtpUser && smtpPassword);

export const mailer = smtpHost && smtpFromEmail && (smtpAuthenticated || localPostfix)
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      disableFileAccess: true,
      disableUrlAccess: true,
      ...(smtpAuthenticated ? { auth: { user: smtpUser, pass: smtpPassword } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  : null;

export async function sendLicenseKeyEmail(input: {
  to: string;
  recipientName: string;
  productName: string;
  key: string;
  messageId: string;
}) {
  if (!mailer || !smtpFromEmail) {
    const error = new Error('Customer email delivery is not configured.') as Error & { code: string };
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
  const recipientName = escapeHtml(input.recipientName);
  const productName = escapeHtml(input.productName);
  const key = escapeHtml(input.key);
  const result = await mailer.sendMail({
    from: smtpFromEmail,
    to: input.to,
    messageId: input.messageId,
    subject: `Your ${input.productName} license key`,
    text: `Hello ${input.recipientName},\n\nYour ${input.productName} license key is:\n\n${input.key}\n\nKeep this key private. Contact support if you need help activating it.`,
    html: `<div style="font-family:Arial,sans-serif;background:#101315;color:#eef3f2;padding:32px;border-radius:12px"><p style="color:#54c7b4;font-weight:700;letter-spacing:2px">LICENSEPULSE</p><h1 style="font-size:22px">Your license key</h1><p>Hello ${recipientName},</p><p>Your ${productName} license key is:</p><p style="font-family:monospace;font-size:20px;letter-spacing:2px;font-weight:700;background:#191c1f;padding:16px;border-radius:8px">${key}</p><p>Keep this key private. Contact support if you need help activating it.</p></div>`,
  });
  if (!result.accepted.some(address => address.toLowerCase() === input.to.toLowerCase())) {
    const error = new Error('SMTP did not accept the recipient.') as Error & { code: string };
    error.code = 'SMTP_RECIPIENT_REJECTED';
    throw error;
  }
  return { messageId: result.messageId };
}
