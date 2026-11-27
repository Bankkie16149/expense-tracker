import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  ArrowUp, 
  ArrowDown, 
  Info, 
  MapPin, 
  UploadCloud,
  Loader2,
  ArrowRightLeft,
  Coffee,
  Store,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useTransactions } from '../hooks/useTransactions';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';
import { notifyUser } from '../utils/notifications';

const COFFEE_MENUS = [
  { id: 'espresso', label: 'เอสเพรซโซ่', en: 'Espresso' },
  { id: 'cappuccino', label: 'คาปูชิโน่', en: 'Cappuccino' },
  { id: 'latte', label: 'ลาเต้', en: 'Latte' },
  { id: 'mocha', label: 'มอคค่า', en: 'Mocha' },
  { id: 'americano', label: 'อเมริกาโน่', en: 'Americano' },
  { id: 'thaitea', label: 'ชาไทย', en: 'Thai Tea' },
  { id: 'greentea', label: 'ชาเขียว', en: 'Green Tea' },
];

const COFFEE_BRANDS = [
  { id: 'amazon', label: 'Amazon Cafe' },
  { id: 'punthai', label: 'Punthai Coffee' },
  { id: 'inthanin', label: 'Inthanin Coffee' },
  { id: 'onetotwo', label: '1:2' },
];

