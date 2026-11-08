const cron = require('node-cron');
const prisma = require('../db/prisma');
const emailService = require('./emailService');

const sendMonthlySummaryEmails = async () => {
  const today = new Date();
  console.log('Running monthly email summary job...');
  const users = await prisma.user.findMany();
  let successCount = 0;
  const details = [];

  // Determine target month:
  // If triggered early in the month (e.g. day 1-10), summarize previous month
  // Otherwise summarize current month
  let targetDate = new Date(today);
  if (today.getDate() <= 10) {
    targetDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  }
  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();
  const monthName = targetDate.toLocaleString('th-TH', { month: 'long' });

  for (const user of users) {
    if (!user.email) continue;

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: { category: true }
    });

    const thisMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const totalIncome = thisMonthTransactions
      .filter(t => t.category?.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = thisMonthTransactions
      .filter(t => t.category?.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const subject = `[FinTrack] สรุปยอดค่าใช้จ่ายประจำเดือน ${monthName}`;
    const text = `
เรียนคุณ ${user.name || user.email},

นี่คือสรุปยอดค่าใช้จ่ายของคุณประจำเดือน${monthName}:
- รายรับทั้งหมด: ฿${totalIncome.toLocaleString()}
- รายจ่ายทั้งหมด: ฿${totalExpense.toLocaleString()}
- ยอดเงินคงเหลือ: ฿${balance.toLocaleString()}

${balance > 0 ? 'ยอดเยี่ยม! คุณมีเงินเหลือเก็บในเดือนนี้' : 'ระวัง! คุณใช้จ่ายเกินกว่ารายรับในเดือนนี้'}

ขอบคุณที่ใช้บริการ FinTrack
    `;

    const sendResult = await emailService.sendEmail(user.email, subject, text);
    details.push({
      email: user.email,
      name: user.name,
      ...sendResult
    });

    if (sendResult.success) {
      successCount++;
    }
  }

  console.log(`Monthly email summary finished: ${successCount}/${users.length} sent successfully.`);
  return {
    success: successCount > 0,
    sentCount: successCount,
    totalUsers: users.length,
    month: monthName,
    details
  };
};

const initCronJobs = () => {
  // A cleaner approach: Run every day at 23:59 and check if it's the last day of the month
  cron.schedule('59 23 * * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (today.getMonth() !== tomorrow.getMonth()) {
      try {
        await sendMonthlySummaryEmails();
      } catch (error) {
        console.error('Error running monthly email cron job:', error);
      }
    }
  });

  console.log('Cron jobs initialized.');
};

module.exports = { initCronJobs, sendMonthlySummaryEmails };
