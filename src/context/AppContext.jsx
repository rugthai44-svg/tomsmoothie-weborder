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

  // Supabase Real-time and continuous connection states
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Custom states for notifications and simulator experience
  const [toast, setToast] = useState(null);

  // 1. Fetch Users from Supabase
  const fetchUsers = async () => {
    try {
      const { data: dbUsers, error: usersErr } = await supabase
        .from('tomsmoothie_users')
        .select('*');

      if (!usersErr && dbUsers && dbUsers.length > 0) {
        const normalizedDbUsers = dbUsers.map(u => ({
          ...u,
          phone: u.phone || u.phone_number || '',
          phone_number: u.phone || u.phone_number || ''
        }));

        // Merge with initial mock users so default demo accounts always exist
        const initialUsers = mockDb.getUsers();
        const merged = [...normalizedDbUsers];
        initialUsers.forEach(initUser => {
          if (!merged.some(u => u.email.toLowerCase() === initUser.email.toLowerCase())) {
            merged.push(initUser);
          }
        });

        setUsers(merged);
        mockDb.saveUsers(merged);
        return true;
      }
    } catch (err) {
      console.warn('Supabase fetchUsers warning:', err);
    }
    return false;
  };

  // 2. Fetch Menu Items (from Supabase if available, fallback to mockDb)
  const fetchMenuItems = async () => {
    try {
      const { data: dbMenu, error: menuErr } = await supabase
        .from('tomsmoothie_menu_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (!menuErr && dbMenu) {
        if (dbMenu.length > 0) {
          setMenuItems(dbMenu);
          mockDb.saveMenu(dbMenu);
          return true;
        } else {
          // Table exists in Supabase but is empty -> push current local menu
          const localMenu = mockDb.getMenu();
          if (localMenu && localMenu.length > 0) {
            const formatted = localMenu.map(m => ({
              id: m.id,
              name: m.name,
              category: m.category,
              base_price: Number(m.base_price),
              image_url: m.image_url,
              is_popular: !!m.is_popular,
              is_available: m.is_available !== false,
              total_sold_count: m.total_sold_count || 0
            }));
            await supabase.from('tomsmoothie_menu_items').upsert(formatted);
            setMenuItems(localMenu);
            return true;
          }
        }
      }
    } catch (err) {
      // Supabase table might not exist yet, fallback gracefully
    }
    setMenuItems(mockDb.getMenu());
    return false;
  };

  // 3. Fetch Orders (with nested items)
  const fetchOrders = async () => {
    try {
      const { data: dbOrders, error: ordersErr } = await supabase
        .from('tomsmoothie_orders')
        .select(`
          *,
          items:tomsmoothie_order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (!ordersErr && dbOrders) {
        setOrders(dbOrders);
        mockDb.saveOrders(dbOrders);
        return true;
      }
    } catch (e) {
      console.warn('Supabase fetchOrders warning:', e);
    }
    return false;
  };

  // 4. Fetch Point Transactions
  const fetchTransactions = async () => {
    try {
      const { data: dbTxs, error: txsErr } = await supabase
        .from('tomsmoothie_point_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!txsErr && dbTxs) {
        setTransactions(dbTxs);
        mockDb.saveTransactions(dbTxs);
        return true;
      }
    } catch (e) {
      console.warn('Supabase fetchTransactions warning:', e);
    }
    return false;
  };

  // 5. Fetch Daily Closings
  const fetchDailyClosings = async () => {
    try {
      const { data: dbClosings, error: closingsErr } = await supabase
        .from('tomsmoothie_daily_closings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!closingsErr && dbClosings) {
        setDailyClosings(dbClosings);
        mockDb.saveDailyClosings(dbClosings);
        return true;
      }
    } catch (e) {
      console.warn('Supabase fetchDailyClosings warning:', e);
    }
    return false;
  };

  // Master fetch function to synchronize all tables
  const fetchAllData = async (isInitial = false) => {
    if (!isInitial) setIsSyncing(true);
    try {
      const [uOk, mOk, oOk, tOk, cOk] = await Promise.all([
        fetchUsers(),
        fetchMenuItems(),
        fetchOrders(),
        fetchTransactions(),
        fetchDailyClosings()
      ]);

      const connected = uOk || mOk || oOk || tOk || cOk;
      setIsDbConnected(connected);
      if (connected) {
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('fetchAllData error:', err);
    } finally {
      if (!isInitial) setIsSyncing(false);
    }
  };

  // Manual Trigger to force instant resync with Supabase
  const syncNow = async () => {
    setIsSyncing(true);
    await fetchAllData(false);
    triggerToast('ซิงค์ข้อมูลล่าสุดกับ Supabase เรียบร้อยแล้ว', 'success');
  };

  // Live Sync currentUser: update logged-in session instantly if points or details change in Supabase
  useEffect(() => {
    if (!currentUser) return;
    const fresh = users.find(u =>
      u.id === currentUser.id ||
      (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
    );

    if (fresh) {
      const isPointsChanged = fresh.current_points !== currentUser.current_points;
      const isNameChanged = fresh.full_name !== currentUser.full_name;
      const isRoleChanged = fresh.role !== currentUser.role;
      const isPhoneChanged = fresh.phone !== currentUser.phone;
      const isActiveChanged = fresh.is_active !== currentUser.is_active;

      if (isPointsChanged || isNameChanged || isRoleChanged || isPhoneChanged || isActiveChanged) {
        const updated = {
          ...currentUser,
          ...fresh,
          phone: fresh.phone || fresh.phone_number || '',
          phone_number: fresh.phone || fresh.phone_number || ''
        };
        setCurrentUser(updated);
        localStorage.setItem('tomsmoothie_current_user', JSON.stringify(updated));
      }
    }
  }, [users, currentUser]);

  // Main Effect: Continuous Supabase Connection (Realtime Channels + Keep-Alive Polling)
  useEffect(() => {
    let isMounted = true;

    // 1. Initial Load
    fetchAllData(true).then(() => {
      // Sync current user session on initial load
      const savedUser = localStorage.getItem('tomsmoothie_current_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          const initialUsers = mockDb.getUsers();
          const fresh = initialUsers.find(u => u.id === parsed.id || u.email.toLowerCase() === (parsed.email || '').toLowerCase());
          if (fresh) {
            setCurrentUser(fresh);
            localStorage.setItem('tomsmoothie_current_user', JSON.stringify(fresh));
          } else {
            setCurrentUser(parsed);
          }
        } catch (e) { }
      }
    });

    // 2. Realtime WebSocket subscription for instant live updates across devices
    const channel = supabase
      .channel('tomsmoothie-live-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tomsmoothie_orders' },
        () => {
          if (isMounted) fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tomsmoothie_order_items' },
        () => {
          if (isMounted) fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tomsmoothie_users' },
        () => {
          if (isMounted) fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tomsmoothie_point_transactions' },
        () => {
          if (isMounted) fetchTransactions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tomsmoothie_daily_closings' },
        () => {
          if (isMounted) fetchDailyClosings();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tomsmoothie_menu_items' },
        () => {
          if (isMounted) fetchMenuItems();
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
          setIsDbConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsRealtimeActive(false);
        }
      });

    // 3. Heartbeat Polling every 4 seconds to guarantee continuous connection
    // even if Supabase Realtime publication is disabled or mobile browser sleeps
    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchAllData(false);
      }
    }, 4000);

    // 4. Reactivate and fetch instantly when user returns to tab, window gains focus, or device comes online
    const handleReactivate = () => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchAllData(false);
      }
    };

    window.addEventListener('visibilitychange', handleReactivate);
    window.addEventListener('focus', handleReactivate);
    window.addEventListener('online', handleReactivate);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleReactivate);
      window.removeEventListener('focus', handleReactivate);
      window.removeEventListener('online', handleReactivate);
    };
  }, []);

  // Quick helper to display a brief visual toast
  const triggerToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check password helper (supports TomAdmin@99! & admin123 for admin)
  const isPasswordMatch = (user, inputPassword) => {
    if (!user) return false;
    if (user.password_hash === inputPassword) return true;
    if (user.role === 'ADMIN') {
      if ((inputPassword === 'TomAdmin@99!' || inputPassword === 'admin123') &&
        (user.password_hash === 'TomAdmin@99!' || user.password_hash === 'admin123')) {
        return true;
      }
    }
    // Convenience: If user signed up via Google or is customer, also accept standard customer passwords
    if (user.role === 'CUSTOMER') {
      if (user.password_hash === 'GOOGLE-OAUTH' || inputPassword === 'cust123' || inputPassword === '123456') {
        return true;
      }
    }
    return false;
  };

  // Auth Operations
  const login = async (email, password) => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    let foundUser = null;

    // 1. Try Supabase
    try {
      const { data: dbUser, error } = await supabase
        .from('tomsmoothie_users')
        .select('*')
        .ilike('email', trimmedEmail)
        .maybeSingle();

      if (!error && dbUser && isPasswordMatch(dbUser, password)) {
        foundUser = dbUser;
      }
    } catch (e) {
      console.warn('Supabase login check failed, trying local DB:', e);
    }

    // 2. Fallback to in-memory users state or mockDb
    if (!foundUser) {
      const localPool = users.length > 0 ? users : mockDb.getUsers();
      foundUser = localPool.find(u =>
        (u.email || '').toLowerCase() === trimmedEmail && isPasswordMatch(u, password)
      );
    }

    if (!foundUser) {
      triggerToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'danger');
      return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    }

    if (!foundUser.is_active) {
      triggerToast('บัญชีนี้ถูกปิดใช้งานชั่วคราว', 'danger');
      return { success: false, message: 'บัญชีนี้ถูกปิดใช้งาน' };
    }

    const normalizedUser = {
      ...foundUser,
      phone: foundUser.phone || foundUser.phone_number || '',
      phone_number: foundUser.phone || foundUser.phone_number || ''
    };

    setCurrentUser(normalizedUser);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(normalizedUser));
    triggerToast(`ยินดีต้อนรับคุณ ${normalizedUser.full_name}`, 'success');
    return { success: true, user: normalizedUser };
  };

  const registerCustomer = async (data) => {
    const trimmedEmail = (data.email || '').trim().toLowerCase();

    // Check if email already exists locally or in db
    const localPool = users.length > 0 ? users : mockDb.getUsers();
    if (localPool.some(u => (u.email || '').toLowerCase() === trimmedEmail)) {
      triggerToast('อีเมลนี้ถูกใช้งานแล้ว', 'danger');
      return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' };
    }

    const randCode = 'MEMBER' + Math.floor(100 + Math.random() * 900);
    const newUser = {
      id: 'u-' + Date.now(),
      email: data.email.trim(),
      password_hash: data.password,
      full_name: data.full_name.trim(),
      phone: data.phone_number || data.phone || '',
      phone_number: data.phone_number || data.phone || '',
      role: 'CUSTOMER',
      current_points: 0,
      member_code: randCode,
      created_at: new Date().toISOString(),
      is_active: true
    };

    try {
      const { data: dbUser } = await supabase
        .from('tomsmoothie_users')
        .insert([{
          id: newUser.id,
          email: newUser.email,
          password_hash: newUser.password_hash,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
          member_code: newUser.member_code,
          current_points: 0,
          created_at: newUser.created_at,
          is_active: true
        }])
        .select()
        .single();

      if (dbUser) {
        newUser.id = dbUser.id;
      }
    } catch (e) {
      console.warn('Supabase customer insert warning, saved to local DB:', e);
    }

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
    triggerToast('สมัครสมาชิกสำเร็จเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ', 'success');
    return { success: true, user: newUser };
  };

  const registerAdmin = async (data) => {
    const trimmedEmail = (data.email || '').trim().toLowerCase();

    // Check if email exists
    const localPool = users.length > 0 ? users : mockDb.getUsers();
    if (localPool.some(u => (u.email || '').toLowerCase() === trimmedEmail)) {
      triggerToast('อีเมลนี้ถูกใช้งานแล้วในระบบ', 'danger');
      return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้วในระบบ' };
    }

    const randCode = 'ADMIN' + Math.floor(100 + Math.random() * 900);
    const newAdmin = {
      id: 'u-admin-' + Date.now(),
      email: data.email.trim(),
      password_hash: data.password,
      full_name: data.full_name.trim(),
      phone: data.phone_number || data.phone || '',
      phone_number: data.phone_number || data.phone || '',
      role: 'ADMIN',
      current_points: 0,
      member_code: randCode,
      created_at: new Date().toISOString(),
      is_active: true
    };

    try {
      const { data: dbUser } = await supabase
        .from('tomsmoothie_users')
        .insert([{
          id: newAdmin.id,
          email: newAdmin.email,
          password_hash: newAdmin.password_hash,
          full_name: newAdmin.full_name,
          phone: newAdmin.phone,
          role: newAdmin.role,
          member_code: newAdmin.member_code,
          current_points: 0,
          created_at: newAdmin.created_at,
          is_active: true
        }])
        .select()
        .single();

      if (dbUser) {
        newAdmin.id = dbUser.id;
      }
    } catch (e) {
      console.warn('Supabase admin insert warning, saved to local DB:', e);
    }

    const updatedUsers = [...users, newAdmin];
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
    setCurrentUser(newAdmin);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(newAdmin));
    triggerToast(`ยินดีต้อนรับผู้ดูแลระบบท่านใหม่ คุณ ${newAdmin.full_name}`, 'success');
    return { success: true, user: newAdmin };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) { }
    setCurrentUser(null);
    localStorage.removeItem('tomsmoothie_current_user');
    localStorage.removeItem('tomsmoothie_session_token');
    triggerToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  const loginWithGoogle = async (profile) => {
    const trimmedEmail = (profile.email || '').trim().toLowerCase();
    let user = null;

    try {
      const { data: dbUser } = await supabase
        .from('tomsmoothie_users')
        .select('*')
        .ilike('email', trimmedEmail)
        .maybeSingle();
      if (dbUser) user = dbUser;
    } catch (e) { }

    if (!user) {
      const localPool = users.length > 0 ? users : mockDb.getUsers();
      user = localPool.find(u => (u.email || '').toLowerCase() === trimmedEmail);
    }

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
        try {
          await supabase
            .from('tomsmoothie_users')
            .update({ google_id: updatedUser.google_id, auth_provider: updatedUser.auth_provider })
            .eq('id', user.id);
        } catch (e) { }
      }

      user = {
        ...updatedUser,
        phone_number: updatedUser.phone || updatedUser.phone_number || '',
        phone: updatedUser.phone || updatedUser.phone_number || ''
      };
      setUsers(prev => prev.map(u => u.id === user.id ? user : u));

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
        phone_number: '',
        role: selectedRole,
        current_points: 0,
        google_id: profile.google_id,
        auth_provider: 'GOOGLE',
        member_code: randCode,
        created_at: new Date().toISOString(),
        is_active: true
      };

      try {
        const { data: dbUser } = await supabase
          .from('tomsmoothie_users')
          .insert([newUser])
          .select()
          .single();

        if (dbUser) newUser.id = dbUser.id;
      } catch (e) { }

      user = newUser;
      const updatedList = [...users, user];
      setUsers(updatedList);
      mockDb.saveUsers(updatedList);
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

  // Listen for Supabase OAuth redirects and sign-ins
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const googleUser = session.user;
        const email = googleUser.email;
        const fullName = googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || 'ลูกค้า Google';
        const googleId = googleUser.id;

        // Skip if already logged in locally to avoid session collision and loops on reload
        const saved = localStorage.getItem('tomsmoothie_current_user');
        if (saved) return;

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

  const updateUserPhone = async (userId, phone) => {
    const cleanPhone = (phone || '').trim();

    // 1. Update in local state & mockDb immediately
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, phone: cleanPhone, phone_number: cleanPhone };
      }
      return u;
    });
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);

    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = { ...currentUser, phone: cleanPhone, phone_number: cleanPhone };
      setCurrentUser(updatedCurrent);
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify(updatedCurrent));
    }

    // 2. Sync to Supabase in background
    try {
      await supabase
        .from('tomsmoothie_users')
        .update({ phone: cleanPhone })
        .eq('id', userId);
    } catch (e) {
      console.warn('Supabase updateUserPhone sync warning:', e);
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

  // CUSTOMER: Pre-order Smoothie
  const createOrder = async (orderCart, isRedeemedFreeCup, pickupTime) => {
    if (!currentUser || currentUser.role !== 'CUSTOMER') return null;

    const cartTotal = orderCart.reduce((sum, item) => sum + item.subtotal_price, 0);
    const totalCups = orderCart.reduce((sum, item) => sum + item.quantity, 0);

    // Check points if free cup requested
    if (isRedeemedFreeCup) {
      if (currentUser.current_points < 10) {
        triggerToast('แต้มสะสมไม่เพียงพอสำหรับการแลกเครื่องดื่มฟรี', 'danger');
        return null;
      }
      if (totalCups > 1) {
        triggerToast('สิทธิ์แลกฟรี 1 แก้ว สามารถใช้ได้เมื่อสั่งซื้อ 1 แก้วต่อออเดอร์เท่านั้น', 'danger');
        return null;
      }
    }

    const orderId = 'ord-' + Math.floor(1000 + Math.random() * 9000);
    const itemsPayload = orderCart.map((item) => ({
      order_id: orderId,
      menu_item_id: item.menu_id,
      name: item.name,
      sweetness_level: item.sweetness_level,
      toppings: item.toppings,
      quantity: item.quantity,
      subtotal_price: isRedeemedFreeCup ? 0 : item.subtotal_price
    }));

    const newOrder = {
      id: orderId,
      customer_id: currentUser.id,
      customer_name: currentUser.full_name,
      customer_phone: currentUser.phone || '',
      pickup_time: pickupTime,
      order_status: 'Pending', // Pending -> Preparing -> Ready -> Completed
      total_price: isRedeemedFreeCup ? 0 : cartTotal,
      is_redeemed_free_cup: isRedeemedFreeCup,
      created_at: new Date().toISOString(),
      items: itemsPayload
    };

    // 1. Update local orders
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    mockDb.saveOrders(updatedOrders);

    // 2. Deduct points locally if free cup redeemed
    if (isRedeemedFreeCup) {
      const nextPoints = Math.max(0, currentUser.current_points - 10);
      const updatedUser = { ...currentUser, current_points: nextPoints };

      const nextUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
      setUsers(nextUsers);
      mockDb.saveUsers(nextUsers);
      setCurrentUser(updatedUser);
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify(updatedUser));

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

      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      mockDb.saveTransactions(updatedTxs);

      // Async sync points & transaction to Supabase
      try {
        await supabase
          .from('tomsmoothie_users')
          .update({ current_points: nextPoints })
          .eq('id', currentUser.id);

        await supabase
          .from('tomsmoothie_point_transactions')
          .insert([newTx]);
      } catch (e) {
        console.warn('Supabase point deduction sync warning:', e);
      }
    }

    // 3. Async sync order to Supabase
    try {
      const orderDbPayload = {
        id: newOrder.id,
        customer_id: newOrder.customer_id,
        customer_name: newOrder.customer_name,
        customer_phone: newOrder.customer_phone,
        pickup_time: newOrder.pickup_time,
        order_status: newOrder.order_status,
        total_price: newOrder.total_price,
        is_redeemed_free_cup: newOrder.is_redeemed_free_cup,
        created_at: newOrder.created_at
      };

      await supabase.from('tomsmoothie_orders').insert([orderDbPayload]);
      await supabase.from('tomsmoothie_order_items').insert(itemsPayload);
      fetchOrders();
    } catch (e) {
      console.warn('Supabase createOrder sync warning:', e);
    }

    triggerToast('ส่งคำสั่งซื้อล่วงหน้าเรียบร้อยแล้ว!', 'success');
    return newOrder;
  };

  // CUSTOMER: Cancel pending order
  const cancelOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      triggerToast('ไม่พบข้อมูลคำสั่งซื้อนี้', 'danger');
      return { success: false, message: 'ไม่พบออเดอร์นี้' };
    }

    if (order.order_status !== 'Pending') {
      triggerToast('ไม่สามารถยกเลิกออเดอร์นี้ได้เนื่องจากร้านค้ากำลังเตรียมแล้ว', 'danger');
      return { success: false, message: 'ไม่สามารถยกเลิกได้' };
    }

    // 1. Update order status locally
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, order_status: 'Cancelled' } : o);
    setOrders(updatedOrders);
    mockDb.saveOrders(updatedOrders);

    // 2. Refund points if free cup was redeemed
    if (order.is_redeemed_free_cup) {
      const customer = users.find(u => u.id === order.customer_id) || currentUser;
      const nextPoints = (customer?.current_points || 0) + 10;

      const nextUsers = users.map(u => u.id === order.customer_id ? { ...u, current_points: nextPoints } : u);
      setUsers(nextUsers);
      mockDb.saveUsers(nextUsers);

      if (currentUser && currentUser.id === order.customer_id) {
        const updatedCurrent = { ...currentUser, current_points: nextPoints };
        setCurrentUser(updatedCurrent);
        localStorage.setItem('tomsmoothie_current_user', JSON.stringify(updatedCurrent));
      }

      // Record refund point transaction
      const newTx = {
        id: 'tx-' + Date.now(),
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        staff_id: 'system',
        staff_email: 'ระบบอัตโนมัติ (แอป)',
        order_id: orderId,
        points_change: 10,
        transaction_type: 'EARN',
        created_at: new Date().toISOString()
      };

      const nextTxs = [newTx, ...transactions];
      setTransactions(nextTxs);
      mockDb.saveTransactions(nextTxs);

      // Async sync refund to Supabase
      try {
        await supabase
          .from('tomsmoothie_users')
          .update({ current_points: nextPoints })
          .eq('id', order.customer_id);

        await supabase
          .from('tomsmoothie_point_transactions')
          .insert([newTx]);
      } catch (e) {
        console.warn('Supabase points refund sync warning:', e);
      }
    }

    // 3. Async sync cancel status to Supabase
    try {
      await supabase
        .from('tomsmoothie_orders')
        .update({ order_status: 'Cancelled' })
        .eq('id', orderId);
      fetchOrders();
      fetchUsers();
      fetchTransactions();
    } catch (e) {
      console.warn('Supabase cancelOrder sync warning:', e);
    }

    triggerToast(`ยกเลิกออเดอร์ #${orderId} เรียบร้อยแล้ว`, 'success');
    return { success: true };
  };

  // STAFF: Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    // 1. Update in local state & mockDb immediately
    const updatedOrders = orders.map(ord => {
      if (ord.id === orderId) {
        return { ...ord, order_status: newStatus };
      }
      return ord;
    });

    setOrders(updatedOrders);
    mockDb.saveOrders(updatedOrders);

    // 2. Sync to Supabase in background
    try {
      await supabase
        .from('tomsmoothie_orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);
      fetchOrders();
    } catch (e) {
      console.warn('Supabase updateOrderStatus sync warning:', e);
    }

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
    const updatedCustomer = { ...customerUser, current_points: nextPoints };

    // 1. Update local users
    const updatedUsers = users.map(u => u.id === customerUser.id ? updatedCustomer : u);
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);

    // 2. Record transaction locally
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

    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    mockDb.saveTransactions(updatedTxs);

    // Sync logged in user if currently viewing customer simulation
    if (currentUser && currentUser.id === customerUser.id) {
      setCurrentUser(updatedCustomer);
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify(updatedCustomer));
    }

    // 3. Sync to Supabase in background
    try {
      await supabase
        .from('tomsmoothie_users')
        .update({ current_points: nextPoints })
        .eq('id', customerUser.id);

      await supabase
        .from('tomsmoothie_point_transactions')
        .insert([newTx]);

      fetchUsers();
      fetchTransactions();
    } catch (e) {
      console.warn('Supabase scanLoyaltyQR sync warning:', e);
    }

    triggerToast(`บันทึกแต้มให้คุณ ${customerUser.full_name} (${pointsChange > 0 ? '+' : ''}${pointsChange} แต้ม) สำเร็จ`, 'success');
    return { success: true, customer: updatedCustomer, finalPoints: nextPoints };
  };

  // ADMIN: Menu Management CRUD
  const addMenuItem = async (item) => {
    const newItem = {
      id: 'm-' + Date.now(),
      name: item.name,
      category: item.category,
      base_price: Number(item.base_price),
      image_url: ['Smoothie', 'Iced', 'Hot'].includes(item.category) ? (item.image_url || '🥤') : null,
      is_popular: !!item.is_popular,
      total_sold_count: 0
    };
    const updatedMenu = [...menuItems, newItem];
    setMenuItems(updatedMenu);
    mockDb.saveMenu(updatedMenu);

    try {
      await supabase.from('tomsmoothie_menu_items').insert([newItem]);
    } catch (e) {
      console.warn('Supabase addMenuItem sync warning:', e);
    }

    triggerToast(`เพิ่มรายการ "${item.name}" สำเร็จ`, 'success');
  };

  const updateMenuItem = async (updatedItem) => {
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

    try {
      await supabase.from('tomsmoothie_menu_items').update({
        name: updatedItem.name,
        base_price: Number(updatedItem.base_price),
        image_url: updatedItem.image_url,
        is_popular: !!updatedItem.is_popular
      }).eq('id', updatedItem.id);
    } catch (e) {
      console.warn('Supabase updateMenuItem sync warning:', e);
    }

    triggerToast(`แก้ไขรายการ "${updatedItem.name}" สำเร็จ`, 'success');
  };

  const deleteMenuItem = async (id) => {
    const target = menuItems.find(m => m.id === id);
    const updatedMenu = menuItems.filter(item => item.id !== id);
    setMenuItems(updatedMenu);
    mockDb.saveMenu(updatedMenu);

    try {
      await supabase.from('tomsmoothie_menu_items').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteMenuItem sync warning:', e);
    }

    triggerToast(`ลบรายการ "${target?.name || ''}" สำเร็จ`, 'success');
  };

  const togglePopularStatus = async (id) => {
    let nextState = false;
    let targetName = '';
    const updatedMenu = menuItems.map(item => {
      if (item.id === id) {
        nextState = !item.is_popular;
        targetName = item.name;
        triggerToast(`เปลี่ยนสถานะ "${item.name}" เป็น [${nextState ? 'เมนูยอดฮิต 🔥' : 'เมนูปกติ'}]`, 'info');
        return { ...item, is_popular: nextState };
      }
      return item;
    });
    setMenuItems(updatedMenu);
    mockDb.saveMenu(updatedMenu);

    try {
      await supabase.from('tomsmoothie_menu_items').update({ is_popular: nextState }).eq('id', id);
    } catch (e) {
      console.warn('Supabase togglePopularStatus sync warning:', e);
    }
  };

  const syncMenuToCloud = async () => {
    try {
      const current = menuItems.length > 0 ? menuItems : mockDb.getMenu();
      const formatted = current.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        base_price: Number(m.base_price),
        image_url: m.image_url,
        is_popular: !!m.is_popular,
        is_available: m.is_available !== false,
        total_sold_count: m.total_sold_count || 0
      }));
      const { error } = await supabase.from('tomsmoothie_menu_items').upsert(formatted);
      if (error) {
        if (error.code === 'PGRST205') {
          triggerToast('ยังไม่มีตาราง tomsmoothie_menu_items ใน Supabase (โปรดรันไฟล์ SQL ใน Dashboard)', 'warning');
          return { success: false, missingTable: true };
        }
        throw error;
      }
      triggerToast('ซิงค์เมนูขึ้น Supabase สำเร็จ ทุกอุปกรณ์จะเห็นตรงกันทันที!', 'success');
      return { success: true };
    } catch (e) {
      triggerToast('ไม่สามารถซิงค์ขึ้น Supabase ได้: ' + (e.message || ''), 'danger');
      return { success: false, error: e.message };
    }
  };

  // ADMIN: Staff Management CRUD
  const registerStaff = async (data) => {
    const trimmedEmail = (data.email || '').trim().toLowerCase();

    // Check email exists locally
    if (users.some(u => (u.email || '').toLowerCase() === trimmedEmail)) {
      triggerToast('อีเมลนี้ถูกใช้งานแล้ว', 'danger');
      return { success: false, message: 'อีเมลนี้มีอยู่แล้ว' };
    }

    const randCode = 'STAFF' + Math.floor(100 + Math.random() * 900);
    const newStaff = {
      id: 'u-' + Date.now(),
      email: data.email.trim(),
      password_hash: data.password,
      full_name: data.full_name.trim(),
      phone: data.phone_number || '',
      phone_number: data.phone_number || '',
      role: 'STAFF',
      current_points: 0,
      member_code: randCode,
      created_at: new Date().toISOString(),
      is_active: true
    };

    // 1. Update in local state & mockDb
    const updatedUsers = [...users, newStaff];
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);

    // 2. Sync to Supabase in background
    try {
      await supabase
        .from('tomsmoothie_users')
        .insert([{
          id: newStaff.id,
          email: newStaff.email,
          password_hash: newStaff.password_hash,
          full_name: newStaff.full_name,
          phone: newStaff.phone,
          role: newStaff.role,
          member_code: newStaff.member_code,
          current_points: 0,
          created_at: newStaff.created_at,
          is_active: true
        }]);
      fetchUsers();
    } catch (e) {
      console.warn('Supabase registerStaff sync warning:', e);
    }

    triggerToast(`เพิ่มพนักงานคุณ "${data.full_name}" สำเร็จ`, 'success');
    return { success: true };
  };

  const toggleStaffStatus = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    const nextState = !targetUser.is_active;

    // 1. Update local state & mockDb
    const updatedUsers = users.map(u => {
      if (u.id === id) {
        return { ...u, is_active: nextState };
      }
      return u;
    });
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);

    // 2. Sync to Supabase in background
    try {
      await supabase
        .from('tomsmoothie_users')
        .update({ is_active: nextState })
        .eq('id', id);
      fetchUsers();
    } catch (e) {
      console.warn('Supabase toggleStaffStatus sync warning:', e);
    }

    const roleLabel = targetUser.role === 'CUSTOMER' ? 'สมาชิก' : (targetUser.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'พนักงาน');
    triggerToast(`${nextState ? 'เปิดใช้งาน' : 'ระงับใช้งาน'} ${roleLabel} "${targetUser.full_name}" เรียบร้อย`, 'info');
  };

  // ADMIN: Delete User (Customer or Staff)
  const deleteUser = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      triggerToast('ไม่พบข้อมูลผู้ใช้นี้ในระบบ', 'danger');
      return { success: false, message: 'ไม่พบผู้ใช้' };
    }

    if (currentUser?.id === id) {
      triggerToast('ไม่สามารถลบบัญชีของตนเองได้', 'danger');
      return { success: false, message: 'ไม่สามารถลบบัญชีของตนเองได้' };
    }

    // 1. Update local state & mockDb
    const updatedUsers = users.filter(u => u.id !== id);
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);

    // 2. Clear saved credentials in localStorage if matched
    try {
      const creds = JSON.parse(localStorage.getItem('tomsmoothie_remembered_credentials') || '{}');
      const emailKey = (targetUser.email || '').toLowerCase();
      if (emailKey && creds[emailKey]) {
        delete creds[emailKey];
        localStorage.setItem('tomsmoothie_remembered_credentials', JSON.stringify(creds));
      }
    } catch (e) {
      console.warn('Error clearing remembered credentials:', e);
    }

    // 3. Sync deletion to Supabase
    try {
      await supabase
        .from('tomsmoothie_users')
        .delete()
        .eq('id', id);
      fetchUsers();
    } catch (e) {
      console.warn('Supabase deleteUser sync warning:', e);
    }

    const roleLabel = targetUser.role === 'CUSTOMER' ? 'สมาชิก' : (targetUser.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'พนักงาน');
    triggerToast(`ลบบัญชี${roleLabel} "${targetUser.full_name}" สำเร็จแล้ว`, 'success');
    return { success: true };
  };

  // ADMIN: Adjust Customer Points directly
  const updateCustomerPoints = async (userId, nextPoints) => {
    const customerUser = users.find(u => u.id === userId);
    if (!customerUser) {
      triggerToast('ไม่พบข้อมูลสมาชิกนี้', 'danger');
      return { success: false, message: 'ไม่พบผู้ใช้' };
    }

    const targetPoints = Math.max(0, Number(nextPoints));
    const pointsChange = targetPoints - (customerUser.current_points || 0);

    // 1. Update points locally
    const updatedUser = { ...customerUser, current_points: targetPoints };
    const updatedUsers = users.map(u => u.id === userId ? updatedUser : u);
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);

    // 2. Record transaction locally
    const newTx = {
      id: 'tx-' + Date.now(),
      customer_id: userId,
      customer_name: customerUser.full_name,
      staff_id: currentUser?.id || 'admin',
      staff_email: (currentUser?.email || 'admin') + ' (แอดมินแก้ไข)',
      order_id: null,
      points_change: pointsChange,
      transaction_type: pointsChange >= 0 ? 'EARN' : 'REDEEM',
      created_at: new Date().toISOString()
    };

    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    mockDb.saveTransactions(updatedTxs);

    // 3. Sync to Supabase in background
    try {
      await supabase
        .from('tomsmoothie_users')
        .update({ current_points: targetPoints })
        .eq('id', userId);

      await supabase
        .from('tomsmoothie_point_transactions')
        .insert([newTx]);

      fetchUsers();
      fetchTransactions();
    } catch (e) {
      console.warn('Supabase updateCustomerPoints sync warning:', e);
    }

    triggerToast(`ปรับแต้มของคุณ ${customerUser.full_name} เป็น ${targetPoints} แต้ม สำเร็จ`, 'success');
    return { success: true };
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

    // 1. Update local state & mockDb
    const updatedClosings = [newClosing, ...dailyClosings];
    setDailyClosings(updatedClosings);
    mockDb.saveDailyClosings(updatedClosings);

    // 2. Sync to Supabase in background
    try {
      await supabase
        .from('tomsmoothie_daily_closings')
        .insert([newClosing]);
      fetchDailyClosings();
    } catch (e) {
      console.warn('Supabase submitDailyClosing sync warning:', e);
    }

    triggerToast('บันทึกปิดยอดขายเรียบร้อย!', 'success');
    return { success: true };
  };

  // RESET DATABASE helper
  const resetDatabase = async () => {
    // 1. Clean all local mock database data back to defaults
    const res = mockDb.resetAll();

    // 2. Update local states
    setUsers(res.users);
    setMenuItems(res.menu);
    setOrders(res.orders);
    setTransactions(res.transactions);
    setDailyClosings(res.dailyClosings || []);

    let nextCurrentUser = null;
    if (currentUser) {
      nextCurrentUser = res.users.find(u => u.email === currentUser.email)
        || res.users.find(u => u.role === currentUser.role);
    }

    if (!nextCurrentUser) {
      nextCurrentUser = res.users.find(u => u.role === 'ADMIN') || res.users[0] || null;
    }

    setCurrentUser(nextCurrentUser);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(nextCurrentUser));

    // 3. Clear Supabase tables in background
    try {
      await supabase.from('tomsmoothie_order_items').delete().neq('order_id', '_');
      await supabase.from('tomsmoothie_orders').delete().neq('id', '_');
      await supabase.from('tomsmoothie_point_transactions').delete().neq('id', '_');
      await supabase.from('tomsmoothie_daily_closings').delete().neq('id', '_');
      await supabase.from('tomsmoothie_users').delete().neq('id', '_');

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
          google_id: u.google_id,
          auth_provider: u.auth_provider,
          is_active: u.is_active
        }));
        await supabase.from('tomsmoothie_users').insert(usersPayload);
      }
      fetchAllData(false);
    } catch (error) {
      console.warn('Supabase resetDatabase sync warning:', error);
    }

    triggerToast('รีเซ็ตฐานข้อมูลเป็นค่าตั้งต้นเรียบร้อยแล้ว!', 'warning');
  };

  return (
    <AppContext.Provider
      value={{
        users,
        menuItems,
        orders,
        transactions,
        currentUser,
        toast,
        triggerToast,
        login,
        registerCustomer,
        registerAdmin,
        logout,
        loginWithGoogle,
        loginWithGoogleRedirect,
        updateUserPhone,
        devSwitchRole,
        createOrder,
        updateOrderStatus,
        scanLoyaltyQR,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        togglePopularStatus,
        syncMenuToCloud,
        registerStaff,
        toggleStaffStatus,
        deleteUser,
        resetDatabase,
        dailyClosings,
        submitDailyClosing,
        cancelOrder,
        updateCustomerPoints,
        isDbConnected,
        isRealtimeActive,
        lastSyncTime,
        isSyncing,
        syncNow,
        fetchAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
