import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Mail, User } from 'lucide-react';
import Logo from '../components/Logo';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTarget = searchParams.get('redirect') ? decodeURIComponent(searchParams.get('redirect')) : '/dashboard';
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'transparent', width: '0%' };
    
    const hasLower = /[a-z]/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    const hasLength = pass.length >= 4;
    
    if (!hasLower || !hasUpper || !hasNumber || !hasLength) {
      return { score: 1, label: 'Weak (Requires 4+ chars, A-Z, a-z, 0-9)', color: '#ef4444', width: '33%' };
    }
    
    if (pass.length >= 8) {
      return { score: 3, label: 'Strong', color: '#22c55e', width: '100%' };
    }
    
    return { score: 2, label: 'Medium', color: '#eab308', width: '66%' };
  };

  const strength = getPasswordStrength(formData.password);
  const isPasswordValid = strength.score >= 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && !isPasswordValid) {
      setError('Please meet the minimum password requirements.');
      return;
    }
    setIsLoading(true);
    setError('');
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    const url = isLogin ? `${API_BASE_URL}/api/auth/login` : `${API_BASE_URL}/api/auth/register`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('userUpdated'));
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTarget = searchParams.get('redirect') ? decodeURIComponent(searchParams.get('redirect')) : '/dashboard';
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left Side: Animated Blurred Graphic */}
      <div className="auth-left">
        <div className="auth-bg-image"></div>
        <div className="auth-left-overlay"></div>
        <div className="auth-left-content">
          <h1>Intelligent Wealth Management</h1>
          <p>Experience the next generation of financial tracking and insights. Secure, elegant, and designed for professionals.</p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Logo size={36} />
            </div>
            <h2 className="auth-title">FinTrack</h2>
            <p className="auth-subtitle">{isLogin ? 'Welcome back to your dashboard' : 'Create your secure account'}</p>
          </div>

          {error && (
            <div style={{ color: '#ef4444', background: '#fef2f2', padding: '12px', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="auth-form-group">
                <div className="auth-input-wrapper">
                  <User size={20} className="auth-icon" />
                  <input 
                    type="text" 
                    className="auth-input"
                    placeholder="Full Name" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            <div className="auth-form-group">
              <div className="auth-input-wrapper">
                <Mail size={20} className="auth-icon" />
                <input 
                  type="email" 
                  className="auth-input"
                  placeholder="Email address" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="auth-form-group">
              <div className="auth-input-wrapper">
                <Lock size={20} className="auth-icon" />
                <input 
                  type="password" 
                  className="auth-input"
                  placeholder="Password" 
                  required 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              {!isLogin && formData.password && (
                <div className="auth-strength-container">
                  <div className="auth-strength-bar">
                    <div 
                      className="auth-strength-fill" 
                      style={{ width: strength.width, backgroundColor: strength.color }} 
                    ></div>
                  </div>
                  <div className="auth-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </div>
                </div>
              )}
            </div>

            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}
                  className="auth-link"
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button type="submit" className="auth-btn" disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="auth-link"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </span>
          </div>

          <div style={{ marginTop: '2.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.5' }}>
            <p><Lock size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Enterprise-grade security</p>
            <p style={{ marginTop: '4px' }}>Your data is encrypted and protected.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