const AddTransaction = () => {
  const navigate = useNavigate();
  const { forecast, transactions } = useTransactions();
  const { t, language } = useLanguage();
  const [isExpense, setIsExpense] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [isCoPayMode, setIsCoPayMode] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCoffeeMenu, setSelectedCoffeeMenu] = useState('');
  const [selectedCoffeeBrand, setSelectedCoffeeBrand] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPro = user?.isPro || false;

  useEffect(() => {
    fetchWithAuth('/api/categories')
      .then(res => res.json())
      .then(data => {
        const expList = Array.isArray(data?.expense) ? [...data.expense] : [];
        if (!expList.includes('ค่ากาแฟ')) {
          expList.push('ค่ากาแฟ');
        }
        setCategories({
          expense: expList,
          income: Array.isArray(data?.income) ? data.income : []
        });
      })
      .catch(err => console.error('Error fetching categories:', err));
  }, []);
  const expenseCategories = categories.expense.length > 0 ? categories.expense : ['อาหาร', 'ค่ากาแฟ', 'เดินทาง', 'ที่พัก/บ้าน'];
  const incomeCategories = categories.income;

  const isCoffeeCategory = isExpense && (category === 'ค่ากาแฟ' || category.toLowerCase() === 'coffee');

  const updateCoffeeDescription = (menuLabel, brandLabel) => {
    if (!menuLabel) return;
    if (brandLabel) {
      setDescription(`ค่า${menuLabel} (${brandLabel})`);
    } else {
      setDescription(`ค่า${menuLabel}`);
    }
  };

  const handleSelectCoffeeMenu = (menuLabel) => {
    if (selectedCoffeeMenu === menuLabel) {
      setSelectedCoffeeMenu('');
      setSelectedCoffeeBrand('');
      setDescription('');
    } else {
      setSelectedCoffeeMenu(menuLabel);
      updateCoffeeDescription(menuLabel, selectedCoffeeBrand);
    }
  };

  const handleSelectCoffeeBrand = (brandLabel) => {
    if (selectedCoffeeBrand === brandLabel) {
      setSelectedCoffeeBrand('');
      updateCoffeeDescription(selectedCoffeeMenu, '');
    } else {
      setSelectedCoffeeBrand(brandLabel);
      updateCoffeeDescription(selectedCoffeeMenu, brandLabel);
    }
  };

  const recentCategoriesList = React.useMemo(() => {
    const currentType = isExpense ? 'expense' : 'income';
    const typeTransactions = transactions.filter(t => (t.category?.type || t.type) === currentType);
    
    // Sort by date descending
    const sorted = [...typeTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const uniqueCategories = [];
    const categoryAmounts = {};
    
    for (const t of sorted) {
      const catName = currentType === 'expense' 
        ? (t.category?.name || t.subtitle) 
        : t.subtitle;
        
      if (!catName) continue;
      
      if (!categoryAmounts[catName]) {
        categoryAmounts[catName] = t.amount;
        uniqueCategories.push(catName);
      }
      
      if (uniqueCategories.length >= 4) break;
    }
    
    return uniqueCategories.map(name => ({
      name,
      latestAmount: categoryAmounts[name]
    }));
  }, [transactions, isExpense]);

  const handleSave = async (e) => {
    e.preventDefault();
    
    const amountInput = amount;
    const dateInput = document.querySelector('input[type="date"]').value;
    const categoryInput = category;
    const descriptionInput = description.trim();
    
    let parsedAmount = parseFloat(amountInput) || 0;
    
    let finalTitle = descriptionInput || (isExpense ? t('expense') : t('income'));

    if (isExpense && isCoPayMode) {
      let govPays = parsedAmount * 0.6;
      if (govPays > 200) govPays = 200;
      parsedAmount = parsedAmount - govPays;
      finalTitle = finalTitle + ' (ไทยช่วยไทย)';
    }

    // Expense Limit Check
    if (isExpense) {
      const targetDate = new Date(dateInput);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      
      const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      });
      
      const monthIncome = monthTransactions.filter(t => t.category?.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const monthExpense = monthTransactions.filter(t => t.category?.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const availableBalance = monthIncome - monthExpense;

      if (parsedAmount > availableBalance) {
        Swal.fire({
          icon: 'warning',
          title: 'ยอดเงินไม่เพียงพอ',
          text: `ไม่สามารถบันทึกรายจ่ายนี้ได้ เนื่องจากยอดคงเหลือในเดือนนี้มีเพียง ฿${availableBalance.toLocaleString()}`,
          confirmButtonColor: 'var(--primary-main)'
        });
        return; // stop execution
      }
    }

    setIsSaving(true);
    
    const payload = {
      title: finalTitle,
      subtitle: isExpense ? categoryInput : document.querySelector('select').value,
      categoryName: isExpense ? categoryInput : 'Income',
      type: isExpense ? 'expense' : 'income',
      amount: parsedAmount,
      date: dateInput
    };

    try {
      const response = await fetchWithAuth('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Add to local notifications
        try {
          const user = JSON.parse(localStorage.getItem('user'));
          if (user) {
            notifyUser(user, `ทำธุรกรรม ${payload.title} (฿${payload.amount.toLocaleString()}) สำเร็จ และส่งข้อมูลแจ้งเตือนไปยังอีเมลของคุณเรียบร้อยแล้ว`, 'transaction');
          }
        } catch(e) {
          console.error(e);
        }

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `${isExpense ? 'Expense' : 'Income'} saved successfully!`,
          confirmButtonColor: 'var(--primary-main)'
        });
        navigate('/dashboard');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Failed to save transaction',
        confirmButtonColor: 'var(--primary-main)'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
          <ArrowRightLeft size={28} style={{ color: 'gray', flexShrink: 0, marginTop: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{t('addTransactionTitle')}</h1>
            <p style={{ margin: 0 }}>{t('addTransactionDesc')}</p>
          </div>
        </div>
      </div>

      <div className="main-grid">
        <div className="card form-card">
          <div className="tab-group">
            <button 
              className={`tab-btn ${isExpense ? 'active' : ''}`}
              onClick={() => { setIsExpense(true); setCategory(''); }}
              style={isExpense ? { color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)' } : {}}
            >
              <ArrowUp size={18} /> {t('expense')}
            </button>
            <button 
              className={`tab-btn ${!isExpense ? 'active' : ''}`}
              onClick={() => { setIsExpense(false); setCategory(''); }}
              style={!isExpense ? { color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.1)' } : {}}
            >
              <ArrowDown size={18} /> {t('income')}
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="amount-input-container">
              <span className="amount-label">{t('amount')}</span>
              <div className="amount-wrapper">
                <span className="currency-symbol">฿</span>
                <input 
                  type="text" 
                  inputMode="decimal"
                  className="amount-input" 
                  placeholder="0.00" 
                  autoFocus 
                  style={{ color: isExpense ? 'var(--danger)' : 'var(--success)', borderColor: amountError ? 'red' : undefined }}
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setAmount(val);
                      setAmountError(false);
                    } else {
                      setAmountError(true);
                    }
                  }}
                />
              </div>
              {amountError && (
                <div style={{ color: 'red', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
                  {language === 'th' ? 'ต้องการตัวเลขเท่านั้น' : 'Numbers only'}
                </div>
              )}
            </div>

            {isExpense && isPro && (
              <div style={{ margin: '1rem 0', padding: '1rem', background: isCoPayMode ? 'rgba(0, 168, 232, 0.05)' : 'var(--bg-card)', border: isCoPayMode ? '1px solid rgba(0, 168, 232, 0.3)' : '1px solid var(--border)', borderRadius: '12px', transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setIsCoPayMode(!isCoPayMode)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/thai-chuy-thai.png" alt="Thai Chuy Thai" style={{ width: '1.5em', height: '1.5em', objectFit: 'contain' }} />
                    <span style={{ fontWeight: 600 }}>{language === 'th' ? 'ใช้สิทธิ์โครงการไทยช่วยไทย (60/40)' : 'Use Thai Chuy Thai (60/40)'}</span>
                  </div>
                  <div className={`toggle-switch ${isCoPayMode ? 'active' : ''}`} style={{ width: '40px', height: '20px', borderRadius: '10px', background: isCoPayMode ? 'var(--primary-main)' : 'var(--text-muted)', position: 'relative', transition: 'background 0.3s' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: isCoPayMode ? '22px' : '2px', transition: 'left 0.3s' }}></div>
                  </div>
                </div>
                
                {isCoPayMode && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{language === 'th' ? 'รัฐจ่าย (60%)' : 'Gov Pays'}</div>
                      <div style={{ fontWeight: 600, color: 'var(--primary-main)' }}>
                        ฿{Math.min((parseFloat(amount) || 0) * 0.6, 200).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{language === 'th' ? 'คุณจ่าย (40%)' : 'You Pay'}</div>
                      <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '1.1rem' }}>
                        ฿{((parseFloat(amount) || 0) - Math.min((parseFloat(amount) || 0) * 0.6, 200)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!isExpense && isPro && (
              <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid transparent', visibility: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '1.5em', height: '1.5em' }}></div>
                    <span style={{ fontWeight: 600 }}>{language === 'th' ? 'ใช้สิทธิ์โครงการไทยช่วยไทย (60/40)' : 'Use Thai Chuy Thai (60/40)'}</span>
                  </div>
                  <div style={{ width: '40px', height: '20px' }}></div>
                </div>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">{t('date')}</label>
                <input type="date" className="form-control" required />
              </div>
              <div className="form-group">
                <label className="form-label">{isExpense ? t('category') : t('source')}</label>
                <select 
                  className="form-control" 
                  required 
                  value={category} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategory(val);
                    if (val !== 'ค่ากาแฟ' && val.toLowerCase() !== 'coffee') {
                      setSelectedCoffeeMenu('');
                      setSelectedCoffeeBrand('');
                    }
                  }}
                >
                  <option value="">{isExpense ? t('selectCategory') : t('selectSource')}</option>
                  {isExpense ? expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  )) : (
                    <>
                      <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย (KBank)</option>
                      <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย (KTB)</option>
                      <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์ (SCB)</option>
                      <option value="เงินสด">เงินสด (Cash)</option>
                      <option value="อื่นๆ">อื่นๆ (Other)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Interactive Step-by-Step Coffee Menu & Brand Selector */}
            {isCoffeeCategory && (
              <div className="coffee-selector-box">
                <div className="coffee-step-section">
                  <div className="coffee-step-header">
                    <Coffee size={16} style={{ color: 'var(--accent)' }} />
                    <span>{language === 'th' ? '1. เลือกเมนูเครื่องดื่ม' : '1. Select Drink Menu'}</span>
                  </div>
                  <div className="coffee-chips-grid">
                    {COFFEE_MENUS.map((item) => {
                      const isSelected = selectedCoffeeMenu === item.label;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`coffee-chip-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectCoffeeMenu(item.label)}
                        >
                          <span>{language === 'th' ? item.label : item.en}</span>
                          {isSelected && <Check size={14} style={{ marginLeft: '2px' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCoffeeMenu && (
                  <div className="coffee-step-section coffee-brand-step">
                    <div className="coffee-step-header">
                      <Store size={16} style={{ color: 'var(--primary-main)' }} />
                      <span>
                        {language === 'th'
                          ? `2. เลือกแบรนด์สำหรับ "${selectedCoffeeMenu}"`
                          : `2. Select Brand for "${selectedCoffeeMenu}"`}
                      </span>
                    </div>
                    <div className="coffee-chips-grid">
                      {COFFEE_BRANDS.map((brand) => {
                        const isSelected = selectedCoffeeBrand === brand.label;
                        return (
                          <button
                            key={brand.id}
                            type="button"
                            className={`coffee-brand-btn ${isSelected ? 'active' : ''}`}
                            onClick={() => handleSelectCoffeeBrand(brand.label)}
                          >
                            <span>{brand.label}</span>
                            {isSelected && <Check size={14} style={{ marginLeft: '2px' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('description')}</label>
              <textarea 
                className="form-control" 
                rows="3" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isExpense ? t('descriptionPlaceholderExpense') : t('descriptionPlaceholderIncome')}
              ></textarea>
            </div>

            <div className="form-actions-row">
              <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard')}>{t('cancel')}</button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ 
                  padding: '12px 32px',
                  background: isExpense ? 'var(--primary-dark)' : 'var(--success)'
                }} 
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" style={{ marginRight: '8px' }} />
                    {t('saving')}
                  </>
                ) : t('save')}
              </button>
            </div>
          </form>
        </div>

        <div className="sidebar-aside">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1rem' }}>{t('dailyBudget')}</h3>
              <Info size={16} className="text-muted" />
            </div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('forecastFromHistory')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                  ฿{forecast?.predictedDailyExpense?.toLocaleString() || 0}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              {t('aiAnalysisNote')}
            </p>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
              <MapPin size={16} style={{ color: 'var(--accent)', marginRight: '8px', verticalAlign: 'middle' }} />
              {t('recentCategories')}
            </h3>
            <div className="category-chips">
              {recentCategoriesList.length > 0 ? (
                recentCategoriesList.map((cat, idx) => (
                  <div 
                    key={idx} 
                    className="category-chip" 
                    onClick={() => setCategory(cat.name)}
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '8px 16px',
                      background: category === cat.name ? 'rgba(0, 168, 232, 0.1)' : 'white',
                      border: category === cat.name ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: '12px',
                      marginRight: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontWeight: '600', color: category === cat.name ? 'var(--primary-dark)' : 'inherit' }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ล่าสุด: ฿{cat.latestAmount?.toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ไม่มีประวัติการทำรายการล่าสุด
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .page-header { margin-bottom: 2.5rem; }
        .form-card { 
          max-width: 800px; 
          margin: 0 auto; 
          display: flex;
          flex-direction: column;
        }
        .tab-group {
          display: flex;
          background: #f1f5f9;
          padding: 6px;
          border-radius: 12px;
          margin-bottom: 2.5rem;
        }
        .tab-btn {
          flex: 1 1 0;
          padding: 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--text-muted);
          font-family: inherit;
        }
        .tab-btn.active {
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .amount-input-container { text-align: center; margin-bottom: 3rem; }
        .amount-label {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 1rem;
          display: block;
        }
        .amount-wrapper { display: inline-flex; align-items: center; gap: 12px; max-width: 100%; }
        .currency-symbol { font-size: 2.5rem; font-family: 'Outfit'; color: var(--text-muted); }
        .amount-input {
          border: none;
          background: transparent;
          font-size: 4rem;
          font-family: 'Outfit';
          font-weight: 700;
          width: 100%;
          max-width: 250px;
          text-align: left;
          color: var(--primary-dark);
          border-bottom: 2px solid transparent;
          transition: border-color 0.2s ease;
        }
        .amount-input:focus { outline: none; border-bottom-color: var(--accent); }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .receipt-upload {
          border: 2px dashed var(--border);
          border-radius: 16px;
          padding: 2.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fafafa;
        }
        .receipt-upload:hover { border-color: var(--accent); background: rgba(0, 168, 232, 0.02); }
        .upload-icon {
          width: 48px;
          height: 48px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: var(--shadow-sm);
          color: var(--text-muted);
        }
        .category-chip:hover { border-color: var(--accent); }
        .coffee-selector-box {
          margin: 0.75rem 0 1.25rem;
          padding: 1rem 1.15rem;
          border-radius: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          animation: coffeeSlideIn 0.25s ease-out;
        }
        @keyframes coffeeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .coffee-step-section {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .coffee-brand-step {
          padding-top: 0.85rem;
          border-top: 1px dashed var(--border);
          animation: coffeeSlideIn 0.22s ease-out;
        }
        .coffee-step-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .coffee-chips-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .coffee-chip-btn, .coffee-brand-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 14px;
          min-height: 38px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-main);
          font-size: 0.85rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
        }
        .coffee-chip-btn:hover, .coffee-brand-btn:hover {
          border-color: var(--accent);
        }
        .coffee-chip-btn.active, .coffee-brand-btn.active {
          background: rgba(0, 168, 232, 0.1);
          border-color: var(--accent);
          color: var(--primary-dark);
        }
        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
          .coffee-selector-box { padding: 0.85rem 0.9rem; }
          .coffee-chip-btn, .coffee-brand-btn {
            padding: 7px 12px;
            font-size: 0.82rem;
            min-height: 36px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default AddTransaction;
