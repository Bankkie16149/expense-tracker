import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { Calculator } from 'lucide-react';
import '../index.css'; // Uses existing styles

const CoPayCalculator = () => {
  const { t, language } = useLanguage();
  const [price, setPrice] = useState('');
  const [govPays, setGovPays] = useState(0);
  const [userPays, setUserPays] = useState(0);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAuthorized = Boolean(user?.isPro || user?.isAdmin);

  useEffect(() => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setGovPays(0);
      setUserPays(0);
      return;
    }

    // Logic: Gov pays 60%, but max 200 THB.
    let calculatedGovPays = numPrice * 0.6;
    if (calculatedGovPays > 200) {
      calculatedGovPays = 200;
    }
    
    setGovPays(calculatedGovPays);
    setUserPays(numPrice - calculatedGovPays);
  }, [price]);

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{  padding: '10px', borderRadius: '12px', color: 'gray', display: 'flex' }}>
            <img src="/thai-chuy-thai.png" alt="Thai Chuy Thai" style={{ width: '1.75em', height: '1.75em', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>{t('calculatorTitle') || (language === 'th' ? 'คำนวณราคา ไทยช่วยไทย' : 'Thai Chuy Thai Calculator')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              {t('calculatorDesc') || (language === 'th' ? 'คำนวณส่วนลด 60/40 (รัฐออกให้สูงสุด 200 บาท/วัน)' : 'Calculate 60/40 co-pay (Gov pays up to 200 THB/day)')}
            </p>
          </div>
        </div>
      </div>

      <div className="main-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card" style={{ padding: '2rem', borderRadius: '32px' }}>
          
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--primary-main)' }}>
              {language === 'th' ? 'ราคาเต็มสินค้า/บริการ (บาท)' : 'Full Price (THB)'}
            </label>
            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
              <input
                type="number"
                className="form-control"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={language === 'th' ? 'ระบุราคา' : 'Enter full price'}
                style={{ fontSize: '1.5rem', padding: '1rem', height: 'auto', textAlign: 'center', fontWeight: '600' }}
                min="0"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {/* Gov Pays */}
            <div className="stat-card" style={{ background: 'rgba(0, 168, 232, 0.1)', border: '1px solid rgba(0, 168, 232, 0.2)', textAlign: 'center', borderRadius: '24px' }}>
              <div className="stat-title" style={{ color: 'var(--primary-light)', fontSize: '1rem', fontWeight: 600 }}>
                {language === 'th' ? 'รัฐออกให้ (60%)' : 'Government Pays (60%)'}
              </div>
              <div className="stat-value" style={{ color: 'var(--primary-main)', fontSize: '2rem', marginTop: '0.5rem' }}>
                ฿{govPays.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {govPays === 200 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 500 }}>
                  * {language === 'th' ? 'ถึงขีดจำกัด 200 บาทแล้ว (ส่วนต่างคุณจ่ายเอง)' : 'Reached 200 THB limit (You pay the rest)'}
                </div>
              )}
            </div>

            {/* User Pays */}
            <div className="stat-card" style={{ background: 'rgba(39, 174, 96, 0.1)', border: '1px solid rgba(39, 174, 96, 0.2)', textAlign: 'center', borderRadius: '24px' }}>
              <div className="stat-title" style={{ color: 'var(--success)', fontSize: '1rem', fontWeight: 600 }}>
                {language === 'th' ? 'เราจ่ายเอง (40%)' : 'You Pay (40%)'}
              </div>
              <div className="stat-value" style={{ color: 'var(--success)', fontSize: '2rem', marginTop: '0.5rem' }}>
                ฿{userPays.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default CoPayCalculator;
