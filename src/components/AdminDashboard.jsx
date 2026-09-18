import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  TrendingUp, Users, Coffee, ListFilter, Plus, Trash2, 
  Edit3, ShieldCheck, Power, RefreshCw, BarChart2, 
  Calendar, Check, UserPlus, FileSpreadsheet, PlayCircle, Sparkles, Clock,
  Tag, Percent, Flame, Search, SlidersHorizontal, Gift, ToggleLeft, ToggleRight, AlertCircle
} from 'lucide-react';

export const AdminDashboard = () => {
  const {
    menuItems,
    promotions,
    orders,
    users,
    transactions,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    togglePopularStatus,
    addPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotionActive,
    registerStaff,
    toggleStaffStatus,
    triggerToast,
    resetDatabase,
    dailyClosings,
    updateCustomerPoints
  } = useApp();

  const [adminTab, setAdminTab] = useState('analytics'); // 'analytics' | 'menu' | 'promotions' | 'members' | 'staff' | 'logs'
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  
  // Menu form states
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null if adding
  const [menuFormName, setMenuFormName] = useState('');
  const [menuFormCategory, setMenuFormCategory] = useState('Smoothie');
  const [menuFormPrice, setMenuFormPrice] = useState(0);
  const [menuFormEmoji, setMenuFormEmoji] = useState('🥤');
  const [menuFormPopular, setMenuFormPopular] = useState(false);

  // Promotion form states
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoType, setPromoType] = useState('DISCOUNT_BAHT');
  const [promoValue, setPromoValue] = useState('ลด 10฿');
  const [promoBadge, setPromoBadge] = useState('โปรโมชั่นพิเศษ');
  const [promoIsActive, setPromoIsActive] = useState(true);
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');

  // Stock Hub filter states
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategory, setStockCategory] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'POPULAR'

  // Staff form states
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');

  // Analytics Math
  const completedOrders = orders.filter(o => o.order_status === 'Completed');
  
  // Base revenue from completed orders plus revenue from submitted daily closings
  const closingsRevenue = (dailyClosings || []).reduce((sum, c) => sum + c.total_revenue, 0);
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_price, 0) + closingsRevenue;
  
  // Total cups and free drinks from closings
  const closingsFreeCups = (dailyClosings || []).reduce((sum, c) => sum + c.free_cups_redeemed, 0);
  const freeDrinksRedeemed = completedOrders.filter(o => o.is_redeemed_free_cup).length + closingsFreeCups;
  
  // Simulated ranges based on base sales
  const revenueDaily = totalRevenue + 130; // base + mock active
  const revenueWeekly = revenueDaily * 6;
  const revenueMonthly = revenueWeekly * 4.3;
  const revenueYearly = revenueMonthly * 12;

  // Best selling calculations
  const smoothies = menuItems.filter(item => ['Smoothie', 'Iced', 'Hot'].includes(item.category));
  const toppings = menuItems.filter(item => item.category === 'Topping');
  
  const sortedSellers = [...smoothies].sort((a, b) => b.total_sold_count - a.total_sold_count);
  const maxSoldVal = sortedSellers.length > 0 ? sortedSellers[0].total_sold_count : 1;

  // Form submit handlers
  const handleOpenMenuModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setMenuFormName(item.name);
      setMenuFormCategory(item.category);
      setMenuFormPrice(item.base_price);
      setMenuFormEmoji(item.image_url || '🥤');
      setMenuFormPopular(item.is_popular);
    } else {
      setEditingItem(null);
      setMenuFormName('');
      setMenuFormCategory('Smoothie');
      setMenuFormPrice(50);
      setMenuFormEmoji('🥤');
      setMenuFormPopular(false);
    }
    setIsMenuModalOpen(true);
  };

  const handleMenuSubmit = (e) => {
    e.preventDefault();
    if (!menuFormName.trim() || menuFormPrice <= 0) {
      triggerToast('กรุณากรอกชื่อเมนูและราคาที่ถูกต้อง', 'danger');
      return;
    }

    const payload = {
      id: editingItem?.id,
      name: menuFormName,
      category: menuFormCategory,
      base_price: Number(menuFormPrice),
      image_url: menuFormEmoji,
      is_popular: menuFormPopular
    };

    if (editingItem) {
      updateMenuItem(payload);
    } else {
      addMenuItem(payload);
    }
    setIsMenuModalOpen(false);
  };

  const handleOpenPromoModal = (promo = null) => {
    if (promo) {
      setEditingPromo(promo);
      setPromoTitle(promo.title);
      setPromoDesc(promo.description);
      setPromoType(promo.discount_type || 'DISCOUNT_BAHT');
      setPromoValue(promo.discount_value || '');
      setPromoBadge(promo.badge_text || 'โปรโมชั่น');
      setPromoIsActive(promo.is_active !== undefined ? promo.is_active : true);
      setPromoStartDate(promo.start_date || '');
      setPromoEndDate(promo.end_date || '');
    } else {
      setEditingPromo(null);
      setPromoTitle('');
      setPromoDesc('');
      setPromoType('DISCOUNT_BAHT');
      setPromoValue('ลด 10฿');
      setPromoBadge('โปรโมชั่นพิเศษ');
      setPromoIsActive(true);
      setPromoStartDate(new Date().toISOString().split('T')[0]);
      setPromoEndDate('2026-12-31');
    }
    setIsPromoModalOpen(true);
  };

  const handlePromoSubmit = (e) => {
    e.preventDefault();
    if (!promoTitle.trim()) {
      triggerToast('กรุณากรอกชื่อโปรโมชั่น', 'danger');
      return;
    }
    const payload = {
      id: editingPromo?.id,
      title: promoTitle,
      description: promoDesc,
      discount_type: promoType,
      discount_value: promoValue,
      badge_text: promoBadge,
      is_active: promoIsActive,
      start_date: promoStartDate,
      end_date: promoEndDate
    };
    if (editingPromo) {
      updatePromotion(payload);
    } else {
      addPromotion(payload);
    }
    setIsPromoModalOpen(false);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!staffEmail || !staffPassword || !staffName) {
      triggerToast('กรุณากรอกข้อมูลพนักงานที่ต้องการเพิ่มให้ครบถ้วน', 'danger');
      return;
    }

    const res = await registerStaff({
      email: staffEmail,
      password: staffPassword,
      full_name: staffName,
      phone_number: staffPhone
    });

    if (res.success) {
      setIsStaffFormOpen(false);
      setStaffEmail('');
      setStaffPassword('');
      setStaffName('');
      setStaffPhone('');
    }
  };

  return (
    <div className="app-container wide-layout" style={{ minHeight: 'calc(100vh - 40px)', padding: '20px' }}>
      
      {/* Admin Quick Title Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid var(--border)',
        paddingBottom: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👑 ระบบจัดการหลังบ้านแอดมิน
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            จัดการเครื่องดื่ม ตรวจสอบยอดขาย คิวออเดอร์ และสิทธิ์พนักงานหน้าร้าน
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container" style={{ marginBottom: '24px' }}>
        <button 
          className={`tab-btn ${adminTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setAdminTab('analytics')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <BarChart2 size={16} />
          วิเคราะห์และยอดขาย
        </button>
        <button 
          className={`tab-btn ${adminTab === 'menu' ? 'active' : ''}`}
          onClick={() => setAdminTab('menu')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Coffee size={16} />
          จัดการเมนูเครื่องดื่ม
        </button>
        <button 
          className={`tab-btn ${adminTab === 'promotions' ? 'active' : ''}`}
          onClick={() => setAdminTab('promotions')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Tag size={16} />
          จัดการโปรโมชั่น/สถานะสินค้า
        </button>
        <button 
          className={`tab-btn ${adminTab === 'members' ? 'active' : ''}`}
          onClick={() => setAdminTab('members')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Users size={16} />
          ข้อมูลสมาชิก (ลูกค้า)
        </button>
        <button 
          className={`tab-btn ${adminTab === 'staff' ? 'active' : ''}`}
          onClick={() => setAdminTab('staff')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <ShieldCheck size={16} />
          สิทธิ์การใช้งานของพนักงาน
        </button>
        <button 
          className={`tab-btn ${adminTab === 'logs' ? 'active' : ''}`}
          onClick={() => setAdminTab('logs')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <FileSpreadsheet size={16} />
          ประวัติการบันทึกแต้ม
        </button>
      </div>

      {/* ================= ADMIN TAB: SALES & ANALYTICS ================= */}
      {adminTab === 'analytics' && (
        <div>
          {/* Revenue metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>รายได้วันนี้ (วันนี้)</span>
                <Calendar size={14} />
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brown)', margin: '4px 0' }}>
                ฿{revenueDaily.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
                📈 ยอดพรีออเดอร์ร้านน้ำปั่นวันนี้
              </span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--warning)', margin: 0 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>รายได้สัปดาห์นี้ (Weekly)</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brown)', margin: '4px 0' }}>
                ฿{revenueWeekly.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                คำนวณฐาน 6 วันทำการต่อสัปดาห์
              </span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--info)', margin: 0 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>รายได้เดือนนี้ (Monthly)</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brown)', margin: '4px 0' }}>
                ฿{revenueMonthly.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                คาดการณ์จากอัตราเฉลี่ยรอบเดือน
              </span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--success)', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>จำนวนแก้วฟรีสะสม</span>
                <Sparkles size={14} color="var(--primary)" />
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', margin: '4px 0' }}>
                {freeDrinksRedeemed} แก้ว
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                แจกฟรีน้ำปั่นครบ 10 แต้มสะสม
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Best Sellers Analytics (Interactive CSS Bar Chart) */}
            <div className="card" style={{ margin: 0 }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} /> 5 อันดับเมนูน้ำปั่นยอดฮิต (จำนวนแก้วที่ขายได้)
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {sortedSellers.slice(0, 5).map((item, idx) => {
                  const pct = Math.max(10, Math.floor((item.total_sold_count / maxSoldVal) * 100));
                  return (
                    <div key={item.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        <span style={{ color: 'var(--brown)' }}>{idx + 1}. {item.name.split(' (')[0]}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{item.total_sold_count} แก้ว</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--brown-pale)', borderRadius: '50px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${pct}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, var(--primary), #ffa726)', 
                          borderRadius: '50px',
                          transition: 'var(--transition)'
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick business review */}
            <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px' }}>
                  📊 สรุปประมวลผลข้อมูลการค้า
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>เมนูเครื่องดื่มทั้งหมด</span>
                    <span style={{ fontWeight: 'bold' }}>{smoothies.length} รายการ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>ท็อปปิ้งในระบบ</span>
                    <span style={{ fontWeight: 'bold' }}>{toppings.length} ชนิด</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>ยอดสั่งซื้อรวมทุกสถานะ</span>
                    <span style={{ fontWeight: 'bold' }}>{orders.length} ออเดอร์</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>สแกนทำรายการรวม (สะสม/แลก)</span>
                    <span style={{ fontWeight: 'bold' }}>{transactions.length} ครั้ง</span>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'var(--primary-light)',
                borderRadius: '8px',
                color: 'var(--primary-hover)',
                fontSize: '0.75rem',
                lineHeight: 1.5,
                fontWeight: 500
              }}>
                💡 <b>คำแนะนำร้านค้า:</b> มะม่วงเสาวรสปั่น และสตรอว์เบอร์รีโยเกิร์ตเป็นเมนูที่สร้างรายได้ดีที่สุด แอดมินสามารถเปิด/ปิดสต๊อกวัตถุดิบและปรับราคาขายได้ทันทีในหน้าเครื่องดื่มถัดไป
              </div>
            </div>

          </div>

          {/* Monthly Revenue Chart */}
          <div className="card" style={{ marginTop: '20px', margin: '20px 0 0 0' }}>
            <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={16} /> กราฟสรุปยอดขายรายเดือน (ปี 2026)
            </h4>
            
            <div style={{ 
              display: 'flex', 
              height: '240px', 
              alignItems: 'flex-end', 
              position: 'relative', 
              paddingLeft: '45px', 
              paddingRight: '15px',
              paddingBottom: '30px', 
              borderBottom: '1px solid var(--border)' 
            }}>
              {/* Grid lines and Y-axis labels */}
              <div style={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                bottom: '30px', 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between', 
                pointerEvents: 'none', 
                fontSize: '0.7rem', 
                color: 'var(--text-muted)' 
              }}>
                <div style={{ borderBottom: '1px dashed var(--border)', width: '100%', paddingBottom: '2px', display: 'flex', justifyContent: 'flex-start' }}>
                  <span>฿8,000</span>
                </div>
                <div style={{ borderBottom: '1px dashed var(--border)', width: '100%', paddingBottom: '2px', display: 'flex', justifyContent: 'flex-start' }}>
                  <span>฿6,000</span>
                </div>
                <div style={{ borderBottom: '1px dashed var(--border)', width: '100%', paddingBottom: '2px', display: 'flex', justifyContent: 'flex-start' }}>
                  <span>฿4,000</span>
                </div>
                <div style={{ borderBottom: '1px dashed var(--border)', width: '100%', paddingBottom: '2px', display: 'flex', justifyContent: 'flex-start' }}>
                  <span>฿2,000</span>
                </div>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                  <span>฿0</span>
                </div>
              </div>

              {/* Bars */}
              <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', height: '100%', zIndex: 1, alignItems: 'flex-end' }}>
                {[
                  { month: 'ม.ค.', sales: 5400 },
                  { month: 'ก.พ.', sales: 5900 },
                  { month: 'มี.ค.', sales: 6200 },
                  { month: 'เม.ย.', sales: 7500 },
                  { month: 'พ.ค.', sales: 6800 },
                  { month: 'มิ.ย.', sales: 5700 },
                  { month: 'ก.ค.', sales: 6300 },
                  { month: 'ส.ค.', sales: Math.round(revenueMonthly) },
                ].map((d, index) => {
                  const heightPercent = (d.sales / 8000) * 100;
                  const isHovered = hoveredBarIndex === index;
                  return (
                    <div key={index} style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      width: '10%', 
                      height: '100%', 
                      justifyContent: 'flex-end', 
                      position: 'relative' 
                    }}>
                      
                      {/* Bar with hover effect */}
                      <div 
                        onMouseEnter={() => setHoveredBarIndex(index)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                        style={{
                          width: '100%',
                          maxWidth: '32px',
                          height: `${heightPercent}%`,
                          background: isHovered 
                            ? 'linear-gradient(to top, var(--brown-hover), var(--primary-hover))' 
                            : 'linear-gradient(to top, var(--brown), var(--primary))',
                          borderRadius: '6px 6px 0 0',
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease-in-out',
                          transform: isHovered ? 'scaleY(1.05)' : 'none',
                          boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                        }}
                      >
                        {/* Tooltip */}
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          marginBottom: '8px',
                          backgroundColor: 'var(--brown)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: 'var(--shadow-md)',
                          opacity: isHovered ? 1 : 0,
                          transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
                          transition: 'all 0.2s ease-in-out',
                          pointerEvents: 'none',
                          zIndex: 10
                        }}>
                          ฿{d.sales.toLocaleString('th-TH')}
                        </div>
                      </div>
                      
                      {/* Month Label */}
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: 'var(--text-muted)', 
                        marginTop: '8px', 
                        position: 'absolute', 
                        bottom: '-22px' 
                      }}>
                        {d.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              * ข้อมูลของเดือน สิงหาคม คำนวณแบบพลวัตจากยอดขายจริงในปัจจุบัน
            </div>
          </div>

          {/* Recent Shift Closings Table */}
          <div className="card" style={{ marginTop: '20px', margin: '20px 0 0 0' }}>
            <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> แสดงรายงานสรุปยอดขายประจำวันล่าสุด
            </h4>

            {(!dailyClosings || dailyClosings.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ยังไม่มีข้อมูลการส่งปิดยอดขายประจำวันในระบบ
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 8px' }}>วันที่</th>
                      <th style={{ padding: '10px 8px' }}>พนักงาน</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>แก้วที่ขายได้</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>แลกฟรี</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>ยอดขายระบบ</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>ยอดนับจริง</th>
                      <th style={{ padding: '10px 8px' }}>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyClosings.map((c) => {
                      const rawDate = c.date;
                      let formattedDate = rawDate;
                      try {
                        const parts = rawDate.split('-');
                        if (parts.length === 3) {
                          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        }
                      } catch (e) {}

                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{formattedDate}</td>
                          <td style={{ padding: '10px 8px' }}>{c.staff_name}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>{c.cups_sold}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>{c.free_cups_redeemed}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--brown)' }}>
                            ฿{c.total_revenue.toLocaleString('th-TH')}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                            ฿{(c.cash_actual || c.total_revenue).toLocaleString('th-TH')}
                          </td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {c.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ================= ADMIN TAB: MENU MANAGEMENT CRUD ================= */}
      {adminTab === 'menu' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem' }}>
              รายการเครื่องดื่ม & ท็อปปิ้งทั้งหมด ในระบบร้านค้า
            </h4>
            <button 
              onClick={() => handleOpenMenuModal(null)}
              className="btn btn-primary"
              style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem', borderRadius: '10px' }}
            >
              <Plus size={14} /> เพิ่มเครื่องดื่ม/ท็อปปิ้งใหม่
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            
            {/* 1. SMOOTHIES TABLE */}
            <div className="card" style={{ padding: '16px 20px', margin: 0 }}>
              <h5 style={{ color: 'var(--brown)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>
                🥤 รายการเครื่องดื่มทั้งหมด (ร้อน / เย็น / ปั่น)
              </h5>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 4px' }}>รูปภาพ</th>
                      <th style={{ padding: '8px' }}>ชื่อรายการ</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>ประเภท</th>
                      <th style={{ padding: '8px' }}>ราคาตั้งต้น</th>
                      <th style={{ padding: '8px' }}>ยอดขายรวม</th>
                      <th style={{ padding: '8px' }}>ความนิยม</th>
                      <th style={{ padding: '8px' }}>สถานะสินค้า</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>เครื่องมือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smoothies.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 4px', fontSize: '1.5rem' }}>{item.image_url}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--brown)' }}>{item.name}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: 'var(--brown-pale)',
                            color: 'var(--brown)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold'
                          }}>
                            {item.category === 'Smoothie' && '🥤 ปั่น'}
                            {item.category === 'Iced' && '🍹 เย็น'}
                            {item.category === 'Hot' && '☕ ร้อน'}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>฿{item.base_price}</td>
                        <td style={{ padding: '8px' }}>{item.total_sold_count} แก้ว</td>
                        <td style={{ padding: '8px' }}>
                          {item.is_popular ? (
                            <span className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>ยอดฮิต 🔥</span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <button
                            onClick={() => toggleMenuItemAvailability(item.id)}
                            style={{
                              backgroundColor: item.is_available ? 'var(--success-light)' : 'var(--danger-light)',
                              color: item.is_available ? 'var(--success)' : 'var(--danger)',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {item.is_available ? 'พร้อมขาย (In-Stock)' : 'สินค้าหมด (Out-of-Stock)'}
                          </button>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => handleOpenMenuModal(item)}
                              style={{ border: 'none', background: 'none', color: 'var(--brown-light)', cursor: 'pointer' }}
                              title="แก้ไข"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`ยืนยันการลบเมนู ${item.name}?`)) {
                                  deleteMenuItem(item.id);
                                }
                              }}
                              style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                              title="ลบ"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. TOPPINGS TABLE */}
            <div className="card" style={{ padding: '16px 20px', margin: 0 }}>
              <h5 style={{ color: 'var(--brown)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>
                🍒 รายการท็อปปิ้งเพิ่มเติม (Toppings)
              </h5>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px' }}>ชื่อท็อปปิ้ง</th>
                      <th style={{ padding: '8px' }}>ราคาเพิ่มเติม</th>
                      <th style={{ padding: '8px' }}>สถานะท็อปปิ้ง</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>เครื่องมือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toppings.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--brown)' }}>{item.name}</td>
                        <td style={{ padding: '8px' }}>+฿{item.base_price}</td>
                        <td style={{ padding: '8px' }}>
                          <button
                            onClick={() => toggleMenuItemAvailability(item.id)}
                            style={{
                              backgroundColor: item.is_available ? 'var(--success-light)' : 'var(--danger-light)',
                              color: item.is_available ? 'var(--success)' : 'var(--danger)',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {item.is_available ? 'พร้อมให้บริการ' : 'หมด (ชั่วคราว)'}
                          </button>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => handleOpenMenuModal(item)}
                              style={{ border: 'none', background: 'none', color: 'var(--brown-light)', cursor: 'pointer' }}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`ยืนยันลบท็อปปิ้ง ${item.name}?`)) {
                                  deleteMenuItem(item.id);
                                }
                              }}
                              style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= ADMIN TAB: PROMOTIONS & STOCK STATUS ================= */}
      {adminTab === 'promotions' && (
        <div style={{ animation: 'pop-in 0.3s ease', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. Header Overview KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>แคมเปญโปรโมชั่นเปิดใช้งาน</span>
                <Gift size={15} color="var(--primary)" />
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brown)', margin: '4px 0' }}>
                {(promotions || []).filter(p => p.is_active).length} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {(promotions || []).length} แคมเปญ</span>
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
                🎉 แสดงผลบนหน้าสั่งซื้อของลูกค้า
              </span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--success)', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>สินค้าพร้อมจำหน่าย (In-Stock)</span>
                <Check size={15} color="var(--success)" />
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', margin: '4px 0' }}>
                {menuItems.filter(i => i.is_available).length} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {menuItems.length} รายการ</span>
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                รวมเครื่องดื่มทุกหมวดและท็อปปิ้ง
              </span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--danger)', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>สินค้าหมดชั่วคราว (Out of Stock)</span>
                <AlertCircle size={15} color="var(--danger)" />
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)', margin: '4px 0' }}>
                {menuItems.filter(i => !i.is_available).length} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>รายการ</span>
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>
                ⚠️ ลูกค้าไม่สามารถกดสั่งซื้อได้
              </span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #ff9800', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>เมนูยอดฮิตประจำร้าน (Popular)</span>
                <Flame size={15} color="#ff9800" />
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e65100', margin: '4px 0' }}>
                {menuItems.filter(i => i.is_popular).length} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>รายการ</span>
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                🔥 ติดป้ายยอดนิยมหน้าแรก
              </span>
            </div>
          </div>

          {/* 2. PROMOTIONS SECTION */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={18} color="var(--primary)" /> จัดการแคมเปญโปรโมชั่นและส่วนลด
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                  เปิด-ปิด หรือสร้างแคมเปญโปรโมชั่น สิทธิประโยชน์แต้มสะสม และส่วนลดเมนูพิเศษ
                </p>
              </div>
              <button 
                onClick={() => handleOpenPromoModal(null)}
                className="btn btn-primary"
                style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem', borderRadius: '10px' }}
              >
                <Plus size={14} /> เพิ่มโปรโมชั่นใหม่
              </button>
            </div>

            {/* Promotions Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {(promotions || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                  ยังไม่มีโปรโมชั่นในระบบ กดปุ่ม "เพิ่มโปรโมชั่นใหม่" เพื่อเริ่มต้น
                </div>
              ) : (
                (promotions || []).map(promo => {
                  const isActive = promo.is_active;
                  return (
                    <div 
                      key={promo.id}
                      style={{
                        backgroundColor: isActive ? 'var(--bg-card)' : 'var(--bg)',
                        border: isActive ? '1.5px solid var(--primary-light)' : '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                        position: 'relative',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{
                            backgroundColor: isActive ? 'var(--primary-light)' : 'var(--brown-pale)',
                            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>
                            {promo.badge_text || 'โปรโมชั่น'}
                          </span>

                          {/* Quick Toggle Active Status */}
                          <button
                            onClick={() => togglePromotionActive(promo.id)}
                            style={{
                              backgroundColor: isActive ? 'var(--success-light)' : 'var(--danger-light)',
                              color: isActive ? 'var(--success)' : 'var(--danger)',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {isActive ? '🟢 เปิดใช้งาน' : '⚪ ปิดใช้งาน'}
                          </button>
                        </div>

                        <h5 style={{ color: 'var(--brown)', fontSize: '0.95rem', fontWeight: 800, margin: '4px 0 6px 0' }}>
                          {promo.title}
                        </h5>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                          {promo.description}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>สิทธิพิเศษ:</span>
                          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>
                            🏷️ {promo.discount_value || 'พิเศษ'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                          <span>ระยะเวลา:</span>
                          <span>{promo.start_date} ถึง {promo.end_date}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenPromoModal(promo)}
                            className="btn btn-outline"
                            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                          >
                            <Edit3 size={13} /> แก้ไข
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`ยืนยันการลบโปรโมชั่น "${promo.title}"?`)) {
                                deletePromotion(promo.id);
                              }
                            }}
                            className="btn btn-danger"
                            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                          >
                            <Trash2 size={13} /> ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. LIVE STOCK & AVAILABILITY CONTROL HUB */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} color="var(--primary)" /> ศูนย์จัดการสถานะสินค้า & สต็อกวัตถุดิบ (Live Stock Hub)
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                เปิด-ปิดสต็อกสินค้าทันทีเมื่อวัตถุดิบหมด หรือกำหนดป้ายเมนูยอดฮิต (Best Sellers) ให้แสดงเด่นหน้าร้าน
              </p>
            </div>

            {/* Filter and Search Controls */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '12px', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              backgroundColor: 'var(--bg)', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              marginBottom: '16px' 
            }}>
              {/* Search input */}
              <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  className="form-input"
                  placeholder="ค้นหาชื่อเครื่องดื่ม หรือท็อปปิ้ง..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.8rem', height: '36px' }}
                />
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'ทั้งหมด' },
                  { id: 'Smoothie', label: '🥤 ปั่น' },
                  { id: 'Iced', label: '🍹 เย็น' },
                  { id: 'Hot', label: '☕ ร้อน' },
                  { id: 'Topping', label: '🍒 ท็อปปิ้ง' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setStockCategory(cat.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '20px',
                      border: '1px solid var(--border)',
                      backgroundColor: stockCategory === cat.id ? 'var(--brown)' : 'var(--bg-card)',
                      color: stockCategory === cat.id ? 'white' : 'var(--brown)',
                      cursor: 'pointer'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <select
                className="form-input"
                value={stockStatusFilter}
                onChange={e => setStockStatusFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '150px', fontSize: '0.8rem', height: '36px', appearance: 'auto' }}
              >
                <option value="ALL">สถานะ: ทั้งหมด</option>
                <option value="IN_STOCK">เฉพาะ: พร้อมขาย (In-Stock)</option>
                <option value="OUT_OF_STOCK">เฉพาะ: สินค้าหมด (Out-of-Stock)</option>
                <option value="POPULAR">เฉพาะ: เมนูยอดฮิต 🔥</option>
              </select>
            </div>

            {/* Items Live Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg)' }}>
                    <th style={{ padding: '12px 10px', width: '50px', textAlign: 'center' }}>ไอคอน</th>
                    <th style={{ padding: '12px 10px' }}>ชื่อรายการสินค้า</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>หมวดหมู่</th>
                    <th style={{ padding: '12px 10px' }}>ราคา</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>ยอดขายสะสม</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>ป้ายยอดนิยม 🔥</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>สถานะสต็อกสินค้า</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allItems = [
                      ...smoothies.map(s => ({ ...s, isTopping: false })),
                      ...toppings.map(t => ({ ...t, isTopping: true, image_url: '🍒' }))
                    ];
                    const filtered = allItems.filter(item => {
                      const matchSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase());
                      const matchCat = stockCategory === 'ALL' || (stockCategory === 'Topping' ? item.isTopping : item.category === stockCategory);
                      let matchStatus = true;
                      if (stockStatusFilter === 'IN_STOCK') matchStatus = item.is_available;
                      if (stockStatusFilter === 'OUT_OF_STOCK') matchStatus = !item.is_available;
                      if (stockStatusFilter === 'POPULAR') matchStatus = item.is_popular;
                      return matchSearch && matchCat && matchStatus;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            ไม่พบรายการสินค้าตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px', fontSize: '1.4rem', textAlign: 'center' }}>
                          {item.image_url || '🥤'}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--brown)' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: 'var(--brown-pale)',
                            color: 'var(--brown)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            {item.isTopping ? 'ท็อปปิ้ง' : item.category}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--primary)' }}>
                          ฿{item.base_price}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {item.total_sold_count !== undefined ? `${item.total_sold_count} แก้ว` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {!item.isTopping ? (
                            <button
                              type="button"
                              onClick={() => togglePopularStatus(item.id)}
                              style={{
                                backgroundColor: item.is_popular ? '#fff3e0' : 'var(--bg)',
                                color: item.is_popular ? '#e65100' : 'var(--text-muted)',
                                border: item.is_popular ? '1.5px solid #ff9800' : '1px solid var(--border)',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                              }}
                            >
                              {item.is_popular ? '🔥 ยอดฮิต' : 'ปกติ'}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleMenuItemAvailability(item.id)}
                            style={{
                              backgroundColor: item.is_available ? 'var(--success-light)' : 'var(--danger-light)',
                              color: item.is_available ? 'var(--success)' : 'var(--danger)',
                              border: item.is_available ? '1.5px solid var(--success)' : '1.5px solid var(--danger)',
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: item.is_available ? '0 2px 6px rgba(46, 125, 50, 0.15)' : 'none',
                              transition: 'var(--transition)'
                            }}
                          >
                            {item.is_available ? '🟢 พร้อมขาย (In-Stock)' : '🔴 สินค้าหมด (Out-of-Stock)'}
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= ADMIN TAB: STAFF MANAGEMENT ================= */}
      {adminTab === 'staff' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Add Staff form */}
          <div className="card" style={{ margin: 0, height: 'fit-content' }}>
            <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={16} /> ลงทะเบียนพนักงานร้านคนใหม่
            </h4>
            
            <form onSubmit={handleStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>ชื่อพนักงาน</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="เช่น สมศักดิ์ จัดเต็ม"
                  value={staffName}
                  onChange={e => setStaffName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>อีเมลใช้งาน (ใช้เข้าสู่ระบบ Staff Portal)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="staffname@tomsmoothie.com"
                  value={staffEmail}
                  onChange={e => setStaffEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>รหัสผ่านเริ่มต้น</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="ความยาวอย่างน้อย 4 ตัวอักษร"
                  value={staffPassword}
                  onChange={e => setStaffPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>เบอร์โทรศัพท์ติดต่อ</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="081-xxx-xxxx"
                  value={staffPhone}
                  onChange={e => setStaffPhone(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                ยืนยันลงทะเบียนพนักงาน
              </button>
            </form>
          </div>

          {/* Staff members table */}
          <div className="card" style={{ margin: 0 }}>
            <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> รายชื่อและสิทธิ์พนักงานหน้าร้าน
            </h4>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>ชื่อพนักงาน</th>
                    <th style={{ padding: '8px' }}>อีเมลล็อกอิน</th>
                    <th style={{ padding: '8px' }}>สถานะสิทธิ์</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>เปิด/ปิดใช้งาน</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'STAFF').map(staff => (
                    <tr key={staff.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--brown)' }}>{staff.full_name}</td>
                      <td style={{ padding: '8px' }}>{staff.email}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          backgroundColor: staff.is_active ? 'var(--success-light)' : 'var(--danger-light)',
                          color: staff.is_active ? 'var(--success)' : 'var(--danger)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.65rem',
                          fontWeight: 'bold'
                        }}>
                          {staff.is_active ? 'ปกติ' : 'ถูกระงับสิทธิ์'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => toggleStaffStatus(staff.id)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: staff.is_active ? 'var(--danger)' : 'var(--success)',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title={staff.is_active ? 'ระงับการเข้าสู่ระบบ' : 'คืนสิทธิ์พนักงาน'}
                        >
                          <Power size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= ADMIN TAB: MEMBERS MANAGEMENT ================= */}
      {adminTab === 'members' && (
        <div style={{ animation: 'pop-in 0.3s ease' }}>
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👥 จัดการรายชื่อลูกค้าสมาชิกทั้งหมด ({users.filter(u => u.role === 'CUSTOMER').length} คน)
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                  ตรวจสอบข้อมูลสมาชิกทั้งหมด ปรับแต่งแต้มสะสม หรือระงับสิทธิ์การใช้งานชั่วคราว
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', backgroundColor: 'var(--bg)' }}>
                    <th style={{ padding: '12px 10px' }}>ชื่อ-นามสกุล</th>
                    <th style={{ padding: '12px 10px' }}>รหัสสมาชิก</th>
                    <th style={{ padding: '12px 10px' }}>ข้อมูลติดต่อ</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>แต้มสะสม</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>สถานะใช้งาน</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>การจัดการสมาชิก</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'CUSTOMER').length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        ไม่มีข้อมูลสมาชิกลูกค้าในระบบขณะนี้
                      </td>
                    </tr>
                  ) : (
                    users.filter(u => u.role === 'CUSTOMER').map(cust => (
                      <tr key={cust.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: 'var(--brown)' }}>
                          {cust.full_name}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <code style={{ backgroundColor: 'var(--brown-pale)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown)' }}>
                            {cust.member_code}
                          </code>
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <div>✉️ {cust.email}</div>
                          <div>📞 {cust.phone || cust.phone_number || '-'}</div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary)' }}>
                          {cust.current_points} แต้ม
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: cust.is_active ? 'var(--success-light)' : 'var(--danger-light)',
                            color: cust.is_active ? 'var(--success)' : 'var(--danger)',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold'
                          }}>
                            {cust.is_active ? 'ปกติ (Active)' : 'ถูกบล็อก (Blocked)'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const pointsStr = prompt(`ป้อนจำนวนแต้มสะสมใหม่สำหรับคุณ ${cust.full_name} (ปัจจุบันมี ${cust.current_points} แต้ม):`, cust.current_points);
                                if (pointsStr !== null) {
                                  const pts = Number(pointsStr);
                                  if (!isNaN(pts) && pts >= 0) {
                                    updateCustomerPoints(cust.id, pts);
                                  } else {
                                    alert('กรุณากรอกแต้มเป็นตัวเลขบวกที่ถูกต้อง');
                                  }
                                }
                              }}
                              className="btn btn-outline"
                              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              ⭐ ปรับแต้ม
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleStaffStatus(cust.id)}
                              className={cust.is_active ? "btn btn-outline" : "btn btn-primary"}
                              style={{ 
                                width: 'auto', 
                                padding: '6px 12px', 
                                fontSize: '0.75rem', 
                                borderRadius: '6px',
                                color: cust.is_active ? 'var(--danger)' : 'white',
                                borderColor: cust.is_active ? 'var(--danger)' : 'var(--primary)'
                              }}
                            >
                              {cust.is_active ? 'ระงับใช้งาน' : 'เปิดใช้งาน'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADMIN TAB: AUDIT LOGS ================= */}
      {adminTab === 'logs' && (
        <div className="card" style={{ margin: 0 }}>
          <h4 style={{ color: 'var(--brown)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
            Scan Audit Trail Log (บันทึกประวัติการสะสมแต้ม)
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '16px' }}>
            รายละเอียดสแกนบัตรสมาชิกสะสมคะแนน และแลกเครื่องดื่มของลูกค้าหน้าร้าน
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>วัน-เวลาทำรายการ</th>
                  <th style={{ padding: '10px 8px' }}>ชื่อลูกค้า</th>
                  <th style={{ padding: '10px 8px' }}>การทำรายการ</th>
                  <th style={{ padding: '10px 8px' }}>การเปลี่ยนแปลงแต้ม</th>
                  <th style={{ padding: '10px 8px' }}>บันทึกโดย (พนักงาน)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      ไม่มีบันทึกข้อมูลประวัติการสแกนในระบบ
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => {
                    const isEarn = tx.transaction_type === 'EARN';
                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 8px' }}>
                          {new Date(tx.created_at).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--brown)' }}>
                          {tx.customer_name}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{
                            backgroundColor: isEarn ? 'var(--info-light)' : 'var(--success-light)',
                            color: isEarn ? 'var(--info)' : 'var(--success)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            fontSize: '0.7rem'
                          }}>
                            {isEarn ? 'สะสมแต้ม (EARN)' : 'แลกน้ำปั่นฟรี (REDEEM)'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: isEarn ? 'var(--info)' : 'var(--danger)' }}>
                          {isEarn ? `+${tx.points_change}` : tx.points_change} แต้ม
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                          {tx.staff_email}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ADD/EDIT MENU MODAL DIALOG ================= */}
      {isMenuModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMenuModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '16px' }}>
              {editingItem ? 'แก้ไขรายการสินค้า' : 'เพิ่มรายการใหม่'}
            </h3>

            <form onSubmit={handleMenuSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label>หมวดหมู่</label>
                <select 
                  className="form-input" 
                  value={menuFormCategory} 
                  onChange={e => setMenuFormCategory(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  <option value="Smoothie">🥤 เครื่องดื่มปั่น (Smoothie)</option>
                  <option value="Iced">🍹 เครื่องดื่มเย็น (Iced)</option>
                  <option value="Hot">☕ เครื่องดื่มร้อน (Hot)</option>
                  <option value="Topping">🍒 ท็อปปิ้ง (Topping)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>ชื่อเมนูภาษาไทย / ภาษาอังกฤษ</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="เช่น ส้มปั่นสด (Orange Smoothie)"
                  value={menuFormName}
                  onChange={e => setMenuFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>ราคาตั้งต้น (THB)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="ราคาเครื่องดื่ม"
                  value={menuFormPrice}
                  onChange={e => setMenuFormPrice(e.target.value)}
                  required
                />
              </div>

              {['Smoothie', 'Iced', 'Hot'].includes(menuFormCategory) && (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>อีโมจิประกอบ (Emoji)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="เช่น 🍊 หรือ 🥭"
                      value={menuFormEmoji}
                      onChange={e => setMenuFormEmoji(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={menuFormPopular}
                        onChange={e => setMenuFormPopular(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                      />
                      <span>ทำเครื่องหมายเป็นเมนูยอดฮิต (Best Sellers)</span>
                    </label>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                <Check size={16} /> ยืนยันบันทึกข้อมูล
              </button>

              <button 
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="btn btn-outline"
              >
                ยกเลิก
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD/EDIT PROMOTION MODAL DIALOG ================= */}
      {isPromoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPromoModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <h3 style={{ color: 'var(--brown)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '16px' }}>
              {editingPromo ? 'แก้ไขแคมเปญโปรโมชั่น' : 'สร้างแคมเปญโปรโมชั่นใหม่'}
            </h3>

            <form onSubmit={handlePromoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label>ชื่อแคมเปญโปรโมชั่น</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="เช่น ลด 10฿ ชาไทยและชาเขียว"
                  value={promoTitle}
                  onChange={e => setPromoTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>ป้ายข้อความกำกับ (Badge Label)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="เช่น เมนูยอดฮิต, Special, Flash Sale"
                  value={promoBadge}
                  onChange={e => setPromoBadge(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>ประเภทโปรโมชั่น</label>
                  <select 
                    className="form-input" 
                    value={promoType} 
                    onChange={e => setPromoType(e.target.value)}
                    style={{ appearance: 'auto' }}
                  >
                    <option value="DISCOUNT_BAHT">ส่วนลดบาท (Baht)</option>
                    <option value="DOUBLE_POINTS">แต้มคูณสอง (Points x2)</option>
                    <option value="FREE_ITEM">แลกรับฟรี (Free Drink)</option>
                    <option value="HAPPY_HOUR">Happy Hour ช่วงเวลา</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>มูลค่าส่วนลด / สิทธิ์</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="เช่น ลด 10฿ หรือ แต้ม x2"
                    value={promoValue}
                    onChange={e => setPromoValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>คำอธิบายรายละเอียดโปรโมชั่น</label>
                <textarea 
                  className="form-input" 
                  placeholder="ระบุเงื่อนไขและรายละเอียดโปรโมชั่นให้ลูกค้าทราบ..."
                  value={promoDesc}
                  onChange={e => setPromoDesc(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>วันที่เริ่มต้น</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={promoStartDate}
                    onChange={e => setPromoStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>วันที่สิ้นสุด</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={promoEndDate}
                    onChange={e => setPromoEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={promoIsActive}
                    onChange={e => setPromoIsActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span>เปิดใช้งานแคมเปญทันที (Active)</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                <Check size={16} /> ยืนยันบันทึกโปรโมชั่น
              </button>

              <button 
                type="button"
                onClick={() => setIsPromoModalOpen(false)}
                className="btn btn-outline"
              >
                ยกเลิก
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
