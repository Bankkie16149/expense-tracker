import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  Plus, 
  PiggyBank, 
  User,
  Shield,
  Sparkles,
  Layers,
  Calculator,
  ChevronRight,
  X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import ProUpgradeModal from './ProUpgradeModal';

const BottomNav = ({ onMenuClick }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [showProModal, setShowProModal] = useState(false);
  const [showToolsSheet, setShowToolsSheet] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = Boolean(user?.isAdmin);
  const isPro = Boolean(user?.isPro);
  const isProOrAdmin = isPro || isAdmin;

  // Active check for tools
  const isToolsActive = ['/savings', '/calculator', '/admin'].includes(location.pathname);

  // Dynamic icon for tools tab based on current route
  const renderToolsIcon = () => {
    if (location.pathname === '/savings') return <PiggyBank size={20} />;
    if (location.pathname === '/calculator') return <Calculator size={20} />;
    if (location.pathname === '/admin') return <Shield size={20} />;
    return <Layers size={20} />;
  };

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {/* 1. Dashboard */}
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          onClick={() => setShowToolsSheet(false)}
        >
          <div className="bottom-nav-icon">
            <LayoutDashboard size={20} />
          </div>
          <span className="bottom-nav-label">{t('dashboard')}</span>
        </NavLink>

        {/* 2. History */}
        <NavLink 
          to="/history" 
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          onClick={() => setShowToolsSheet(false)}
        >
          <div className="bottom-nav-icon">
            <HistoryIcon size={20} />
          </div>
          <span className="bottom-nav-label">{t('history')}</span>
        </NavLink>

        {/* 3. Center Action Button: Add Transaction */}
        <NavLink 
          to="/add-transaction" 
          className={({ isActive }) => `bottom-nav-action-btn ${isActive ? 'active' : ''}`}
          aria-label={t('addTransaction')}
          onClick={() => setShowToolsSheet(false)}
        >
          <div className="action-btn-circle">
            <Plus size={26} strokeWidth={2.5} color="#ffffff" />
          </div>
        </NavLink>

        {/* 4. Tools (Savings + Thai Chuy Thai for PRO/Admin) OR Upgrade PRO (for Standard User) */}
        {isProOrAdmin ? (
          <button 
            type="button"
            onClick={() => setShowToolsSheet(!showToolsSheet)}
            className={`bottom-nav-item ${isToolsActive || showToolsSheet ? 'active' : ''}`}
            aria-label="Tools"
            style={{ position: 'relative' }}
          >
            <div className="bottom-nav-icon">
              {renderToolsIcon()}
            </div>
            <span className="bottom-nav-label">
              {location.pathname === '/savings'
                ? (language === 'th' ? 'การออม' : 'Savings')
                : location.pathname === '/calculator'
                ? (language === 'th' ? 'ไทยช่วยไทย' : 'Co-Pay')
                : location.pathname === '/admin'
                ? 'Admin'
                : (language === 'th' ? 'เครื่องมือ' : 'Tools')}
            </span>
          </button>
        ) : (
          <button 
            type="button"
            onClick={() => {
              setShowToolsSheet(false);
              setShowProModal(true);
            }}
            className="bottom-nav-item"
            style={{ color: '#00A896', cursor: 'pointer' }}
            aria-label="Upgrade to PRO"
          >
            <div className="bottom-nav-icon">
              <Sparkles size={20} color="#00A896" />
            </div>
            <span className="bottom-nav-label" style={{ fontWeight: 600, color: '#00A896' }}>
              {language === 'th' ? 'อัปเกรด PRO' : 'Upgrade'}
            </span>
          </button>
        )}

        {/* 5. Profile */}
        <NavLink 
          to="/profile" 
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          aria-label="Profile"
          onClick={() => setShowToolsSheet(false)}
        >
          <div className="bottom-nav-icon">
            <User size={20} />
          </div>
          <span className="bottom-nav-label">{language === 'th' ? 'โปรไฟล์' : 'Profile'}</span>
        </NavLink>
      </nav>

      {/* Tools Bottom Sheet Menu for Pro / Admin */}
      {showToolsSheet && isProOrAdmin && (
        <>
          <div 
            className="bottom-sheet-backdrop" 
            onClick={() => setShowToolsSheet(false)} 
          />
          <div className="bottom-sheet-modal">
            <div className="bottom-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--primary-main)" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {language === 'th' ? 'เครื่องมือและบริการพิเศษ' : 'Special Tools & Services'}
                </h4>
              </div>
              <button 
                type="button" 
                className="bottom-sheet-close"
                onClick={() => setShowToolsSheet(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="bottom-sheet-body">
              {/* Tool 1: Savings */}
              <NavLink 
                to="/savings" 
                className={({ isActive }) => `bottom-sheet-item ${isActive ? 'active' : ''}`}
                onClick={() => setShowToolsSheet(false)}
              >
                <div className="sheet-item-icon" style={{ background: 'rgba(0, 168, 232, 0.12)', color: '#00A8E8' }}>
                  <PiggyBank size={22} />
                </div>
                <div className="sheet-item-text">
                  <strong>{language === 'th' ? 'การออมเงิน (Savings)' : 'Savings Goals'}</strong>
                  <p>{language === 'th' ? 'ตั้งเป้าหมายและบันทึกเงินออมส่วนตัว' : 'Track and manage your savings goals'}</p>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </NavLink>

              {/* Tool 2: Thai Chuy Thai Co-Pay Calculator */}
              <NavLink 
                to="/calculator" 
                className={({ isActive }) => `bottom-sheet-item ${isActive ? 'active' : ''}`}
                onClick={() => setShowToolsSheet(false)}
              >
                <div className="sheet-item-icon" style={{ background: 'rgba(39, 174, 96, 0.12)' }}>
                  <img src="/thai-chuy-thai.png" alt="Thai Chuy Thai" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                </div>
                <div className="sheet-item-text">
                  <strong>{language === 'th' ? 'เครื่องมือคำนวณไทยช่วยไทย' : 'Thai Chuy Thai Co-Pay'}</strong>
                  <p>{language === 'th' ? 'คำนวณสัดส่วนเงินรัฐช่วยจ่าย 60% (สูงสุด 200 บาท)' : 'Calculate government co-pay benefit'}</p>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </NavLink>

              {/* Tool 3: Admin Hub (If Admin) */}
              {isAdmin && (
                <NavLink 
                  to="/admin" 
                  className={({ isActive }) => `bottom-sheet-item ${isActive ? 'active' : ''}`}
                  onClick={() => setShowToolsSheet(false)}
                >
                  <div className="sheet-item-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                    <Shield size={22} />
                  </div>
                  <div className="sheet-item-text">
                    <strong>{language === 'th' ? 'แอดมิน แดชบอร์ด' : 'Admin Hub'}</strong>
                    <p>{language === 'th' ? 'จัดการผู้ใช้และภาพรวมระบบ' : 'System and user management'}</p>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </NavLink>
              )}
            </div>
          </div>
        </>
      )}

      {/* Pro Upgrade Modal for Standard Users */}
      {showProModal && (
        <ProUpgradeModal 
          isOpen={showProModal} 
          onClose={() => setShowProModal(false)} 
          onSuccess={() => {
            setShowProModal(false);
            window.location.reload();
          }} 
        />
      )}
    </>
  );
};

export default BottomNav;
