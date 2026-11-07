const express = require('express');
const router = express.Router();
const { sendMonthlySummaryEmails } = require('../services/cronJobs');
const emailService = require('../services/emailService');

// Middleware to verify secret token
const verifyCronSecret = (req, res, next) => {
  const secret = req.query.key || req.headers['x-cron-secret'];
  const validSecret = process.env.CRON_SECRET || 'fintrack_cron_secret_2026';

  if (!secret || secret !== validSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid cron secret key' });
  }
  next();
};

// Route 1: Trigger Monthly Summary Email (called by cron-job.org at end of month)
router.get('/monthly-summary', verifyCronSecret, async (req, res) => {
  try {
    const result = await sendMonthlySummaryEmails();
    res.json({
      message: 'Monthly summary emails sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error in monthly-summary cron endpoint:', error);
    res.status(500).json({ error: error.message || 'Failed to send emails' });
  }
});

// Route 2: Test Email Endpoint (to test if SMTP works immediately via browser)
router.get('/test-email', verifyCronSecret, async (req, res) => {
  try {
    const to = req.query.to || process.env.SMTP_USER;
    if (!to) {
      return res.status(400).json({ error: 'Please specify ?to=your_email@gmail.com' });
    }

    const result = await emailService.sendEmail(
      to,
      '[FinTrack] Email System Test / ทดสอบระบบอีเมล',
      `สวัสดีครับ! นี่คืออีเมลทดสอบระบบจาก FinTrack บน Render\nส่งเมื่อ: ${new Date().toLocaleString('th-TH')}`
    );

    res.json({
      message: 'Email test executed',
      sentTo: to,
      result
    });
  } catch (error) {
    console.error('Error in test-email endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
