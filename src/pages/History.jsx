import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useTransactions } from '../hooks/useTransactions';
import { useLanguage } from '../contexts/LanguageContext';
import { Download, Trash2, History as HistoryIcon } from 'lucide-react';
import TransactionRow from '../components/Dashboard/TransactionRow';
import Swal from 'sweetalert2';
import CategoryIcon from '../components/CategoryIcon';
import { fetchWithAuth } from '../utils/api';
import PdfExportModal from '../components/PdfExportModal';

const History = () => {
  const { transactions, isLoading } = useTransactions();
  const { t, getMonthName, language } = useLanguage();
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

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
      matchesCategory = (tItem.category?.name?.toLowerCase() === filterCategory.toLowerCase() || tItem.category?.type?.toLowerCase() === filterCategory.toLowerCase());
    }

    return matchesSearch && matchesCategory;
  });

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
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
          <HistoryIcon size={28} style={{ color: 'gray', flexShrink: 0, marginTop: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{t('history')}</h1>
            <p style={{ margin: 0 }}>{t('addTransactionDesc')}</p>
          </div>
        </div>
      </div>

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

        <div className="table-responsive">
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
