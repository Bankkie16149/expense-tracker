import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  LogOut,
  History as HistoryIcon,
  PiggyBank,
  Calculator,
  Shield,
  Crown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';
import ProUpgradeModal from './ProUpgradeModal';
import Swal from 'sweetalert2';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { t, language } = useLanguage();
  const [isProModalOpen, setIsProModalOpen] = React.useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPro = user?.isPro || false;
  const isAdmin = Boolean(user?.isAdmin);
  
  const [customApp, setCustomApp] = React.useState(null);

  React.useEffect(() => {
    const checkName = () => {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setCustomApp(u.customAppName || null);
      } catch (e) {}
    };
    checkName();
    window.addEventListener('userUpdated', checkName);
    window.addEventListener('storage', checkName);
    return () => {
      window.removeEventListener('userUpdated', checkName);
      window.removeEventListener('storage', checkName);
    };
  }, []);
  
  const isShortName = customApp && customApp.length < 6;
  const subtitleSize = isShortName ? '0.5rem' : '0.65rem';
  
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Logo size={32} />
        {customApp ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', overflow: 'hidden' }}>
            <h2 style={{ 
              fontSize: 'clamp(1rem, 5vw, 1.35rem)', 
              margin: 0, 
              fontWeight: 700, 
              letterSpacing: '0.5px', 
              lineHeight: '1.5',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {customApp}
            </h2>
            <span style={{ 
              fontSize: subtitleSize, 
              fontWeight: 600, 
              opacity: 0.7, 
              textAlign: 'right', 
              marginTop: '-2px',
              letterSpacing: '0.5px' 
            }}>
              BY FINTRACK
            </span>
          </div>
        ) : (
          <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>FinTrack</h2>
        )}
      </div>
      
      <ul className="nav-links">
        <li className="nav-item">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsOpen && setIsOpen(false)}>
            <LayoutDashboard size={20} />
            <span>{t('dashboard')}</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/add-transaction" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsOpen && setIsOpen(false)}>
            <ArrowRightLeft size={20} />
            <span>{t('transactions')}</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsOpen && setIsOpen(false)}>
            <HistoryIcon size={20} />
            <span>{t('history')}</span>
          </NavLink>
        </li>
        {isAdmin && (
          <li className="nav-item">
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsOpen && setIsOpen(false)}>
              <Shield size={20} />
              <span>{language === 'th' ? 'แอดมิน แดชบอร์ด' : 'Admin Dashboard'}</span>
            </NavLink>
          </li>
        )}
        {isPro && (
          <>
            <li className="nav-item">
              <NavLink to="/savings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsOpen && setIsOpen(false)}>
                <PiggyBank size={20} />
                <span>{language === 'th' ? 'การออม' : 'Savings'}</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/calculator" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsOpen && setIsOpen(false)}>
                <img src="/thai-chuy-thai.png" alt="Thai Chuy Thai" style={{ width: '1.25em', height: '1.25em', objectFit: 'contain' }} />
                <span>{language === 'th' ? 'ไทยช่วยไทย' : 'Co-Pay'}</span>
              </NavLink>
            </li>
          </>
        )}
      </ul>

      <div className="sidebar-footer">
        {!isPro && !isAdmin ? (
          user.proStatus === 'pending' ? (
            <div className="upgrade-card" style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} onClick={() => Swal.fire(language === 'th' ? 'โปรดรอสักครู่' : 'Please Wait', language === 'th' ? 'กำลังส่งคำขอการสมัครสมาชิกแบบ PRO โปรดรอสักครู่ เราจะส่งการแจ้งเตือนกลับอีกครั้ง' : 'Sending PRO subscription request, please wait. We will notify you again.', 'info')}>
              <h4 style={{ marginBottom: '0.5rem', color: '#fff' }}>{language === 'th' ? 'รอดำเนินการ' : 'Pending Approval'}</h4>
              <p style={{ opacity: 0.9, fontSize: '0.75rem', color: '#fff' }}>{language === 'th' ? 'กำลังตรวจสอบการสมัคร PRO ของคุณ' : 'We are verifying your PRO request'}</p>
            </div>
          ) : (
            <div className="upgrade-card" style={{ cursor: 'pointer' }} onClick={() => setIsProModalOpen(true)}>
              <h4 style={{ marginBottom: '0.5rem' }}>{t('upgradePro')}</h4>
              <p style={{ opacity: 0.8, fontSize: '0.75rem' }}>{t('upgradeDesc')}</p>
            </div>
          )
        ) : (
          <div className="upgrade-card" style={{ background: 'linear-gradient(135deg, #1D3557 0%, #028090 50%, #00A896 100%)'}}>
            <h4 style={{ marginBottom: '0.5rem', color: '#fff' }}>{isAdmin ? 'Pro ADMIN' : 'Pro Member'}</h4>
            <p style={{ opacity: 0.9, fontSize: '0.75rem', color: '#fff' }}>
              {isAdmin ? 'Administrator Access' : (language === 'th' ? 'คุณเป็นสมาชิกระดับ Pro แล้ว' : 'You are a Pro member')}
            </p>
          </div>
        )}
      </div>

      <ProUpgradeModal 
        isOpen={isProModalOpen} 
        onClose={() => setIsProModalOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </div>
  );
};

export default Sidebar;
