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
