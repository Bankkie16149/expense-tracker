import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Check, CheckCheck } from 'lucide-react';
import { io } from 'socket.io-client';
import { fetchWithAuth } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [adminInfo, setAdminInfo] = useState(null);
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });
  const { t, language } = useLanguage();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleUserUpdate = () => {
      const userStr = localStorage.getItem('user');
      setUser(userStr ? JSON.parse(userStr) : null);
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    // Also listen to storage events in case of multiple tabs
    window.addEventListener('storage', handleUserUpdate);

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  // We only show the widget for non-admin logged-in users
  // (Admins will have a separate dashboard for chat)
  const isAdmin = Boolean(user?.isAdmin);
  const shouldRender = user && !isAdmin;

  useEffect(() => {
    if (!shouldRender) return;

    // Fetch admin info
    const getAdmin = async () => {
      try {
        const res = await fetchWithAuth('/api/chat/admin-info');
        if (res.ok) {
          const data = await res.json();
          setAdminInfo(data);
          
          // Fetch chat history
          const histRes = await fetchWithAuth(`/api/chat/${data.id}`);
          if (histRes.ok) {
            const histData = await histRes.json();
            setMessages(histData);
          }
        }
      } catch (err) {
        console.error('Error fetching admin or chat history:', err);
      }
    };
    
    getAdmin();
  }, [shouldRender]);

  useEffect(() => {
    if (!adminInfo || !shouldRender) return;

    let intervalId;
    if (isOpen) {
      // Fetch messages periodically when chat is open
      const pollData = async () => {
        try {
          const [msgRes, adminRes] = await Promise.all([
            fetchWithAuth(`/api/chat/${adminInfo.id}`),
            fetchWithAuth('/api/chat/admin-info')
          ]);
          
          if (msgRes.ok) {
            const data = await msgRes.json();
            setMessages(data);
          }
          if (adminRes.ok) {
            const data = await adminRes.json();
            setAdminInfo(data);
            if (isOpen && data.id) {
              fetchWithAuth('/api/chat/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: data.id })
              }).catch(() => {});
            }
          }
        } catch (err) {
          console.error("Error fetching chat data:", err);
        }
      };

      pollData();
      intervalId = setInterval(pollData, 3000); // Poll every 3 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [shouldRender, adminInfo?.id, isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!adminInfo) return;
    
    const content = inputValue;
    setInputValue(''); // Clear immediately for good UX

    try {
      const res = await fetchWithAuth('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: adminInfo.id,
          content: content
        })
      });
      
      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (!shouldRender) return null;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) + (language === 'th' ? ' น.' : '');
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return language === 'th' ? 'ออฟไลน์' : 'Offline';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return language === 'th' ? 'เมื่อสักครู่' : 'Just now';
    if (diffMins < 60) return language === 'th' ? `${diffMins} นาทีที่แล้ว` : `${diffMins} mins ago`;
    if (diffHours < 24) return language === 'th' ? `${diffHours} ชั่วโมงที่แล้ว` : `${diffHours} hours ago`;
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-widget-container">
      {/* Chat Window */}
      {isOpen && (
        <div className="chat-widget-window">
          {/* Header */}
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--primary-main)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: 'white', color: 'var(--primary-main)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '1.2rem', overflow: 'hidden'
                }}>
                  {adminInfo?.profilePic ? (
                    <img src={adminInfo.profilePic} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    adminInfo?.name?.charAt(0) || 'A'
                  )}
                </div>
                <div style={{
                  position: 'absolute', bottom: '0', right: '0',
                  width: '12px', height: '12px', borderRadius: '50%',
                  backgroundColor: adminInfo?.isOnline ? '#10b981' : '#9ca3af',
                  border: '2px solid var(--primary-main)'
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{adminInfo?.name || 'Admin'}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {adminInfo?.isOnline 
                    ? (language === 'th' ? 'ออนไลน์' : 'Online')
                    : (adminInfo?.lastSeen 
                        ? (language === 'th' ? `ใช้งานล่าสุด: ${formatLastSeen(adminInfo?.lastSeen)}` : `Last seen: ${formatLastSeen(adminInfo?.lastSeen)}`)
                        : (language === 'th' ? 'ออฟไลน์' : 'Offline'))
                  }
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{
              background: 'none', border: 'none', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f8fafc'
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.9rem' }}>
                {language === 'th' ? 'มีอะไรให้เราช่วยเหลือไหมครับ?' : 'How can we help you?'}
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderId === user.id;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: '16px',
                      backgroundColor: isMe ? 'var(--primary-main)' : 'white',
                      color: isMe ? 'white' : 'var(--text-main)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      borderBottomRightRadius: isMe ? '4px' : '16px',
                      borderBottomLeftRadius: !isMe ? '4px' : '16px',
                      fontSize: '0.9rem'
                    }}>
                      {msg.content}
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, textAlign: 'right', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMe && (
                          <span>
                            {msg.isRead ? <CheckCheck size={14} style={{ color: '#bae6fd' }} /> : <Check size={14} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'th' ? 'พิมพ์ข้อความ...' : 'Type a message...'}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              style={{
                background: 'var(--primary-main)',
                color: 'white',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                opacity: inputValue.trim() ? 1 : 0.6
              }}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="chat-widget-btn"
        aria-label="Chat with Admin"
      >
        {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
      </button>
    </div>
  );
};

export default ChatWidget;
