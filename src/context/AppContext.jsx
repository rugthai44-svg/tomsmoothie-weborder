import React, { createContext, useState, useEffect, useContext } from 'react';
import { mockDb } from '../mockDb';
import { supabase } from '../supabase';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tomsmoothie_current_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [dailyClosings, setDailyClosings] = useState([]);
  
  // Custom states for notifications and simulator experience
  const [lineNotifications, setLineNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLiffInitialized, setIsLiffInitialized] = useState(false);

  // Sync database state from Supabase on load
  useEffect(() => {
    const initData = async () => {
      // 1. Fetch Users
      let { data: dbUsers, error: usersErr } = await supabase
        .from('tomsmoothie_users')
        .select('*');
        
      if (usersErr) {
        console.error('Error fetching users from Supabase:', usersErr);
      }
      
      // Seed if empty
      if (!dbUsers || dbUsers.length === 0) {
        const initialUsers = mockDb.getUsers();
        const { data: insertedUsers, error: insertErr } = await supabase
          .from('tomsmoothie_users')
          .insert(initialUsers.map(u => ({
            id: u.id,
            email: u.email,
            password_hash: u.password_hash,
            full_name: u.full_name,
            phone: u.phone_number,
            role: u.role,
            member_code: u.member_code,
            current_points: u.current_points,
            line_user_id: u.line_user_id,
            google_id: u.google_id,
            auth_provider: u.auth_provider,
            is_active: u.is_active
          })))
          .select();
          
        if (insertErr) {
          console.error('Error seeding users:', insertErr);
        } else {
          dbUsers = insertedUsers;
        }
      }
      
      if (dbUsers) setUsers(dbUsers);
      
      // 2. Fetch Menu Items (Local static read-only in this mock db)
      setMenuItems(mockDb.getMenu());
      
      // 3. Fetch Orders (with nested items)
      const { data: dbOrders, error: ordersErr } = await supabase
        .from('tomsmoothie_orders')
        .select(`
          *,
          items:tomsmoothie_order_items(*)
        `)
        .order('created_at', { ascending: false });
        
      if (ordersErr) console.error('Error fetching orders:', ordersErr);
      if (dbOrders) setOrders(dbOrders);
      
      // 4. Fetch Point Transactions
      const { data: dbTxs, error: txsErr } = await supabase
        .from('tomsmoothie_point_transactions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (txsErr) console.error('Error fetching transactions:', txsErr);
      if (dbTxs) setTransactions(dbTxs);
      
      // 5. Fetch Daily Closings
      const { data: dbClosings, error: closingsErr } = await supabase
        .from('tomsmoothie_daily_closings')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (closingsErr) console.error('Error fetching daily closings:', closingsErr);
      if (dbClosings) setDailyClosings(dbClosings);

      // 6. Sync current user session
      const savedUser = localStorage.getItem('tomsmoothie_current_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (dbUsers) {
            const fresh = dbUsers.find(u => u.id === parsed.id);
            if (fresh) {
              setCurrentUser(fresh);
              localStorage.setItem('tomsmoothie_current_user', JSON.stringify(fresh));
            } else {
              setCurrentUser(parsed);
            }
          }
        } catch (e) {}
      }
    };
    
    initData();
  }, []);
 
  // Real LINE LIFF Initialization
  useEffect(() => {
    const liffId = import.meta.env.VITE_LIFF_ID || "";
    if (window.liff && liffId) {
      window.liff.init({ liffId })
        .then(() => {
          console.log("LIFF SDK Initialized successfully");
          setIsLiffInitialized(true);
        })
        .catch(err => {
          console.error("LIFF initialization failed:", err);
          setIsLiffInitialized(false);
        });
    }
  }, []);

  // Listen for Supabase OAuth redirects and sign-ins
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const googleUser = session.user;
        const email = googleUser.email;
        const fullName = googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || 'ลูกค้า Google';
        const googleId = googleUser.id;

        // Skip if already logged in locally to avoid infinite toast loops on reload
        const saved = localStorage.getItem('tomsmoothie_current_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.email === email) return;
          } catch(e) {}
        }

        const res = await loginWithGoogle({
          email: email,
          name: fullName,
          google_id: googleId
        });
        
        if (!res?.success) {
          await supabase.auth.signOut();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [users]);

  // Quick helper to display a brief visual toast
  const triggerToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper to send mock LINE notifications (and real push if token configured)
  const sendLineNotification = (targetUserId, message) => {
    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser || !targetUser.line_user_id) return; // Only notify if LINE is linked
    
    const newNotif = {
      id: 'notif-' + Date.now() + Math.random().toString(36).substr(2, 5),
      user_name: targetUser.full_name,
      message,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    
    setLineNotifications(prev => [newNotif, ...prev]);
    // Auto-remove notification after 8 seconds
    setTimeout(() => {
      setLineNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 8000);

    // Real LINE Messaging API Push (if VITE_LINE_ACCESS_TOKEN is configured)
    const channelAccessToken = import.meta.env.VITE_LINE_ACCESS_TOKEN || "";
    if (channelAccessToken && !targetUser.line_user_id.startsWith('U-LINE-')) {
      const payload = {
        to: targetUser.line_user_id,
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      };

      fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.line.me/v2/bot/message/push'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => console.log('Real LINE push notification sent:', data))
      .catch(err => console.error('Error sending real LINE notification:', err));
    }
  };

  // Auth Operations
  const login = async (email, password) => {
    const { data: user, error } = await supabase
      .from('tomsmoothie_users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', password)
      .maybeSingle();

    if (error || !user) {
      triggerToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'danger');
      return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    }
    if (!user.is_active) {
      triggerToast('บัญชีนี้ถูกปิดใช้งานชั่วคราว', 'danger');
      return { success: false, message: 'บัญชีนี้ถูกปิดใช้งาน' };
    }
    setCurrentUser(user);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(user));
    triggerToast(`ยินดีต้อนรับคุณ ${user.full_name}`, 'success');
    return { success: true, user };
  };

  const registerCustomer = async (data) => {
    // Check if email exists
    const { data: existing } = await supabase
      .from('tomsmoothie_users')
      .select('id')
      .eq('email', data.email)
      .maybeSingle();

    if (existing) {
      triggerToast('อีเมลนี้ถูกใช้งานแล้ว', 'danger');
      return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' };
    }
    
    const randCode = 'MEMBER' + Math.floor(100 + Math.random() * 900);
    const newUser = {
      id: 'u-' + Date.now(),
      email: data.email,
      password_hash: data.password,
      full_name: data.full_name,
      phone: data.phone_number || '',
      role: 'CUSTOMER',
      current_points: 0,
      line_user_id: null,
      member_code: randCode,
      created_at: new Date().toISOString(),
      is_active: true
    };
    
    const { data: dbUser, error } = await supabase
      .from('tomsmoothie_users')
      .insert([newUser])
      .select()
      .single();

    if (error || !dbUser) {
      console.error('Error registering customer:', error);
      triggerToast('เกิดข้อผิดพลาดในการลงทะเบียน', 'danger');
      return { success: false };
    }

    setUsers(prev => [...prev, dbUser]);
    setCurrentUser(dbUser);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(dbUser));
    triggerToast('ลงทะเบียนและเข้าสู่ระบบสำเร็จ', 'success');
    return { success: true, user: dbUser };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('tomsmoothie_current_user');
    localStorage.removeItem('tomsmoothie_session_token');
    triggerToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  const loginWithGoogle = async (profile) => {
    let { data: user } = await supabase
      .from('tomsmoothie_users')
      .select('*')
      .eq('email', profile.email)
      .maybeSingle();

    let isNew = false;

    if (user) {
      let updatedUser = { ...user };
      let changed = false;
      if (!user.google_id) {
        updatedUser.google_id = profile.google_id;
        changed = true;
      }
      if (user.auth_provider !== 'GOOGLE') {
        updatedUser.auth_provider = 'GOOGLE';
        changed = true;
      }

      if (changed) {
        const { data: freshUser } = await supabase
          .from('tomsmoothie_users')
          .update({ google_id: updatedUser.google_id, auth_provider: updatedUser.auth_provider })
          .eq('id', user.id)
          .select()
          .single();
        if (freshUser) {
          user = freshUser;
          setUsers(prev => prev.map(u => u.id === user.id ? user : u));
        }
      }
      
      if (!user.is_active) {
        triggerToast('บัญชีนี้ถูกปิดใช้งานชั่วคราว', 'danger');
        return { success: false, message: 'บัญชีนี้ถูกปิดใช้งาน' };
      }
    } else {
      isNew = true;
      const selectedRole = localStorage.getItem('tomsmoothie_last_role') || 'CUSTOMER';
      const randCode = selectedRole === 'CUSTOMER' 
        ? 'TOM-CUST-' + Math.floor(1000 + Math.random() * 9000)
        : (selectedRole === 'STAFF' ? 'STAFF' + Math.floor(100 + Math.random() * 900) : 'ADMIN' + Math.floor(100 + Math.random() * 900));

      const newUser = {
        id: 'u-' + Date.now(),
        email: profile.email,
        password_hash: 'GOOGLE-OAUTH',
        full_name: profile.name,
        phone: '',
        role: selectedRole,
        current_points: 0,
        line_user_id: null,
        google_id: profile.google_id,
        auth_provider: 'GOOGLE',
        member_code: randCode,
        created_at: new Date().toISOString(),
        is_active: true
      };

      const { data: dbUser, error } = await supabase
        .from('tomsmoothie_users')
        .insert([newUser])
        .select()
        .single();

      if (error || !dbUser) {
        console.error('Error creating google user:', error);
        triggerToast('เกิดข้อผิดพลาดในการเชื่อมโยงบัญชี Google', 'danger');
        return { success: false };
      }

      user = dbUser;
      setUsers(prev => [...prev, user]);
    }

    setCurrentUser(user);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(user));
    
    const mockToken = 'mock-jwt-' + btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role }));
    localStorage.setItem('tomsmoothie_session_token', mockToken);

    triggerToast(`ยินดีต้อนรับคุณ ${user.full_name}`, 'success');
    return { success: true, user, isNew };
  };

  const loginWithGoogleRedirect = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      triggerToast('เกิดข้อผิดพลาดในการลงชื่อเข้าใช้งานด้วย Google', 'danger');
    }
  };

  const updateUserPhone = async (userId, phone) => {
    const { data: dbUser, error } = await supabase
      .from('tomsmoothie_users')
      .update({ phone: phone })
      .eq('id', userId)
      .select()
      .single();

    if (error || !dbUser) {
      triggerToast('เกิดข้อผิดพลาดในการบันทึกเบอร์โทรศัพท์', 'danger');
      return { success: false };
    }

    setUsers(prev => prev.map(u => u.id === userId ? dbUser : u));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(dbUser);
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify(dbUser));
    }
    triggerToast('บันทึกเบอร์โทรศัพท์สำเร็จ!', 'success');
    return { success: true };
  };

  // Switch role directly (useful helper bar for peer testing/grading)
  const devSwitchRole = (role) => {
    let target = null;
    if (role === 'CUSTOMER') target = users.find(u => u.role === 'CUSTOMER');
    else if (role === 'STAFF') target = users.find(u => u.role === 'STAFF');
    else if (role === 'ADMIN') target = users.find(u => u.role === 'ADMIN');
    
    if (target) {
      setCurrentUser(target);
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify(target));
      triggerToast(`สลับบทบาทเป็น: ${role}`, 'success');
    }
  };

  // Link Customer LINE account (hybrid real LIFF & simulation fallback)
  const linkLineAccount = () => {
    if (!currentUser || currentUser.role !== 'CUSTOMER') return;

    const isCurrentlyLinked = !!currentUser.line_user_id;

    if (isCurrentlyLinked) {
      saveLinkedLineId(null);
    } else {
      if (window.liff && isLiffInitialized) {
        if (!window.liff.isLoggedIn()) {
          triggerToast('กำลังนำคุณไปยังหน้าเข้าสู่ระบบ LINE...', 'info');
          window.liff.login();
          return;
        }

        window.liff.getProfile()
          .then(profile => {
            const lineUserId = profile.userId;
            saveLinkedLineId(lineUserId);
          })
          .catch(err => {
            console.error("LIFF profile fetch error:", err);
            triggerToast('การเชื่อมต่อกับ LINE ล้มเหลว กรุณาลองใหม่อีกครั้ง', 'danger');
          });
      } else {
        const simulatedId = 'U-LINE-' + Math.floor(100000 + Math.random() * 900000);
        saveLinkedLineId(simulatedId);
      }
    }
  };

  const saveLinkedLineId = async (newId) => {
    const { data: dbUser, error } = await supabase
      .from('tomsmoothie_users')
      .update({ line_user_id: newId })
      .eq('id', currentUser.id)
      .select()
      .single();

    if (error || !dbUser) {
      triggerToast('เกิดข้อผิดพลาดในการบันทึกบัญชี LINE', 'danger');
      return;
    }

    setUsers(prev => prev.map(u => u.id === currentUser.id ? dbUser : u));
    setCurrentUser(dbUser);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(dbUser));
    
    if (newId) {
      triggerToast('เชื่อมต่อบัญชี LINE สำเร็จแล้ว!', 'success');
      setTimeout(() => {
        sendLineNotification(currentUser.id, '💬 ขอบคุณที่เชื่อมต่อ LINE แจ้งเตือน! คุณจะได้รับข้อความสถานะออเดอร์และแต้มสะสมที่ห้องแชทนี้');
      }, 800);
    } else {
      triggerToast('ยกเลิกการเชื่อมต่อ LINE แล้ว', 'info');
    }
  };

  // CUSTOMER: Pre-order Smoothie
  const createOrder = async (orderCart, isRedeemedFreeCup, pickupTime) => {
    if (!currentUser || currentUser.role !== 'CUSTOMER') return null;
    
    // Check points if free cup requested
    if (isRedeemedFreeCup && currentUser.current_points < 10) {
      triggerToast('แต้มสะสมไม่เพียงพอสำหรับการแลกเครื่องดื่มฟรี', 'danger');
      return null;
    }

    const orderId = 'ord-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      id: orderId,
      customer_id: currentUser.id,
      customer_name: currentUser.full_name,
      customer_phone: currentUser.phone || '',
      pickup_time: pickupTime,
      order_status: 'Pending', // Pending -> Preparing -> Ready -> Completed
      total_price: isRedeemedFreeCup ? 0 : orderCart.reduce((sum, item) => sum + item.subtotal_price, 0),
      is_redeemed_free_cup: isRedeemedFreeCup,
      created_at: new Date().toISOString()
    };

    // 1. Insert order to Supabase
    const { error: orderErr } = await supabase
      .from('tomsmoothie_orders')
      .insert([newOrder]);

    if (orderErr) {
      console.error('Error creating order in Supabase:', orderErr);
      triggerToast('เกิดข้อผิดพลาดในการสั่งซื้อ', 'danger');
      return null;
    }

    // 2. Insert items
    const itemsPayload = orderCart.map((item, idx) => ({
      order_id: orderId,
      menu_item_id: item.menu_id,
      name: item.name,
      sweetness_level: item.sweetness_level,
      toppings: item.toppings,
      quantity: item.quantity,
      subtotal_price: isRedeemedFreeCup ? 0 : item.subtotal_price
    }));

    const { error: itemsErr } = await supabase
      .from('tomsmoothie_order_items')
      .insert(itemsPayload);

    if (itemsErr) {
      console.error('Error creating order items in Supabase:', itemsErr);
    }

    const fullOrder = { ...newOrder, items: itemsPayload };

    // 3. Deduct points if free cup redeemed
    let updatedSelf = { ...currentUser };
    if (isRedeemedFreeCup) {
      const nextPoints = currentUser.current_points - 10;
      const { data: dbUser } = await supabase
        .from('tomsmoothie_users')
        .update({ current_points: nextPoints })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (dbUser) {
        updatedSelf = dbUser;
        setUsers(prev => prev.map(u => u.id === currentUser.id ? dbUser : u));
        setCurrentUser(dbUser);
        localStorage.setItem('tomsmoothie_current_user', JSON.stringify(dbUser));
      }

      // Append transaction to Supabase
      const newTx = {
        id: 'tx-' + Date.now(),
        customer_id: currentUser.id,
        customer_name: currentUser.full_name,
        staff_id: 'system',
        staff_email: 'ระบบอัตโนมัติ (แอป)',
        order_id: orderId,
        points_change: -10,
        transaction_type: 'REDEEM',
        created_at: new Date().toISOString()
      };

      const { data: dbTx } = await supabase
        .from('tomsmoothie_point_transactions')
        .insert([newTx])
        .select()
        .single();

      if (dbTx) {
        setTransactions(prev => [dbTx, ...prev]);
      }
      
      sendLineNotification(currentUser.id, `🍹 แลกน้ำปั่นฟรีสำเร็จ! หักคะแนน 10 แต้ม คงเหลือ ${updatedSelf.current_points} แต้ม`);
    } else {
      sendLineNotification(currentUser.id, `🛒 สั่งซื้อสำเร็จ! ออเดอร์ของคุณกำลังรอดำเนินการ รับสินค้าเวลา ${pickupTime}`);
    }

    setOrders(prev => [fullOrder, ...prev]);
    triggerToast('ส่งคำสั่งซื้อล่วงหน้าเรียบร้อยแล้ว!', 'success');
    return fullOrder;
  };

  // STAFF: Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('tomsmoothie_orders')
      .update({ order_status: newStatus })
      .eq('id', orderId);

    if (error) {
      triggerToast('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'danger');
      return;
    }

    const updatedOrders = orders.map(ord => {
      if (ord.id === orderId) {
        if (newStatus === 'Preparing') {
          sendLineNotification(ord.customer_id, `🍓 ร้านกำลังเริ่มปั่นเครื่องดื่มของคุณแล้ว! (เตรียมรับสินค้าตามเวลาที่ระบุ)`);
        } else if (newStatus === 'Ready') {
          sendLineNotification(ord.customer_id, `🔔 เครื่องดื่มปั่นเสร็จเรียบร้อย! พร้อมให้คุณเข้ามารับที่เคาน์เตอร์แล้วครับ`);
        } else if (newStatus === 'Completed') {
          sendLineNotification(ord.customer_id, `🤝 ขอบคุณที่อุดหนุน TomSmoothie! รับสินค้าเรียบร้อยแล้ว หวังว่าจะชอบแก้วนี้นะครับ`);
        }
        return { ...ord, order_status: newStatus };
      }
      return ord;
    });

    setOrders(updatedOrders);
    triggerToast(`อัปเดตสถานะออเดอร์เป็น [${newStatus}]`, 'success');
  };

  // STAFF: Scan QR points add/deduct
  const scanLoyaltyQR = async (memberCode, actionType, cupsCount = 1) => {
    if (!currentUser || currentUser.role !== 'STAFF') {
      triggerToast('เฉพาะพนักงานเท่านั้นที่สามารถบันทึกแต้มได้', 'danger');
      return { success: false, message: 'การสิทธิ์ไม่ถูกต้อง' };
    }

    const customerUser = users.find(u => u.member_code === memberCode && u.role === 'CUSTOMER');
    if (!customerUser) {
      triggerToast('ไม่พบข้อมูลรหัสสมาชิกนี้', 'danger');
      return { success: false, message: 'ไม่พบสมาชิก' };
    }

    let pointsChange = 0;
    if (actionType === 'EARN') {
      pointsChange = cupsCount;
    } else if (actionType === 'REDEEM') {
      if (customerUser.current_points < 10) {
        triggerToast('สมาชิกแต้มสะสมไม่เพียงพอ (ต้องการ 10 แต้ม)', 'danger');
        return { success: false, message: 'แต้มสะสมไม่เพียงพอ' };
      }
      pointsChange = -10;
    }

    const nextPoints = Math.max(0, customerUser.current_points + pointsChange);

    // 1. Update user points in Supabase
    const { data: dbUser, error: userErr } = await supabase
      .from('tomsmoothie_users')
      .update({ current_points: nextPoints })
      .eq('id', customerUser.id)
      .select()
      .single();

    if (userErr || !dbUser) {
      triggerToast('เกิดข้อผิดพลาดในการอัปเดตแต้ม', 'danger');
      return { success: false };
    }

    // 2. Record transaction in Supabase
    const newTx = {
      id: 'tx-' + Date.now(),
      customer_id: customerUser.id,
      customer_name: customerUser.full_name,
      staff_id: currentUser.id,
      staff_email: currentUser.email,
      order_id: null,
      points_change: pointsChange,
      transaction_type: actionType,
      created_at: new Date().toISOString()
    };

    const { data: dbTx } = await supabase
      .from('tomsmoothie_point_transactions')
      .insert([newTx])
      .select()
      .single();

    if (dbTx) {
      setTransactions(prev => [dbTx, ...prev]);
    }

    setUsers(prev => prev.map(u => u.id === customerUser.id ? dbUser : u));

    // Send LINE alerts
    const finalPoints = dbUser.current_points;
    if (actionType === 'EARN') {
      sendLineNotification(customerUser.id, `🎉 ได้รับแต้มสะสม +${pointsChange} แต้ม! ปัจจุบันคุณมีสะสม ${finalPoints}/10 แต้ม`);
      if (finalPoints >= 10) {
        setTimeout(() => {
          sendLineNotification(customerUser.id, `🌟 ยินดีด้วยครับ! แต้มสะสมครบ 10 แต้มแล้ว สามารถแลกเครื่องดื่มฟรีได้ในครั้งถัดไป!`);
        }, 1500);
      }
    } else {
      sendLineNotification(customerUser.id, `🍹 พนักงานบันทึกการแลกน้ำปั่นฟรี หักแต้ม -10 คะแนน คงเหลือ ${finalPoints} แต้ม`);
    }

    // Sync logged in user if currently viewing customer simulation
    if (currentUser.id === customerUser.id) {
      setCurrentUser(dbUser);
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify(dbUser));
    }

    triggerToast(`บันทึกแต้มให้คุณ ${customerUser.full_name} (${pointsChange > 0 ? '+' : ''}${pointsChange} แต้ม) สำเร็จ`, 'success');
    return { success: true, customer: dbUser, finalPoints };
  };

  // ADMIN: Menu Management CRUD (Locally kept for static catalog demo)
  const addMenuItem = (item) => {
    const newItem = {
      id: 'm-' + Date.now(),
      name: item.name,
      category: item.category,
      base_price: Number(item.base_price),
      image_url: item.category === 'Smoothie' ? (item.image_url || '🥤') : null,
      is_popular: !!item.is_popular,
      is_available: true,
      total_sold_count: 0
    };
    const updatedMenu = [...menuItems, newItem];
    setMenuItems(updatedMenu);
    mockDb.saveMenu(updatedMenu);
    triggerToast(`เพิ่มรายการ "${item.name}" สำเร็จ`, 'success');
  };

  const updateMenuItem = (updatedItem) => {
    const updatedMenu = menuItems.map(item => {
      if (item.id === updatedItem.id) {
        return {
          ...item,
          name: updatedItem.name,
          base_price: Number(updatedItem.base_price),
          image_url: updatedItem.image_url,
          is_popular: !!updatedItem.is_popular
        };
      }
      return item;
    });
    setMenuItems(updatedMenu);
    mockDb.saveMenu(updatedMenu);
    triggerToast(`แก้ไขรายการ "${updatedItem.name}" สำเร็จ`, 'success');
  };

  const deleteMenuItem = (id) => {
    const target = menuItems.find(m => m.id === id);
    const updatedMenu = menuItems.filter(item => item.id !== id);
    setMenuItems(updatedMenu);
    mockDb.saveMenu(updatedMenu);
    triggerToast(`ลบรายการ "${target?.name || ''}" สำเร็จ`, 'success');
  };

  const toggleMenuItemAvailability = (id) => {
    const updatedMenu = menuItems.map(item => {
      if (item.id === id) {
        const nextState = !item.is_available;
        triggerToast(`เปลี่ยนสถานะ "${item.name}" เป็น [${nextState ? 'พร้อมขาย' : 'หมด'}]`, 'info');
        return { ...item, is_available: nextState };
      }
      return item;
    });
    setMenuItems(updatedMenu);
    mockDb.saveMenu(updatedMenu);
  };

  // ADMIN: Staff Management CRUD
  const registerStaff = async (data) => {
    // Check email exists
    const { data: existing } = await supabase
      .from('tomsmoothie_users')
      .select('id')
      .eq('email', data.email)
      .maybeSingle();

    if (existing) {
      triggerToast('อีเมลนี้ถูกใช้งานแล้ว', 'danger');
      return { success: false, message: 'อีเมลนี้มีอยู่แล้ว' };
    }

    const randCode = 'STAFF' + Math.floor(100 + Math.random() * 900);
    const newStaff = {
      id: 'u-' + Date.now(),
      email: data.email,
      password_hash: data.password,
      full_name: data.full_name,
      phone: data.phone_number || '',
      role: 'STAFF',
      current_points: 0,
      line_user_id: null,
      member_code: randCode,
      created_at: new Date().toISOString(),
      is_active: true
    };

    // Insert staff to Supabase
    const { data: dbStaff, error: staffErr } = await supabase
      .from('tomsmoothie_users')
      .insert([newStaff])
      .select()
      .single();

    if (staffErr || !dbStaff) {
      console.error('Error inserting staff to Supabase:', staffErr);
      triggerToast('เกิดข้อผิดพลาดในการลงทะเบียนพนักงาน', 'danger');
      return { success: false };
    }

    const updatedUsers = [...users, dbStaff];
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
    triggerToast(`เพิ่มพนักงานคุณ "${data.full_name}" สำเร็จ`, 'success');
    return { success: true };
  };

  const toggleStaffStatus = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    const nextState = !targetUser.is_active;

    const { error: err } = await supabase
      .from('tomsmoothie_users')
      .update({ is_active: nextState })
      .eq('id', id);

    if (err) {
      console.error('Error updating staff active status in Supabase:', err);
      triggerToast('เกิดข้อผิดพลาดในการอัปเดตสถานะพนักงาน', 'danger');
      return;
    }

    const updatedUsers = users.map(u => {
      if (u.id === id) {
        return { ...u, is_active: nextState };
      }
      return u;
    });
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
    triggerToast(`${nextState ? 'เปิดใช้งาน' : 'ระงับใช้งาน'} พนักงาน "${targetUser.full_name}" เรียบร้อย`, 'info');
  };

  const submitDailyClosing = async (closingData) => {
    const newClosing = {
      id: 'close-' + Date.now(),
      created_at: new Date().toISOString(),
      date: closingData.date,
      staff_id: closingData.staff_id,
      staff_name: closingData.staff_name,
      cups_sold: Number(closingData.cups_sold),
      free_cups_redeemed: Number(closingData.free_cups_redeemed),
      total_revenue: Number(closingData.total_revenue),
      cash_actual: Number(closingData.cash_actual),
      notes: closingData.notes || ''
    };

    const { data: dbClosing, error: closeErr } = await supabase
      .from('tomsmoothie_daily_closings')
      .insert([newClosing])
      .select()
      .single();

    if (closeErr || !dbClosing) {
      console.error('Error inserting daily closing to Supabase:', closeErr);
      triggerToast('เกิดข้อผิดพลาดในการบันทึกปิดกะลงระบบ', 'danger');
      return { success: false };
    }

    const updatedClosings = [dbClosing, ...dailyClosings];
    setDailyClosings(updatedClosings);
    mockDb.saveDailyClosings(updatedClosings);

    // Trigger LINE push notification to Admin
    const adminUser = users.find(u => u.role === 'ADMIN');
    if (adminUser) {
      const rawDate = closingData.date;
      let formattedDate = rawDate;
      try {
        const parts = rawDate.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      } catch (e) {}

      const lineMessage = `🔔 สรุปยอดขายประจำวัน - ร้านน้ำปั่นพี่ต้อม\n📅 วันที่: ${formattedDate}\n👤 ผู้ปิดกะ: ${closingData.staff_name}\n🥤 ขายได้: ${closingData.cups_sold} แก้ว (แลกฟรี: ${closingData.free_cups_redeemed} แก้ว)\n💵 ยอดขายรวม: ${closingData.total_revenue} บาท\n📝 หมายเหตุ: ${closingData.notes || 'ไม่มี'}`;
      
      sendLineNotification(adminUser.id, lineMessage);
    }

    triggerToast('บันทึกปิดกะและส่งแจ้งเตือน LINE เรียบร้อย!', 'success');
    return { success: true };
  };

  // RESET DATABASE helper
  const resetDatabase = async () => {
    try {
      // 1. Clear Supabase tables to reset them
      // Deleting order_items first due to foreign keys referencing orders, then orders/transactions referencing users.
      await supabase.from('tomsmoothie_order_items').delete().neq('order_id', '_');
      await supabase.from('tomsmoothie_orders').delete().neq('id', '_');
      await supabase.from('tomsmoothie_point_transactions').delete().neq('id', '_');
      await supabase.from('tomsmoothie_daily_closings').delete().neq('id', '_');
      await supabase.from('tomsmoothie_users').delete().neq('id', '_');

      // 2. Clean all local mock database data back to defaults
      const res = mockDb.resetAll();

      // 3. Re-seed default users in Supabase
      if (res.users && res.users.length > 0) {
        const usersPayload = res.users.map(u => ({
          id: u.id,
          email: u.email,
          password_hash: u.password_hash,
          full_name: u.full_name,
          phone: u.phone_number || u.phone || '',
          role: u.role,
          member_code: u.member_code,
          current_points: u.current_points,
          line_user_id: u.line_user_id,
          google_id: u.google_id,
          auth_provider: u.auth_provider,
          is_active: u.is_active
        }));
        const { error: seedErr } = await supabase.from('tomsmoothie_users').insert(usersPayload);
        if (seedErr) {
          console.error('Error seeding users to Supabase on reset:', seedErr);
        }
      }

      // 4. Update local states
      setUsers(res.users);
      setMenuItems(res.menu);
      setOrders(res.orders);
      setTransactions(res.transactions);
      setDailyClosings(res.dailyClosings || []);
      
      // Keep the current user logged in with their newly seeded user details
      let nextCurrentUser = null;
      if (currentUser) {
        nextCurrentUser = res.users.find(u => u.email === currentUser.email) 
                          || res.users.find(u => u.role === currentUser.role);
      }
      
      if (!nextCurrentUser) {
        nextCurrentUser = res.users.find(u => u.role === 'CUSTOMER');
      }

      setCurrentUser(nextCurrentUser);
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify(nextCurrentUser));
      
      setLineNotifications([]);
      triggerToast('รีเซ็ตฐานข้อมูลเป็นค่าตั้งต้นเรียบร้อยแล้ว!', 'warning');
    } catch (error) {
      console.error('Error resetting database:', error);
      triggerToast('เกิดข้อผิดพลาดในการรีเซ็ตฐานข้อมูล', 'danger');
    }
  };

  return (
    <AppContext.Provider
      value={{
        users,
        menuItems,
        orders,
        transactions,
        currentUser,
        lineNotifications,
        toast,
        triggerToast,
        sendLineNotification,
        login,
        registerCustomer,
        logout,
        loginWithGoogle: loginWithGoogleRedirect,
        updateUserPhone,
        devSwitchRole,
        linkLineAccount,
        createOrder,
        updateOrderStatus,
        scanLoyaltyQR,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        toggleMenuItemAvailability,
        registerStaff,
        toggleStaffStatus,
        resetDatabase,
        dailyClosings,
        submitDailyClosing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
