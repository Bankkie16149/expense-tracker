import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Footer from '../components/Footer';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Sparkles,
  Lightbulb,
  ShoppingCart,
  Banknote,
  Home,
  ArrowRightLeft,
  AlertTriangle,
  Info,
  LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import TransactionRow from '../components/Dashboard/TransactionRow';
import MobileTransactionCard from '../components/Dashboard/MobileTransactionCard';
import InsightCard from '../components/Dashboard/InsightCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';
import { fetchWithAuth } from '../utils/api';
import CategoryIcon from '../components/CategoryIcon';
import AdModal from '../components/AdModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, getMonthName, translateInsight, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [ad, setAd] = useState(null);
  const [showAd, setShowAd] = useState(false);
  
  const currentMonthStr = new Date().getMonth().toString();
  const [filterMonth, setFilterMonth] = useState(currentMonthStr);
  const [filterDate, setFilterDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const currentYearStr = new Date().getFullYear().toString();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { transactions, stats, forecast, isLoading, refresh } = useTransactions(filterMonth, currentYearStr);

  const fetchAd = async () => {
    try {
      const res = await fetchWithAuth('/api/ads/active');
      if (res.ok) {
        const ads = await res.json();
        if (ads && ads.length > 0) {
          const randomAd = ads[Math.floor(Math.random() * ads.length)];
          setAd(randomAd);
          setShowAd(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch ad', error);
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!user.isPro) {
      fetchAd();
    }
  }, []);

  useEffect(() => {
    if (transactions.length === 0) return;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const rolloverKey = `rollover_prompt_${currentYear}_${currentMonth}`;
    
    if (!localStorage.getItem(rolloverKey)) {
      const hasRollover = transactions.some(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.title === 'ยอดยกมา';
      });

      if (!hasRollover) {
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth < 0) {
          prevMonth = 11;
          prevYear -= 1;
        }

        const prevMonthTx = transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });

        const prevIncome = prevMonthTx.filter(t => t.category?.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const prevExpense = prevMonthTx.filter(t => t.category?.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const prevBalance = prevIncome - prevExpense;

        if (prevBalance > 0) {
          if (user.isPro) {
            Swal.fire({
              title: language === 'th' ? 'จัดการยอดคงเหลือเดือนที่แล้ว' : 'Manage Last Month Balance',
              text: language === 'th' 
                ? `คุณมียอดคงเหลือจากเดือนที่แล้ว ฿${prevBalance.toLocaleString()} ต้องการจัดการอย่างไร?`
                : `You have a remaining balance of ฿${prevBalance.toLocaleString()} from last month.`,
              icon: 'question',
              showDenyButton: true,
              showCancelButton: true,
              confirmButtonColor: 'var(--success)',
              denyButtonColor: 'var(--primary-light)',
              cancelButtonColor: 'var(--text-muted)',
              confirmButtonText: language === 'th' ? 'ทบเป็นรายรับเดือนนี้' : 'Rollover to this month',
              denyButtonText: language === 'th' ? 'เก็บเข้าการออม' : 'Save to Savings',
              cancelButtonText: language === 'th' ? 'ไม่ทำอะไร' : 'Do nothing'
            }).then(async (result) => {
              if (result.isConfirmed) {
                try {
                  const targetDate = new Date(currentYear, currentMonth, 1);
                  const localDateStr = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                  
                  const response = await fetchWithAuth('/api/transactions', {
                    method: 'POST',
                    body: JSON.stringify({
                      title: 'ยอดยกมา',
                      subtitle: 'อื่นๆ',
                      categoryName: 'Income',
                      type: 'income',
                      amount: prevBalance,
                      date: localDateStr
                    }),
                  });
                  if (response.ok) {
                    localStorage.setItem(rolloverKey, 'true');
                    Swal.fire('สำเร็จ!', 'เพิ่มยอดยกมาเรียบร้อยแล้ว', 'success');
                    if (refresh) refresh();
                    else window.location.reload();
                  }
                } catch(e) {
                  console.error(e);
                }
              } else if (result.isDenied) {
                try {
                  const res = await fetchWithAuth('/api/savings');
                  if (res.ok) {
                    const data = await res.json();
                    const goals = data.goals;
                    
                    if (goals.length === 0) {
                      Swal.fire('Error', language === 'th' ? 'คุณยังไม่มีเป้าหมายการออม กรุณาสร้างเป้าหมายก่อน' : 'No savings goals found. Please create one first.', 'error');
                      return;
                    }
                    
                    const inputOptions = {};
                    goals.forEach(g => {
                      inputOptions[g.id] = g.name;
                    });
                    
                    const { value: selectedGoalId } = await Swal.fire({
                      title: language === 'th' ? 'เลือกเป้าหมายการออม' : 'Select Savings Goal',
                      input: 'select',
                      inputOptions,
                      inputPlaceholder: language === 'th' ? 'เลือกเป้าหมาย' : 'Select a goal',
                      showCancelButton: true
                    });
                    
                    if (selectedGoalId) {
                      const addRes = await fetchWithAuth(`/api/savings/goals/${selectedGoalId}/add`, {
                        method: 'POST',
                        body: JSON.stringify({ amount: prevBalance })
                      });
                      
                      if (addRes.ok) {
                        localStorage.setItem(rolloverKey, 'true');
                        Swal.fire('สำเร็จ!', language === 'th' ? 'นำยอดเงินเก็บเข้าการออมเรียบร้อยแล้ว' : 'Saved to savings successfully', 'success');
                        setTimeout(() => navigate('/savings'), 1500);
                      }
                    }
                  }
                } catch(e) {
                  console.error(e);
                }
              } else {
                localStorage.setItem(rolloverKey, 'true');
              }
            });
          } else {
            Swal.fire({
              title: 'ทบยอดเดือนที่แล้ว?',
              text: `คุณมียอดคงเหลือจากเดือนที่แล้ว ฿${prevBalance.toLocaleString()} ต้องการนำมาเป็นรายรับเริ่มต้นของเดือนนี้หรือไม่?`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonColor: 'var(--success)',
              cancelButtonColor: 'var(--text-muted)',
              confirmButtonText: 'ใช่, นำยอดมาทบ',
              cancelButtonText: 'ไม่เป็นไร'
            }).then(async (result) => {
              if (result.isConfirmed) {
                try {
                  const targetDate = new Date(currentYear, currentMonth, 1);
                  const localDateStr = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                  
                  const response = await fetchWithAuth('/api/transactions', {
                    method: 'POST',
                    body: JSON.stringify({
                      title: 'ยอดยกมา',
                      subtitle: 'อื่นๆ',
                      categoryName: 'Income',
                      type: 'income',
                      amount: prevBalance,
                      date: localDateStr
                    }),
                  });
                  if (response.ok) {
                    localStorage.setItem(rolloverKey, 'true');
                    Swal.fire('สำเร็จ!', 'เพิ่มยอดยกมาเรียบร้อยแล้ว', 'success');
                    if (refresh) refresh();
                    else window.location.reload();
                  }
                } catch(e) {
                  console.error(e);
                }
              } else {
                localStorage.setItem(rolloverKey, 'true');
              }
            });
          }
        } else {
          localStorage.setItem(rolloverKey, 'true');
        }
      } else {
        localStorage.setItem(rolloverKey, 'true');
      }
    }
  }, [transactions, refresh]);

  const filteredTransactions = transactions.filter(tItem => {
    if (filterDate) {
      const tDate = new Date(tItem.date);
      const localDate = new Date(tDate.getTime() - (tDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      if (localDate !== filterDate) return false;
    }

    if (!searchQuery && filterCategory === 'all') return true;

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

    let matchesCategory = true;
    if (filterCategory !== 'all') {
      matchesCategory = (tItem.category?.name?.toLowerCase() === filterCategory.toLowerCase() || tItem.category?.type?.toLowerCase() === filterCategory.toLowerCase());
    }

    return matchesSearch && matchesCategory;
  });

  const chartData = [
    {
      name: t('jan').substring(0, 3), 
      [t('income')]: stats?.monthlyIncome || 0,
      [t('expense')]: stats?.monthlyExpenses || 0,
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid var(--border)', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--primary-dark)' }}>{getMonthName(parseInt(filterMonth))}</p>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '4px' }}>
              <span>{entry.name}:</span>
              <span style={{ fontWeight: 600 }}>฿{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery} showSearch={true}>
      {showAd && <AdModal ad={ad} onClose={() => setShowAd(false)} />}
      <div className="dashboard-header">
        <div className="header-title flex-wrap" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, marginTop: '6px', flexWrap: 'wrap' }}>
          <LayoutDashboard size={28} style={{ color: 'gray', flexShrink: 0, marginTop: '22px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start', minWidth: 0, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, lineHeight: 1.2, paddingTop: '3px' }}>{t('overviewTitle')}</h1>
            <p style={{ margin: 0, lineHeight: 1.4 }}>{t('overviewDesc')}</p>
            {transactions.length > 0 && (() => {
              try {
                const validTxs = transactions.filter(t => t.createdAt || t.date);
                if (validTxs.length === 0) return null;

                const latest = [...validTxs].sort((a, b) => {
                  const dA = new Date(a.createdAt || a.date).getTime();
                  const dB = new Date(b.createdAt || b.date).getTime();
                  return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
                })[0];

                const latestTime = new Date(latest.createdAt || latest.date);
                if (isNaN(latestTime.getTime())) return null;

                return (
                  <div style={{
                    marginTop: '0.25rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-body)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                    alignSelf: 'flex-start'
                  }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', flexShrink: 0 }}></span>
                    {language === 'th' ? 'บันทึกล่าสุด: ' : 'Last saved: '}
                    {latestTime.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                );
              } catch (e) {
                console.error(e);
                return null;
              }
            })()}
          </div>
        </div>

        <div className="date-picker flex gap-4">
          <input 
            type="date" 
            className="form-control" 
            style={{ width: 'auto' }}
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
            style={{ width: 'auto' }}
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setFilterDate(''); // Clear specific date when month is changed
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i.toString()}>
                {getMonthName(i)}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => navigate('/add-transaction')}>
            <Plus size={18} style={{ marginRight: '8px' }} />
            {t('addTransaction')}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-label">{t('totalIncome')}</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>฿{stats?.monthlyIncome?.toLocaleString() || 0}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">{t('totalExpense')}</span>
          <span className="stat-value" style={{ color: 'var(--danger)' }}>฿{stats?.monthlyExpenses?.toLocaleString() || 0}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">{t('netBalance')}</span>
          <span className="stat-value">฿{stats?.monthlyBalance?.toLocaleString() || 0}</span>
          <span className={`stat-trend ${stats?.monthlyBalance >= 0 ? 'trend-up' : 'trend-down'}`}>
            {stats?.monthlyBalance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} 
            {stats?.monthlyBalance >= 0 ? ` ${t('trendUp')}` : ` ${t('trendDown')}`}
          </span>
        </div>
      </div>

      <div className="main-grid">
        <div className="card main-dashboard-card">
          <div className="flex justify-between items-center mb-6">
            <h3 style={{ fontSize: '1.25rem' }}>{t('chartTitle')}</h3>
          </div>
          
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: isMobile ? 10 : 30, left: isMobile ? -15 : 20, bottom: 5 }}
                barSize={isMobile ? 22 : 45}
              >
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.9}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey={t('income')} fill="url(#colorIncome)" radius={[8, 8, 0, 0]} />
                <Bar dataKey={t('expense')} fill="url(#colorExpense)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{t('recentTransactions')}</h3>
              
              <div style={{ position: 'relative' }}>
                <select 
                  style={{ 
                    padding: '6px 32px 6px 16px', 
                    fontSize: '0.85rem',
                    borderRadius: '20px',
                    appearance: 'none',
                    background: 'var(--bg-body)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  onMouseOver={(e) => e.target.style.borderColor = 'var(--primary-main)'}
                  onMouseOut={(e) => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="all">{language === 'th' ? 'ทุกหมวดหมู่' : 'All Categories'}</option>
                  <option value="income">{language === 'th' ? 'รายรับทั้งหมด' : 'All Income'}</option>
                  <option value="expense">{language === 'th' ? 'รายจ่ายทั้งหมด' : 'All Expenses'}</option>
                  <option value="food">{language === 'th' ? 'อาหาร' : 'Food'}</option>
                  <option value="housing">{language === 'th' ? 'ที่พัก/บ้าน' : 'Housing'}</option>
                  <option value="transportation">{language === 'th' ? 'เดินทาง' : 'Transportation'}</option>
                </select>
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--primary-main)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            {isLoading ? (
              <p>{t('loading')}</p>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>{t('noTransactions')}</p>
            ) : (
              <>
                {/* Desktop View: Full Data Table */}
                <div className="table-responsive desktop-table-view">
                  <table className="data-table" style={{ width: '100%' }}>
                    <tbody>
                      {filteredTransactions.slice(0, 5).map(tItem => (
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
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Banking-Style Cards (< 640px) */}
                <div className="mobile-card-list">
                  {filteredTransactions.slice(0, 5).map(tItem => (
                    <MobileTransactionCard 
                      key={`mob-${tItem.id}`}
                      icon={<CategoryIcon categoryName={tItem.category?.name || tItem.subtitle} />} 
                      title={tItem.title} 
                      subtitle={tItem.subtitle} 
                      category={tItem.category?.name || tItem.subtitle} 
                      badgeClass={tItem.category?.type === 'income' ? 'badge-income' : 'badge-housing'}
                      badgeStyle={tItem.category?.type === 'income' ? { background: 'rgba(0, 51, 102, 0.1)', color: 'var(--primary-main)' } : {}}
                      date={new Date(tItem.date).toLocaleDateString(t('jan') === 'มกราคม' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' })} 
                      amount={`${tItem.category?.type === 'expense' ? '-' : '+'}฿${tItem.amount.toLocaleString()}`} 
                      isNegative={tItem.category?.type === 'expense'} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card ai-insights">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            <h3>{t('aiInsights')}</h3>
          </div>

          <div className="forecast-banner">
            <div className="banner-label">{t('forecastLabel')}</div>
            <div className="forecast-split">
              <div className="forecast-item">
                <div className="estimate-label">{t('expectedIncome')}</div>
                <div className="estimate-value" style={{ color: '#10b981' }}>฿{forecast?.predictedIncome?.toLocaleString() || 0}</div>
              </div>
              <div className="forecast-divider"></div>
              <div className="forecast-item">
                <div className="estimate-label">{t('expectedExpense')}</div>
                <div className="estimate-value" style={{ color: '#ef4444' }}>฿{forecast?.predictedExpenses?.toLocaleString() || 0}</div>
              </div>
            </div>
            
            <div className="net-forecast">
              <div className="estimate-label">{t('expectedSavings')}</div>
              <div className="flex justify-between items-center">
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{forecast?.netSavings >= 0 ? '+' : '-'}฿{Math.abs(forecast?.netSavings || 0).toLocaleString()}</div>
                <span className="savings-badge">{forecast?.efficiency > 0 ? '+' : ''}{forecast?.efficiency || 0}% {t('efficiency')}</span>
              </div>
            </div>
          </div>

          {forecast?.insights?.map(insight => {
            const mappedInsight = translateInsight(insight);
            return (
              <InsightCard 
                key={mappedInsight.id}
                icon={mappedInsight.type === 'saving' ? <Lightbulb size={18} /> : mappedInsight.type === 'investment' ? <TrendingUp size={18} /> : mappedInsight.type === 'warning' ? <AlertTriangle size={18} color="red" /> : <Info size={18} />} 
                title={mappedInsight.title} 
                text={mappedInsight.text} 
              />
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
