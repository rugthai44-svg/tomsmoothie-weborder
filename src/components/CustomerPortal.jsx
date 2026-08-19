import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Flame, ShoppingBag, Clock, User, Gift, RefreshCw, 
  Check, MessageSquare, AlertCircle, ShoppingCart, 
  MapPin, Plus, Minus, ArrowRight, CheckCircle2 
} from 'lucide-react';

export const CustomerPortal = () => {
  const { 
    menuItems, 
    orders, 
    transactions,
    users,
    currentUser, 
    createOrder, 
    linkLineAccount, 
    triggerToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('tomsmoothie_customer_active_tab') || 'menu';
  });

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('tomsmoothie_customer_active_tab', tab);
  };
  const [selectedItem, setSelectedItem] = useState(null); // Item currently in customizer modal
  const [cart, setCart] = useState([]); // In-app cart
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [pickupTime, setPickupTime] = useState('15 นาที');
  const [isRedeemed, setIsRedeemed] = useState(false);

  const customerTxs = (transactions || []).filter(t => t.customer_id === currentUser.id);

  // Customizer state
  const [sweetness, setSweetness] = useState('100%');
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  if (!currentUser) return null;

  // Filter smoothies and toppings
  const smoothies = menuItems.filter(item => item.category === 'Smoothie');
  const toppings = menuItems.filter(item => item.category === 'Topping' && item.is_available);

  // Calculate 5 Best Sellers
  const bestSellers = [...smoothies]
    .sort((a, b) => b.total_sold_count - a.total_sold_count)
    .slice(0, 5);

  // Cart Management
  const openCustomizer = (item) => {
    if (!item.is_available) {
      triggerToast('ขออภัย รายการนี้สินค้าหมดชั่วคราว', 'danger');
      return;
    }
    setSelectedItem(item);
    setSweetness('100%');
    setSelectedToppings([]);
    setNotes('');
    setQuantity(1);
  };

  const handleAddToppingsToggle = (toppingName) => {
    setSelectedToppings(prev => 
      prev.includes(toppingName) 
        ? prev.filter(t => t !== toppingName) 
        : [...prev, toppingName]
    );
  };

  const addToCart = () => {
    const toppingPrice = selectedToppings.length * 10;
    const singlePrice = selectedItem.base_price + toppingPrice;
    
    const cartItem = {
      id: 'cart-' + Date.now(),
      menu_id: selectedItem.id,
      name: selectedItem.name,
      base_price: selectedItem.base_price,
      sweetness_level: sweetness,
      toppings: [...selectedToppings],
      quantity: quantity,
      notes: notes,
      subtotal_price: singlePrice * quantity
    };

    setCart(prev => [...prev, cartItem]);
    setSelectedItem(null);
    triggerToast('เพิ่มเครื่องดื่มลงตะกร้าแล้ว!', 'success');
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      triggerToast('กรุณาเลือกเครื่องดื่มลงตะกร้าก่อนสั่งซื้อ', 'warning');
      return;
    }
    setIsCheckoutOpen(true);
    // Reset free cup selection if they don't have enough points
    if (currentUser.current_points < 10) {
      setIsRedeemed(false);
    }
  };

  const submitOrder = async () => {
    const created = await createOrder(cart, isRedeemed, pickupTime);
    if (created) {
      setCart([]);
      setIsCheckoutOpen(false);
      handleSetActiveTab('orders'); // Jump to orders view to see status tracker
    }
  };

  // Re-order past item helper
  const handleReorder = (pastOrder) => {
    // Populate cart with past items
    const newCartItems = pastOrder.items.map(item => {
      const originalItem = menuItems.find(m => m.id === item.menu_id);
      return {
        id: 'cart-' + Date.now() + Math.random(),
        menu_id: item.menu_id,
        name: item.name,
        base_price: originalItem ? originalItem.base_price : (item.subtotal_price / item.quantity),
        sweetness_level: item.sweetness_level,
        toppings: [...item.toppings],
        quantity: item.quantity,
        notes: '',
        subtotal_price: item.subtotal_price
      };
    });

    setCart(newCartItems);
    triggerToast('โหลดรายการสั่งซื้อเดิมลงตะกร้าแล้ว', 'success');
    handleSetActiveTab('menu');
    setIsCheckoutOpen(true);
  };

  // Filter current active orders and completed history
  const customerOrders = orders.filter(o => o.customer_id === currentUser.id);
  const activeOrders = customerOrders.filter(o => o.order_status !== 'Completed');
  const pastOrders = customerOrders.filter(o => o.order_status === 'Completed');



  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal_price, 0);
  const freeCupDiscount = isRedeemed 
    ? cart.reduce((max, item) => {
        const toppingPrice = (item.toppings ? item.toppings.length : 0) * 10;
        const singlePrice = item.base_price + toppingPrice;
        return Math.max(max, singlePrice);
      }, 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Desktop Top Tabs Navigation */}
      <div className="desktop-tabs" style={{ 
        padding: '12px 20px', 
        backgroundColor: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border)'
      }}>
        <button 
          className={`desktop-tab-link ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => handleSetActiveTab('menu')}
        >
          🥤 สั่งเครื่องดื่ม
        </button>
        <button 
          className={`desktop-tab-link ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => handleSetActiveTab('rewards')}
        >
          ⭐ สะสมแต้ม
        </button>
        <button 
          className={`desktop-tab-link ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => { handleSetActiveTab('orders'); setIsCheckoutOpen(false); }}
        >
          📋 ออเดอร์
          {activeOrders.length > 0 && (
            <span className="nav-badge" style={{ position: 'relative', top: '0', right: '0', marginLeft: '6px' }}>{activeOrders.length}</span>
          )}
        </button>
      </div>

      {/* 1. Header Information & LINE Toggle */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brown), var(--brown-hover))',
        color: 'white',
        padding: '20px',
        borderBottomLeftRadius: 'var(--radius-lg)',
        borderBottomRightRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>ยินดีต้อนรับคุณ</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{currentUser.full_name}</h3>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>รหัสสมาชิก: {currentUser.member_code}</span>
          </div>
        </div>

        {/* Dynamic points progress card */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: '#ffb28a', fontWeight: 600 }}>คะแนนสะสมของคุณ</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                {currentUser.current_points}
              </span>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>/ 10 แต้ม</span>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('rewards')}
            className="btn btn-primary"
            style={{ width: 'auto', padding: '8px 14px', fontSize: '0.8rem', borderRadius: '30px' }}
          >
            <Gift size={14} /> ดูรหัส QR คูปอง
          </button>
        </div>
      </div>

      {/* Live Order Status Board */}
      {activeOrders.length > 0 && (
        <div style={{
          margin: '16px 16px 0 16px',
          padding: '16px',
          backgroundColor: '#fffdf9',
          border: '2px solid var(--primary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h4 style={{ color: 'var(--brown)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            📢 บอร์ดติดตามออเดอร์ล่าสุด (Live Order Board)
          </h4>
          {activeOrders.map(order => (
            <div key={order.id} style={{
              backgroundColor: 'white',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--brown)' }}>
                  ออเดอร์ #{order.id}
                </span>
                <span className={`badge badge-${order.order_status.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
                  {order.order_status === 'Pending' && '⏳ รอดำเนินการ'}
                  {order.order_status === 'Preparing' && '🍓 กำลังเริ่มปั่น'}
                  {order.order_status === 'Ready' && '🔔 ปั่นเสร็จแล้ว! มารับได้เลย'}
                </span>
              </div>

              {/* Progress Tracker */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', padding: '0 4px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '8%', right: '8%', height: '2px', backgroundColor: 'var(--border)', zIndex: 1, transform: 'translateY(-50%)' }} />
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '8%', 
                  width: order.order_status === 'Pending' ? '0%' : order.order_status === 'Preparing' ? '42%' : '84%', 
                  height: '2px', 
                  backgroundColor: 'var(--primary)', 
                  zIndex: 2, 
                  transform: 'translateY(-50%)',
                  transition: 'width 0.4s ease'
                }} />

                {[
                  { label: 'รอดำเนินการ', status: 'Pending', icon: '⏳' },
                  { label: 'กำลังปั่น', status: 'Preparing', icon: '🍓' },
                  { label: 'พร้อมรับสินค้า', status: 'Ready', icon: '🔔' }
                ].map((step, idx) => {
                  const statuses = ['Pending', 'Preparing', 'Ready'];
                  const currentIdx = statuses.indexOf(order.order_status);
                  const stepIdx = statuses.indexOf(step.status);
                  const isCompleted = stepIdx < currentIdx;
                  const isActive = stepIdx === currentIdx;

                  return (
                    <div key={step.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? 'var(--primary)' : isCompleted ? 'var(--brown)' : 'white',
                        color: isActive || isCompleted ? 'white' : 'var(--text-muted)',
                        border: `2px solid ${isActive || isCompleted ? 'var(--primary)' : 'var(--border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        transition: 'var(--transition)'
                      }}>
                        {step.icon}
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--primary)' : 'var(--text-muted)', marginTop: '4px' }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Order items detail */}
              <div style={{ fontSize: '0.78rem', color: 'var(--text)', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--brown)' }}>รายละเอียด: </span>
                {order.items.map((item, idx) => (
                  <span key={idx}>
                    {idx > 0 && ', '}{item.name} (หวาน {item.sweetness_level}) x{item.quantity}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', borderTop: '1px solid var(--border-light)', paddingTop: '6px' }}>
                <span>🕒 รับสินค้าประมาณ: <strong style={{ color: 'var(--primary)' }}>{order.pickup_time}</strong></span>
                <span>ยอดชำระ: <strong style={{ color: 'var(--primary)' }}>฿{order.total_price}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs - Mobile only */}
      <div className="desktop-hidden" style={{ padding: '16px 16px 0 16px' }}>
        <div className="tabs-container" style={{ margin: 0 }}>
          <button 
            className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => handleSetActiveTab('menu')}
          >
            🥤 เมนูน้ำปั่น
          </button>
          <button 
            className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
            onClick={() => handleSetActiveTab('rewards')}
          >
            ⭐ สะสมแต้ม
          </button>
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => handleSetActiveTab('orders')}
            style={{ position: 'relative' }}
          >
            📋 ออเดอร์
            {activeOrders.length > 0 && (
              <span className="nav-badge" style={{ right: '6px', top: '6px' }}>{activeOrders.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Content views */}
      <div style={{ padding: '16px' }}>

        {/* ================= MENU TAB ================= */}
        {activeTab === 'menu' && (
          <div className="desktop-grid-2col">
            {/* Left Column: Menu Items */}
            <div>
              {/* Best Sellers Carousel Section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={16} color="var(--primary)" fill="var(--primary)" />
                  🔥 5 อันดับเมนูยอดฮิต (Best Sellers)
                </h4>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  overflowX: 'auto', 
                  paddingBottom: '8px',
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {bestSellers.map((item, idx) => (
                    <div 
                      key={item.id}
                      onClick={() => openCustomizer(item)}
                      style={{
                        flex: '0 0 130px',
                        backgroundColor: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        borderRadius: '50%',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {idx + 1}
                      </div>
                      
                      <div style={{ fontSize: '2.2rem', margin: '8px 0' }}>{item.image_url}</div>
                      
                      <h5 style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: 'var(--brown)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        margin: '4px 0'
                      }}>
                        {item.name.split(' (')[0]}
                      </h5>
                      
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: 'var(--primary)' 
                      }}>
                        ฿{item.base_price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categorized Menu List */}
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px' }}>
                🥤 เมนูเครื่องดื่มปั่นทั้งหมด
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {smoothies.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => openCustomizer(item)}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      margin: 0,
                      cursor: item.is_available ? 'pointer' : 'not-allowed',
                      opacity: item.is_available ? 1 : 0.6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '2rem', 
                        backgroundColor: 'var(--brown-pale)', 
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '12px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        {item.image_url}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--brown)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </h5>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                          {item.is_popular && (
                            <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                              ยอดฮิต
                            </span>
                          )}
                          {!item.is_available && (
                            <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                              สินค้าหมด
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1rem' }}>
                        ฿{item.base_price}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: User Profile, Points & Desktop Cart (Sticky Sidebar) */}
            <div className="mobile-hidden desktop-card-sticky" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
              
              {/* Member Card */}
              <div className="card" style={{ padding: '16px', margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User size={16} color="var(--primary)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--brown)' }}>ข้อมูลสมาชิก</span>
                </div>
                <h4 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.05rem', margin: '4px 0' }}>
                  {currentUser.full_name}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  รหัส: {currentUser.member_code} | เบอร์: {currentUser.phone_number}
                </p>
                
                {/* loyalty cups progress */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', margin: '8px 0' }}>
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const isFilled = idx < currentUser.current_points;
                    return (
                      <div 
                        key={idx} 
                        className={`loyalty-cup ${isFilled ? 'filled' : ''}`}
                        style={{ fontSize: '0.9rem', width: '100%', height: 'auto', aspectRatio: '1' }}
                      >
                        {isFilled ? '🍹' : idx + 1}
                      </div>
                    );
                  })}
                </div>
                
                <div style={{
                  marginTop: '12px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--brown-pale)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--brown)',
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  {currentUser.current_points >= 10 
                    ? '🎉 พร้อมใช้สิทธิ์แลกฟรี 1 แก้ว!' 
                    : `ขาดอีก ${10 - currentUser.current_points} แก้ว จะได้ฟรี 1 แก้ว`}
                </div>
              </div>

              {/* Sidebar Cart */}
              <div className="card" style={{ padding: '18px 16px', margin: 0 }}>
                <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingCart size={16} /> ตะกร้าสั่งเครื่องดื่มของคุณ
                </h4>
                
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    ยังไม่มีน้ำปั่นในตะกร้า<br />คลิกเลือกเมนูด้านซ้ายเพื่อเพิ่มสินค้า
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                      {cart.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                          <div style={{ paddingRight: '8px' }}>
                            <p style={{ fontWeight: 'bold', color: 'var(--brown)' }}>{item.name} x{item.quantity}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              หวาน: {item.sweetness_level}
                              {item.toppings.length > 0 && ` | +${item.toppings.join(', ')}`}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontWeight: 'bold' }}>฿{item.subtotal_price}</span>
                            <button 
                              onClick={() => removeFromCart(item.id)} 
                              style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pickup time selector */}
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>เวลารับสินค้า (สั่งล่วงหน้า)</label>
                      <select 
                        className="form-input" 
                        value={pickupTime} 
                        onChange={(e) => setPickupTime(e.target.value)}
                        style={{ padding: '8px', fontSize: '0.8rem', borderRadius: '6px', marginTop: '4px' }}
                      >
                        <option value="15 นาที">อีก 15 นาที</option>
                        <option value="30 นาที">อีก 30 นาที</option>
                        <option value="45 นาที">อีก 45 นาที</option>
                        <option value="60 นาที">อีก 1 ชั่วโมง</option>
                      </select>
                    </div>

                    {/* Point deduction option */}
                    {currentUser.current_points >= 10 && (
                      <div style={{ 
                        backgroundColor: 'var(--success-light)', 
                        border: '1px solid rgba(56, 142, 60, 0.2)',
                        padding: '10px', 
                        borderRadius: '8px', 
                        marginBottom: '14px' 
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={isRedeemed} 
                            onChange={(e) => setIsRedeemed(e.target.checked)} 
                            style={{ accentColor: 'var(--success)', width: '15px', height: '15px' }} 
                          />
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--success)' }}>ใช้ 10 แต้ม แลกฟรีแก้วนี้!</p>
                          </div>
                        </label>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {isRedeemed ? 'ราคาสุทธิ (หักแลกฟรี 1 แก้ว):' : 'ราคาสุทธิ:'}
                      </span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>฿{Math.max(0, cartTotal - freeCupDiscount)}</span>
                    </div>

                    <button 
                      onClick={submitOrder} 
                      className="btn btn-primary" 
                      style={{ padding: '10px', fontSize: '0.85rem' }}
                    >
                      <CheckCircle2 size={14} /> ยืนยันสั่งสินค้าล่วงหน้า
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ================= REWARDS & QR TAB ================= */}
        {activeTab === 'rewards' && (
          <div style={{ textAlign: 'center' }}>
            
            {/* Loyalty Cups Grid */}
            <div className="card" style={{ padding: '20px 16px', marginBottom: '20px' }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                บัตรสะสมแต้มดิจิทัล (TomSmoothie Card)
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '16px' }}>
                ซื้อน้ำปั่นครบ 10 แก้ว แลกรับฟรี 1 แก้วทันที!
              </p>
              
              <div className="loyalty-progress-container">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const isFilled = idx < currentUser.current_points;
                  return (
                    <div 
                      key={idx} 
                      className={`loyalty-cup ${isFilled ? 'filled' : ''}`}
                    >
                      {isFilled ? '🍹' : idx + 1}
                    </div>
                  );
                })}
              </div>

              <div style={{
                marginTop: '16px',
                padding: '8px 12px',
                backgroundColor: 'var(--brown-pale)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--brown)',
                fontWeight: 600
              }}>
                {currentUser.current_points >= 10 
                  ? '🎉 คุณได้สิทธิ์แลกน้ำปั่นฟรี 1 แก้วแล้ว!' 
                  : `ขาดอีกเพียง ${10 - currentUser.current_points} แก้ว จะได้ฟรี 1 แก้ว!`}
              </div>
            </div>

            {/* Member QR Code Card */}
            <div className="card" style={{ 
              padding: '24px 20px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '12px',
              border: '2px solid var(--primary-light)',
              boxShadow: '0 8px 24px rgba(255, 120, 46, 0.08)'
            }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                คิวอาร์โค้ดสมาชิก
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: -4 }}>
                เปิดให้พนักงานสแกนที่หน้าร้านเพื่อสะสมแต้ม หรือแลกแก้วฟรี
              </p>
              
              <div style={{ 
                padding: '16px', 
                backgroundColor: 'white', 
                border: '1px solid var(--border)',
                borderRadius: '16px',
                display: 'inline-block',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)'
              }}>
                <QRCodeSVG 
                  value={currentUser.member_code} 
                  size={180} 
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--brown)',
                letterSpacing: '1px'
              }}>
                {currentUser.member_code}
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-muted)',
                fontSize: '0.75rem'
              }}>
                <span className="badge badge-ready" style={{ width: '6px', height: '6px', padding: 0 }}></span>
                <span>รหัส QR อัปเดตแบบเรียลไทม์</span>
              </div>
            </div>

            {/* Points History Card */}
            <div className="card" style={{ 
              marginTop: '20px', 
              textAlign: 'left',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📜 ประวัติการรับและแลกแต้ม
              </h4>

              {customerTxs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  ยังไม่มีประวัติการทำรายการสะสมแต้มสะสม
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {customerTxs.map(t => {
                    const isEarn = t.transaction_type === 'EARN';
                    const staffUser = users.find(u => u.id === t.staff_id || u.email === t.staff_email);
                    const staffName = staffUser ? staffUser.full_name : (t.staff_email || 'ระบบอัตโนมัติ');
                    
                    // Format Date
                    let formattedDateTime = '-';
                    try {
                      const d = new Date(t.created_at);
                      const dateStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
                      formattedDateTime = `${dateStr} - ${timeStr}`;
                    } catch (e) {}

                    return (
                      <div 
                        key={t.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          backgroundColor: 'var(--bg-light)',
                          borderRadius: '8px',
                          borderLeft: isEarn ? '4px solid var(--success)' : '4px solid var(--primary)',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.01)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--brown)' }}>
                            {isEarn ? '🥤 บันทึกสะสมแต้มหน้าร้าน' : '🎁 แลกเครื่องดื่มฟรี 1 แก้ว'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            🕒 {formattedDateTime}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            👤 พนักงาน: <strong style={{ color: 'var(--brown)' }}>{staffName}</strong>
                          </span>
                        </div>
                        <div style={{
                          backgroundColor: isEarn ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 120, 46, 0.1)',
                          color: isEarn ? 'var(--success)' : 'var(--primary)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap'
                        }}>
                          {isEarn ? `+${t.points_change} แต้ม` : `${t.points_change} แต้ม`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= ORDERS TAB ================= */}
        {activeTab === 'orders' && (
          <div>
            {/* Active Pre-Orders */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px' }}>
                🟢 รายการที่กำลังเตรียม (Active Pre-Orders)
              </h4>

              {activeOrders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <AlertCircle size={28} style={{ color: 'var(--border)', marginBottom: '8px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                  ไม่มีรายการสั่งซื้อที่กำลังดำเนินการขณะนี้
                </div>
              ) : (
                activeOrders.map(order => (
                  <div key={order.id} className="card" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--brown)' }}>
                        ออเดอร์ #{order.id}
                      </span>
                      
                      {/* Status Badges mapping */}
                      {order.order_status === 'Pending' && <span className="badge badge-pending">รอดำเนินการ (Pending)</span>}
                      {order.order_status === 'Preparing' && <span className="badge badge-preparing">กำลังปั่น (Preparing)</span>}
                      {order.order_status === 'Ready' && <span className="badge badge-ready">พร้อมรับสินค้า (Ready)</span>}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      เวลารับสินค้า: <span style={{ fontWeight: 'bold', color: 'var(--brown)' }}>{order.pickup_time}</span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '10px 0', marginBottom: '10px' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                            {item.name} (หวาน {item.sweetness_level}) x{item.quantity}
                            {item.toppings.length > 0 && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', paddingLeft: '8px' }}>
                                + {item.toppings.join(', ')}
                              </div>
                            )}
                          </span>
                          <span style={{ fontWeight: 600 }}>฿{item.subtotal_price}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {order.is_redeemed_free_cup ? '🎁 แลกเครื่องดื่มฟรี' : 'ยอดชำระสุทธิ (จ่ายหน้าร้าน)'}
                      </span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ฿{order.total_price}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Past Orders History */}
            <div>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px' }}>
                📜 ประวัติการสั่งซื้อ (Order History)
              </h4>

              {pastOrders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  ไม่มีประวัติการทำรายการในระบบ
                </div>
              ) : (
                pastOrders.map(order => (
                  <div key={order.id} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        วันที่: {new Date(order.created_at).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                      </span>
                      <span className="badge badge-completed">รับสำเร็จแล้ว</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.8rem', maxWidth: '70%' }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ color: 'var(--brown)', fontWeight: 600 }}>
                            {item.name.split(' (')[0]} x{item.quantity}
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                          ฿{order.total_price}
                        </span>
                        {order.is_redeemed_free_cup && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 'bold' }}>แลกแก้วฟรี</div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        ออเดอร์ #{order.id}
                      </span>
                      <button 
                        onClick={() => handleReorder(order)}
                        className="btn btn-outline"
                        style={{
                          width: 'auto',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          gap: '4px'
                        }}
                      >
                        <RefreshCw size={10} /> สั่งซ้ำ (Re-order)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

      {/* 3. Bottom Checkout floating button (if cart is not empty) */}
      {cart.length > 0 && activeTab === 'menu' && (
        <div className="desktop-hidden" style={{
          position: 'fixed',
          bottom: '72px', // Float just above bottom nav
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)',
          maxWidth: '576px',
          backgroundColor: 'var(--brown)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 90
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: 'var(--primary)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div>
              <p style={{ color: 'white', fontSize: '0.75rem', opacity: 0.8 }}>ตะกร้าของคุณ</p>
              <p style={{ color: 'white', fontSize: '0.95rem', fontWeight: 800 }}>฿{cartTotal}</p>
            </div>
          </div>
          <button 
            onClick={handleCheckout}
            className="btn btn-primary"
            style={{ width: 'auto', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem' }}
          >
            สั่งสินค้า <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ================= ITEM CUSTOMIZER MODAL ================= */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {selectedItem.category === 'Smoothie' ? 'เครื่องดื่มปั่นสูตรพิเศษ' : 'ท็อปปิ้งเพิ่มเติม'}
                </span>
                <h3 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.2rem' }}>
                  {selectedItem.name}
                </h3>
              </div>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
                ฿{selectedItem.base_price}
              </span>
            </div>

            {/* Customizer options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Sweetness Slider */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--brown)' }}>
                  ระดับความหวาน (Sweetness Level)
                </label>
                <div className="sweetness-options">
                  {['0%', '25%', '50%', '100%'].map(lvl => (
                    <div 
                      key={lvl}
                      className={`sweetness-btn ${sweetness === lvl ? 'active' : ''}`}
                      onClick={() => setSweetness(lvl)}
                    >
                      {lvl === '0%' && 'ไม่หวาน (0%)'}
                      {lvl === '25%' && 'หวานน้อย (25%)'}
                      {lvl === '50%' && 'หวานปกติ (50%)'}
                      {lvl === '100%' && 'หวานฉ่ำ (100%)'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Toppings Multi-select */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--brown)' }}>
                  เพิ่มท็อปปิ้ง (+10฿ ต่ออย่าง)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  {toppings.map(top => {
                    const isChecked = selectedToppings.includes(top.name);
                    return (
                      <div 
                        key={top.id}
                        onClick={() => handleAddToppingsToggle(top.name)}
                        style={{
                          border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: isChecked ? 'var(--primary-light)' : 'white',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          transition: 'var(--transition)'
                        }}
                      >
                        <span style={{ color: isChecked ? 'var(--primary-hover)' : 'var(--text)' }}>
                          {top.name.split(' (')[0]}
                        </span>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                          +฿10
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Note */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>บันทึกถึงร้านค้า (โน้ต)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="เช่น ไม่ใส่วิปครีม, ขอแยกเสาวรส..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Quantity selectors */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '10px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>จำนวน</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button 
                    type="button" 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    style={{ border: '1px solid var(--border)', background: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{quantity}</span>
                  <button 
                    type="button" 
                    onClick={() => setQuantity(q => q + 1)}
                    style={{ border: '1px solid var(--border)', background: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Add button */}
              <button 
                onClick={addToCart}
                className="btn btn-primary"
                style={{ marginTop: '10px' }}
              >
                ใส่ตะกร้า (฿{(selectedItem.base_price + selectedToppings.length * 10) * quantity})
              </button>

              <button 
                onClick={() => setSelectedItem(null)}
                className="btn btn-outline"
                style={{ marginTop: -8 }}
              >
                ยกเลิก
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ================= CHECKOUT MODAL ================= */}
      {isCheckoutOpen && (
        <div className="modal-overlay" onClick={() => setIsCheckoutOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px' }}>
              สรุปรายการคำสั่งซื้อล่วงหน้า
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '16px' }}>
              ตรวจสอบความถูกต้องและเลือกเวลารับสินค้า
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <div>
                    <p style={{ fontWeight: 'bold', color: 'var(--brown)' }}>
                      {item.name} x{item.quantity}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      ความหวาน: {item.weight || item.sweetness_level}
                      {item.toppings.length > 0 && ` | ท็อปปิ้ง: ${item.toppings.join(', ')}`}
                      {item.notes && ` | โน้ต: ${item.notes}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold' }}>฿{item.subtotal_price}</span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pickup time options */}
            <div className="form-group">
              <label>เวลารับสินค้าที่คาดไว้ (Pickup Time)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                {['15 นาที', '30 นาที', '45 นาที'].map(t => (
                  <button 
                    key={t}
                    type="button"
                    className={`btn ${pickupTime === t ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '8px 4px', fontSize: '0.75rem', borderRadius: '8px' }}
                    onClick={() => setPickupTime(t)}
                  >
                    อีก {t}
                  </button>
                ))}
              </div>
              
              <div style={{ marginTop: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="ระบุเวลาเฉพาะเจาะจง (เช่น 14:30 น.)" 
                  value={pickupTime.includes('นาที') ? '' : pickupTime}
                  onChange={(e) => setPickupTime(e.target.value || '15 นาที')}
                  style={{ padding: '10px' }}
                />
              </div>
            </div>

            {/* Points Redemption Offer */}
            {currentUser.current_points >= 10 && (
              <div className="card" style={{ 
                backgroundColor: 'var(--success-light)', 
                borderColor: 'rgba(56, 142, 60, 0.2)',
                padding: '12px 14px', 
                marginBottom: '16px' 
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={isRedeemed}
                    onChange={(e) => setIsRedeemed(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--success)' }}
                  />
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--success)' }}>
                      ใช้คะแนนสะสม 10 แต้ม แลกแก้วนี้ฟรี!
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      คะแนนปัจจุบัน: {currentUser.current_points} แต้ม (หักหลังยืนยัน)
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Price calculation block */}
            <div style={{ 
              backgroundColor: 'var(--brown-pale)', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                {isRedeemed ? 'ราคาสุทธิ (หักแลกฟรี 1 แก้ว)' : 'ราคาสุทธิ (ชำระเงินหน้าร้าน)'}
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                ฿{Math.max(0, cartTotal - freeCupDiscount)}
              </span>
            </div>

            <button 
              onClick={submitOrder}
              className="btn btn-primary"
              style={{ marginBottom: '8px' }}
            >
              <CheckCircle2 size={16} /> ยืนยันสั่งน้ำปั่นล่วงหน้า
            </button>

            <button 
              onClick={() => setIsCheckoutOpen(false)}
              className="btn btn-outline"
            >
              กลับไปเลือกสินค้า
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar (Customer view only) */}
      <div className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => handleSetActiveTab('menu')}
        >
          <ShoppingBag size={20} />
          <span>สั่งเครื่องดื่ม</span>
        </button>
        
        <button 
          className={`nav-item ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => handleSetActiveTab('rewards')}
        >
          <Gift size={20} />
          <span>สะสมแต้ม</span>
        </button>
        
        <button 
          className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleSetActiveTab('orders')}
        >
          <Clock size={20} />
          <span>ออเดอร์</span>
          {activeOrders.length > 0 && (
            <span className="nav-badge">{activeOrders.length}</span>
          )}
        </button>
      </div>

    </div>
  );
};
