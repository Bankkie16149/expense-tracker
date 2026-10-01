import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';
import { Trash2, Edit, Plus, Eye, Check, X, UserPlus, Megaphone, MessageSquare } from 'lucide-react';
import Layout from '../components/Layout';
import Swal from 'sweetalert2';
import '../index.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [proRequests, setProRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email !== 'tanakorn.tip@student.mahidol.edu') {
      navigate('/');
    } else {
      if (activeTab === 'users') loadUsers();
      else loadProRequests();
    }
  }, [navigate, activeTab]);

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
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/admin/chat')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', background: 'white' }}>
              <MessageSquare size={18} />
              {language === 'th' ? 'แชทกับผู้ใช้' : 'User Chats'}
            </button>
            <button onClick={() => navigate('/admin/ads')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={18} />
              {language === 'th' ? 'จัดการโฆษณา' : 'Manage Ads'}
            </button>
            <button onClick={handleCreateUser} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} />
              {language === 'th' ? 'เพิ่มผู้ใช้' : 'Add User'}
            </button>
          </div>
        </div>

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
          <div className="table-responsive">
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
        ) : (
          <div className="table-responsive">
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
                        {u.email !== 'tanakorn.tip@student.mahidol.edu' && (
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
