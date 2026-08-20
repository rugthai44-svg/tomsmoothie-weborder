import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  ScanLine, ClipboardList, CheckCircle2, Search, 
  Sparkles, Coffee, AlertCircle, Camera, Check, 
  Clock, LogIn, ChevronRight, CheckSquare, Award
} from 'lucide-react';

export const StaffPortal = () => {
  const { 
    orders, 
    users, 
    transactions,
    currentUser, 
    updateOrderStatus, 
    scanLoyaltyQR, 
    triggerToast,
    submitDailyClosing
  } = useApp();

  const [staffTab, setStaffTab] = useState(() => {
    return localStorage.getItem('tomsmoothie_staff_active_tab') || 'queue';
  });

  const handleSetStaffTab = (tab) => {
    setStaffTab(tab);
    localStorage.setItem('tomsmoothie_staff_active_tab', tab);
  };
  
  // Close Shift states
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);
  const [cupsSold, setCupsSold] = useState(0);
  const [freeCupsRedeemed, setFreeCupsRedeemed] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [cashActual, setCashActual] = useState(0);
  const [closeNotes, setCloseNotes] = useState('');

  // Pre-calculate shift summary stats automatically based on closeDate
  useEffect(() => {
    if (staffTab === 'close') {
      const todayCompletedOrders = orders.filter(o => {
        if (o.order_status !== 'Completed') return false;
        return o.created_at.split('T')[0] === closeDate;
      });

      const todayPointTxs = transactions.filter(t => {
        return t.created_at.split('T')[0] === closeDate;
      });

      let cups = 0;
      let freeCups = 0;
      let revenue = 0;

      // 1. Calculate cups and free drinks from online queue orders
      todayCompletedOrders.forEach(order => {
        revenue += order.total_price;
        if (order.is_redeemed_free_cup) {
          freeCups += 1;
        }
        order.items.forEach(item => {
          cups += item.quantity;
        });
      });

      // 2. Add walk-in point credits (EARN) and walk-in free redemptions (REDEEM where order_id is null)
      todayPointTxs.forEach(t => {
        if (t.transaction_type === 'EARN') {
          cups += t.points_change;
        }
        if (t.transaction_type === 'REDEEM' && !t.order_id) {
          freeCups += 1;
        }
      });

      setCupsSold(cups);
      setFreeCupsRedeemed(freeCups);
      setTotalRevenue(revenue);
      setCashActual(revenue); // Prefill counted cash to match system sales revenue
    }
  }, [closeDate, orders, transactions, staffTab]);

  const handleCloseShiftSubmit = async (e) => {
    e.preventDefault();
    if (cupsSold < 0 || freeCupsRedeemed < 0 || totalRevenue < 0 || cashActual < 0) {
      triggerToast('กรุณากรอกข้อมูลตัวเลขที่ถูกต้อง', 'danger');
      return;
    }

    if (confirm('ยืนยันความถูกต้องและต้องการส่งรายงานปิดยอดขายให้แอดมินทาง LINE หรือไม่?')) {
      const res = await submitDailyClosing({
        date: closeDate,
        staff_id: currentUser.id,
        staff_name: currentUser.full_name,
        cups_sold: cupsSold,
        free_cups_redeemed: freeCupsRedeemed,
        total_revenue: totalRevenue,
        cash_actual: cashActual,
        notes: `ยอดเงินสด/โอนนับได้จริง: ฿${cashActual.toLocaleString()} (หมายเหตุ: ${closeNotes || 'ไม่มี'})`
      });

      if (res.success) {
        setCloseNotes('');
        handleSetStaffTab('queue');
      }
    }
  };
  
  // Scanner / Search states
  const [cameraMode, setCameraMode] = useState(false);
  const [searchMemberCode, setSearchMemberCode] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  
  // Point adjustment states
  const [cupsCount, setCupsCount] = useState(1);

  // Real Camera Scanner Initialization
  useEffect(() => {
    let scanner = null;
    if (cameraMode) {
      // Small timeout to ensure DOM container is rendered
      const timeout = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            'qr-reader-container', 
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              rememberLastUsedCamera: true
            }, 
            /* verbose= */ false
          );
          
          scanner.render(
            (decodedText) => {
              // Successfully decoded member code
              triggerToast(`พบรหัสสมาชิกจากการสแกน: ${decodedText}`, 'success');
              handleFindCustomerByCode(decodedText);
              setCameraMode(false);
            },
            (error) => {
              // Silence error logs for scanner frame updates
            }
          );
        } catch (err) {
          console.error("Scanner startup failed", err);
          triggerToast('กล้องไม่พร้อมทำงาน หรือติดสิทธิ์ความปลอดภัย (กล้องจะเข้าสู่โหมดจำลองอัตโนมัติ)', 'warning');
        }
      }, 300);

      return () => {
        clearTimeout(timeout);
        if (scanner) {
          scanner.clear().catch(err => console.error("Scanner clear error", err));
        }
      };
    }
  }, [cameraMode]);

  if (!currentUser || currentUser.role !== 'STAFF') return null;

  // Find customer logic
  const handleFindCustomerByCode = (code) => {
    const codeClean = code.trim();
    const customer = users.find(
      u => u.role === 'CUSTOMER' && 
      (u.member_code.toLowerCase() === codeClean.toLowerCase() || u.phone_number === codeClean)
    );

    if (customer) {
      setFoundCustomer(customer);
      setSearchMemberCode(customer.member_code);
    } else {
      triggerToast('ไม่พบลักษณะของรหัสสมาชิกหรือเบอร์โทรศัพท์นี้', 'danger');
      setFoundCustomer(null);
    }
  };

  // Perform Loyalty Action (EARN points)
  const handleCreditPoints = async () => {
    if (!foundCustomer) return;
    const res = await scanLoyaltyQR(foundCustomer.member_code, 'EARN', cupsCount);
    if (res.success) {
      // Re-fetch customer information to sync displayed points
      const updatedCust = users.find(u => u.id === foundCustomer.id);
      setFoundCustomer(updatedCust);
      setCupsCount(1);
    }
  };

  // Perform Loyalty Action (REDEEM 10 points)
  const handleRedeemPoints = async () => {
    if (!foundCustomer) return;
    if (foundCustomer.current_points < 10) {
      triggerToast('ลูกค้าท่านนี้มีแต้มไม่เพียงพอสะสม (ต้องมีอย่างน้อย 10 แต้ม)', 'danger');
      return;
    }
    
    if (confirm(`ยืนยันการใช้สิทธิ์แลกน้ำปั่นฟรี 1 แก้ว? (หักลบ 10 แต้มจากคุณ ${foundCustomer.full_name})`)) {
      const res = await scanLoyaltyQR(foundCustomer.member_code, 'REDEEM');
      if (res.success) {
        const updatedCust = users.find(u => u.id === foundCustomer.id);
        setFoundCustomer(updatedCust);
      }
    }
  };

  // Queue categorizations
  const activeQueues = orders.filter(o => o.order_status !== 'Completed' && o.order_status !== 'Cancelled');
  const pendingOrders = activeQueues.filter(o => o.order_status === 'Pending').reverse();
  const preparingOrders = activeQueues.filter(o => o.order_status === 'Preparing');
  const readyOrders = activeQueues.filter(o => o.order_status === 'Ready');

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Staff identity banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brown), var(--brown-hover))',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomLeftRadius: 'var(--radius-lg)',
        borderBottomRightRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>พนักงานร้าน (Logged-In)</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{currentUser.full_name}</h3>
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>อีเมล: {currentUser.email}</span>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.15)',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00e676' }}></span>
          Staff Portal
        </div>
      </div>

      {/* Staff View Tabs - Available on all screens */}
      <div style={{ padding: '16px 16px 0 16px' }}>
        <div className="tabs-container" style={{ margin: 0 }}>
          <button 
            type="button"
            className={`tab-btn ${staffTab === 'queue' ? 'active' : ''}`}
            onClick={() => handleSetStaffTab('queue')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <ClipboardList size={16} />
            จัดการคิวออเดอร์
            {activeQueues.length > 0 && (
              <span className="nav-badge" style={{ position: 'relative', top: '0', right: '0', marginLeft: '4px' }}>
                {activeQueues.length}
              </span>
            )}
          </button>
          
          <button 
            type="button"
            className={`tab-btn ${staffTab === 'scan' ? 'active' : ''}`}
            onClick={() => handleSetStaffTab('scan')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <ScanLine size={16} />
            สแกนแต้มหน้าร้าน
          </button>

          <button 
            type="button"
            className={`tab-btn ${staffTab === 'close' ? 'active' : ''}`}
            onClick={() => handleSetStaffTab('close')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Clock size={16} />
            ปิดกะประจำวัน
          </button>
        </div>
      </div>

      {/* Main Staff View area */}
      <div style={{ padding: '16px' }}>

        {staffTab === 'close' ? (
          <div style={{ maxWidth: '600px', margin: '0 auto', animation: 'pop-in 0.3s ease' }}>
            {/* ================= STAFF: CLOSE SHIFT FORM ================= */}
            <div className="card" style={{ margin: 0 }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckSquare size={18} /> รายงานปิดกะและยอดขายประจำวัน
              </h4>

              <form onSubmit={handleCloseShiftSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>วันที่ปิดยอด</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={closeDate}
                      onChange={(e) => setCloseDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>ผู้ปิดกะ (พนักงาน)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={currentUser.full_name}
                      disabled
                      style={{ backgroundColor: '#f1f3f4', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                {/* System calculations summary */}
                <div style={{
                  backgroundColor: 'var(--brown-pale)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--brown)', borderBottom: '1px dashed var(--border)', paddingBottom: '6px' }}>
                    📊 สรุปยอดขายจากระบบ (อัตโนมัติ)
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>🥤 จำนวนแก้วที่ขายได้:</span>
                    <strong style={{ color: 'var(--brown)' }}>{cupsSold} แก้ว</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>🎁 จำนวนแก้วที่แลกฟรี:</span>
                    <strong style={{ color: 'var(--success)' }}>{freeCupsRedeemed} แก้ว</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 'bold', borderTop: '1px dashed var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                    <span>💵 ยอดขายรวมตามระบบ:</span>
                    <span style={{ color: 'var(--primary)' }}>฿{totalRevenue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>💵 ยอดเงินสด / เงินโอน ที่นับได้จริงหน้าร้าน (Cash counted)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={cashActual}
                    onChange={(e) => setCashActual(Number(e.target.value))}
                    min="0"
                    placeholder="ป้อนยอดรวมเงินในลิ้นชักที่นับได้จริง"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>📝 หมายเหตุการปิดยอด (Closing Notes)</label>
                  <textarea 
                    className="form-input" 
                    placeholder="เช่น นับยอดเงินสดในลิ้นชักตรงกับระบบ หรือระบุสาเหตุยอดต่าง..." 
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    style={{ height: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '12px', fontWeight: 700, marginTop: '8px' }}
                >
                  🕒 ยืนยันและส่งสรุปยอดไปยัง Admin
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="desktop-grid-2col">
            {/* Column 1 (Queue): Hidden on mobile if not active, always visible on desktop */}
            <div className={staffTab !== 'queue' ? 'mobile-hidden' : ''}>
            {/* ================= STAFF: PRE-ORDER QUEUE ================= */}
            <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem' }}>
                รายการสั่งซื้อล่วงหน้า ({activeQueues.length} ออเดอร์)
              </h4>
            </div>

            {activeQueues.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: '10px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                ไม่มีคิวเครื่องดื่มค้างอยู่ในระบบ!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. READY TO PICKUP SECTOR */}
                {readyOrders.length > 0 && (
                  <div>
                    <h5 style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--success)', borderRadius: '50%', display: 'inline-block' }}></span>
                      พร้อมรับเครื่องดื่มแล้ว ({readyOrders.length} ออเดอร์)
                    </h5>
                    
                    {readyOrders.map(order => (
                      <div key={order.id} className="card" style={{ borderLeft: '4px solid var(--success)', padding: '12px 14px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>
                          <span>ออเดอร์ #{order.id} - คุณ {order.customer_name}</span>
                          <span className="badge badge-ready">พร้อมรับ (Ready)</span>
                        </div>
                        
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          เวลานัด: <b>{order.pickup_time}</b> | ลูกค้าจ่าย: <b>฿{order.total_price}</b> {order.is_redeemed_free_cup && <b style={{ color: 'var(--success)' }}>(แลกแก้วฟรี)</b>}
                        </p>

                        <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ color: 'var(--brown)', fontWeight: 600 }}>
                              {item.name} (หวาน {item.sweetness_level}) x{item.quantity}
                              {item.toppings.length > 0 && <span style={{ color: 'var(--primary)', fontWeight: 'normal', fontSize: '0.75rem' }}> (+ {item.toppings.join(', ')})</span>}
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => updateOrderStatus(order.id, 'Completed')}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                        >
                          <Check size={14} /> ส่งมอบสินค้าให้ลูกค้าแล้ว (Complete)
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. PREPARING SECTOR */}
                {preparingOrders.length > 0 && (
                  <div>
                    <h5 style={{ color: 'var(--info)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>
                      กำลังทำ / กำลังปั่น ({preparingOrders.length} ออเดอร์)
                    </h5>
                    
                    {preparingOrders.map(order => (
                      <div key={order.id} className="card" style={{ borderLeft: '4px solid var(--info)', padding: '12px 14px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>
                          <span>ออเดอร์ #{order.id} - คุณ {order.customer_name}</span>
                          <span className="badge badge-preparing">กำลังปั่น (Preparing)</span>
                        </div>
                        
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          เวลานัด: <b>{order.pickup_time}</b> | ลูกค้าจ่าย: <b>฿{order.total_price}</b>
                        </p>

                        <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ color: 'var(--brown)', fontWeight: 600 }}>
                              {item.name} (หวาน {item.sweetness_level}) x{item.quantity}
                              {item.toppings.length > 0 && <span style={{ color: 'var(--primary)', fontWeight: 'normal', fontSize: '0.75rem' }}> (+ {item.toppings.join(', ')})</span>}
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => updateOrderStatus(order.id, 'Ready')}
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', color: 'var(--info)', borderColor: 'var(--info)' }}
                        >
                          <Sparkles size={14} /> ทำเสร็จแล้ว แจ้งลูกค้ามารับ (Ready)
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. PENDING PRE-ORDERS */}
                {pendingOrders.length > 0 && (
                  <div>
                    <h5 style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>
                      ออเดอร์ใหม่ รอดำเนินการ ({pendingOrders.length} ออเดอร์)
                    </h5>
                    
                    {pendingOrders.map(order => (
                      <div key={order.id} className="card" style={{ borderLeft: '4px solid var(--warning)', padding: '12px 14px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>
                          <span>ออเดอร์ #{order.id} - คุณ {order.customer_name}</span>
                          <span className="badge badge-pending">รอดำเนินการ</span>
                        </div>
                        
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          เวลานัด: <b style={{ color: 'var(--danger)' }}>{order.pickup_time}</b> | ลูกค้าจ่าย: <b>฿{order.total_price}</b>
                        </p>

                        <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ color: 'var(--brown)', fontWeight: 600 }}>
                              {item.name} (หวาน {item.sweetness_level}) x{item.quantity}
                              {item.toppings.length > 0 && <span style={{ color: 'var(--primary)', fontWeight: 'normal', fontSize: '0.75rem' }}> (+ {item.toppings.join(', ')})</span>}
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => updateOrderStatus(order.id, 'Preparing')}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                        >
                          <Coffee size={14} /> กดยืนยันออเดอร์และเริ่มปั่น (Accept & Prepare)
                        </button>
                      </div>
                    ))}
                  </div>
                )}

            </div>
          )}
        </div>
      </div>

          {/* Column 2 (Scan/Search): Hidden on mobile if not active, always visible on desktop */}
          <div className={staffTab !== 'scan' ? 'mobile-hidden' : ''}>
            {/* ================= STAFF: QR SCAN & POINTS MANAGEMENT ================= */}
            <div>
            
            {/* Camera Frame (Toggled on click) */}
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '10px' }}>
                กล้องสแกนคิวอาร์โค้ดบัตรสมาชิก
              </h4>
              
              {!cameraMode ? (
                <div style={{ padding: '24px 0', width: '100%' }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    margin: '0 auto 16px'
                  }}>
                    <Camera size={44} />
                  </div>
                  <button 
                    onClick={() => setCameraMode(true)}
                    className="btn btn-primary"
                    style={{ maxWidth: '250px', display: 'inline-flex', margin: '0 auto' }}
                  >
                    <ScanLine size={16} /> เปิดกล้องสแกนคิวอาร์ (QR Scanner)
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  {/* Container for html5-qrcode renderer */}
                  <div id="qr-reader-container" style={{ width: '100%', maxWidth: '350px', margin: '0 auto', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border)' }}></div>
                  <button 
                    onClick={() => setCameraMode(false)}
                    className="btn btn-outline"
                    style={{ marginTop: '12px', maxWidth: '200px', display: 'inline-flex' }}
                  >
                    ปิดกล้องสแกน
                  </button>
                </div>
              )}
            </div>

            {/* FALLBACK SCANNER SIMULATOR (DUMMY SELECT / TEXT SEARCH) */}
            <div className="card" style={{ borderStyle: 'dashed', backgroundColor: 'var(--brown-pale)' }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--primary)" />
                เครื่องจำลองการสแกน (QR Simulator)
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                กรณีไม่มีกล้องหรือสิทธิ์ความปลอดภัยติดขัด ให้เลือกผู้ใช้ทดสอบเพื่อจำลองการสแกนบัตรสมาชิก:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Pre-defined list of customers for easy clicking */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                  {users.filter(u => u.role === 'CUSTOMER').map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => handleFindCustomerByCode(cust.member_code)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'white',
                        textAlign: 'left',
                        fontSize: '0.8rem',
                        fontWeight: searchMemberCode === cust.member_code ? 700 : 500,
                        borderColor: searchMemberCode === cust.member_code ? 'var(--primary)' : 'var(--border)',
                        color: 'var(--brown)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <b>{cust.full_name}</b> ({cust.member_code})
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>เบอร์: {cust.phone_number}</div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {cust.current_points} แต้ม
                      </span>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="กรอกรหัสสมาชิก หรือ เบอร์โทร" 
                    value={searchMemberCode}
                    onChange={e => setSearchMemberCode(e.target.value)}
                    style={{ flex: 1, margin: 0, padding: '10px' }}
                  />
                  <button 
                    onClick={() => handleFindCustomerByCode(searchMemberCode)}
                    className="btn btn-outline"
                    style={{ width: 'auto', padding: '10px 14px' }}
                  >
                    <Search size={16} /> ค้นหา
                  </button>
                </div>
              </div>
            </div>

            {/* Loyalty points credit/debit panel */}
            {foundCustomer && (
              <div className="card" style={{ 
                border: '2px solid var(--primary)', 
                animation: 'pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>พบข้อมูลสมาชิก</span>
                    <h4 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.1rem' }}>
                      {foundCustomer.full_name}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      รหัส: {foundCustomer.member_code} | โทร: {foundCustomer.phone_number}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>แต้มสะสมปัจจุบัน</p>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {foundCustomer.current_points}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> แต้ม</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Action 1: Credit points (+1 per cup) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--brown)' }}>
                      1. เพิ่มแต้มการซื้อเครื่องดื่ม (+1 แต้มต่อแก้ว)
                    </span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'white' }}>
                        <button 
                          onClick={() => setCupsCount(c => Math.max(1, c - 1))}
                          style={{ border: 'none', background: 'none', padding: '6px 12px', cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <span style={{ padding: '6px 12px', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>{cupsCount}</span>
                        <button 
                          onClick={() => setCupsCount(c => c + 1)}
                          style={{ border: 'none', background: 'none', padding: '6px 12px', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>แก้ว</span>
                      
                      <button 
                        onClick={handleCreditPoints}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }}
                      >
                        <Award size={14} /> บันทึกเพิ่ม +{cupsCount} แต้ม
                      </button>
                    </div>
                  </div>

                  {/* Action 2: Redeem free cup (10 points) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--brown)' }}>
                      2. สิทธิ์แลกแก้วฟรีหน้าร้าน (หัก 10 แต้ม)
                    </span>
                    <button 
                      onClick={handleRedeemPoints}
                      className="btn btn-danger"
                      style={{ padding: '10px', fontSize: '0.8rem' }}
                      disabled={foundCustomer.current_points < 10}
                    >
                      <Sparkles size={14} /> ยืนยันหัก 10 แต้มแลกแก้วฟรี
                    </button>
                    {foundCustomer.current_points < 10 && (
                      <p style={{ color: 'var(--danger)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 2 }}>
                        <AlertCircle size={10} /> แต้มสะสมลูกค้าไม่เพียงพอสำหรับการแลกหน้าร้าน
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={() => { setFoundCustomer(null); setSearchMemberCode(''); }}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '6px' }}
                  >
                    ปิดการ์ดข้อมูลลูกค้า
                  </button>

                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      </div>

    </div>
  );
};
