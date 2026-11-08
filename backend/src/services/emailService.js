const nodemailer = require('nodemailer');
const axios = require('axios');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_PORT === '465',
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: {
      user: process.env.SMTP_USER || 'mock_user@example.com',
      pass: process.env.SMTP_PASS || 'mock_pass',
    },
  });
};

const sendEmail = async (to, subject, text, html) => {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY;

    // 1. Primary: Brevo REST API (HTTPS Port 443)
    if (brevoApiKey) {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER;
      if (!senderEmail) {
        const errorMsg = 'BREVO_SENDER_EMAIL is not configured in environment variables.';
        console.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      const formattedHtml = html || `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; white-space: pre-wrap; color: #334155;">${text}</div>`;

      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: 'FinTrack', email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: formattedHtml,
          textContent: text,
        },
        {
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      const messageId = response.data?.messageId;
      console.log(`Email sent via Brevo to ${to} successfully:`, messageId);
      return { success: true, messageId, provider: 'brevo' };
    }

    // 2. Secondary: SMTP / Nodemailer (local fallback)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createTransporter();
      const info = await transporter.sendMail({
        from: `"FinTrack" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log(`Email sent via SMTP to ${to} successfully: %s`, info.messageId);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    }

    // 3. Neither is configured: Report clear error (NO fake mock success!)
    const errorMsg = 'No email service configured. Please set BREVO_API_KEY in Render Environment variables.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  } catch (error) {
    const errData = error.response?.data || error.message || error;
    console.error(`Error sending email to ${to}:`, errData);
    return { success: false, error: errData };
  }
};

const sendTransactionNotification = async (userEmail, transaction) => {
  const isExpense = transaction.category?.type === 'expense';
  const typeText = isExpense ? 'รายจ่าย' : 'รายรับ';
  const subject = `[FinTrack] แจ้งเตือนการเพิ่ม${typeText}ใหม่`;
  const text = `
เรียนคุณ ${userEmail},

มีการเพิ่มรายการ${typeText}ใหม่ในบัญชีของคุณ:
- ชื่อรายการ: ${transaction.title}
- หมวดหมู่: ${transaction.category?.name || 'ทั่วไป'}
- จำนวนเงิน: ฿${transaction.amount?.toLocaleString()}
- วันที่: ${new Date(transaction.date).toLocaleDateString('th-TH')}

ขอขอบคุณที่ใช้บริการ FinTrack
  `;

  return sendEmail(userEmail, subject, text);
};

module.exports = {
  sendEmail,
  sendTransactionNotification
};
