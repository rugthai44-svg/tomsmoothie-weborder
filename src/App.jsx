import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthPortal } from './components/AuthPortal';
import { CustomerPortal } from './components/CustomerPortal';
import { StaffPortal } from './components/StaffPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { LogOut, RefreshCw } from 'lucide-react';
import heroVideo from './assets/hero-video.mp4';

const AppContent = () => {
  const { 
    currentUser, 
    devSwitchRole, 
    logout, 
    toast,
    isDbConnected,
    isRealtimeActive,
    lastSyncTime,
    isSyncing,
    syncNow
  } = useApp();

  return (
    <div className="app-container">
      
      {/* 1. Developer Simulator Helper Bar Removed */}



      {/* 3. Header Logo Section */}
      <header>
        <div className="logo-container">
          <div className="logo-icon" style={{ overflow: 'hidden', padding: 0, border: '2px solid #ff9800', background: '#000' }}>
            <video
              src={heroVideo}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          </div>
          <div className="logo-text">
            <h1 style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>เว็บแอปพลิเคชันสั่งจองเครื่องดื่มล่วงหน้าและสะสมแต้มสมาชิกดิจิทัล ร้านน้ำปั่นพี่ต้อม</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              <p style={{ margin: 0 }}>TomSmoothie WebOrder & Points</p>
              <button
                type="button"
                onClick={syncNow}
                title={`เชื่อมต่อฐานข้อมูล Supabase ตลอดเวลา (คลิกเพื่อซิงค์ข้อมูลใหม่ทันที)\nสถานะ Real-time: ${isRealtimeActive ? 'เปิดใช้งาน (Live WebSocket)' : 'เชื่อมต่อพร้อมทำงาน (Active Heartbeat)'}\nอัปเดตล่าสุด: ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('th-TH') : 'กำลังเชื่อมต่อ...'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: isDbConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: isDbConnected ? '#059669' : '#d97706',
                  border: `1px solid ${isDbConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                  lineHeight: '1.2'
                }}
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isDbConnected ? '#10b981' : '#f59e0b',
                  boxShadow: isDbConnected ? '0 0 6px #10b981' : 'none',
                  display: 'inline-block'
                }} />
                <span>{isSyncing ? 'กำลังซิงค์...' : (isDbConnected ? (isRealtimeActive ? '🟢 Supabase สดตลอดเวลา' : '🟢 Supabase เชื่อมต่อแล้ว') : '🟠 กำลังเชื่อมต่อ...')}</span>
                <RefreshCw size={10} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Current user badge & Logout display */}
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{
              fontSize: '0.75rem', 
              fontWeight: 700,
              backgroundColor: 'var(--brown-pale)',
              color: 'var(--brown)',
              padding: '4px 8px',
              borderRadius: '20px',
              maxWidth: '150px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'inline-block'
            }}>
              {currentUser.role === 'CUSTOMER' && `👤 ${currentUser.full_name.split(' ')[0]} (${currentUser.current_points}⭐)`}
              {currentUser.role === 'STAFF' && `🧑‍🍳 ${currentUser.full_name.split(' ')[0]}`}
              {currentUser.role === 'ADMIN' && `👑 พี่ต้อม`}
            </span>
            <button 
              onClick={logout} 
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              style={{ 
                backgroundColor: 'var(--danger)', 
                color: 'white', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '4px', 
                padding: '4px 10px',
                fontSize: '0.75rem',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                touchAction: 'manipulation'
              }}
            >
              <LogOut size={12} /> ออก
            </button>
          </div>
        )}
      </header>

      {/* 4. Core Router Navigation based on Role */}
      <main style={{ flex: 1 }}>
        {!currentUser ? (
          <AuthPortal />
        ) : (
          <>
            {currentUser.role === 'CUSTOMER' && <CustomerPortal />}
            {currentUser.role === 'STAFF' && <StaffPortal />}
            {currentUser.role === 'ADMIN' && <AdminDashboard />}
          </>
        )}
      </main>

      {/* 5. In-App Floating Toasts */}
      {toast && (
        <div className="toast">
          {toast.type === 'success' && <span>✅</span>}
          {toast.type === 'danger' && <span>❌</span>}
          {toast.type === 'warning' && <span>⚠️</span>}
          {toast.type === 'info' && <span>ℹ️</span>}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
