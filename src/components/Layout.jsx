import React, { useEffect, useState, useRef } from 'react';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { Search, Bell, Globe, Menu, X, CheckCircle, Info, Settings, LogOut, User, Mail, Moon, Sun } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchWithAuth } from '../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import NotificationSetupModal from './NotificationSetupModal';
import ProfileEditModal from './ProfileEditModal';
import BottomNav from './BottomNav';
import Logo from './Logo';

const Layout = ({ children, searchQuery, setSearchQuery, showSearch = false }) => {
  const { t, language, toggleLanguage } = useLanguage();
  const { isDarkMode, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const isAdmin = Boolean(user?.isAdmin);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [profilePic, setProfilePic] = useState(null);
  const [showNotifSetup, setShowNotifSetup] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser?.id) {
      if (storedUser.profilePic) {
        setProfilePic(storedUser.profilePic);
      }
      if (storedUser) {
        const localPic = localStorage.getItem(`profilePic_${storedUser.id}`);
        if (localPic) setProfilePic(localPic);
        
        // Show popup for new users to set preferences
        if (storedUser.hasSetPrefs === false || storedUser.hasSetPrefs === undefined) {
          setShowNotifSetup(true);
        }
      }
    }
  }, []);

  const handleProfileClick = () => {
    if (window.innerWidth <= 768) {
      navigate('/profile');
    } else {
      setShowProfileMenu(!showProfileMenu);
    }
  };

  const hour = new Date().getHours();
  let greetingTh = 'สวัสดี';
  let greetingEn = 'Hello';
  if (hour >= 5 && hour < 12) {
    greetingTh = 'สวัสดีตอนเช้า';
    greetingEn = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    greetingTh = 'สวัสดีตอนบ่าย';
    greetingEn = 'Good afternoon';
  } else if (hour >= 17 && hour < 22) {
    greetingTh = 'สวัสดีตอนเย็น';
    greetingEn = 'Good evening';
  }

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const res = await fetchWithAuth('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      let currentUser = null;
      if (storedUser) {
        currentUser = JSON.parse(storedUser);
        setUser(currentUser);
      }
      
      if (currentUser) {
        fetchNotifications();
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleUpdate = () => {
      if (user) {
        fetchNotifications();
      }
    };
    window.addEventListener('notifications_updated', handleUpdate);
    return () => window.removeEventListener('notifications_updated', handleUpdate);
  }, [user]);

  // Handle click outside to close notifications and profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await fetchWithAuth('/api/notifications/mark-all-read', { method: 'POST' });
      const updated = notifications.map(n => ({ ...n, isRead: true }));
      setNotifications(updated);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="main-content">
        <div className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu size={24} color="var(--text-main)" />
            </button>
            <div className="mobile-brand-title">
              <Logo size={24} />
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                {user?.customAppName || 'FinTrack'}
              </span>
            </div>
            {showSearch && (
              <div className="search-box" style={{ flex: 1, maxWidth: '360px', minWidth: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Search 
                    size={16} 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }} 
                  />
                  <input 
                    type="text" 
                    placeholder={t('search')} 
                    className="form-control search-input" 
                    style={{ paddingLeft: '36px', width: '100%' }}
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="top-bar-actions">
            {/* Theme-matched Language Toggle */}
            <div className="lang-toggle-wrapper" onClick={toggleLanguage}>
              <span className={`lang-label ${language === 'th' ? 'active' : ''}`}>TH</span>
              <div className={`toggle-switch ${language === 'en' ? 'switched' : ''}`}>
                <div className="toggle-knob"><Globe size={12} color="var(--primary-dark)" /></div>
              </div>
              <span className={`lang-label ${language === 'en' ? 'active' : ''}`}>EN</span>
            </div>

            {/* Notifications */}
            <div className="notification-wrapper" ref={notifRef}>
              <div className="bell-icon" onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markAllRead();
              }}>
                <Bell size={20} color="var(--text-muted)" />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </div>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="dropdown-header">
                    <h4>{language === 'th' ? 'การแจ้งเตือน' : 'Notifications'}</h4>
                  </div>
                  <div className="dropdown-body">
                    {notifications.length === 0 ? (
                      <p className="no-notifs">{language === 'th' ? 'ไม่มีการแจ้งเตือน' : 'No notifications'}</p>
                    ) : (
                      notifications.slice().reverse().map(n => (
                        <div key={n.id} className={`notification-item ${!n.isRead ? 'unread' : ''}`}>
                          <div className="notif-icon">
                            <Info size={16} color="#3b82f6" />
                          </div>
                          <div className="notif-content">
                            <p>{n.message}</p>
                            <span className="notif-time">{new Date(n.createdAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="user-profile" ref={profileRef} style={{ position: 'relative' }}>
              <div className="user-info">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  {language === 'th' ? greetingTh : greetingEn},
                </div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{user?.name || 'User'}</div>
              </div>
              <div 
                className="avatar-circle" 
                onClick={handleProfileClick}
                style={{ 
                  cursor: 'pointer', 
                  backgroundImage: (user?.isPro && profilePic) ? `url(${profilePic})` : '', 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center', 
                  position: 'relative',
                  overflow: 'visible' // allow badge to stick out
                }}
              >
                {!(user?.isPro && profilePic) && !(isAdmin && profilePic) && (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
                
                {/* PRO/ADMIN Badge */}
                {(user?.isPro || isAdmin) && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: isAdmin ? 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)' : 'linear-gradient(135deg, #1D3557 0%, #028090 50%, #00A896 100%)',
                    color: isAdmin ? '#1E293B' : '#fff',
                    fontSize: '0.4rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 2
                  }}>
                    {isAdmin ? 'ADMIN' : 'PRO'}
                  </div>
                )}
              </div>


              {showProfileMenu && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {user?.name || 'User'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {user?.email || 'email@example.com'}
                    </div>
                  </div>
                  <div className="profile-dropdown-body">
                    <button className="profile-dropdown-item" onClick={() => { setShowProfileEdit(true); setShowProfileMenu(false); }}>
                      <User size={18} />
                      <span>{language === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit Profile'}</span>
                    </button>
                    <button className="profile-dropdown-item" onClick={() => { setShowNotifSetup(true); setShowProfileMenu(false); }}>
                      <Settings size={18} />
                      <span>{language === 'th' ? 'ตั้งค่าการแจ้งเตือน' : 'Notification Settings'}</span>
                    </button>
                    <div className="profile-dropdown-item" onClick={(e) => {
                      e.stopPropagation();
                      toggleTheme();
                    }}>
                      <div className="theme-toggle-container">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {isDarkMode ? <Moon size={18} color="var(--primary-main)" /> : <Sun size={18} color="var(--warning)" />}
                          <span>{language === 'th' ? (isDarkMode ? 'โหมดมืด' : 'โหมดสว่าง') : (isDarkMode ? 'Dark Mode' : 'Light Mode')}</span>
                        </div>
                        <div className={`theme-switch ${isDarkMode ? 'dark' : ''}`}>
                          <div className="theme-switch-knob"></div>
                        </div>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider"></div>
                    <button className="profile-dropdown-item logout" onClick={() => {
                      localStorage.removeItem('token');
                      window.location.href = '/';
                    }}>
                      <LogOut size={18} />
                      <span>{language === 'th' ? 'ออกจากระบบ' : 'Logout'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 8rem)' }}>
          <div className="ultra-smooth-entry">
            {children}
          </div>
          <Footer />
        </div>
      </main>
      
      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <BottomNav onMenuClick={() => setIsSidebarOpen(true)} />
      
      {showNotifSetup && (
        <NotificationSetupModal 
          user={user} 
          setUser={(updatedUser) => {
            setUser(updatedUser);
            setShowNotifSetup(false);
          }} 
          onClose={() => setShowNotifSetup(false)} 
        />
      )}

      {showProfileEdit && (
        <ProfileEditModal 
          user={user} 
          setUser={(updatedUser) => {
            setUser(updatedUser);
            if (updatedUser.profilePic) {
              setProfilePic(updatedUser.profilePic);
            }
          }} 
          onClose={() => setShowProfileEdit(false)} 
        />
      )}
    </div>
  );
};

export default Layout;
