import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SarabunFont } from '../assets/fonts/Sarabun';

/**
 * Generate redesigned FinTrack financial PDF statement
 * Matching Stitch Screen ea98adc06bd94f0fb03468d24837f7a8
 */
export const generatePdfReport = async ({
  transactions = [],
  filterMonth = 'all',
  filterDate = '',
  filterCategory = 'all',
  language = 'th',
  user = {},
  qrDataUrl = null
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Register Thai Sarabun Font
  doc.addFileToVFS('Sarabun-Regular.ttf', SarabunFont);
  doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
  doc.setFont('Sarabun');

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // 1. Calculate Financial Summaries
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  const categoryMap = {};

  transactions.forEach((t) => {
    const isInc = t.category?.type === 'income';
    const amount = Number(t.amount) || 0;
    if (isInc) {
      totalIncome += amount;
      incomeCount++;
    } else {
      totalExpense += amount;
      expenseCount++;
      const catName = t.category?.name || t.subtitle || (language === 'th' ? 'ทั่วไป' : 'General');
      categoryMap[catName] = (categoryMap[catName] || 0) + amount;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0;

  // Expense breakdown sorted descending
  const expenseCategories = Object.entries(categoryMap)
    .map(([name, amount]) => ({
      name,
      amount,
      pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Weekly cadence calculation
  const weeklyCadence = [
    { label: language === 'th' ? 'สัปดาห์ที่ 1 (01-07)' : 'Week 1 (01-07)', inc: 0, exp: 0 },
    { label: language === 'th' ? 'สัปดาห์ที่ 2 (08-14)' : 'Week 2 (08-14)', inc: 0, exp: 0 },
    { label: language === 'th' ? 'สัปดาห์ที่ 3 (15-21)' : 'Week 3 (15-21)', inc: 0, exp: 0 },
    { label: language === 'th' ? 'สัปดาห์ที่ 4 (22-สิ้นเดือน)' : 'Week 4 (22-End)', inc: 0, exp: 0 }
  ];

  let idx;
  transactions.forEach((t) => {
    const d = new Date(t.date).getDate();
    const isInc = t.category?.type === 'income';
    const amount = Number(t.amount) || 0;
    if (d <= 7) idx = 0;
    else if (d <= 14) idx = 1;
    else if (d <= 21) idx = 2;
    else idx = 3;

    if (isInc) weeklyCadence[idx].inc += amount;
    else weeklyCadence[idx].exp += amount;
  });

  // Period text resolution
  const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let periodScopeText = language === 'th' ? 'ทั้งหมด (All Time)' : 'All Time History';
  let dateRangeText = '-';

  if (filterDate) {
    periodScopeText = language === 'th' ? `รายวัน (ประจำวันที่ ${filterDate})` : `Daily (${filterDate})`;
    dateRangeText = filterDate;
  } else if (filterMonth !== 'all') {
    const mIdx = parseInt(filterMonth, 10);
    const mName = language === 'th' ? thMonths[mIdx] : enMonths[mIdx];
    periodScopeText = language === 'th' ? `รายเดือน (ประจำเดือน${mName})` : `Monthly (${mName})`;
    const nowYear = new Date().getFullYear();
    const lastDay = new Date(nowYear, mIdx + 1, 0).getDate();
    dateRangeText = `01/${String(mIdx + 1).padStart(2, '0')}/${nowYear} - ${lastDay}/${String(mIdx + 1).padStart(2, '0')}/${nowYear}`;
  } else if (transactions.length > 0) {
    const dates = transactions.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b);
    const minD = new Date(dates[0]).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US');
    const maxD = new Date(dates[dates.length - 1]).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US');
    dateRangeText = `${minD} - ${maxD}`;
  }

  if (filterCategory !== 'all') {
    periodScopeText += ` • ${language === 'th' ? 'หมวดหมู่' : 'Category'}: ${filterCategory}`;
  }

  // Document metadata
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const userSuffix = user?.id ? String(user.id).slice(-3).padStart(3, '0') : '042';
  const docNo = `FT-REP-${yearMonth}-${userSuffix}`;
  const issueDateFormatted = language === 'th'
    ? `${now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} (${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`
    : `${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} (${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})`;
  const userName = user?.name || user?.email || (language === 'th' ? 'ผู้ใช้งาน FinTrack' : 'FinTrack User');
  const customAppName = user?.customAppName || 'FinTrack';
  const isPro = !!user?.isPro;

  // Draw Logo Vector
  const drawFintrackLogo = (x, y, size) => {
    doc.setFillColor(0, 51, 102); // #003366 navy
    doc.roundedRect(x, y, size, size, 2, 2, 'F');
    // 'F' mark
    doc.setFillColor(255, 255, 255);
    doc.rect(x + size * 0.28, y + size * 0.22, size * 0.12, size * 0.55, 'F'); // stem
    doc.rect(x + size * 0.38, y + size * 0.22, size * 0.34, size * 0.12, 'F'); // top bar
    doc.rect(x + size * 0.38, y + size * 0.42, size * 0.22, size * 0.12, 'F'); // mid bar
    // Upward arrow
    doc.setDrawColor(16, 185, 129); // #10b981
    doc.setLineWidth(size * 0.08);
    doc.line(x + size * 0.52, y + size * 0.72, x + size * 0.82, y + size * 0.38);
    doc.line(x + size * 0.82, y + size * 0.38, x + size * 0.62, y + size * 0.38);
    doc.line(x + size * 0.82, y + size * 0.38, x + size * 0.82, y + size * 0.58);
  };

  // --- HEADER SECTION ---
  const headerY = 14;
  drawFintrackLogo(marginX, headerY, 11);

  // Brand Name & Tier Badge
  doc.setFont('Sarabun');
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102);
  doc.text(customAppName, marginX + 14, headerY + 7);

  const brandWidth = doc.getTextWidth(customAppName);
  const badgeX = marginX + 14 + brandWidth + 3;
  const badgeText = isPro ? 'PRO ACCOUNT' : 'STANDARD';
  doc.setFontSize(7);
  doc.setFillColor(0, 51, 102);
  doc.roundedRect(badgeX, headerY + 1.5, doc.getTextWidth(badgeText) + 6, 6, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, badgeX + 3, headerY + 5.5);

  // Document Title
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  const docTitle = language === 'th' ? 'รายงานสรุปรายรับ - รายจ่ายและยอดคงเหลือ' : 'Comprehensive Financial & Expense Statement';
  doc.text(docTitle, marginX, headerY + 16);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  const docSub = language === 'th' ? 'FinTrack Financial & Expense Statement' : 'Official Statement generated by FinTrack Cloud';
  doc.text(docSub, marginX, headerY + 20);

  // Meta Box (Top Right)
  const metaBoxW = 66;
  const metaBoxH = 19;
  const metaBoxX = pageWidth - marginX - metaBoxW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(metaBoxX, headerY, metaBoxW, metaBoxH, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(language === 'th' ? 'เลขที่เอกสาร:' : 'Doc No:', metaBoxX + 3, headerY + 5);
  doc.text(language === 'th' ? 'วันที่ออกเอกสาร:' : 'Issue Date:', metaBoxX + 3, headerY + 10);
  doc.text(language === 'th' ? 'ผู้ออกรายงาน:' : 'Issued By:', metaBoxX + 3, headerY + 15);

  doc.setTextColor(15, 23, 42);
  doc.text(docNo, metaBoxX + metaBoxW - 3, headerY + 5, { align: 'right' });
  doc.text(issueDateFormatted, metaBoxX + metaBoxW - 3, headerY + 10, { align: 'right' });
  doc.text(userName.slice(0, 22), metaBoxX + metaBoxW - 3, headerY + 15, { align: 'right' });

  // Divider Line
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.6);
  doc.line(marginX, headerY + 23, pageWidth - marginX, headerY + 23);

  // --- SCOPE BAR ---
  const scopeY = headerY + 26;
  const scopeH = 8;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, scopeY, contentWidth, scopeH, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${language === 'th' ? 'ขอบเขตข้อมูล:' : 'Scope:'} ${periodScopeText}`, marginX + 4, scopeY + 5.2);
  doc.text(`${language === 'th' ? 'ระยะเวลา:' : 'Period:'} ${dateRangeText}`, marginX + 85, scopeY + 5.2);
  doc.text(`${language === 'th' ? 'สกุลเงิน: THB (฿)' : 'Currency: THB (฿)'}`, marginX + contentWidth - 4, scopeY + 5.2, { align: 'right' });

  // --- 3 KPI SUMMARY CARDS ---
  const kpiY = scopeY + 12;
  const kpiW = (contentWidth - 8) / 3; // ~58mm each
  const kpiH = 22;

  // Card 1: Total Income
  doc.setFillColor(240, 253, 244); // light green
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(marginX, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(language === 'th' ? 'รายรับทั้งหมด (Total Income)' : 'Total Income', marginX + 4, kpiY + 5);
  doc.setFontSize(12);
  doc.setTextColor(22, 163, 74); // green-600
  doc.text(`+฿${totalIncome.toLocaleString()}`, marginX + 4, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${language === 'th' ? 'รวม' : 'Total'} ${incomeCount} ${language === 'th' ? 'รายการ' : 'entries'}`, marginX + 4, kpiY + 18.5);

  // Card 2: Total Expenses
  const expCardX = marginX + kpiW + 4;
  doc.setFillColor(254, 242, 242); // light red
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(expCardX, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(language === 'th' ? 'รายจ่ายทั้งหมด (Total Expenses)' : 'Total Expenses', expCardX + 4, kpiY + 5);
  doc.setFontSize(12);
  doc.setTextColor(220, 38, 38); // red-600
  doc.text(`-฿${totalExpense.toLocaleString()}`, expCardX + 4, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${language === 'th' ? 'รวม' : 'Total'} ${expenseCount} ${language === 'th' ? 'รายการ' : 'entries'}`, expCardX + 4, kpiY + 18.5);

  // Card 3: Net Savings Balance
  const netCardX = expCardX + kpiW + 4;
  doc.setFillColor(0, 51, 102); // #003366 Navy
  doc.setDrawColor(0, 34, 68);
  doc.roundedRect(netCardX, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(language === 'th' ? 'ยอดคงเหลือสุทธิ (Net Savings)' : 'Net Savings / Margin', netCardX + 4, kpiY + 5);
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`${netBalance >= 0 ? '+' : '-'}฿${Math.abs(netBalance).toLocaleString()}`, netCardX + 4, kpiY + 13);
  doc.setFontSize(6.5);
  doc.setTextColor(147, 197, 253); // blue-300
  doc.text(`${language === 'th' ? 'อัตราการออมสุทธิ' : 'Savings Rate'} ${savingsRate}%`, netCardX + 4, kpiY + 18.5);

  // --- DUAL ANALYTICS PANELS ---
  const panelY = kpiY + kpiH + 4;
  const panelW = (contentWidth - 4) / 2; // 89mm
  const panelH = 34;

  // Left: Expense Breakdown
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, panelY, panelW, panelH, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(language === 'th' ? 'สัดส่วนหมวดหมู่ค่าใช้จ่าย (EXPENSE BREAKDOWN)' : 'EXPENSE BREAKDOWN', marginX + 4, panelY + 5.5);

  const colors = [
    [37, 99, 235], // Blue
    [8, 145, 178], // Cyan
    [16, 185, 129], // Emerald
    [139, 92, 246] // Purple
  ];

  let catRowY = panelY + 9.5;
  if (expenseCategories.length === 0) {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(language === 'th' ? 'ไม่มีรายการรายจ่ายในช่วงเวลานี้' : 'No expenses recorded in this period', marginX + 4, catRowY + 5);
  } else {
    expenseCategories.forEach((cat, idx) => {
      const c = colors[idx % colors.length];
      // Dot
      doc.setFillColor(c[0], c[1], c[2]);
      doc.circle(marginX + 5.5, catRowY + 1.2, 1.2, 'F');
      // Name
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text(cat.name.slice(0, 18), marginX + 8.5, catRowY + 2.2);
      // Amount & Pct
      const amtStr = `฿${cat.amount.toLocaleString()} (${cat.pct}%)`;
      doc.text(amtStr, marginX + panelW - 4, catRowY + 2.2, { align: 'right' });
      // Progress Bar
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX + 8.5, catRowY + 3.2, panelW - 13, 1.5, 'F');
      doc.setFillColor(c[0], c[1], c[2]);
      const barFillW = Math.max(1, ((panelW - 13) * cat.pct) / 100);
      doc.rect(marginX + 8.5, catRowY + 3.2, barFillW, 1.5, 'F');

      catRowY += 5.6;
    });
  }

  // Right: Weekly Cadence
  const rightPanelX = marginX + panelW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightPanelX, panelY, panelW, panelH, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(language === 'th' ? 'สรุปรายสัปดาห์ (WEEKLY CADENCE)' : 'WEEKLY CADENCE', rightPanelX + 4, panelY + 5.5);

  let cadenceY = panelY + 10;
  weeklyCadence.forEach((w) => {
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(w.label, rightPanelX + 4, cadenceY);

    doc.setTextColor(22, 163, 74);
    const incStr = `+฿${w.inc.toLocaleString()}`;
    doc.text(incStr, rightPanelX + panelW - 25, cadenceY, { align: 'right' });

    doc.setTextColor(220, 38, 38);
    const expStr = `-฿${w.exp.toLocaleString()}`;
    doc.text(expStr, rightPanelX + panelW - 4, cadenceY, { align: 'right' });

    cadenceY += 4.5;
  });

  // Weekly Average Box at bottom of cadence
  const avgExpense = Math.round(totalExpense / 4);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightPanelX + 3, panelY + panelH - 6.5, panelW - 6, 5, 1, 1, 'FD');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  const burnRateText = language === 'th'
    ? `อัตราการใช้จ่ายเฉลี่ย: ฿${avgExpense.toLocaleString()} / สัปดาห์`
    : `Weekly Average Spend: ฿${avgExpense.toLocaleString()} / week`;
  doc.text(burnRateText, rightPanelX + panelW / 2, panelY + panelH - 3.2, { align: 'center' });

  // --- ITEMIZED TRANSACTIONS TABLE ---
  const tableStartY = panelY + panelH + 5;

  const tableHeaders = language === 'th'
    ? ['วันที่', 'ประเภท', 'รายละเอียด', 'หมวดหมู่', 'จำนวนเงิน']
    : ['Date', 'Type', 'Description', 'Category', 'Amount'];

  const tableRows = transactions.map((t) => {
    const isInc = t.category?.type === 'income';
    const dObj = new Date(t.date);
    const dateFormatted = language === 'th'
      ? dObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
      : dObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    const typeBadge = isInc ? (language === 'th' ? 'รายรับ' : 'Income') : (language === 'th' ? 'รายจ่าย' : 'Expense');
    const title = t.title || '-';
    const category = t.category?.name || t.subtitle || (language === 'th' ? 'ทั่วไป' : 'General');
    const amountStr = `${isInc ? '+' : '-'}฿${Number(t.amount).toLocaleString()}`;

    return [dateFormatted, typeBadge, title, category, amountStr];
  });

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: tableStartY,
    margin: { left: marginX, right: marginX, bottom: 35 },
    styles: {
      font: 'Sarabun',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [51, 65, 85]
    },
    headStyles: {
      font: 'Sarabun',
      fontSize: 8.5,
      fillColor: [0, 51, 102], // Brand Navy
      textColor: [255, 255, 255],
      fontStyle: 'normal'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 26 }, // Date
      1: { cellWidth: 20 }, // Type
      2: { cellWidth: 'auto' }, // Title
      3: { cellWidth: 32 }, // Category
      4: { cellWidth: 28, halign: 'right' } // Amount
    },
    didParseCell: function (data) {
      if (data.section === 'body') {
        // Style Type column
        if (data.column.index === 1) {
          const val = data.cell.raw;
          if (val === 'รายรับ' || val === 'Income') {
            data.cell.styles.textColor = [22, 163, 74];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
        // Style Amount column
        if (data.column.index === 4) {
          const val = data.cell.raw;
          if (val && val.startsWith('+')) {
            data.cell.styles.textColor = [22, 163, 74];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      }
    },
    foot: [
      [
        {
          content: `${language === 'th' ? 'สรุปยอดรวมประจำงวด (Net Period Total):' : 'Net Period Total:'} ${netBalance >= 0 ? '+' : '-'}฿${Math.abs(netBalance).toLocaleString()}`,
          colSpan: 5,
          styles: {
            halign: 'right',
            font: 'Sarabun',
            fontSize: 8.5,
            textColor: netBalance >= 0 ? [22, 163, 74] : [220, 38, 38],
            fillColor: [241, 245, 249]
          }
        }
      ]
    ],
    didDrawPage: function (data) {
      // Draw Page Footers
      doc.setFont('Sarabun');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);

      const footerLeft = `${customAppName} Financial Services • Confidential & Proprietary`;
      const footerRight = `${language === 'th' ? 'หน้าที่' : 'Page'} ${data.pageNumber} • Generated by FinTrack Cloud System`;

      doc.text(footerLeft, marginX, pageHeight - 10);
      doc.text(footerRight, pageWidth - marginX, pageHeight - 10, { align: 'right' });
    }
  });

  // --- SIGNATURES & VERIFICATION SECTION ---
  let finalY = doc.lastAutoTable?.finalY || tableStartY + 40;

  // Check if enough space remains on page (need at least 32mm)
  if (finalY > pageHeight - 45) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 8;
  }

  // Draw Signature & Verification Container
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, finalY, pageWidth - marginX, finalY);

  const signAreaY = finalY + 4;

  // Left: Authorized Signer
  doc.setFont('Sarabun');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // Blue signature script tone
  doc.text(userName, marginX + 15, signAreaY + 8);

  doc.setDrawColor(148, 163, 184);
  doc.line(marginX + 5, signAreaY + 11, marginX + 65, signAreaY + 11);

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(userName, marginX + 35, signAreaY + 15, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(language === 'th' ? 'ผู้จัดทำรายงาน / เจ้าของบัญชี' : 'Account Owner & Reporter', marginX + 35, signAreaY + 19, { align: 'center' });

  // Right: Digital Verification Box
  const verifyW = 75;
  const verifyH = 20;
  const verifyX = pageWidth - marginX - verifyW;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(verifyX, signAreaY, verifyW, verifyH, 2, 2, 'FD');

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', verifyX + 3, signAreaY + 2.5, 15, 15);
    } catch (e) {
      console.error('Error drawing QR code to PDF:', e);
    }
  } else {
    // Mini mock QR box
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(verifyX + 3, signAreaY + 2.5, 15, 15, 1, 1, 'FD');
    doc.setFillColor(0, 51, 102);
    doc.rect(verifyX + 5, signAreaY + 4.5, 4, 4, 'F');
    doc.rect(verifyX + 12, signAreaY + 4.5, 4, 4, 'F');
    doc.rect(verifyX + 5, signAreaY + 11.5, 4, 4, 'F');
    doc.rect(verifyX + 11, signAreaY + 11.5, 5, 5, 'F');
  }

  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Digital Verification', verifyX + 21, signAreaY + 6);

  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  const verifyDesc = language === 'th'
    ? 'สแกนเพื่อตรวจสอบความถูกต้อง\nของเอกสารระบบ FinTrack'
    : 'Scan to verify authenticity on\nFinTrack Cloud System';
  doc.text(verifyDesc, verifyX + 21, signAreaY + 11);

  // Output filename
  let filenameSuffix = 'all';
  if (filterDate) {
    filenameSuffix = filterDate;
  } else if (filterMonth !== 'all') {
    filenameSuffix = enMonths[parseInt(filterMonth, 10)].toLowerCase();
  }

  const filename = `fintrack_report_${filenameSuffix}.pdf`;
  doc.save(filename);

  return filename;
};
