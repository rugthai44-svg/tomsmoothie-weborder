import React, { createContext, useState, useEffect, useContext } from 'react';
import { mockDb } from '../mockDb';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [dailyClosings, setDailyClosings] = useState([]);
  
  // Custom states for notifications and simulator experience
  const [lineNotifications, setLineNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  // Sync database state from localStorage on load
  useEffect(() => {
    setUsers(mockDb.getUsers());
    setMenuItems(mockDb.getMenu());
    setOrders(mockDb.getOrders());
    setTransactions(mockDb.getTransactions());
    setDailyClosings(mockDb.getDailyClosings());
    
    // Automatically log in customer1 as default starting experience
    const savedUser = localStorage.getItem('tomsmoothie_current_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        // ignore
      }
    } else {
      const allUsers = mockDb.getUsers();
      const defaultCustomer = allUsers.find(u => u.role === 'CUSTOMER');
      if (defaultCustomer) {
        setCurrentUser(defaultCustomer);
        localStorage.setItem('tomsmoothie_current_user', JSON.stringify(defaultCustomer));
      }
    }
  }, []);
 
  // Real LINE LIFF Initialization
  useEffect(() => {
    const liffId = import.meta.env.VITE_LIFF_ID || "";
    if (window.liff && liffId) {
      window.liff.init({ liffId })
        .then(() => {
          console.log("LIFF SDK Initialized successfully");
        })
        .catch(err => {
          console.error("LIFF initialization failed:", err);
        });
    }
  }, []);

  // Quick helper to display a brief visual toast
  const triggerToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper to send mock LINE notifications
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
  };

  // Auth Operations
  const login = (email, password) => {
    const user = users.find(u => u.email === email && u.password_hash === password);
    if (!user) {
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

  const registerCustomer = (data) => {
    const existing = users.find(u => u.email === data.email);
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
      phone_number: data.phone_number,
      role: 'CUSTOMER',
      current_points: 0,
      line_user_id: null,
      member_code: randCode,
      created_at: new Date().toISOString(),
      is_active: true
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
    
    // Auto log in newly registered user
    setCurrentUser(newUser);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(newUser));
    triggerToast('ลงทะเบียนและเข้าสู่ระบบสำเร็จ', 'success');
    return { success: true, user: newUser };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tomsmoothie_current_user');
    localStorage.removeItem('tomsmoothie_session_token');
    triggerToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  const loginWithGoogle = (profile) => {
    let user = users.find(u => u.email.toLowerCase().trim() === profile.email.toLowerCase().trim());
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
        const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
        setUsers(updatedUsers);
        mockDb.saveUsers(updatedUsers);
        user = updatedUser;
      }
      
      if (!user.is_active) {
        triggerToast('บัญชีนี้ถูกปิดใช้งานชั่วคราว', 'danger');
        return { success: false, message: 'บัญชีนี้ถูกปิดใช้งาน' };
      }
    } else {
      isNew = true;
      const randCode = 'TOM-CUST-' + Math.floor(1000 + Math.random() * 9000);
      user = {
        id: 'u-' + Date.now(),
        email: profile.email,
        password_hash: null,
        full_name: profile.name,
        phone_number: '',
        role: 'CUSTOMER',
        current_points: 0,
        line_user_id: null,
        google_id: profile.google_id,
        auth_provider: 'GOOGLE',
        member_code: randCode,
        created_at: new Date().toISOString(),
        is_active: true
      };

      const updatedUsers = [...users, user];
      setUsers(updatedUsers);
      mockDb.saveUsers(updatedUsers);
    }

    setCurrentUser(user);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(user));
    
    const mockToken = 'mock-jwt-' + btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role }));
    localStorage.setItem('tomsmoothie_session_token', mockToken);

    triggerToast(`ยินดีต้อนรับคุณ ${user.full_name}`, 'success');
    return { success: true, user, isNew };
  };

  const updateUserPhone = (userId, phone) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const updated = { ...u, phone_number: phone };
        if (currentUser && currentUser.id === userId) {
          setCurrentUser(updated);
          localStorage.setItem('tomsmoothie_current_user', JSON.stringify(updated));
        }
        return updated;
      }
      return u;
    });

    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
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
      if (window.liff) {
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

  const saveLinkedLineId = (newId) => {
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return { ...u, line_user_id: newId };
      }
      return u;
    });
    
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
    
    const updatedSelf = { ...currentUser, line_user_id: newId };
    setCurrentUser(updatedSelf);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(updatedSelf));
    
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
  const createOrder = (orderCart, isRedeemedFreeCup, pickupTime) => {
    if (!currentUser || currentUser.role !== 'CUSTOMER') return;
    
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
      pickup_time: pickupTime,
      order_status: 'Pending', // Pending -> Preparing -> Ready -> Completed
      total_price: isRedeemedFreeCup ? 0 : orderCart.reduce((sum, item) => sum + item.subtotal_price, 0),
      is_redeemed_free_cup: isRedeemedFreeCup,
      created_at: new Date().toISOString(),
      items: orderCart.map((item, idx) => ({
        id: `ord-item-${Date.now()}-${idx}`,
        menu_id: item.menu_id,
        name: item.name,
        sweetness_level: item.sweetness_level,
        toppings: item.toppings,
        quantity: item.quantity,
        subtotal_price: isRedeemedFreeCup ? 0 : item.subtotal_price
      }))
    };

    // Save order
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    mockDb.saveOrders(updatedOrders);

    // If free cup redeemed, deduct 10 points
    let updatedSelf = { ...currentUser };
    if (isRedeemedFreeCup) {
      const updatedUsers = users.map(u => {
        if (u.id === currentUser.id) {
          const nextPoints = u.current_points - 10;
          updatedSelf.current_points = nextPoints;
          return { ...u, current_points: nextPoints };
        }
        return u;
      });
      setUsers(updatedUsers);
      mockDb.saveUsers(updatedUsers);
      setCurrentUser(updatedSelf);
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify(updatedSelf));

      // Append transaction
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
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      mockDb.saveTransactions(updatedTx);
      
      sendLineNotification(currentUser.id, `🍹 แลกน้ำปั่นฟรีสำเร็จ! หักคะแนน 10 แต้ม คงเหลือ ${updatedSelf.current_points} แต้ม`);
    } else {
      sendLineNotification(currentUser.id, `🛒 สั่งซื้อสำเร็จ! ออเดอร์ของคุณกำลังรอดำเนินการ รับสินค้าเวลา ${pickupTime}`);
    }

    triggerToast('ส่งคำสั่งซื้อล่วงหน้าเรียบร้อยแล้ว!', 'success');
    return newOrder;
  };

  // STAFF: Update order status
  const updateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map(ord => {
      if (ord.id === orderId) {
        // Trigger LINE messages for customer
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
    mockDb.saveOrders(updatedOrders);
    
    // Sync current_user locally if they are the customer looking at their active trackers
    if (currentUser && currentUser.role === 'CUSTOMER') {
      // Just let React state triggers clean it
    }

    triggerToast(`อัปเดตสถานะออเดอร์เป็น [${newStatus}]`, 'success');
  };

  // STAFF: Scan QR points add/deduct
  const scanLoyaltyQR = (memberCode, actionType, cupsCount = 1) => {
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

    const updatedUsers = users.map(u => {
      if (u.id === customerUser.id) {
        const nextPoints = Math.max(0, u.current_points + pointsChange);
        return { ...u, current_points: nextPoints };
      }
      return u;
    });

    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);

    // Record audit log
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

    const updatedTx = [newTx, ...transactions];
    setTransactions(updatedTx);
    mockDb.saveTransactions(updatedTx);

    // Send LINE alerts
    const finalPoints = Math.max(0, customerUser.current_points + pointsChange);
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
      setCurrentUser({ ...currentUser, current_points: finalPoints });
      localStorage.setItem('tomsmoothie_current_user', JSON.stringify({ ...currentUser, current_points: finalPoints }));
    }

    triggerToast(`บันทึกแต้มให้คุณ ${customerUser.full_name} (${pointsChange > 0 ? '+' : ''}${pointsChange} แต้ม) สำเร็จ`, 'success');
    return { success: true, customer: customerUser, finalPoints };
  };

  // ADMIN: Menu Management CRUD
  const addMenuItem = (item) => {
    const newItem = {
      id: 'm-' + Date.now(),
      name: item.name,
      category: item.category, // Smoothie or Topping
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
  const registerStaff = (data) => {
    const existing = users.find(u => u.email === data.email);
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
      phone_number: data.phone_number || '',
      role: 'STAFF',
      current_points: 0,
      line_user_id: null,
      member_code: randCode,
      created_at: new Date().toISOString(),
      is_active: true
    };

    const updatedUsers = [...users, newStaff];
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
    triggerToast(`เพิ่มพนักงานคุณ "${data.full_name}" สำเร็จ`, 'success');
    return { success: true };
  };

  const toggleStaffStatus = (id) => {
    const updatedUsers = users.map(u => {
      if (u.id === id) {
        const nextState = !u.is_active;
        triggerToast(`${nextState ? 'เปิดใช้งาน' : 'ระงับใช้งาน'} พนักงาน "${u.full_name}" เรียบร้อย`, 'info');
        return { ...u, is_active: nextState };
      }
      return u;
    });
    setUsers(updatedUsers);
    mockDb.saveUsers(updatedUsers);
  };

  const submitDailyClosing = (closingData) => {
    const newClosing = {
      id: 'close-' + Date.now(),
      created_at: new Date().toISOString(),
      ...closingData
    };

    const updatedClosings = [newClosing, ...dailyClosings];
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
  const resetDatabase = () => {
    const res = mockDb.resetAll();
    setUsers(res.users);
    setMenuItems(res.menu);
    setOrders(res.orders);
    setTransactions(res.transactions);
    setDailyClosings(res.dailyClosings || []);
    
    // Set default customer as logged in
    const defaultCust = res.users.find(u => u.role === 'CUSTOMER');
    setCurrentUser(defaultCust);
    localStorage.setItem('tomsmoothie_current_user', JSON.stringify(defaultCust));
    
    setLineNotifications([]);
    triggerToast('รีเซ็ตฐานข้อมูลเป็นค่าตั้งต้นแล้ว', 'warning');
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
        loginWithGoogle,
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
