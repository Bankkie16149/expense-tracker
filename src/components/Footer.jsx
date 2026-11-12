import React from 'react';
import Logo from './Logo';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';
import { APP_VERSION } from '../utils/version';

const Footer = () => {
  const { language } = useLanguage();

  const handlePrivacyClick = (e) => {
    e.preventDefault();
    Swal.fire({
      title: 'ประกาศความเป็นส่วนตัว (Privacy Policy)',
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.6; color: var(--text-main);">
          <p><strong>Fintrack</strong> (ซึ่งต่อไปในประกาศนี้จะเรียกว่า “บริษัทฯ”) ตระหนักและให้ความสำคัญอย่างยิ่งยวดต่อสิทธิในความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคลของลูกค้า คู่ค้า พนักงาน ผู้เยี่ยมชมเว็บไซต์ และบุคคลใด ๆ ที่มีความสัมพันธ์กับบริษัทฯ (ซึ่งต่อไปจะเรียกว่า “ท่าน”)</p>
          <p>ข้อมูลส่วนบุคคลของท่านถือเป็นสิ่งมีค่าและต้องได้รับความคุ้มครองตามกฎหมายอย่างเคร่งครัด บริษัทฯ จึงได้จัดทำประกาศนโยบายความเป็นส่วนตัวฉบับนี้ขึ้น เพื่ออธิบายให้ท่านทราบถึงแนวทางปฏิบัติ วิธีการ ขอบเขต วัตถุประสงค์อันชอบด้วยกฎหมาย ตลอดจนรายละเอียดเชิงลึกเกี่ยวกับการเก็บรวบรวม การประมวลผล การใช้ การเปิดเผย และการรักษาความปลอดภัยข้อมูลส่วนบุคคลของท่าน</p>
          <p>ภายใต้มาตรฐานการทำงานตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) และกฎหมายอื่นที่เกี่ยวข้อง</p>
        </div>
      `,
      confirmButtonText: 'รับทราบ',
      confirmButtonColor: 'var(--primary-main)',
      width: '600px',
      padding: '2rem',
      customClass: {
        title: 'privacy-modal-title',
        htmlContainer: 'privacy-modal-content'
      }
    });
  };

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <Logo size={28} />
          <div className="footer-brand-text">
            <strong>FinTrack</strong>
            <p>{language === 'th' ? 'จัดการการเงินส่วนบุคคลอย่างชาญฉลาด' : 'Smart personal finance'}</p>
          </div>
        </div>

        <div className="footer-meta">
          <span>© {new Date().getFullYear()} FinTrack ({APP_VERSION}). {language === 'th' ? 'สงวนลิขสิทธิ์.' : 'All rights reserved.'}</span>
          <div className="footer-links">
            <a href="#" onClick={handlePrivacyClick}>Privacy Policy</a>
          </div>
        </div>
      </div>

      <style>{`
        .site-footer {
          margin-top: 3rem;
          padding: 1.5rem 0;
          background: transparent;
          border-top: 1px solid var(--border);
        }
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .footer-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .footer-brand-text strong {
          display: block;
          font-size: 0.95rem;
          color: var(--text-main);
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 0.1rem;
        }
        .footer-brand-text p {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .footer-meta {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .footer-links {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .footer-links a {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .footer-links a:hover {
          color: var(--primary-main);
        }
        @media (max-width: 640px) {
          .footer-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .footer-brand {
            flex-direction: column;
            gap: 0.5rem;
          }
          .footer-meta {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;