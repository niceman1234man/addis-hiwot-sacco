import nodemailer from "nodemailer";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_PORT) === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

export async function sendPasswordResetEmail({ email, name, token }) {
  const transport = getTransport();
  if (!transport) throw new Error("Password recovery email delivery is not configured.");
  const baseUrl = (process.env.FRONTEND_URL || process.env.APP_URL || "").replace(/\/$/, "");
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) throw new Error("FRONTEND_URL must be set to the public application URL.");
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await transport.sendMail({
    from,
    to: email,
    subject: "Reset your Addis Hiwot SACCO password",
    text: `Hello ${name || ""},\n\nA password reset was requested for your Addis Hiwot staff account. Use this link within 30 minutes:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.\n\nAddis Hiwot SACCO`,
    html: `<p>Hello ${escapeHtml(name || "")},</p><p>A password reset was requested for your Addis Hiwot staff account.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p><p>Addis Hiwot SACCO</p>`,
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}
