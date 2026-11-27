import React from 'react';
import { ShoppingCart, Banknote, Home, Car, ArrowRightLeft, Briefcase, Coffee, Zap, Info, Plus } from 'lucide-react';

export const getCategoryInfo = (categoryName) => {
  const name = categoryName?.toLowerCase() || '';
  
  if (name.includes('food') || name.includes('อาหาร')) {
    return { icon: <ShoppingCart size={20} />, color: '#27AE60', bg: 'rgba(39, 174, 96, 0.15)' };
  }
  if (name.includes('income') || name.includes('เงินเดือน') || name.includes('รายรับ') || name.includes('ยอดยกมา')) {
    return { icon: <Banknote size={20} />, color: 'var(--primary-main)', bg: 'rgba(0, 51, 102, 0.15)' };
  }
  if (name.includes('housing') || name.includes('บ้าน') || name.includes('ที่พัก')) {
    return { icon: <Home size={20} />, color: 'var(--accent)', bg: 'rgba(0, 168, 232, 0.15)' };
  }
  if (name.includes('transportation') || name.includes('เดินทาง') || name.includes('รถ')) {
    return { icon: <Car size={20} />, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
  }
  if (name.includes('work') || name.includes('งาน')) {
    return { icon: <Briefcase size={20} />, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
  }
  if (name.includes('coffee') || name.includes('กาแฟ')) {
    return { icon: <Coffee size={20} />, color: 'var(--primary-main)', bg: 'rgba(0, 168, 232, 0.15)' };
  }
  if (name.includes('utility') || name.includes('ไฟฟ้า') || name.includes('น้ำ')) {
    return { icon: <Zap size={20} />, color: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)' };
  }
  
  // Default fallback
  return { icon: <ArrowRightLeft size={20} />, color: 'var(--text-muted)', bg: 'var(--bg-body)' };
};

const CategoryIcon = ({ categoryName }) => {
  const info = getCategoryInfo(categoryName);
  
  return (
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: info.bg,
      color: info.color,
      flexShrink: 0
    }}>
      {info.icon}
    </div>
  );
};

export default CategoryIcon;
