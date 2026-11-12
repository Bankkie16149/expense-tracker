import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { 
  User, 
  Mail, 
  Camera, 
  Moon, 
  Sun, 
  Globe, 
  Bell, 
  LogOut, 
  Shield, 
  PiggyBank, 
  Calculator, 
  ChevronRight, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit3,
  Calendar,
  Layers
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchWithAuth } from '../utils/api';
import Swal from 'sweetalert2';
import ProfileEditModal from '../components/ProfileEditModal';
import NotificationSetupModal from '../components/NotificationSetupModal';
import ProUpgradeModal from '../components/ProUpgradeModal';
import { APP_VERSION, BUILD_TIME } from '../utils/version';
import { useTransactions } from '../hooks/useTransactions';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [profilePic, setProfilePic] = useState(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showNotifSetup, setShowNotifSetup] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const fileInputRef = useRef(null);

  const isAdmin = Boolean(user?.isAdmin);
  const isPro = Boolean(user?.isPro);

  // Fetch current month's transactions to calculate today's income & expense
  const now = new Date();
  const currentMonthStr = now.getMonth().toString();
  const currentYearStr = now.getFullYear().toString();
  const { transactions } = useTransactions(currentMonthStr, currentYearStr);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser?.id) {
      setUser(storedUser);
      if (storedUser.profilePic) {
        setProfilePic(storedUser.profilePic);
      }
      const localPic = localStorage.getItem(`profilePic_${storedUser.id}`);
      if (localPic) setProfilePic(localPic);
    }
  }, []);

  // Today's Date String in local format
  const todayLocalDate = now.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Calculate today's income and expense
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const todayTransactions = (transactions || []).filter(item => {
    if (!item.date) return false;
    const itemDate = new Date(item.date);
    const itemStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
    return itemStr === todayStr;
  });

  const todayIncome = todayTransactions
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const todayExpense = todayTransactions
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const todayNet = todayIncome - todayExpense;

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfilePic(compressedDataUrl);

        try {
          const res = await fetchWithAuth('/api/auth/profile-pic', {
            method: 'PUT',
            body: JSON.stringify({ profilePic: compressedDataUrl })
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            window.dispatchEvent(new Event('userUpdated'));
            Swal.fire({
              icon: 'success',
              title: language === 'th' ? 'อัปเดตรูปโปรไฟล์สำเร็จ' : 'Profile Picture Updated',
              showConfirmButton: false,
              timer: 1500
            });
          } else {
            setProfilePic(user.profilePic || null);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: language === 'th' ? 'อัปโหลดไม่สำเร็จ หรือรูปภาพมีขนาดใหญ่เกินไป' : 'Upload failed or image is too large'
            });
          }
        } catch (error) {
          console.error(error);
          setProfilePic(user.profilePic || null);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    if (isPro || isAdmin) {
      fileInputRef.current?.click();
    } else {
      setShowProUpgrade(true);
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: language === 'th' ? 'ออกจากระบบ?' : 'Log out?',
      text: language === 'th' ? 'คุณต้องการออกจากระบบ FinTrack ใช่หรือไม่?' : 'Are you sure you want to log out of FinTrack?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: language === 'th' ? 'ยืนยันออกจากระบบ' : 'Log Out',
      cancelButtonText: language === 'th' ? 'ยกเลิก' : 'Cancel',
      confirmButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    });
  };

  return (
    <Layout>
      <div className="profile-page-container">
        {/* Hidden file input for photo upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleProfilePhotoChange} 
        />

        {/* 1. Hero Profile Card */}
        <div className="profile-hero-card">
          <div className="profile-avatar-wrapper" onClick={handleAvatarClick}>
            {profilePic ? (
              <img src={profilePic} alt={user?.name} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-img">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <button 
              className="profile-avatar-camera-badge" 
              type="button"
              aria-label="Change Profile Picture"
            >
              <Camera size={16} />
            </button>
          </div>

          <h2 className="profile-user-name">{user?.name || 'User'}</h2>
          <p className="profile-user-email">{user?.email || 'user@example.com'}</p>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
            {isAdmin ? (
              <span className="profile-badge-tier profile-badge-admin">
                <Shield size={12} />
                ADMINISTRATOR
              </span>
            ) : isPro ? (
              <span className="profile-badge-tier profile-badge-pro">
                <Sparkles size={12} />
                PRO MEMBER
              </span>
            ) : (
              <span className="profile-badge-tier profile-badge-free">
                STANDARD MEMBER
              </span>
            )}
          </div>

          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ 
              borderRadius: '20px', 
              fontSize: '0.85rem', 
              padding: '6px 18px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
            onClick={() => setShowProfileEdit(true)}
          >
            <Edit3 size={15} />
            <span>{language === 'th' ? 'แก้ไขข้อมูลส่วนตัว' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* 2. Today's Financial Summary Card */}
        <div className="profile-today-card">
          <div className="profile-today-header">
            <h3 className="profile-today-title">
              <Calendar size={18} color="var(--primary-main)" />
              <span>{language === 'th' ? 'สรุปรายรับ - รายจ่ายวันนี้' : "Today's Summary"}</span>
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {todayLocalDate}
            </span>
          </div>

          <div className="profile-today-grid">
            {/* Income Today */}
            <div className="profile-today-box income">
              <span className="profile-today-label">
                {language === 'th' ? 'รายรับวันนี้' : "Today's Income"}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowUpRight size={18} color="var(--income)" />
                <span className="profile-today-amount">
                  +{todayIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                </span>
              </div>
            </div>

            {/* Expense Today */}
            <div className="profile-today-box expense">
              <span className="profile-today-label">
                {language === 'th' ? 'รายจ่ายวันนี้' : "Today's Expense"}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowDownRight size={18} color="var(--expense)" />
                <span className="profile-today-amount">
                  -{todayExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                </span>
              </div>
            </div>
          </div>

          {/* Net Today Banner */}
          <div className="profile-today-net-banner">
            <span style={{ color: 'var(--text-muted)' }}>
              {language === 'th' ? 'คงเหลือสุทธิวันนี้' : "Today's Net Balance"}
            </span>
            <span style={{ 
              fontWeight: 700, 
              fontSize: '1.05rem', 
              color: todayNet >= 0 ? 'var(--income)' : 'var(--expense)' 
            }}>
              {todayNet >= 0 ? `+${todayNet.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : todayNet.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
            </span>
          </div>
        </div>

        {/* 3. Settings & Preferences Group */}
        <div className="profile-menu-section">
          <div className="profile-section-heading">
            {language === 'th' ? 'การตั้งค่าและระบบ' : 'Preferences & Tools'}
          </div>

          <div className="profile-menu-card">
            {/* Dark Mode Switch */}
            <div className="profile-menu-row" onClick={toggleTheme}>
              <div className="profile-menu-row-left">
                <div className="profile-menu-icon">
                  {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <span>{language === 'th' ? (isDarkMode ? 'โหมดมืด (Dark Mode)' : 'โหมดสว่าง (Light Mode)') : (isDarkMode ? 'Dark Mode' : 'Light Mode')}</span>
              </div>
              <div className="profile-menu-row-right">
                <div className={`theme-switch ${isDarkMode ? 'dark' : ''}`}>
                  <div className="theme-switch-knob"></div>
                </div>
              </div>
            </div>

            {/* Language Switch */}
            <div className="profile-menu-row" onClick={toggleLanguage}>
              <div className="profile-menu-row-left">
                <div className="profile-menu-icon">
                  <Globe size={18} />
                </div>
                <span>{language === 'th' ? 'ภาษา (Language)' : 'Language'}</span>
              </div>
              <div className="profile-menu-row-right">
                <span style={{ fontWeight: 600, color: 'var(--primary-main)' }}>
                  {language === 'th' ? 'ไทย (TH)' : 'English (EN)'}
                </span>
                <ChevronRight size={18} />
              </div>
            </div>

            {/* Notification Setup */}
            <button 
              type="button" 
              className="profile-menu-row" 
              onClick={() => setShowNotifSetup(true)}
            >
              <div className="profile-menu-row-left">
                <div className="profile-menu-icon">
                  <Bell size={18} />
                </div>
                <span>{language === 'th' ? 'ตั้งค่าการแจ้งเตือนเตือนบันทึก' : 'Notification Reminders'}</span>
              </div>
              <div className="profile-menu-row-right">
                <ChevronRight size={18} />
              </div>
            </button>

            {/* Co-Pay Calculator (Thai Chuy Thai) */}
            <Link to="/calculator" className="profile-menu-row">
              <div className="profile-menu-row-left">
                <div className="profile-menu-icon">
                  <Calculator size={18} />
                </div>
                <span>{language === 'th' ? 'เครื่องมือคำนวณ ไทยช่วยไทย' : 'Co-Pay Calculator'}</span>
              </div>
              <div className="profile-menu-row-right">
                <ChevronRight size={18} />
              </div>
            </Link>

            {/* Admin Hub shortcut if admin */}
            {isAdmin && (
              <Link to="/admin" className="profile-menu-row">
                <div className="profile-menu-row-left">
                  <div className="profile-menu-icon" style={{ color: '#d97706' }}>
                    <Shield size={18} />
                  </div>
                  <span>{language === 'th' ? 'ระบบจัดการผู้ดูแลระบบ (Admin Hub)' : 'Admin Dashboard'}</span>
                </div>
                <div className="profile-menu-row-right">
                  <ChevronRight size={18} />
                </div>
              </Link>
            )}

            {/* Upgrade to Pro if free */}
            {!isPro && !isAdmin && (
              <button 
                type="button" 
                className="profile-menu-row" 
                onClick={() => setShowProUpgrade(true)}
              >
                <div className="profile-menu-row-left">
                  <div className="profile-menu-icon" style={{ color: '#00A896' }}>
                    <Sparkles size={18} />
                  </div>
                  <span style={{ fontWeight: 600, color: '#00A896' }}>
                    {language === 'th' ? 'อัปเกรดเป็น FinTrack PRO ✨' : 'Upgrade to PRO ✨'}
                  </span>
                </div>
                <div className="profile-menu-row-right">
                  <ChevronRight size={18} />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* 4. Logout Button */}
        <button 
          type="button" 
          className="profile-logout-button" 
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>{language === 'th' ? 'ออกจากระบบ' : 'Log Out'}</span>
        </button>

        {/* 5. Web Version Badge & Metadata */}
        <div className="profile-version-footer">
          <div className="profile-version-badge">
            FinTrack Web Version: {APP_VERSION}
          </div>
          {BUILD_TIME && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Build {BUILD_TIME} • Responsive Edition
            </span>
          )}
        </div>

        {/* Modals */}
        {showProfileEdit && (
          <ProfileEditModal 
            user={user} 
            setUser={(updatedUser) => {
              setUser(updatedUser);
              if (updatedUser.profilePic) setProfilePic(updatedUser.profilePic);
            }} 
            onClose={() => setShowProfileEdit(false)} 
          />
        )}

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

        {showProUpgrade && (
          <ProUpgradeModal 
            isOpen={showProUpgrade} 
            onClose={() => setShowProUpgrade(false)} 
            onSuccess={() => {
              setShowProUpgrade(false);
              const u = JSON.parse(localStorage.getItem('user') || '{}');
              setUser(u);
            }} 
          />
        )}
      </div>
    </Layout>
  );
};

export default Profile;
