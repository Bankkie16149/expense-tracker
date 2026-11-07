const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    return new Resend(apiKey);
  }
  return null;
};

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
    const resend = getResendClient();

    // 1. Primary: Resend API (HTTPS Port 443 - works everywhere including Render Free Tier)
    if (resend) {
      const from = process.env.EMAIL_FROM || 'FinTrack <Fintrack@resend.dev>';
      const formattedHtml = html || `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; white-space: pre-wrap; color: #334155;">${text}</div>`;

      const response = await resend.emails.send({
        from,
        to: [to],
        subject,
        text,
        html: formattedHtml,
      });

      if (response.error) {
        console.error('Resend API error:', response.error);
        return { success: false, error: response.error };
      }

      console.log('Email sent via Resend successfully:', response.data?.id);
      return { success: true, messageId: response.data?.id, provider: 'resend' };
    }

    // 2. Secondary: SMTP / Nodemailer (if SMTP_USER is set and no Resend key)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createTransporter();
      const info = await transporter.sendMail({
        from: `"FinTrack" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Email sent via SMTP successfully: %s', info.messageId);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    }

    // 3. Fallback: Mock mode
    console.log('--- EMAIL MOCK ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('--- END EMAIL ---');
    return { success: true, mock: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message || error };
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
