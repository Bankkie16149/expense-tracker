import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  Plus, 
  PiggyBank, 
  User,
  Shield
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const BottomNav = ({ onMenuClick }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
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

      {/* 4. Savings (or Admin Panel if Admin) */}
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
        <NavLink 
          to="/dashboard" 
          onClick={(e) => {
            e.preventDefault();
            if (onMenuClick) onMenuClick();
          }}
          className="bottom-nav-item"
        >
          <div className="bottom-nav-icon">
            <PiggyBank size={20} />
          </div>
          <span className="bottom-nav-label">{t('savings')}</span>
        </NavLink>
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
    </nav>
  );
};

export default BottomNav;
