import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  Plus, 
  PiggyBank, 
  Menu,
  Shield,
  MessageSquare
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

      {/* 5. Menu / More */}
      <button 
        type="button" 
        className="bottom-nav-item bottom-nav-menu-btn" 
        onClick={onMenuClick}
        aria-label="Open Menu"
      >
        <div className="bottom-nav-icon">
          <Menu size={20} />
        </div>
        <span className="bottom-nav-label">{language === 'th' ? 'เมนู' : 'Menu'}</span>
      </button>
    </nav>
  );
};

export default BottomNav;
