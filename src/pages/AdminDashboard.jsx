import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';
import { Trash2, Edit, Plus, Eye, Check, X, UserPlus, Megaphone, MessageSquare, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import Swal from 'sweetalert2';
import '../index.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [proRequests, setProRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [showCoPayPanel, setShowCoPayPanel] = useState(false);
  const [coPayEnabled, setCoPayEnabled] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('fintrack_system_settings') || '{}');
      return cached.coPayEnabled !== undefined ? Boolean(cached.coPayEnabled) : true;
    } catch {
      return true;
    }
  });
  const [coPayWarningText, setCoPayWarningText] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('fintrack_system_settings') || '{}');
      return cached.coPayWarningText || '';
    } catch {
      return '';
    }
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user?.isAdmin) {
      navigate('/');
    } else {
      loadSystemSettings();
      if (activeTab === 'users') loadUsers();
      else loadProRequests();
    }
  }, [navigate, activeTab]);

  const loadSystemSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/system-settings');
      if (res.ok) {
        const data = await res.json();
        const enabled = data.coPayEnabled !== undefined ? Boolean(data.coPayEnabled) : true;
        const warning = data.coPayWarningText || '';
        setCoPayEnabled(enabled);
        setCoPayWarningText(warning);
        localStorage.setItem('fintrack_system_settings', JSON.stringify({ coPayEnabled: enabled, coPayWarningText: warning }));
      }
    } catch (e) {
      console.error('Failed to load system settings', e);
    }
  };

  const handleSaveCoPaySettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = {
        coPayEnabled: Boolean(coPayEnabled),
        coPayWarningText: coPayWarningText.trim()
      };
      const res = await fetchWithAuth('/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      const data = await res.json();
      localStorage.setItem('fintrack_system_settings', JSON.stringify({
        coPayEnabled: data.coPayEnabled,
        coPayWarningText: data.coPayWarningText
      }));
      window.dispatchEvent(new Event('systemSettingsUpdated'));
      Swal.fire({
        icon: 'success',
        title: language === 'th' ? 'บันทึกการตั้งค่าสำเร็จ' : 'Settings Saved',
        text: language === 'th'
          ? `สถานะไทยช่วยไทย: ${data.coPayEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน (ทุกบัญชีรวมถึงแอดมิน)'}`
          : `Thai Chuy Thai is now ${data.coPayEnabled ? 'Enabled' : 'Disabled for all users'}`,
        confirmButtonColor: 'var(--primary-main)'
      });
      setShowCoPayPanel(false);
    } catch (error) {
      Swal.fire('Error', error.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/users?t=${new Date().getTime()}`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users', error);
      Swal.fire('Error', 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProRequests = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/pro-requests');
      if (!res.ok) throw new Error('Failed to load pro requests');
      const data = await res.json();
      setProRequests(data);
    } catch (error) {
      console.error('Failed to load pro requests', error);
      Swal.fire('Error', 'Failed to load pro requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePro = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/admin/pro-requests/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        Swal.fire('Success', 'User has been approved for PRO', 'success');
        loadProRequests();
      } else {
        Swal.fire('Error', 'Failed to approve', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Connection error', 'error');
    }
  };

  const handleRejectPro = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/admin/pro-requests/${id}/reject`, { method: 'POST' });
      if (res.ok) {
        Swal.fire('Success', 'User has been rejected', 'success');
        loadProRequests();
      } else {
        Swal.fire('Error', 'Failed to reject', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Connection error', 'error');
    }
  };

  const handleDeleteUser = async (id, name) => {
    const result = await Swal.fire({
      title: language === 'th' ? `ลบผู้ใช้ ${name}?` : `Delete ${name}?`,
      text: language === 'th' ? 'ข้อมูลธุรกรรมทั้งหมดของผู้ใช้นี้จะถูกลบด้วย (ไม่สามารถกู้คืนได้)' : 'All transactions for this user will also be deleted (irreversible)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: language === 'th' ? 'ยืนยันการลบ' : 'Yes, delete',
      cancelButtonText: language === 'th' ? 'ยกเลิก' : 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetchWithAuth(`/api/admin/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
        Swal.fire('Deleted!', 'User deleted successfully.', 'success');
        loadUsers();
      } catch (error) {
        Swal.fire('Error', 'Failed to delete user', 'error');
      }
    }
  };

  const handleEditUser = async (user) => {
    const { value: formValues } = await Swal.fire({
      title: language === 'th' ? 'แก้ไขผู้ใช้' : 'Edit User',
      html: `
        <div style="text-align: left; padding: 0 10px; overflow-x: hidden;">
          <label style="display:block; margin-bottom: 8px; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">Name:</label>
          <input id="swal-input1" class="swal2-input" value="${user.name || ''}" placeholder="Name" style="margin: 0 0 15px 0; width: 100%; box-sizing: border-box;">
          
          <label style="display:block; margin-bottom: 8px; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">Email:</label>
          <input id="swal-input2" class="swal2-input" value="${user.email}" placeholder="Email" style="margin: 0 0 15px 0; width: 100%; box-sizing: border-box;">
          
          <label style="display:block; margin-bottom: 8px; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">Theme Color:</label>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
            <input type="color" id="swal-color" value="${user.themeColor || '#0a2540'}" style="width: 50px; height: 50px; cursor: pointer; border: none; border-radius: 8px; padding: 0; background: none;">
            <span style="font-size: 0.85rem; color: var(--text-muted);">Click to pick a color</span>
          </div>

          <label style="display:block; margin-bottom: 8px; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">Custom Logo:</label>
          <input type="file" id="swal-logo" accept="image/*" style="width: 100%; box-sizing: border-box; box-sizing: border-box; padding: 8px; border: 1px dashed var(--border); border-radius: 8px; margin-bottom: 10px; background: #f8fafc;">
          ${user.customLogoUrl ? `<div style="margin-bottom: 15px;"><img src="${user.customLogoUrl}" style="max-width: 80px; max-height: 80px; border-radius: 8px; border: 1px solid var(--border);" alt="Custom Logo" /></div>` : '<div style="margin-bottom: 15px;"></div>'}

          <label style="display:block; margin-bottom: 8px; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">Custom App Name:</label>
          <input id="swal-appname" class="swal2-input" value="${user.customAppName || ''}" placeholder="Leave empty for FinTrack" style="margin: 0 0 20px 0; width: 100%; box-sizing: border-box;">

          <label style="display:flex; align-items:center; cursor: pointer; padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border);">
            <label class="custom-toggle" style="margin-right: 12px; margin-bottom: 0;">
              <input type="checkbox" id="swal-input3" ${user.isPro ? 'checked' : ''}>
              <span class="custom-toggle-slider"></span>
            </label>
            <span style="font-weight: 500; color: var(--text-main);">Pro User Access</span>
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const name = document.getElementById('swal-input1').value;
        const email = document.getElementById('swal-input2').value;
        const isPro = document.getElementById('swal-input3').checked;
        const themeColor = document.getElementById('swal-color').value;
        const fileInput = document.getElementById('swal-logo');
        const customAppName = document.getElementById('swal-appname').value;

        if (!email) {
          Swal.showValidationMessage('Email is required');
          return false;
        }

        return new Promise((resolve) => {
          if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => {
              // Convert to canvas to resize if needed, but for now just read
              resolve({ name, email, isPro, themeColor, customLogoUrl: e.target.result, customAppName });
            };
            reader.readAsDataURL(fileInput.files[0]);
          } else {
            resolve({ name, email, isPro, themeColor, customLogoUrl: user.customLogoUrl, customAppName });
          }
        });
      }
    });

    if (formValues) {
      try {
        const res = await fetchWithAuth(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify(formValues)
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || data.error || 'Failed to update user');
        }
        
        // If the admin edited themselves, update localStorage
        const currentUserStr = localStorage.getItem('user');
        if (currentUserStr) {
          const currentUser = JSON.parse(currentUserStr);
          if (currentUser.id === user.id) {
            const data = await res.json();
            localStorage.setItem('user', JSON.stringify({ ...currentUser, ...data.user }));
            window.dispatchEvent(new Event('userUpdated'));
          }
        }
        
        Swal.fire('Saved!', 'User updated successfully.', 'success');
        loadUsers();
      } catch (error) {
        Swal.fire('Error', error.message || 'Failed to update user', 'error');
      }
    }
  };

  const showSlip = (url) => {
    Swal.fire({
      imageUrl: url,
      imageAlt: 'Transfer Slip',
      width: 'auto',
      showConfirmButton: false,
      showCloseButton: true
    });
  };

  const handleCreateUser = async () => {
    const { value: formValues } = await Swal.fire({
      title: language === 'th' ? 'สร้างผู้ใช้ใหม่' : 'Create User',
      html: `
        <div style="text-align: left; padding: 0 10px; overflow-x: hidden;">
          <label style="display:block; margin-bottom: 8px; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">Name:</label>
          <input id="swal-create1" class="swal2-input" placeholder="Enter full name" style="margin: 0 0 15px 0; width: 100%; box-sizing: border-box;">
          
          <label style="display:block; margin-bottom: 8px; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">Email (required):</label>
          <input id="swal-create2" class="swal2-input" placeholder="Enter email address" style="margin: 0 0 15px 0; width: 100%; box-sizing: border-box;">
          
          <label style="display:block; margin-bottom: 8px; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">Password (required):</label>
          <input type="password" id="swal-create3" class="swal2-input" placeholder="Enter password" style="margin: 0 0 20px 0; width: 100%; box-sizing: border-box;">
          
          <label style="display:flex; align-items:center; cursor: pointer; padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border);">
            <label class="custom-toggle" style="margin-right: 12px; margin-bottom: 0;">
              <input type="checkbox" id="swal-create4">
              <span class="custom-toggle-slider"></span>
            </label>
            <span style="font-weight: 500; color: var(--text-main);">Pro User Access</span>
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const name = document.getElementById('swal-create1').value;
        const email = document.getElementById('swal-create2').value;
        const password = document.getElementById('swal-create3').value;
        const isPro = document.getElementById('swal-create4').checked;
        
        if (!email || !password) {
          Swal.showValidationMessage('Email and Password are required');
        }
        return { name, email, password, isPro };
      }
    });

    if (formValues) {
      try {
        const res = await fetchWithAuth(`/api/admin/users`, {
          method: 'POST',
          body: JSON.stringify(formValues)
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || data.error || 'Failed to create user');
        }
        Swal.fire('Created!', 'User created successfully.', 'success');
        loadUsers();
      } catch (error) {
        Swal.fire('Error', error.message || 'Failed to create user', 'error');
      }
    }
  };

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
        <div className="header-title" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1>{language === 'th' ? 'แอดมิน แดชบอร์ด' : 'Admin Dashboard'}</h1>
            <p style={{ color: 'var(--text-muted)' }}>{language === 'th' ? 'จัดการผู้ใช้และดูภาพรวมของระบบ' : 'Manage users and system overview'}</p>
          </div>
          <div className="admin-header-actions">
            <button onClick={() => navigate('/admin/chat')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <MessageSquare size={18} />
              <span>{language === 'th' ? 'แชทกับผู้ใช้' : 'User Chats'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCoPayPanel(!showCoPayPanel)}
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: showCoPayPanel ? '1.5px solid var(--primary-main)' : '1px solid var(--border)',
                background: showCoPayPanel ? 'rgba(0, 168, 232, 0.08)' : 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            >
              <img src="/thai-chuy-thai.png" alt="Thai Chuy Thai" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
              <span>{language === 'th' ? 'ตั้งค่าไทยช่วยไทย' : 'Co-Pay Control'}</span>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: coPayEnabled ? '#22c55e' : '#ef4444',
                  flexShrink: 0
                }}
                title={coPayEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              />
            </button>
            <button onClick={() => navigate('/admin/ads')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={18} />
              <span>{language === 'th' ? 'จัดการโฆษณา' : 'Manage Ads'}</span>
            </button>
            <button onClick={handleCreateUser} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} />
              <span>{language === 'th' ? 'เพิ่มผู้ใช้' : 'Add User'}</span>
            </button>
          </div>
        </div>

        {/* Responsive Co-Pay Admin Control Card inside Admin Dashboard */}
        {showCoPayPanel && (
          <div className="card admin-copay-card">
            <div className="admin-copay-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <img src="/thai-chuy-thai.png" alt="Thai Chuy Thai" style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {language === 'th' ? 'ควบคุมฟังก์ชันโครงการไทยช่วยไทย (60/40)' : 'Thai Chuy Thai (60/40) System Control'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {language === 'th'
                      ? 'เมื่อปิดฟังก์ชัน ผู้ใช้ทุกคนรวมถึงแอดมินจะไม่สามารถกดใช้สิทธิ์ได้ และจะแสดงข้อความคำเตือนตรงปุ่ม'
                      : 'When disabled, all users including Admins cannot use Co-Pay, and the warning text will appear on the button.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCoPayPanel(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCoPaySettings} className="admin-copay-body">
              <div
                className="admin-copay-toggle-row"
                onClick={() => setCoPayEnabled(!coPayEnabled)}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{language === 'th' ? 'สถานะฟังก์ชันไทยช่วยไทย' : 'Function Status'}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        background: coPayEnabled ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                        color: coPayEnabled ? '#16a34a' : '#dc2626'
                      }}
                    >
                      {coPayEnabled
                        ? (language === 'th' ? 'เปิดใช้งาน (Enabled)' : 'Enabled')
                        : (language === 'th' ? 'ปิดใช้งานทั้งหมด (Disabled)' : 'Disabled')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {language === 'th'
                      ? 'คลิกเพื่อสลับเปิดหรือปิดการใช้งานทั้งระบบ (มีผลกับแอดมินด้วย)'
                      : 'Click to toggle system-wide availability (affects Admins as well)'}
                  </div>
                </div>
                <div
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: coPayEnabled ? 'var(--primary-main)' : 'var(--text-muted)',
                    position: 'relative',
                    transition: 'background 0.25s ease',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: '2px',
                      left: coPayEnabled ? '22px' : '2px',
                      transition: 'left 0.25s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>
              </div>

              <div className="admin-copay-input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                  <AlertTriangle size={15} color="var(--danger)" />
                  <span>{language === 'th' ? 'ข้อความคำเตือน (แสดงเป็นข้อความเล็กๆ ตรงปุ่มใช้ไทยช่วยไทย)' : 'Warning Message (shown on the Thai Chuy Thai button)'}</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={coPayWarningText}
                  onChange={(e) => setCoPayWarningText(e.target.value)}
                  placeholder={
                    language === 'th'
                      ? 'เช่น ปิดใช้งานชั่วคราวเนื่องจากสิทธิ์โครงการเต็มแล้ว หรือ เฉพาะร้านค้าที่ร่วมรายการ'
                      : 'e.g. Temporarily disabled due to quota limit'
                  }
                />
              </div>

              <div className="admin-copay-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCoPayPanel(false)}
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingSettings}
                >
                  {savingSettings
                    ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                    : (language === 'th' ? 'บันทึกการตั้งค่า' : 'Save Settings')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveTab('users')}
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'users' ? '2px solid var(--primary-main)' : 'none', color: activeTab === 'users' ? 'var(--primary-main)' : 'var(--text-muted)', fontWeight: activeTab === 'users' ? 'bold' : 'normal', cursor: 'pointer' }}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'requests' ? '2px solid var(--primary-main)' : 'none', color: activeTab === 'requests' ? 'var(--primary-main)' : 'var(--text-muted)', fontWeight: activeTab === 'requests' ? 'bold' : 'normal', cursor: 'pointer' }}
          >
            PRO Requests {proRequests.length > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '12px', marginLeft: '5px' }}>{proRequests.length}</span>}
          </button>
        </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
        ) : activeTab === 'requests' ? (
          <>
            {/* Desktop View */}
            <div className="table-responsive desktop-table-view">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>ID</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Slip</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proRequests.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No pending requests</td></tr>
                  ) : proRequests.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '16px' }}>{r.id}</td>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{r.email}</td>
                      <td style={{ padding: '16px' }}><span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Pending</span></td>
                      <td style={{ padding: '16px' }}>
                        {r.proSlipUrl ? (
                          <button onClick={() => showSlip(r.proSlipUrl)} style={{ background: 'none', border: 'none', color: 'var(--primary-main)', cursor: 'pointer', textDecoration: 'underline' }}>View Slip</button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button onClick={() => handleApprovePro(r.id)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }}>
                          อนุมัติ
                        </button>
                        <button onClick={() => handleRejectPro(r.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                          ปฏิเสธ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View (< 640px) */}
            <div className="mobile-card-list">
              {proRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No pending requests</div>
              ) : proRequests.map((r) => (
                <div key={`mob-req-${r.id}`} className="mobile-card-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{r.id}</span>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.email}</div>
                    </div>
                    <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Pending</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    {r.proSlipUrl ? (
                      <button onClick={() => showSlip(r.proSlipUrl)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        View Slip
                      </button>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No Slip</span>}
                    <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleApprovePro(r.id)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', minHeight: '36px', flex: 1, maxWidth: '110px' }}>
                        อนุมัติ
                      </button>
                      <button onClick={() => handleRejectPro(r.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', minHeight: '36px', flex: 1, maxWidth: '110px' }}>
                        ปฏิเสธ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Desktop View */}
            <div className="table-responsive desktop-table-view">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>ID</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Pro</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Balance (฿)</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '16px' }}>{u.id}</td>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{u.name || '-'}</td>
                      <td style={{ padding: '16px' }}>{u.email}</td>
                      <td style={{ padding: '16px' }}>
                        {u.isPro ? <Check size={18} color="var(--success)" /> : <X size={18} color="var(--text-muted)" />}
                      </td>
                      <td style={{ padding: '16px', color: u.balance >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 'bold' }}>
                        ฿{u.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            style={{ background: 'var(--bg-hover)', color: 'var(--primary-main)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                            title="View Transactions"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleEditUser(u)}
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                            title="Edit User"
                          >
                            <Edit size={18} />
                          </button>
                          {!u.isAdmin && (
                            <button 
                              onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                              style={{ background: 'var(--bg-hover-danger)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View (< 640px) */}
            <div className="mobile-card-list">
              {users.map((u) => (
                <div key={`mob-u-${u.id}`} className="mobile-card-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{u.name || '-'}</span>
                        {u.isPro && (
                          <span style={{ background: 'rgba(39, 174, 96, 0.15)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>PRO</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>{u.email}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Balance</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: u.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                        ฿{u.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{u.id}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                        style={{ background: 'var(--bg-hover)', color: 'var(--primary-main)', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500, minHeight: '36px' }}
                      >
                        <Eye size={16} /> <span>Tx</span>
                      </button>
                      <button 
                        onClick={() => handleEditUser(u)}
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500, minHeight: '36px' }}
                      >
                        <Edit size={16} /> <span>Edit</span>
                      </button>
                      {!u.isAdmin && (
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                          style={{ background: 'var(--bg-hover-danger)', color: 'var(--danger)', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500, minHeight: '36px' }}
                        >
                          <Trash2 size={16} /> <span>Del</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .table-row-hover:hover {
          background-color: var(--bg-hover);
        }
      `}} />
    </div>
    </Layout>
  );
};

export default AdminDashboard;
