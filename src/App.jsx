import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import History from './pages/History';
import Savings from './pages/Savings';
import CoPayCalculator from './pages/CoPayCalculator';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserTransactions from './pages/AdminUserTransactions';
import AdminAds from './pages/AdminAds';
import AdminChat from './pages/AdminChat';
import ProtectedRoute from './components/ProtectedRoute';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ChatWidget from './components/ChatWidget';
import { fetchWithAuth } from './utils/api';
import './styles/auth.css';

function App() {
  React.useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetchWithAuth('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('user', JSON.stringify(data.user));
            window.dispatchEvent(new Event('userUpdated'));
          }
        } catch (error) {
          console.error('Failed to fetch user on load', error);
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/add-transaction" element={<ProtectedRoute><AddTransaction /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/savings" element={<ProtectedRoute><Savings /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/calculator" element={<ProtectedRoute><CoPayCalculator /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/ads" element={<ProtectedRoute><AdminAds /></ProtectedRoute>} />
          <Route path="/admin/chat" element={<ProtectedRoute><AdminChat /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute><AdminUserTransactions /></ProtectedRoute>} />
          {/* Redirect unknown routes to dashboard or login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatWidget />
      </Router>
    </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
