import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  Plus, 
  PiggyBank, 
  User,
  Shield,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import ProUpgradeModal from './ProUpgradeModal';

const BottomNav = ({ onMenuClick }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [showProModal, setShowProModal] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = Boolean(user?.isAdmin);
  const isPro = Boolean(user?.isPro);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {/* 1. Dashboard */}
      <NavLink 
        to="/dashboard" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
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
      >
        <div className="action-btn-circle">
          <Plus size={26} strokeWidth={2.5} color="#ffffff" />
        </div>
      </NavLink>

      {/* 4. Admin (for Admin), Savings (for PRO), or Upgrade PRO (for Standard User) */}
      {isAdmin ? (
        <NavLink 
          to="/admin" 
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <Shield size={20} />
          </div>
          <span className="bottom-nav-label">Admin</span>
        </NavLink>
      ) : isPro ? (
        <NavLink 
          to="/savings" 
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <PiggyBank size={20} />
          </div>
          <span className="bottom-nav-label">{t('savings')}</span>
        </NavLink>
      ) : (
        <button 
          type="button"
          onClick={() => setShowProModal(true)}
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
      >
        <div className="bottom-nav-icon">
          <User size={20} />
        </div>
        <span className="bottom-nav-label">{language === 'th' ? 'โปรไฟล์' : 'Profile'}</span>
      </NavLink>

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
    </nav>
  );
};

export default BottomNav;
