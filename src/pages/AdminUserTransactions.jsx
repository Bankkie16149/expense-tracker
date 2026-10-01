import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const AdminUserTransactions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const getMonthName = (monthIndex) => {
    const date = new Date(2000, monthIndex, 1);
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'long' });
  };

  const handleEdit = async (tx) => {
    const { value: formValues } = await Swal.fire({
      title: language === 'th' ? 'แก้ไขรายการ' : 'Edit Transaction',
      html: `
        <div style="display: flex; flex-direction: column; gap: 15px; text-align: left; padding: 10px 0; overflow-x: hidden;">
          <div>
            <label style="font-size: 14px; font-weight: bold; color: #555; margin-bottom: 5px; display: block;">
              ${language === 'th' ? 'ชื่อรายการ' : 'Title'}
            </label>
            <input id="swal-title" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box;" value="${tx.title}">
          </div>
          <div>
            <label style="font-size: 14px; font-weight: bold; color: #555; margin-bottom: 5px; display: block;">
              ${language === 'th' ? 'จำนวนเงิน' : 'Amount'}
            </label>
            <input id="swal-amount" type="number" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box;" value="${tx.amount}">
          </div>
          <div>
            <label style="font-size: 14px; font-weight: bold; color: #555; margin-bottom: 5px; display: block;">
              ${language === 'th' ? 'วันที่' : 'Date'}
            </label>
            <input id="swal-date" type="date" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box;" value="${new Date(tx.date).toISOString().split('T')[0]}">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          title: document.getElementById('swal-title').value,
          amount: document.getElementById('swal-amount').value,
          date: document.getElementById('swal-date').value
        }
      }
    });

    if (formValues) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/transactions/${tx.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: formValues.title,
            amount: formValues.amount,
            date: formValues.date
          })
        });

        if (!response.ok) throw new Error('Update failed');
        Swal.fire('Success', language === 'th' ? 'แก้ไขสำเร็จ' : 'Updated successfully', 'success');
        fetchUserData();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  const handleDelete = async (txId) => {
    const result = await Swal.fire({
      title: language === 'th' ? 'ยืนยันการลบ?' : 'Are you sure?',
      text: language === 'th' ? 'ไม่สามารถกู้คืนได้' : "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: language === 'th' ? 'ลบเลย' : 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/transactions/${txId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Delete failed');
        Swal.fire('Deleted!', language === 'th' ? 'ลบรายการสำเร็จ' : 'Transaction deleted.', 'success');
        fetchUserData();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="loading-spinner"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="card" style={{ textAlign: 'center', color: 'var(--danger)', padding: '3rem' }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button className="btn mt-4" onClick={() => navigate('/admin')}>
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const { user, balance: totalBalance, transactions } = data;
  
  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    const matchYear = txDate.getFullYear().toString() === filterYear;
    const matchMonth = filterMonth === 'all' || txDate.getMonth().toString() === filterMonth;
    return matchYear && matchMonth;
  });

  const totalIncome = filteredTransactions.reduce((acc, tx) => tx.category.type === 'income' ? acc + tx.amount : acc, 0);
  const totalExpense = filteredTransactions.reduce((acc, tx) => tx.category.type === 'expense' ? acc + tx.amount : acc, 0);
  const filteredBalance = totalIncome - totalExpense;

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
        <button 
          onClick={() => navigate('/admin')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={18} />
        {language === 'th' ? 'กลับไปหน้า Admin Dashboard' : 'Back to Admin Dashboard'}
      </button>

      <div className="header-title" style={{ marginBottom: '2rem' }}>
        <h1>{user?.name || user?.email}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{user?.email} {user?.isPro && <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>(Pro)</span>}</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>{language === 'th' ? 'ประวัติธุรกรรม' : 'Transaction History'}</h3>
          
          <div className="date-picker" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select 
              style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: '#f8fafc', color: 'var(--text-main)', fontWeight: 500, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', fontSize: '0.9rem' }}
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              onMouseOver={(e) => e.target.style.borderColor = 'var(--primary-main)'}
              onMouseOut={(e) => e.target.style.borderColor = 'var(--border)'}
            >
              <option value="all">{language === 'th' ? 'ทุกเดือน' : 'All Months'}</option>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i.toString()}>
                  {getMonthName(i)}
                </option>
              ))}
            </select>
            <select
              style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: '#f8fafc', color: 'var(--text-main)', fontWeight: 500, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', fontSize: '0.9rem' }}
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              onMouseOver={(e) => e.target.style.borderColor = 'var(--primary-main)'}
              onMouseOut={(e) => e.target.style.borderColor = 'var(--border)'}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            {language === 'th' ? 'ไม่มีรายการธุรกรรม' : 'No transactions found'}
          </p>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Date</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Title</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Category</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '16px' }}>
                      {new Date(tx.date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium' })}
                    </td>
                    <td style={{ padding: '16px', fontWeight: 500 }}>{tx.title}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.85rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tx.category.color || 'var(--primary-main)' }}></span>
                        {tx.category.name}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: tx.category.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                      {tx.category.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button onClick={() => handleEdit(tx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-main)', marginRight: '10px' }} title="Edit">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredTransactions.length > 0 && (
          <div className="admin-summary-card">
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>{language === 'th' ? 'รวมรายรับ' : 'Total Income'}</span>
                <span style={{ color: 'var(--income)', fontWeight: 'bold', fontSize: '1.2rem' }}>+฿{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>{language === 'th' ? 'รวมรายจ่าย' : 'Total Expense'}</span>
                <span style={{ color: 'var(--expense)', fontWeight: 'bold', fontSize: '1.2rem' }}>-฿{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>{language === 'th' ? 'ยอดสุทธิ (Net)' : 'Net Balance'}</span>
              <span style={{ color: filteredBalance >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 'bold', fontSize: '1.4rem' }}>
                {filteredBalance >= 0 ? '+' : ''}฿{filteredBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
};

export default AdminUserTransactions;
