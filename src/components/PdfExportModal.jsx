import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import { 
  FileText, 
  Printer, 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart, 
  BarChart3, 
  Calendar,
  Loader2
} from 'lucide-react';
import Logo from './Logo';
import { generatePdfReport, buildVerificationUrl } from '../utils/generatePdfReport';
import { generateSignatureImage } from '../utils/signatureGenerator';
import { notifyUser } from '../utils/notifications';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/pdfExportModal.css';

// Month lookup arrays
const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PdfExportModal = ({
  isOpen,
  onClose,
  transactions = [],
  filterMonth = 'all',
  filterDate = '',
  filterCategory = 'all',
  initialLang = 'th',
  user = {}
}) => {
  const { isDarkMode } = useTheme();
  const [lang, setLang] = useState(initialLang);

  // Responsive initial fit zoom based on device screen
  const getFitZoom = () => {
    if (typeof window === 'undefined') return 1.0;
    const padding = window.innerWidth < 640 ? 20 : window.innerWidth < 1024 ? 36 : 48;
    const availableWidth = window.innerWidth - padding;
    const a4PixelWidth = 794; // approx 210mm at 96dpi
    const calculated = availableWidth / a4PixelWidth;
    return Math.min(1.05, Math.max(0.35, Math.round(calculated * 100) / 100));
  };

  const [zoom, setZoom] = useState(() => getFitZoom());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setZoom(getFitZoom());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculations
  const {
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate,
    incomeCount,
    expenseCount,
    expenseCategories,
    weeklyCadence,
    periodScopeText,
    dateRangeText,
    docNo,
    issueDateFormatted,
    filename
  } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let incCnt = 0;
    let expCnt = 0;
    const catMap = {};

    transactions.forEach((t) => {
      const isInc = t.category?.type === 'income';
      const amount = Number(t.amount) || 0;
      if (isInc) {
        inc += amount;
        incCnt++;
      } else {
        exp += amount;
        expCnt++;
        const catName = t.category?.name || t.subtitle || (lang === 'th' ? 'ทั่วไป' : 'General');
        catMap[catName] = (catMap[catName] || 0) + amount;
      }
    });

    const net = inc - exp;
    const sRate = inc > 0 ? ((net / inc) * 100).toFixed(1) : 0;

    // Categories
    const catList = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: exp > 0 ? Math.round((amount / exp) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    // Weekly Cadence
    const cadence = [
      { label: lang === 'th' ? 'สัปดาห์ที่ 1 (01-07)' : 'Week 1 (01-07)', inc: 0, exp: 0 },
      { label: lang === 'th' ? 'สัปดาห์ที่ 2 (08-14)' : 'Week 2 (08-14)', inc: 0, exp: 0 },
      { label: lang === 'th' ? 'สัปดาห์ที่ 3 (15-21)' : 'Week 3 (15-21)', inc: 0, exp: 0 },
      { label: lang === 'th' ? 'สัปดาห์ที่ 4 (22-สิ้นเดือน)' : 'Week 4 (22-End)', inc: 0, exp: 0 }
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

      if (isInc) cadence[idx].inc += amount;
      else cadence[idx].exp += amount;
    });

    // Period Scope
    let pScope = lang === 'th' ? 'ภาพรวมประวัติทั้งหมด' : 'All Time History';
    let dRange = '-';

    if (filterDate) {
      pScope = lang === 'th' ? `รายวัน (ประจำวันที่ ${filterDate})` : `Daily (${filterDate})`;
      dRange = filterDate;
    } else if (filterMonth !== 'all') {
      const mIdx = parseInt(filterMonth, 10);
      const mName = lang === 'th' ? thMonths[mIdx] : enMonths[mIdx];
      const nowYear = new Date().getFullYear();
      const lastDay = new Date(nowYear, mIdx + 1, 0).getDate();
      pScope = lang === 'th' ? `รายเดือน (ประจำเดือน${mName})` : `Monthly (${mName})`;
      dRange = `01/${String(mIdx + 1).padStart(2, '0')}/${nowYear} - ${lastDay}/${String(mIdx + 1).padStart(2, '0')}/${nowYear}`;
    } else if (transactions.length > 0) {
      const dates = transactions.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b);
      const minD = new Date(dates[0]).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US');
      const maxD = new Date(dates[dates.length - 1]).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US');
      dRange = `${minD} - ${maxD}`;
    }

    if (filterCategory !== 'all') {
      pScope += ` • ${lang === 'th' ? 'หมวดหมู่' : 'Category'}: ${filterCategory}`;
    }

    // Metadata
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const userSuffix = user?.id ? String(user.id).slice(-3).padStart(3, '0') : '042';
    const dNo = `FT-REP-${yearMonth}-${userSuffix}`;

    const dateFormatted = lang === 'th'
      ? `${now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} (${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`
      : `${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} (${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})`;

    let fnSuffix = 'all';
    if (filterDate) {
      fnSuffix = filterDate;
    } else if (filterMonth !== 'all') {
      fnSuffix = enMonths[parseInt(filterMonth, 10)].toLowerCase();
    }
    const fName = `FinTrack_Financial_Report_${fnSuffix}.pdf`;

    return {
      totalIncome: inc,
      totalExpense: exp,
      netBalance: net,
      savingsRate: sRate,
      incomeCount: incCnt,
      expenseCount: expCnt,
      expenseCategories: catList,
      weeklyCadence: cadence,
      periodScopeText: pScope,
      dateRangeText: dRange,
      docNo: dNo,
      issueDateFormatted: dateFormatted,
      filename: fName
    };
  }, [transactions, filterMonth, filterDate, filterCategory, lang, user]);

  const userName = user?.name || user?.email || (lang === 'th' ? 'ผู้ใช้งาน FinTrack' : 'FinTrack User');
  const customAppName = user?.customAppName || 'FinTrack';
  const isPro = !!user?.isPro;
  const verificationUrl = useMemo(
    () => buildVerificationUrl({ docNo, filterMonth, filterDate, filterCategory }),
    [docNo, filterMonth, filterDate, filterCategory]
  );
  const signatureDataUrl = useMemo(() => generateSignatureImage(userName), [userName]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(1.4, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.35, Math.round((prev - 0.1) * 10) / 10));
  const handleZoomReset = () => setZoom(getFitZoom());

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  const categoryColors = ['#2563eb', '#0891b2', '#10b981', '#8b5cf6'];
  const avgExpense = Math.round(totalExpense / 4);

  if (!isOpen) return null;

  // Download PDF handler
  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);

      const generatedName = await generatePdfReport({
        transactions,
        filterMonth,
        filterDate,
        filterCategory,
        language: lang,
        user,
        signatureDataUrl
      });

      if (user) {
        notifyUser(user, `คุณได้ส่งออกรายงาน PDF เรียบร้อยแล้ว (${generatedName})`, 'summary');
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return createPortal(
    <div className={`pdf-modal-overlay ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {/* Top Action Toolbar */}
      <div className="pdf-modal-toolbar">
        {/* Left: Document Info */}
        <div className="pdf-toolbar-left">
          <div className="pdf-toolbar-file-info">
            <span className="pdf-file-icon">
              <FileText size={20} />
            </span>
            <span className="pdf-file-name" title={filename}>
              {filename}
            </span>
            <span className="pdf-file-badge">~120 KB</span>
          </div>
        </div>

        {/* Center: Page & Zoom Controls & Language */}
        <div className="pdf-toolbar-center">
          <div className="pdf-page-indicator">
            <span>1 / 1</span>
          </div>

          <div className="pdf-zoom-controls">
            <button
              className="pdf-tool-btn"
              onClick={handleZoomOut}
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="pdf-zoom-val">{Math.round(zoom * 100)}%</span>
            <button
              className="pdf-tool-btn"
              onClick={handleZoomIn}
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn size={15} />
            </button>
            <button
              className="pdf-tool-btn"
              onClick={handleZoomReset}
              title="Fit Screen"
              aria-label="Fit to 100%"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Live Document Language Switcher */}
          <div className="pdf-lang-switch">
            <button
              className={`pdf-lang-btn ${lang === 'th' ? 'active' : ''}`}
              onClick={() => setLang('th')}
            >
              ไทย
            </button>
            <button
              className={`pdf-lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </div>

        {/* Right: Print, Download, Close */}
        <div className="pdf-toolbar-right">
          <button
            className="pdf-action-btn-print"
            onClick={handlePrint}
            title={lang === 'th' ? 'พิมพ์เอกสาร' : 'Print Document'}
          >
            <Printer size={16} />
            <span>{lang === 'th' ? 'พิมพ์' : 'Print'}</span>
          </button>

          <button
            className="pdf-action-btn-download"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            title={lang === 'th' ? 'ดาวน์โหลดไฟล์ PDF' : 'Download PDF'}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{lang === 'th' ? 'ดาวน์โหลด PDF' : 'Download PDF'}</span>
          </button>

          <button
            className="pdf-close-btn"
            onClick={onClose}
            title={lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            aria-label="Close Preview"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Canvas Area: A4 Document Preview */}
      <div className="pdf-modal-canvas">
        <div
          className="pdf-canvas-inner"
          style={{
            width: `${Math.round(794 * zoom)}px`,
            minHeight: `${Math.round(1123 * zoom)}px`
          }}
        >
          <div
            className="pdf-paper-document"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left'
            }}
          >
            {/* 1. Header */}
            <div className="pdf-doc-header">
              <div>
                <div className="pdf-doc-brand">
                  <Logo size={36} />
                  <div className="pdf-doc-brand-title">
                    <h1 className="pdf-doc-appname">{customAppName}</h1>
                    <span className={`pdf-doc-tier-badge ${isPro ? 'pro' : 'standard'}`}>
                      {isPro ? 'PRO ACCOUNT' : 'STANDARD'}
                    </span>
                  </div>
                </div>
                <div className="pdf-doc-heading">
                  <h2 className="pdf-doc-title">
                    {lang === 'th'
                      ? 'รายงานสรุปรายรับ - รายจ่ายและยอดคงเหลือ'
                      : 'Comprehensive Financial & Expense Statement'}
                  </h2>
                  <p className="pdf-doc-subtitle">
                    {lang === 'th'
                      ? 'FinTrack Financial & Expense Statement'
                      : 'Official Statement generated by FinTrack Cloud'}
                  </p>
                </div>
              </div>

              {/* Meta Box (Right) */}
              <div className="pdf-doc-meta-card">
                <div className="pdf-meta-row">
                  <span className="pdf-meta-label">
                    {lang === 'th' ? 'เลขที่เอกสาร:' : 'Doc No:'}
                  </span>
                  <span className="pdf-meta-value">{docNo}</span>
                </div>
                <div className="pdf-meta-row">
                  <span className="pdf-meta-label">
                    {lang === 'th' ? 'วันที่ออกเอกสาร:' : 'Issue Date:'}
                  </span>
                  <span className="pdf-meta-value">{issueDateFormatted}</span>
                </div>
                <div className="pdf-meta-row">
                  <span className="pdf-meta-label">
                    {lang === 'th' ? 'ผู้ออกรายงาน:' : 'Issued By:'}
                  </span>
                  <span className="pdf-meta-value">{userName}</span>
                </div>
              </div>
            </div>

            {/* 2. Scope Bar */}
            <div className="pdf-scope-bar">
              <div className="pdf-scope-item">
                <Calendar size={13} color="#003366" />
                <span>
                  <span className="pdf-scope-label">
                    {lang === 'th' ? 'ขอบเขตข้อมูลที่กรอง: ' : 'Scope: '}
                  </span>
                  {periodScopeText}
                </span>
              </div>
              <div className="pdf-scope-item">
                <span>
                  <span className="pdf-scope-label">
                    {lang === 'th' ? 'ระยะเวลา: ' : 'Period: '}
                  </span>
                  {dateRangeText}
                </span>
              </div>
              <div className="pdf-scope-item">
                <span>
                  <span className="pdf-scope-label">
                    {lang === 'th' ? 'สกุลเงิน: ' : 'Currency: '}
                  </span>
                  THB (฿)
                </span>
              </div>
            </div>

            {/* 3. 3 KPI Summary Cards */}
            <div className="pdf-kpi-grid">
              {/* Card 1: Total Income */}
              <div className="pdf-kpi-card pdf-kpi-income">
                <div className="pdf-kpi-header">
                  <span className="pdf-kpi-title">
                    {lang === 'th' ? 'รายรับทั้งหมด (Total Income)' : 'Total Income'}
                  </span>
                  <span className="pdf-kpi-icon-badge">
                    <TrendingUp size={13} />
                  </span>
                </div>
                <div className="pdf-kpi-amount">+฿{totalIncome.toLocaleString()}</div>
                <div className="pdf-kpi-footer">
                  <span>
                    {lang === 'th' ? `รวม ${incomeCount} รายการธุรกรรม` : `Total ${incomeCount} entries`}
                  </span>
                </div>
              </div>

              {/* Card 2: Total Expenses */}
              <div className="pdf-kpi-card pdf-kpi-expense">
                <div className="pdf-kpi-header">
                  <span className="pdf-kpi-title">
                    {lang === 'th' ? 'รายจ่ายทั้งหมด (Total Expenses)' : 'Total Expenses'}
                  </span>
                  <span className="pdf-kpi-icon-badge">
                    <TrendingDown size={13} />
                  </span>
                </div>
                <div className="pdf-kpi-amount">-฿{totalExpense.toLocaleString()}</div>
                <div className="pdf-kpi-footer">
                  <span>
                    {lang === 'th' ? `รวม ${expenseCount} รายการธุรกรรม` : `Total ${expenseCount} entries`}
                  </span>
                </div>
              </div>

              {/* Card 3: Net Savings Balance */}
              <div className="pdf-kpi-card pdf-kpi-net">
                <div className="pdf-kpi-header">
                  <span className="pdf-kpi-title">
                    {lang === 'th' ? 'ยอดคงเหลือสุทธิ (Net Savings)' : 'Net Savings / Margin'}
                  </span>
                  <span className="pdf-kpi-icon-badge">
                    <Wallet size={13} />
                  </span>
                </div>
                <div className="pdf-kpi-amount">
                  {netBalance >= 0 ? '+' : '-'}฿{Math.abs(netBalance).toLocaleString()}
                </div>
                <div className="pdf-kpi-footer">
                  <span>
                    {lang === 'th' ? `อัตราการออมสุทธิ ${savingsRate}%` : `Savings Rate ${savingsRate}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Dual Analytics Panels */}
            <div className="pdf-analytics-grid">
              {/* Left: Expense Breakdown */}
              <div className="pdf-panel">
                <div className="pdf-panel-head">
                  <PieChart size={13} color="#2563eb" />
                  <span className="pdf-panel-title">
                    {lang === 'th' ? 'สัดส่วนหมวดหมู่ค่าใช้จ่าย (EXPENSE BREAKDOWN)' : 'EXPENSE BREAKDOWN'}
                  </span>
                </div>
                <div className="pdf-panel-subtitle">
                  {lang === 'th'
                    ? 'สัดส่วนการใช้จ่ายแยกตามหมวดหมู่หลัก'
                    : 'Expense proportion grouped by category'}
                </div>

                <div className="pdf-breakdown-list">
                  {expenseCategories.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', padding: '12px 0' }}>
                      {lang === 'th' ? 'ไม่มีรายการรายจ่ายในช่วงเวลานี้' : 'No expenses recorded in this period'}
                    </div>
                  ) : (
                    expenseCategories.map((cat, idx) => {
                      const color = categoryColors[idx % categoryColors.length];
                      return (
                        <div key={cat.name} className="pdf-breakdown-row">
                          <div className="pdf-breakdown-info">
                            <div className="pdf-cat-name-tag">
                              <span
                                className="pdf-cat-dot"
                                style={{ backgroundColor: color }}
                              />
                              <span>{cat.name}</span>
                            </div>
                            <div>
                              <span className="pdf-cat-amount">฿{cat.amount.toLocaleString()}</span>
                              <span className="pdf-cat-pct"> ({cat.pct}%)</span>
                            </div>
                          </div>
                          <div className="pdf-cat-progress-bg">
                            <div
                              className="pdf-cat-progress-fill"
                              style={{ width: `${cat.pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Weekly Cadence */}
              <div className="pdf-panel">
                <div className="pdf-panel-head">
                  <BarChart3 size={13} color="#0891b2" />
                  <span className="pdf-panel-title">
                    {lang === 'th' ? 'สรุปรายสัปดาห์ (WEEKLY CADENCE)' : 'WEEKLY CADENCE'}
                  </span>
                </div>
                <div className="pdf-panel-subtitle">
                  {lang === 'th'
                    ? 'เปรียบเทียบกระแสเงินสดตามสัปดาห์ในเดือน'
                    : 'Cash flow progression by week'}
                </div>

                <div className="pdf-cadence-list">
                  {weeklyCadence.map((w) => (
                    <div key={w.label} className="pdf-cadence-row">
                      <span className="pdf-cadence-week">{w.label}</span>
                      <div className="pdf-cadence-values">
                        <span className="pdf-cadence-inc">+฿{w.inc.toLocaleString()}</span>
                        <span className="pdf-cadence-exp">-฿{w.exp.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pdf-cadence-summary">
                  {lang === 'th'
                    ? `อัตราการใช้จ่ายเฉลี่ย: ฿${avgExpense.toLocaleString()} / สัปดาห์`
                    : `Weekly Average Spend: ฿${avgExpense.toLocaleString()} / week`}
                </div>
              </div>
            </div>

            {/* 5. Itemized Transactions Table */}
            <div className="pdf-table-section">
              <div className="pdf-table-header-desc">
                <span className="pdf-table-title">
                  {lang === 'th' ? 'รายการธุรกรรมและรายละเอียดตามช่วงเวลา' : 'Itemized Transactions'}
                </span>
                <span className="pdf-table-count">
                  {lang === 'th'
                    ? `แสดง ${transactions.length} รายการของงวดนี้`
                    : `Showing ${transactions.length} transactions in this period`}
                </span>
              </div>

              <table className="pdf-doc-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>{lang === 'th' ? 'วันที่ (Date)' : 'Date'}</th>
                    <th style={{ width: '14%' }}>{lang === 'th' ? 'ประเภท' : 'Type'}</th>
                    <th style={{ width: '38%' }}>{lang === 'th' ? 'รายละเอียด (Description)' : 'Description'}</th>
                    <th style={{ width: '16%' }}>{lang === 'th' ? 'หมวดหมู่ (Category)' : 'Category'}</th>
                    <th style={{ width: '14%', textAlign: 'right' }}>{lang === 'th' ? 'จำนวนเงิน (Amount)' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 15).map((tItem, index) => {
                    const isInc = tItem.category?.type === 'income';
                    const d = new Date(tItem.date);
                    const dateStr = lang === 'th'
                      ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                      : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

                    return (
                      <tr key={tItem.id || index}>
                        <td>{dateStr}</td>
                        <td>
                          <span className={`pdf-pill-badge ${isInc ? 'income' : 'expense'}`}>
                            {isInc ? (lang === 'th' ? 'รายรับ' : 'Income') : (lang === 'th' ? 'รายจ่าย' : 'Expense')}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{tItem.title || '-'}</div>
                          {tItem.subtitle && (
                            <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{tItem.subtitle}</div>
                          )}
                        </td>
                        <td>
                          <span className="pdf-category-tag">
                            {tItem.category?.name || tItem.subtitle || (lang === 'th' ? 'ทั่วไป' : 'General')}
                          </span>
                        </td>
                        <td className={`pdf-table-amount ${isInc ? 'income' : 'expense'}`}>
                          {isInc ? '+' : '-'}฿{Number(tItem.amount).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="pdf-table-footer-row">
                    <td colSpan={4} style={{ textAlign: 'right' }}>
                      {lang === 'th' ? 'สรุปยอดรวมประจำงวด (Net Period Total):' : 'Net Period Total:'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: netBalance >= 0 ? '#16a34a' : '#dc2626'
                      }}
                    >
                      {netBalance >= 0 ? '+' : '-'}฿{Math.abs(netBalance).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
              {transactions.length > 15 && (
                <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'right', marginTop: '4px' }}>
                  {lang === 'th' ? `* ในเอกสาร PDF ตัวเต็มจะมีครบทั้ง ${transactions.length} รายการ` : `* Full downloaded PDF includes all ${transactions.length} records`}
                </div>
              )}
            </div>

            {/* 6. Sign-off & Digital Verification */}
            <div className="pdf-bottom-section">
              {/* Authorized Signer */}
              <div className="pdf-sign-box">
                {signatureDataUrl ? (
                  <img
                    src={signatureDataUrl}
                    alt="Signature"
                    style={{ height: '34px', objectFit: 'contain', marginBottom: '-4px' }}
                  />
                ) : (
                  <span className="pdf-sign-script">{userName}</span>
                )}
                <div className="pdf-sign-line" />
                <span className="pdf-sign-name">{userName}</span>
                <span className="pdf-sign-role">
                  {lang === 'th' ? 'ผู้จัดทำรายงาน / เจ้าของบัญชี' : 'Account Owner & Reporter'}
                </span>
              </div>

              {/* Digital Verification */}
              <div className="pdf-verify-box">
                <div className="pdf-verify-qr">
                  <QRCode
                    value={verificationUrl}
                    size={52}
                    level="M"
                  />
                </div>
                <div className="pdf-verify-text">
                  <div className="pdf-verify-title">Digital Verification</div>
                  <div>
                    {lang === 'th'
                      ? 'สแกนเพื่อตรวจสอบความถูกต้องของเอกสารระบบ FinTrack'
                      : 'Scan to verify authenticity on FinTrack Cloud System'}
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Document Footer Note */}
            <div className="pdf-doc-page-footer">
              <span>{customAppName} Financial Services • Confidential & Proprietary</span>
              <span>
                {lang === 'th' ? 'หน้าที่ 1 จาก 1' : 'Page 1 of 1'} • Generated by FinTrack Cloud System
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PdfExportModal;
