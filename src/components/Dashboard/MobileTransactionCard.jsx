import React from 'react';

const MobileTransactionCard = ({
  icon,
  title,
  subtitle,
  category,
  badgeClass = '',
  badgeStyle = {},
  date,
  amount,
  isNegative,
  checkbox = null,
  actions = null
}) => {
  return (
    <div className="mobile-card-item">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
        {checkbox && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {checkbox}
          </div>
        )}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: '0.95rem',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            color: 'var(--text-main)'
          }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
            <span 
              className={`transaction-badge ${badgeClass}`} 
              style={{ fontSize: '0.7rem', padding: '2px 6px', ...badgeStyle }}
            >
              {category || subtitle}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {date}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '6px' }}>
        <div style={{ 
          textAlign: 'right', 
          fontWeight: 700, 
          fontSize: '0.95rem',
          whiteSpace: 'nowrap',
          color: isNegative ? 'var(--danger)' : 'var(--success)' 
        }}>
          {amount}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTransactionCard;
