import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, User, Phone, CheckCircle, ShieldAlert } from 'lucide-react';

export const AuthPortal = () => {
  const { login, registerCustomer, logout, loginWithGoogle, updateUserPhone, users } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [loginRole, setLoginRole] = useState('CUSTOMER'); // 'CUSTOMER' | 'STAFF' | 'ADMIN'
  const [email, setEmail] = useState('customer1@tomsmoothie.com');
  const [password, setPassword] = useState('cust123');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Google OAuth flow states
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [pendingPhoneUserId, setPendingPhoneUserId] = useState(null);
  const [tempPhone, setTempPhone] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Load remembered credentials from localStorage
  const getSavedCredentials = () => {
    try {
      const saved = localStorage.getItem('tomsmoothie_remembered_credentials');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  };

  const saveCredentials = (userEmail, userPass, shouldRemember) => {
    try {
      const creds = getSavedCredentials();
      const normalizedEmail = userEmail.toLowerCase().trim();
      if (shouldRemember) {
        creds[normalizedEmail] = userPass;
      } else {
        delete creds[normalizedEmail];
      }
      localStorage.setItem('tomsmoothie_remembered_credentials', JSON.stringify(creds));
    } catch (e) {
      console.error(e);
    }
  };

  // Load last logged in role and credentials
  useEffect(() => {
    let lastRole = localStorage.getItem('tomsmoothie_last_role') || 'CUSTOMER';
    if (!['CUSTOMER', 'STAFF', 'ADMIN'].includes(lastRole)) {
      lastRole = 'CUSTOMER';
    }
    setLoginRole(lastRole);

    let lastEmail = localStorage.getItem(`tomsmoothie_last_email_${lastRole}`) || '';
    setEmail(lastEmail);

    if (lastEmail) {
      const creds = getSavedCredentials();
      const savedPass = creds[lastEmail.toLowerCase().trim()] || '';
      if (savedPass) {
        setPassword(savedPass);
        setRememberMe(true);
      } else {
        setPassword('');
        setRememberMe(false);
      }
    } else {
      setPassword('');
      setRememberMe(false);
    }
  }, []);

  const switchRoleTab = (role) => {
    setLoginRole(role);
    setIsRegister(false);
    setError('');
    localStorage.setItem('tomsmoothie_last_role', role);

    const creds = getSavedCredentials();
    const savedEmail = localStorage.getItem(`tomsmoothie_last_email_${role}`) || '';
    setEmail(savedEmail);
    
    if (savedEmail) {
      const savedPass = creds[savedEmail.toLowerCase().trim()] || '';
      setPassword(savedPass);
      setRememberMe(!!savedPass);
    } else {
      setPassword('');
      setRememberMe(false);
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    const creds = getSavedCredentials();
    const savedPass = creds[val.toLowerCase().trim()];
    if (savedPass) {
      setPassword(savedPass);
      setRememberMe(true);
    } else {
      setRememberMe(false);
    }
  };

  // Google OAuth select handlers
  const handleGoogleLoginSelect = (name, googleEmail) => {
    setIsGoogleModalOpen(false);
    
    // Simulate google sub/id
    const googleId = 'g-sub-' + btoa(googleEmail).substring(0, 10);
    const res = loginWithGoogle({
      email: googleEmail,
      name: name,
      google_id: googleId
    });

    if (res.success) {
      if (res.user.role !== loginRole) {
        setError(`สิทธิ์การเข้าใช้งานไม่ถูกต้องสำหรับหน้าล็อกอินบทบาทนี้`);
        logout();
        return;
      }
      
      // If phone number is missing, prompt for it
      if (!res.user.phone_number) {
        setPendingPhoneUserId(res.user.id);
        setTempPhone('');
        setShowPhonePrompt(true);
      }
    }
  };

  const handleCustomGoogleSubmit = () => {
    if (!customGoogleName.trim() || !customGoogleEmail.trim()) return;
    
    const name = customGoogleName.trim();
    const googleEmail = customGoogleEmail.trim();
    
    setCustomGoogleName('');
    setCustomGoogleEmail('');
    
    handleGoogleLoginSelect(name, googleEmail);
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!tempPhone.trim() || !pendingPhoneUserId) return;

    await updateUserPhone(pendingPhoneUserId, tempPhone.trim());
    
    setShowPhonePrompt(false);
    setPendingPhoneUserId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!email || !password || !fullName || !phone) {
        setError('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
        return;
      }
      const res = await registerCustomer({
        email,
        password,
        full_name: fullName,
        phone_number: phone
      });
      if (!res.success) {
        setError(res.message);
      }
    } else {
      if (!email || !password) {
        setError('กรุณากรอกอีเมลและรหัสผ่าน');
        return;
      }
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message);
      } else {
        if (res.user.role !== loginRole) {
          setError(`สิทธิ์การเข้าใช้งานไม่ถูกต้องสำหรับหน้าล็อกอินบทบาทนี้`);
          await logout();
          return;
        }
        saveCredentials(email, password, rememberMe);
        localStorage.setItem(`tomsmoothie_last_email_${loginRole}`, email);
        localStorage.setItem('tomsmoothie_last_email', email);
        localStorage.setItem('tomsmoothie_last_role', loginRole);
      }
    }
  };

  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ textAlign: 'center', margin: '20px 0 10px' }}>
        <div className="logo-icon" style={{ margin: '0 auto 16px', width: '60px', height: '60px', fontSize: '30px' }}>🍹</div>
        <h2 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '1.6rem' }}>
          ร้านน้ำปั่นพี่ต้อม
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          TomSmoothie WebOrder & Digital Points
        </p>
      </div>

      {/* 2. Global Role Selection Tabs Removed */}

      <div className="card" style={{ padding: '28px 24px', margin: 0 }}>
        {loginRole === 'CUSTOMER' ? (
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '24px' }}>
            <button 
              type="button" 
              onClick={() => { setIsRegister(false); setError(''); }}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: !isRegister ? '3px solid var(--primary)' : '3px solid transparent',
                color: !isRegister ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              เข้าสู่ระบบ (Login)
            </button>
            <button 
              type="button" 
              onClick={() => { setIsRegister(true); setError(''); }}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: isRegister ? '3px solid var(--primary)' : '3px solid transparent',
                color: isRegister ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              สมัครสมาชิก (Register)
            </button>
          </div>
        ) : (
          <div style={{ borderBottom: '2px solid var(--border)', marginBottom: '24px', paddingBottom: '12px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>
              {loginRole === 'STAFF' ? '🧑‍🍳 ล็อกอินพนักงานร้าน (Staff Portal)' : '👑 ล็อกอินผู้ดูแลระบบ (Admin Dashboard)'}
            </h3>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            border: '1px solid rgba(211, 47, 47, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        {loginRole === 'CUSTOMER' && (
          <button
            type="button"
            onClick={loginWithGoogle}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              color: 'var(--text-dark)',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '16px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            {/* Google Icon SVG */}
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '8px' }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            {isRegister ? 'สมัครสมาชิกด้วย Google' : 'เข้าสู่ระบบด้วย Google'}
          </button>
        )}

        {/* OR Divider */}
        {loginRole === 'CUSTOMER' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            margin: '16px 0',
            fontWeight: 600
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
            <span style={{ padding: '0 10px' }}>หรือ</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label>ชื่อ-นามสกุล</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="เช่น สมชาย รักน้ำปั่น"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>เบอร์โทรศัพท์</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="เช่น 081-234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label>อีเมล (Email)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                className="form-input" 
                placeholder={
                  loginRole === 'CUSTOMER' ? "customer1@tomsmoothie.com" :
                  loginRole === 'STAFF' ? "staff1@tomsmoothie.com" : "admin@tomsmoothie.com"
                }
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>รหัสผ่าน (Password)</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="รหัสผ่านเข้าใช้งาน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          {/* Remember Password Checkbox */}
          {!isRegister && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0 8px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-muted)', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ 
                    cursor: 'pointer', 
                    width: '16px', 
                    height: '16px', 
                    accentColor: 'var(--primary)',
                    borderRadius: '4px'
                  }}
                />
                จดจำรหัสผ่าน (Remember Password)
              </label>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
            {isRegister ? 'ยืนยันสมัครสมาชิก' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Staff/Admin buttons below Customer Login form */}
        {loginRole === 'CUSTOMER' && !isRegister && (
          <div style={{ marginTop: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              marginBottom: '16px',
              fontWeight: 600
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
              <span style={{ padding: '0 10px' }}>เข้าสู่ระบบสำหรับพนักงาน / แอดมิน</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => switchRoleTab('STAFF')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--brown-pale)',
                  color: 'var(--brown)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0e6df';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--brown-pale)';
                }}
              >
                🧑‍🍳 พนักงานร้าน
              </button>
              <button
                type="button"
                onClick={() => switchRoleTab('ADMIN')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--brown-pale)',
                  color: 'var(--brown)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0e6df';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--brown-pale)';
                }}
              >
                👑 แอดมิน
              </button>
            </div>
          </div>
        )}

        {/* Back to Customer Login button for Staff/Admin */}
        {loginRole !== 'CUSTOMER' && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => switchRoleTab('CUSTOMER')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'underline'
              }}
            >
              👤 กลับสู่หน้าเข้าสู่ระบบสำหรับลูกค้า
            </button>
          </div>
        )}
      </div>


      {/* Help footnote with testing accounts */}
      {!isRegister && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '16px', 
          fontSize: '0.7rem', 
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          backgroundColor: 'var(--brown-pale)',
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border)'
        }}>
          💡 <b>ข้อมูลทดสอบระบบ:</b><br />
          • ลูกค้า: <code style={{ backgroundColor: '#fff', padding: '1px 3px', borderRadius: '3px' }}>customer1@tomsmoothie.com</code> (รหัส: cust123)<br />
          • พนักงาน: <code style={{ backgroundColor: '#fff', padding: '1px 3px', borderRadius: '3px' }}>staff1@tomsmoothie.com</code> (รหัส: staff123)<br />
          • แอดมิน: <code style={{ backgroundColor: '#fff', padding: '1px 3px', borderRadius: '3px' }}>admin@tomsmoothie.com</code> (รหัส: admin123)
        </div>
      )}

      {/* Simulated Google Accounts Chooser Modal */}
      {isGoogleModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            margin: 0
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ marginBottom: '8px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#202124', margin: '4px 0' }}>ลงชื่อเข้าใช้งานด้วย Google</h3>
              <p style={{ fontSize: '0.85rem', color: '#5f6368', margin: 0 }}>เพื่อดำเนินการต่อยัง TomSmoothie</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
              {[
                { name: 'สมชาย รักสุขภาพ', email: 'customer1@tomsmoothie.com', avatar: '👨‍⚕️' },
                { name: 'อรอนงค์ สมูทตี้ (บัญชีใหม่)', email: 'oranong.smooth@gmail.com', avatar: '👩' }
              ].map((acc, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleGoogleLoginSelect(acc.name, acc.email)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    width: '100%',
                    border: '1px solid #dadce0',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <span style={{ fontSize: '1.5rem' }}>{acc.avatar}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3c4043' }}>{acc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#70757a', textOverflow: 'ellipsis', overflow: 'hidden' }}>{acc.email}</div>
                  </div>
                </button>
              ))}

              <div style={{ borderTop: '1px solid #dadce0', margin: '8px 0' }}></div>

              {/* Custom Google account inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5f6368' }}>ป้อนบัญชี Google อื่น:</span>
                <input 
                  type="text" 
                  placeholder="ชื่อเต็มภาษาไทย / อังกฤษ" 
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  style={{ 
                    padding: '8px 12px', 
                    fontSize: '0.8rem', 
                    border: '1px solid #dadce0', 
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
                <input 
                  type="email" 
                  placeholder="username@gmail.com" 
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  style={{ 
                    padding: '8px 12px', 
                    fontSize: '0.8rem', 
                    border: '1px solid #dadce0', 
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleCustomGoogleSubmit()}
                  disabled={!customGoogleName.trim() || !customGoogleEmail.trim()}
                  className="btn btn-primary"
                  style={{ 
                    padding: '8px', 
                    fontSize: '0.8rem', 
                    backgroundColor: '#4285F4',
                    borderColor: '#4285F4',
                    cursor: (!customGoogleName.trim() || !customGoogleEmail.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (!customGoogleName.trim() || !customGoogleEmail.trim()) ? 0.6 : 1
                  }}
                >
                  🚀 เข้าใช้งานด้วยบัญชีนี้
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(false)}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                backgroundColor: '#f1f3f4',
                color: '#5f6368',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ยกเลิก (Cancel)
            </button>
          </div>
        </div>
      )}

      {/* One-time Phone Number Setup Modal */}
      {showPhonePrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: 'white',
            padding: '28px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            margin: 0,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📱</div>
            <h3 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '8px' }}>
              ระบุเบอร์โทรศัพท์ (One-time Setup)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.4 }}>
              ยินดีต้อนรับครับ! กรุณาระบุเบอร์โทรศัพท์มือถือของคุณ เพื่อใช้สำหรับการติดต่อและยืนยันการรับสินค้าที่หน้าร้าน
            </p>

            <form onSubmit={handlePhoneSubmit}>
              <input
                type="tel"
                placeholder="เช่น 081-234-5678"
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  textAlign: 'center',
                  outline: 'none'
                }}
                required
              />

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontWeight: 700 }}
              >
                บันทึกและเข้าใช้งานระบบ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
