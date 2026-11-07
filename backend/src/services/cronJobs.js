const cron = require('node-cron');
const prisma = require('../db/prisma');
const emailService = require('./emailService');

const sendMonthlySummaryEmails = async () => {
  const today = new Date();
  console.log('Running monthly email summary job...');
  const users = await prisma.user.findMany();
  let count = 0;

  for (const user of users) {
    if (!user.email) continue;

    // If triggered early in the month (e.g. day 1-5), summarize the previous month
    // Otherwise summarize the current month
    let targetDate = new Date(today);
    if (today.getDate() <= 5) {
      targetDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    }
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    const monthName = targetDate.toLocaleString('th-TH', { month: 'long' });

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

นี่คือสรุปยอดค่าใช้จ่ายของคุณประจำเดือนนี้:
- รายรับทั้งหมด: ฿${totalIncome.toLocaleString()}
- รายจ่ายทั้งหมด: ฿${totalExpense.toLocaleString()}
- ยอดเงินคงเหลือ: ฿${balance.toLocaleString()}

${balance > 0 ? 'ยอดเยี่ยม! คุณมีเงินเหลือเก็บในเดือนนี้' : 'ระวัง! คุณใช้จ่ายเกินกว่ารายรับในเดือนนี้'}

ขอบคุณที่ใช้บริการ FinTrack
    `;

    await emailService.sendEmail(user.email, subject, text);
    count++;
  }

  console.log(`Monthly email summaries sent to ${count} users.`);
  return { success: true, count, month: today.getMonth() + 1 };
};

const initCronJobs = () => {
  // A cleaner approach: Run every day at 23:59 and check if it's the last day of the month
  // If the server happens to be alive, it will also trigger.
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
