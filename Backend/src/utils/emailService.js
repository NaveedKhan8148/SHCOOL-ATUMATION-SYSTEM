import nodemailer from "nodemailer";

/**
 * Helper to check if valid SMTP credentials are set in .env
 */
const isSmtpConfigured = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) return false;

    // Check for default placeholder strings
    const isPlaceholderUser = user.includes("your_gmail") || user.includes("example.com") || user.includes("YOUR_");
    const isPlaceholderPass = pass.includes("your_16_char") || pass.includes("YOUR_") || pass === "123456";

    return !isPlaceholderUser && !isPlaceholderPass;
};

/**
 * Creates a reusable nodemailer transporter using SMTP credentials from .env
 */
const createTransporter = () => {
    if (!isSmtpConfigured()) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === "true", // true for port 465, false for 587
        family: 4, // Force IPv4 to prevent IPv6 network unreachable errors
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Sends a password-reset email with a secure reset link.
 *
 * @param {string} toEmail   - Recipient email address
 * @param {string} resetLink - Full reset URL (e.g. http://localhost:5173/reset-password?token=xxx)
 * @param {string} userName  - Display name shown in the email body
 */
export const sendPasswordResetEmail = async (toEmail, resetLink, userName = "User") => {
    const transporter = createTransporter();

    // ALWAYS log the reset link to backend terminal for easy dev testing
    console.log(`\n======================================================`);
    console.log(`🔑 [DEV/DEBUG] PASSWORD RESET LINK FOR ${toEmail}:`);
    console.log(`👉 ${resetLink}`);
    console.log(`======================================================\n`);

    if (!transporter) {
        console.warn(`⚠️ [emailService] SMTP credentials not set in .env (EMAIL_USER / EMAIL_PASS). Skipping actual email dispatch. Reset link printed to terminal above.`);
        return { messageId: "dev-console-fallback", previewUrl: resetLink };
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px;
               box-shadow: 0 4px 24px rgba(102,126,234,0.12); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 36px 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px; }
    .body { padding: 36px 32px; }
    .body p { color: #444; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 36px;
           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
           color: #fff !important; text-decoration: none; border-radius: 50px;
           font-size: 15px; font-weight: 600; letter-spacing: 0.3px; }
    .link-box { background: #f4f6fb; border-radius: 8px; padding: 12px 16px;
                word-break: break-all; font-size: 12px; color: #667eea; margin-top: 8px; }
    .footer { background: #f4f6fb; text-align: center; padding: 20px 32px;
              font-size: 11px; color: #9ca3af; }
    .warning { background: #fff7e6; border-left: 4px solid #faad14; border-radius: 6px;
               padding: 10px 14px; font-size: 12px; color: #b45309; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎓 Education Automation System</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="body">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to create a new password. This link is valid for <strong>1 hour</strong>.</p>
      <div class="btn-wrap">
        <a class="btn" href="${resetLink}">Reset My Password</a>
      </div>
      <p style="font-size:13px; color:#888;">If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="link-box">${resetLink}</div>
      <div class="warning">
        ⚠️ <strong>Security tip:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Education Automation System &bull; This is an automated message, please do not reply.
    </div>
  </div>
</body>
</html>`;

    try {
        const info = await transporter.sendMail({
            from: `"Education Automation System" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "🔐 Reset Your Password — Education Automation System",
            html,
        });
        console.log(`✅ [emailService] Reset email successfully delivered to ${toEmail} via SMTP!`);
        return info;
    } catch (err) {
        console.error("❌ [emailService] SMTP send error:", err.message);
        // Fallback in non-production environment so development is not blocked
        if (process.env.NODE_ENV !== "production") {
            console.warn("⚠️ [emailService] Development fallback active: returning success so UI works. Reset link is printed in terminal above.");
            return { messageId: "dev-smtp-error-fallback", previewUrl: resetLink };
        }
        throw err;
    }
};
