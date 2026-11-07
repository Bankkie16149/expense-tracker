import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';
import { MessageSquare, ArrowLeft, Send, Trash2, Check, CheckCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { io } from 'socket.io-client';
import Layout from '../components/Layout';

const AdminChat = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [socket, setSocket] = useState(null);
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const admin = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!admin?.isAdmin) {
      navigate('/');
      return;
    }

    fetchUsers();
  }, [navigate]);

  useEffect(() => {
    let intervalId;
    
    // Poll for user list updates and messages if a user is selected
    const pollData = async () => {
      fetchUsers();
      if (selectedUser) {
        // Fetch new messages
        try {
          const res = await fetchWithAuth(`/api/chat/${selectedUser.id}`);
          if (res.ok) {
            const data = await res.json();
            setMessages(data);
            fetchWithAuth('/api/chat/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId: selectedUser.id })
            }).catch(() => {});
          }
        } catch (err) {
          console.error('Error fetching messages:', err);
        }
      }
    };

    intervalId = setInterval(pollData, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedUser?.id]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      // mark as read
      fetchWithAuth('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: selectedUser.id })
      }).then(() => {
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, unreadCount: 0 } : u));
      });
    }
  }, [selectedUser]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, selectedUser]);

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/chat/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const res = await fetchWithAuth(`/api/chat/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedUser) return;
    
    const content = inputValue;
    setInputValue('');

    try {
      const res = await fetchWithAuth('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content: content
        })
      });
      
      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        fetchUsers(); // Update the sidebar with latest message
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleClearChat = async () => {
    if (!selectedUser) return;
    
    const confirmResult = await Swal.fire({
      title: language === 'th' ? 'ล้างประวัติแชท?' : 'Clear Chat History?',
      text: language === 'th' ? `คุณแน่ใจหรือไม่ที่จะลบประวัติการแชททั้งหมดกับ ${selectedUser.name}?` : `Are you sure you want to clear all chat history with ${selectedUser.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: language === 'th' ? 'ใช่, ลบเลย!' : 'Yes, clear it!',
      cancelButtonText: language === 'th' ? 'ยกเลิก' : 'Cancel'
    });

    if (confirmResult.isConfirmed) {
      try {
        const res = await fetchWithAuth(`/api/chat/${selectedUser.id}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          setMessages([]);
          fetchUsers(); // Update sidebar list
          Swal.fire(
            language === 'th' ? 'ลบแล้ว!' : 'Cleared!',
            language === 'th' ? 'ประวัติการแชทถูกลบเรียบร้อยแล้ว' : 'The chat history has been cleared.',
            'success'
          );
        } else {
          throw new Error('Failed to clear chat');
        }
      } catch (err) {
        console.error("Error clearing chat history:", err);
        Swal.fire('Error', 'Failed to clear chat history.', 'error');
      }
    }
  };

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
    <Layout>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', paddingBottom: '20px' }}>
        <div className="flex items-center gap-4" style={{ marginBottom: '24px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/admin')}>
            <ArrowLeft size={18} /> {language === 'th' ? 'กลับ' : 'Back'}
          </button>
          <h2 style={{ margin: 0 }}>{language === 'th' ? 'แชทกับผู้ใช้' : 'User Chats'}</h2>
        </div>

        <div className={`admin-chat-wrapper ${selectedUser ? 'chat-active' : ''}`}>
          {/* User List Sidebar */}
          <div className="admin-chat-sidebar">
            <div style={{ padding: '20px', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>
              {language === 'th' ? 'กล่องข้อความ' : 'Inbox'}
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {users.map(u => (
                <div 
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: selectedUser?.id === u.id ? '#eef2ff' : 'transparent',
                    boxShadow: selectedUser?.id === u.id ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { if (selectedUser?.id !== u.id) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                  onMouseOut={(e) => { if (selectedUser?.id !== u.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-main)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {u.profilePic ? <img src={u.profilePic} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}/> : u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: u.isOnline ? '#10b981' : '#9ca3af', border: '2px solid white' }} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: selectedUser?.id === u.id ? 600 : 500 }}>{u.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(u.lastMessageAt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {u.lastMessage || (language === 'th' ? 'ไม่มีข้อความ' : 'No messages')}
                      </span>
                      {u.unreadCount > 0 && (
                        <div style={{ backgroundColor: 'var(--danger)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }}>
                          {u.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {language === 'th' ? 'ยังไม่มีผู้ใช้' : 'No users found'}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="admin-chat-main">
            {selectedUser ? (
              <>
                <div style={{ 
                  padding: '12px 20px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.85)', 
                  backdropFilter: 'blur(12px)',
                  borderBottom: '1px solid rgba(0,0,0,0.05)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  <button 
                    className="mobile-back-btn" 
                    onClick={() => setSelectedUser(null)}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-main)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
                      {selectedUser.profilePic ? <img src={selectedUser.profilePic} style={{width:'100%', height:'100%', objectFit:'cover'}}/> : selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: selectedUser.isOnline ? '#10b981' : '#9ca3af', border: '2px solid white' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedUser.name}</div>
                    <div style={{ fontSize: '0.85rem', color: selectedUser.isOnline ? '#10b981' : 'var(--text-muted)' }}>
                      {selectedUser.isOnline 
                        ? (language === 'th' ? 'ออนไลน์' : 'Online') 
                        : (selectedUser.lastSeen 
                            ? (language === 'th' ? `ใช้งานล่าสุด: ${formatLastSeen(selectedUser.lastSeen)}` : `Last seen: ${formatLastSeen(selectedUser.lastSeen)}`)
                            : (language === 'th' ? 'ออฟไลน์' : 'Offline'))
                      }
                    </div>
                  </div>
                  <button 
                    onClick={handleClearChat}
                    style={{ 
                      marginLeft: 'auto', 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    title={language === 'th' ? 'ล้างประวัติแชท' : 'Clear Chat'}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc' }}>
                  {messages.map((msg, i) => {
                    const isMe = msg.senderId === admin.id;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ 
                          maxWidth: '75%', 
                          padding: '10px 14px', 
                          borderRadius: '16px', 
                          background: isMe ? 'var(--primary-main)' : '#ffffff', 
                          color: isMe ? 'white' : 'var(--text-main)', 
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          borderBottomRightRadius: isMe ? '4px' : '16px',
                          borderBottomLeftRadius: !isMe ? '4px' : '16px',
                          lineHeight: '1.5'
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
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: '16px 20px', backgroundColor: 'white', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={language === 'th' ? 'พิมพ์ข้อความ...' : 'Type a message...'}
                    style={{ 
                      flex: 1, 
                      padding: '12px 16px', 
                      backgroundColor: '#f1f5f9',
                      border: '1px solid transparent', 
                      borderRadius: '20px', 
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontSize: '0.95rem'
                    }}
                    onFocus={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.border = '1px solid #c7d2fe'; e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)' }}
                    onBlur={(e) => { e.target.style.backgroundColor = '#f1f5f9'; e.target.style.border = '1px solid transparent'; e.target.style.boxShadow = 'none' }}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    style={{ 
                      background: 'var(--primary-main)', 
                      color: 'white', 
                      border: 'none', 
                      width: '44px', height: '44px', 
                      borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: inputValue.trim() ? 'pointer' : 'not-allowed', 
                      opacity: inputValue.trim() ? 1 : 0.6,
                      boxShadow: inputValue.trim() ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { if(inputValue.trim()) e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { if(inputValue.trim()) e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Send size={18} style={{ marginLeft: '2px' }} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'linear-gradient(180deg, #f8fafc, #f1f5f9)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                  <MessageSquare size={36} color="var(--primary-main)" style={{ opacity: 0.8 }} />
                </div>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600 }}>{language === 'th' ? 'แชทกับผู้ใช้' : 'User Chats'}</h3>
                <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{language === 'th' ? 'เลือกผู้ใช้จากแถบด้านซ้ายเพื่อเริ่มสนทนา' : 'Select a user from the left sidebar to start chatting'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminChat;
