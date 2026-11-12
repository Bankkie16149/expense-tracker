import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';
import { Trash2, Plus, Megaphone, ArrowLeft, Image as ImageIcon, Edit, Check, X, Eye, EyeOff } from 'lucide-react';
import Layout from '../components/Layout';
import Swal from 'sweetalert2';

export default function AdminAds() {
  const [ads, setAds] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const navigate = useNavigate();

  // New Ad Form State
  const [showForm, setShowForm] = useState(false);
  const [editAdId, setEditAdId] = useState(null);
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().slice(0, 16);
  };

  useEffect(() => {
    fetchAds();
    fetchUsers();
  }, []);

  const fetchAds = async () => {
    try {
      const res = await fetchWithAuth('/api/ads');
      if (res.ok) {
        const data = await res.json();
        setAds(data);
      }
    } catch (error) {
      console.error('Failed to fetch ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const compressedBase64 = await compressImage(file);
        setImages(prev => [...prev, compressedBase64]);
      }
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditClick = async (ad) => {
    try {
      // Show loading (optional, but good UX if the image is large)
      Swal.fire({ title: 'Loading...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      const res = await fetchWithAuth(`/api/ads/${ad.id}`);
      if (res.ok) {
        const fullAd = await res.json();
        setEditAdId(fullAd.id);
        setImages(fullAd.images || []);
        setDescription(fullAd.description || '');
        setOwnerEmail(fullAd.ownerEmail || '');
        setStartDate(formatDateForInput(fullAd.startDate));
        setEndDate(formatDateForInput(fullAd.endDate));
        setShowForm(true);
        Swal.close();
      } else {
        Swal.fire('Error', 'Failed to fetch ad details', 'error');
      }
    } catch (error) {
      console.error('Fetch ad error:', error);
      Swal.fire('Error', 'Server error', 'error');
    }
  };

  const handleAddNewClick = () => {
    setEditAdId(null);
    setImages([]);
    setDescription('');
    setOwnerEmail('');
    setStartDate('');
    setEndDate('');
    setShowForm(!showForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) {
      return Swal.fire('Error', 'Please upload at least one image', 'error');
    }

    try {
      const url = editAdId ? `/api/ads/${editAdId}` : '/api/ads';
      const method = editAdId ? 'PUT' : 'POST';
      const payload = {
        description,
        images,
        ownerEmail,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      };

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Swal.fire('Success', editAdId ? 'Ad updated successfully' : 'Ad created successfully', 'success');
        setShowForm(false);
        setEditAdId(null);
        setImages([]);
        setDescription('');
        setOwnerEmail('');
        setStartDate('');
        setEndDate('');
        fetchAds();
      } else {
        const data = await res.json();
        Swal.fire('Error', data.error || 'Failed to save ad', 'error');
      }
    } catch (error) {
      console.error('Save ad error:', error);
      Swal.fire('Error', 'Server error', 'error');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetchWithAuth(`/api/ads/${id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          Swal.fire('Deleted!', 'Ad has been deleted.', 'success');
          fetchAds();
        }
      } catch (error) {
        Swal.fire('Error', 'Failed to delete', 'error');
      }
    }
  };

  const toggleStatus = async (ad) => {
    try {
      const res = await fetchWithAuth(`/api/ads/${ad.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !ad.isActive })
      });
      if (res.ok) fetchAds();
    } catch (error) {
      console.error('Toggle status error', error);
    }
  };

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
        <div className="header-title" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>{language === 'th' ? 'จัดการโฆษณา' : 'Ad Management'}</h1>
            <p style={{ color: 'var(--text-muted)' }}>{language === 'th' ? 'สร้างและจัดการป็อปอัพโฆษณา' : 'Create and manage popup advertisements'}</p>
          </div>
          <div className="admin-ads-header-actions">
            <button onClick={() => navigate('/admin')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <ArrowLeft size={18} />
              {language === 'th' ? 'กลับ' : 'Back'}
            </button>
            <button onClick={handleAddNewClick} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              {showForm ? <ArrowLeft size={18} /> : <Plus size={18} />}
              {showForm ? (language === 'th' ? 'ยกเลิก' : 'Cancel') : (language === 'th' ? 'เพิ่มโฆษณา' : 'Add Ad')}
            </button>
          </div>
        </div>

        {showForm ? (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2>{editAdId ? (language === 'th' ? 'แก้ไขโฆษณา' : 'Edit Ad') : (language === 'th' ? 'สร้างโฆษณาใหม่' : 'Create New Ad')}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Images (Upload multiple)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleImageUpload}
                  className="form-control"
                />
                {images.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {images.map((img, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={img} alt={`upload-${i}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                        <button 
                          type="button" 
                          onClick={() => removeImage(i)}
                          style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer' }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                <textarea 
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-control"
                  rows="3"
                ></textarea>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Owner (Select User)</label>
                <select 
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Select Owner --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.email}>{u.email} ({u.name || 'No Name'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Start Date</label>
                  <input type="datetime-local" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-control" />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>End Date</label>
                  <input type="datetime-local" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-control" />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                {editAdId ? 'Save Changes' : 'Save Advertisement'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading ads...</div>
            ) : ads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No ads found.</div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="table-responsive desktop-table-view">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Image</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Description</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Owner</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Duration</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Status</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ads.map(ad => (
                        <tr key={ad.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} className="table-row-hover">
                          <td style={{ padding: '16px' }}>
                            {ad.images && ad.images.length > 0 ? (
                              <img src={ad.images[0]} alt="ad" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                            ) : <ImageIcon size={24} />}
                          </td>
                          <td style={{ padding: '16px', maxWidth: '200px' }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{ad.description}</div>
                          </td>
                          <td style={{ padding: '16px' }}>{ad.ownerEmail}</td>
                          <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {ad.isActive ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.9rem', fontWeight: 500 }}>
                                <Check size={16} /> Active
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                                <X size={16} /> Inactive
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => toggleStatus(ad)}
                                style={{ background: 'var(--bg-hover)', color: ad.isActive ? 'var(--text-muted)' : 'var(--success)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                title={ad.isActive ? "Deactivate" : "Activate"}
                              >
                                {ad.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                              <button 
                                onClick={() => handleEditClick(ad)}
                                style={{ background: 'var(--bg-hover)', color: 'var(--primary-main)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                title="Edit Ad"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => handleDelete(ad.id)}
                                style={{ background: 'var(--bg-hover-danger)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                title="Delete Ad"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (< 640px) */}
                <div className="mobile-card-list">
                  {ads.map(ad => (
                    <div key={`mob-ad-${ad.id}`} className="mobile-card-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {ad.images && ad.images.length > 0 ? (
                          <img src={ad.images[0]} alt="ad" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '56px', height: '56px', background: 'var(--bg-hover)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ImageIcon size={24} color="var(--text-muted)" />
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ad.description}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {ad.ownerEmail}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <div>
                          {ad.isActive ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                              <Check size={14} /> Active
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                              <X size={14} /> Inactive
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => toggleStatus(ad)}
                            style={{ background: 'var(--bg-hover)', color: ad.isActive ? 'var(--text-muted)' : 'var(--success)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                          >
                            {ad.isActive ? <EyeOff size={16} /> : <Eye size={16} />} <span>{ad.isActive ? 'Hide' : 'Show'}</span>
                          </button>
                          <button 
                            onClick={() => handleEditClick(ad)}
                            style={{ background: 'var(--bg-hover)', color: 'var(--primary-main)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                          >
                            <Edit size={16} /> <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(ad.id)}
                            style={{ background: 'var(--bg-hover-danger)', color: 'var(--danger)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                          >
                            <Trash2 size={16} /> <span>Del</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .table-row-hover:hover {
          background-color: var(--bg-hover);
        }
      `}} />
    </Layout>
  );
}
