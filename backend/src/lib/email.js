import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;
const CLIENT_URL = process.env.CLIENT_ORIGINS?.split(",")[0]?.trim() || "";

let transporter = null;
if (EMAIL_USER && EMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD },
  });
}

export const isEmailConfigured = () => Boolean(transporter);

const escapeHtml = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const sendWelcomeEmail = async (user) => {
  if (!transporter) return;

  const safeName = escapeHtml(user.fullName || "there");
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #2563eb; margin-bottom: 8px;">Welcome to Streamify, ${safeName}!</h1>
      <p style="color: #334155; line-height: 1.6;">
        Your account is ready. Start connecting with language partners, chat, and
        practice over voice or video calls.
      </p>
      ${
        CLIENT_URL
          ? `<p style="margin-top: 24px;">
               <a href="${CLIENT_URL}" style="background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                 Open Streamify
               </a>
             </p>`
          : ""
      }
      <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
        If you didn't create this account, you can safely ignore this email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Streamify" <${EMAIL_USER}>`,
    to: user.email,
    subject: "Welcome to Streamify!",
    html,
  });
};
