import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTransactions } from '../hooks/useTransactions';
import { useLanguage } from '../contexts/LanguageContext';
import { Download, Trash2, History as HistoryIcon, ShieldCheck, FilterX } from 'lucide-react';
import TransactionRow from '../components/Dashboard/TransactionRow';
import MobileTransactionCard from '../components/Dashboard/MobileTransactionCard';
import Swal from 'sweetalert2';
import CategoryIcon from '../components/CategoryIcon';
import { fetchWithAuth } from '../utils/api';
import PdfExportModal from '../components/PdfExportModal';

const History = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const verifyDoc = searchParams.get('verify');
  const queryMonth = searchParams.get('month');
  const queryDate = searchParams.get('date');
  const queryCategory = searchParams.get('category');

  const { transactions, isLoading } = useTransactions();
  const { t, getMonthName, language } = useLanguage();
  const [filterMonth, setFilterMonth] = useState(queryMonth !== null ? queryMonth : 'all');
  const [filterDate, setFilterDate] = useState(queryDate !== null ? queryDate : '');
  const [filterCategory, setFilterCategory] = useState(queryCategory !== null ? queryCategory : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  // Extract unique category names from transactions for dynamic filter dropdown
  const uniqueCategories = useMemo(() => {
    const names = new Set();
    transactions.forEach((tItem) => {
      const name = tItem.category?.name || tItem.subtitle;
      if (name) names.add(name);
    });
    return Array.from(names);
  }, [transactions]);

  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('user') || '{}'));
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener('userUpdated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  const filteredTransactions = transactions.filter(tItem => {
    const tDate = new Date(tItem.date);
    
    // Month filter
    if (filterMonth !== 'all') {
      const tMonth = tDate.getMonth().toString();
      if (tMonth !== filterMonth) return false;
    }

    // Date filter
    if (filterDate) {
      // Compare YYYY-MM-DD
      const localDate = new Date(tDate.getTime() - (tDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      if (localDate !== filterDate) return false;
    }
    
    // Search query filter
    let matchesSearch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matchesSearch = (
        tItem.title?.toLowerCase().includes(query) ||
        tItem.category?.name?.toLowerCase().includes(query) ||
        tItem.subtitle?.toLowerCase().includes(query) ||
        tItem.amount?.toString().includes(query)
      );
    }

    // Category filter
    let matchesCategory = true;
    if (filterCategory !== 'all') {
      const catLower = filterCategory.toLowerCase();
      matchesCategory = (
        tItem.category?.name?.toLowerCase() === catLower ||
        tItem.category?.type?.toLowerCase() === catLower ||
        tItem.subtitle?.toLowerCase() === catLower
      );
    }

    return matchesSearch && matchesCategory;
  });

  const handleResetFilters = () => {
    setFilterMonth('all');
    setFilterDate('');
    setFilterCategory('all');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('month');
    newParams.delete('date');
    newParams.delete('category');
    setSearchParams(newParams, { replace: true });
  };

  const triggerExport = () => {
    if (filteredTransactions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: language === 'th' ? 'ไม่พบข้อมูล' : 'No Data',
        text: language === 'th' ? 'ไม่สามารถส่งออกได้เนื่องจากไม่มีข้อมูลตามเงื่อนไขที่เลือก' : 'Cannot export because there is no data.',
        confirmButtonColor: 'var(--primary-main)'
      });
      return;
    }

    setIsPdfModalOpen(true);
  };

  const handleDeleteAll = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this! This deletes all your transactions.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete all!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetchWithAuth('/api/transactions/all', {
          method: 'DELETE',
        });
        
        if (response.ok) {
          Swal.fire(
            'Deleted!',
            'Your transactions have been deleted.',
            'success'
          );
          // Refresh page to clear data
          window.location.reload();
        } else {
          throw new Error('Failed to delete');
        }
      } catch {
        Swal.fire('Error', 'Failed to delete transactions.', 'error');
      }
    }
  };

  return (
    <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery} showSearch={true}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
          <HistoryIcon size={28} style={{ color: 'gray', flexShrink: 0, marginTop: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{t('history')}</h1>
            <p style={{ margin: 0 }}>{t('addTransactionDesc')}</p>
          </div>
        </div>
      </div>

      {verifyDoc && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          color: '#15803d',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <ShieldCheck size={26} style={{ flexShrink: 0, color: '#16a34a', marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.95rem' }}>
                  {language === 'th' ? 'การยืนยันตัวตนและความถูกต้องสำเร็จ' : 'Document Authenticity Verified'}
                </strong>
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  color: '#166534'
                }}>
                  {verifyDoc}
                </span>
              </div>

              {(filterMonth !== 'all' || filterDate || filterCategory !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    fontSize: '0.78rem',
                    background: '#ffffff',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    color: '#15803d',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#dcfce7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <FilterX size={14} />
                  {language === 'th' ? 'รีเซ็ตตัวกรอง (ดูทั้งหมด)' : 'Reset Filters (View All)'}
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.82rem', color: '#166534', marginTop: '6px', lineHeight: 1.5 }}>
              {language === 'th' ? (
                <>
                  เอกสารอ้างอิงเลขที่: <strong>{verifyDoc}</strong> ได้รับการยืนยันความถูกต้องผ่านระบบ FinTrack Cloud เรียบร้อยแล้ว
                  {(filterMonth !== 'all' || filterDate || filterCategory !== 'all') ? (
                    <span style={{ display: 'block', marginTop: '4px', color: '#14532d', fontWeight: 500 }}>
                      ⚡ ระบบได้ตั้งค่าตัวกรองตามเงื่อนไขที่ออกในรายงานให้อัตโนมัติ (พบ <strong>{filteredTransactions.length}</strong> รายการ)
                    </span>
                  ) : (
                    <span style={{ display: 'block', marginTop: '4px', color: '#14532d' }}>
                      แสดงรายการธุรกรรมทั้งหมดตามรายงานฉบับนี้ (พบ <strong>{filteredTransactions.length}</strong> รายการ)
                    </span>
                  )}
                </>
              ) : (
                <>
                  Document reference: <strong>{verifyDoc}</strong> is officially verified by FinTrack Cloud System.
                  {(filterMonth !== 'all' || filterDate || filterCategory !== 'all') ? (
                    <span style={{ display: 'block', marginTop: '4px', color: '#14532d', fontWeight: 500 }}>
                      ⚡ Filters automatically applied matching the exported report criteria (found <strong>{filteredTransactions.length}</strong> records).
                    </span>
                  ) : (
                    <span style={{ display: 'block', marginTop: '4px', color: '#14532d' }}>
                      Showing all transactions for this report (found <strong>{filteredTransactions.length}</strong> records).
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card history-card">
        <div className="history-header">
          <h2 style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', margin: 0 }}>{t('recentTransactions')}</h2>
          <div className="history-filters-row">
            <div className="history-filters-group">
              <select 
                className="form-control" 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">{language === 'th' ? 'ทุกหมวดหมู่' : 'All Categories'}</option>
                <option value="income">{language === 'th' ? 'รายรับทั้งหมด' : 'All Income'}</option>
                <option value="expense">{language === 'th' ? 'รายจ่ายทั้งหมด' : 'All Expenses'}</option>
                <option value="food">{language === 'th' ? 'อาหาร' : 'Food'}</option>
                <option value="housing">{language === 'th' ? 'ที่พัก/บ้าน' : 'Housing'}</option>
                <option value="transportation">{language === 'th' ? 'เดินทาง' : 'Transportation'}</option>
                {uniqueCategories
                  .filter((cat) => !['food', 'housing', 'transportation', 'income', 'expense', 'อาหาร', 'ที่พัก/บ้าน', 'เดินทาง'].includes(cat.toLowerCase()))
                  .map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                }
                {filterCategory !== 'all' && 
                 !['food', 'housing', 'transportation', 'income', 'expense', 'อาหาร', 'ที่พัก/บ้าน', 'เดินทาง'].includes(filterCategory.toLowerCase()) && 
                 !uniqueCategories.map(c => c.toLowerCase()).includes(filterCategory.toLowerCase()) && (
                  <option value={filterCategory}>{filterCategory}</option>
                )}
              </select>
              <input 
                type="date" 
                className="form-control" 
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  if (e.target.value) {
                    const d = new Date(e.target.value);
                    setFilterMonth(d.getMonth().toString());
                  }
                }}
              />
              <select 
                className="form-control" 
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setFilterDate(''); // Clear specific date when month is changed
                }}
              >
                <option value="all">{t('allTime')}</option>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i.toString()}>
                    {getMonthName(i)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="history-actions-group">
              <button className="btn btn-outline" onClick={triggerExport} style={{ padding: '8px 12px', justifyContent: 'center', display: 'flex', alignItems: 'center' }}>
                <Download size={16} className="mr-2" style={{ marginRight: '8px' }} />
                Export
              </button>
              <button className="btn" onClick={handleDeleteAll} style={{ padding: '8px 12px', background: 'var(--danger)', color: 'white', justifyContent: 'center', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={16} className="mr-2" style={{ marginRight: '8px' }} />
                Delete All
              </button>
            </div>
          </div>
        </div>

        {/* Desktop View: Full Data Table */}
        <div className="table-responsive desktop-table-view">
          <table className="data-table" style={{ minWidth: '600px' }}>
            <thead>
              <tr>
                <th>{t('transaction')}</th>
                <th>{t('category')}</th>
                <th>{t('date')}</th>
                <th style={{ textAlign: 'right' }}>{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tItem => (
                <TransactionRow 
                  key={tItem.id}
                  icon={<CategoryIcon categoryName={tItem.category?.name || tItem.subtitle} />} 
                  title={tItem.title} 
                  subtitle={tItem.subtitle} 
                  category={tItem.category?.name || tItem.subtitle} 
                  badgeClass={tItem.category?.type === 'income' ? 'badge-income' : 'badge-housing'}
                  badgeStyle={tItem.category?.type === 'income' ? { background: 'rgba(0, 51, 102, 0.1)', color: 'var(--primary-main)' } : {}}
                  date={new Date(tItem.date).toLocaleDateString(t('jan') === 'มกราคม' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                  amount={`${tItem.category?.type === 'expense' ? '-' : '+'}฿${tItem.amount.toLocaleString()}`} 
                  isNegative={tItem.category?.type === 'expense'} 
                />
              ))}
              {!isLoading && filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No transactions found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Banking-Style Cards (< 640px) */}
        <div className="mobile-card-list">
          {filteredTransactions.map(tItem => (
            <MobileTransactionCard 
              key={`mob-hist-${tItem.id}`}
              icon={<CategoryIcon categoryName={tItem.category?.name || tItem.subtitle} />} 
              title={tItem.title} 
              subtitle={tItem.subtitle} 
              category={tItem.category?.name || tItem.subtitle} 
              badgeClass={tItem.category?.type === 'income' ? 'badge-income' : 'badge-housing'}
              badgeStyle={tItem.category?.type === 'income' ? { background: 'rgba(0, 51, 102, 0.1)', color: 'var(--primary-main)' } : {}}
              date={new Date(tItem.date).toLocaleDateString(t('jan') === 'มกราคม' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
              amount={`${tItem.category?.type === 'expense' ? '-' : '+'}฿${tItem.amount.toLocaleString()}`} 
              isNegative={tItem.category?.type === 'expense'} 
            />
          ))}
          {!isLoading && filteredTransactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No transactions found for this period.
            </div>
          )}
        </div>
      </div>

      {isPdfModalOpen && (
        <PdfExportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          transactions={filteredTransactions}
          filterMonth={filterMonth}
          filterDate={filterDate}
          filterCategory={filterCategory}
          initialLang={language || 'th'}
          user={currentUser}
        />
      )}
    </Layout>
  );
};

export default History;
