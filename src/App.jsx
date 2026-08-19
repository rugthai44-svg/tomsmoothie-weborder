import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthPortal } from './components/AuthPortal';
import { CustomerPortal } from './components/CustomerPortal';
import { StaffPortal } from './components/StaffPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { LogOut, RefreshCw, Smartphone, Award, Coffee, User } from 'lucide-react';

const AppContent = () => {
  const { 
    currentUser, 
    devSwitchRole, 
    logout, 
    lineNotifications, 
    toast 
  } = useApp();

  return (
    <div className="app-container">
      
      {/* 1. Developer Simulator Helper Bar Removed */}

      {/* 2. Mock LINE Notification Alerts */}
      {lineNotifications.length > 0 && (
        <div className="line-notif-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span>💬</span>
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <b>[LINE แจ้งเตือน]:</b> {lineNotifications[0].message}
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
            {lineNotifications[0].timestamp}
          </span>
        </div>
      )}

      {/* 3. Header Logo Section */}
      <header>
        <div className="logo-container">
          <div className="logo-icon">🍹</div>
          <div className="logo-text">
            <h1>ร้านน้ำปั่นพี่ต้อม</h1>
            <p>TomSmoothie WebOrder & Points</p>
          </div>
        </div>

        {/* Current user badge & Logout display */}
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '0.75rem', 
              fontWeight: 700,
              backgroundColor: 'var(--brown-pale)',
              color: 'var(--brown)',
              padding: '4px 10px',
              borderRadius: '20px'
            }}>
              {currentUser.role === 'CUSTOMER' && `👤 ${currentUser.full_name.split(' ')[0]} (${currentUser.current_points} แต้ม)`}
              {currentUser.role === 'STAFF' && `🧑‍🍳 พนักงาน: ${currentUser.full_name.split(' ')[0]}`}
              {currentUser.role === 'ADMIN' && `👑 แอดมิน: พี่ต้อม`}
            </span>
            <button 
              onClick={logout} 
              style={{ 
                backgroundColor: 'var(--danger)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                padding: '4px 10px',
                fontSize: '0.75rem',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              <LogOut size={11} /> ออกจากระบบ
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
