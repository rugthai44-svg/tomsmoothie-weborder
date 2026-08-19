// Local Database Engine for TomSmoothie WebOrder & Points
// Uses localStorage to persist data across page reloads

const DB_KEYS = {
  USERS: 'tomsmoothie_users',
  MENU: 'tomsmoothie_menu_items',
  ORDERS: 'tomsmoothie_orders',
  TRANSACTIONS: 'tomsmoothie_point_transactions',
  DAILY_CLOSINGS: 'tomsmoothie_daily_closings',
};

// Initial Data definitions
const INITIAL_USERS = [
  {
    id: 'u-admin-1',
    email: 'admin@tomsmoothie.com',
    password_hash: 'TomAdmin@99!', // Secure and unique password to avoid Chrome leak warning
    full_name: 'แอดมิน พี่ต้อม',
    phone_number: '089-999-9999',
    role: 'ADMIN',
    current_points: 0,
    line_user_id: 'U-ADMIN-LINE',
    google_id: null,
    auth_provider: 'LOCAL',
    member_code: 'ADMIN001',
    created_at: new Date(2026, 7, 1).toISOString(),
    is_active: true
  }
];

const INITIAL_MENU = [
  // Smoothies
  {
    id: 'm-1',
    name: 'มะม่วงเสาวรสปั่น (Mango Passionfruit)',
    category: 'Smoothie',
    base_price: 65,
    image_url: '🍊', // Emoji shorthand representation
    is_popular: true,
    is_available: true,
    total_sold_count: 145
  },
  {
    id: 'm-2',
    name: 'สตรอว์เบอร์รีโยเกิร์ตปั่น (Strawberry Yogurt)',
    category: 'Smoothie',
    base_price: 70,
    image_url: '🍓',
    is_popular: true,
    is_available: true,
    total_sold_count: 180
  },
  {
    id: 'm-3',
    name: 'มะพร้าวนมสดปั่น (Coconut Fresh Milk)',
    category: 'Smoothie',
    base_price: 60,
    image_url: '🥥',
    is_popular: true,
    is_available: true,
    total_sold_count: 120
  },
  {
    id: 'm-4',
    name: 'โกโก้ปั่นเข้มข้น (Cocoa Intense)',
    category: 'Smoothie',
    base_price: 55,
    image_url: '🍫',
    is_popular: true,
    is_available: true,
    total_sold_count: 95
  },
  {
    id: 'm-5',
    name: 'อะโวคาโดน้ำผึ้งปั่น (Avocado Honey)',
    category: 'Smoothie',
    base_price: 85,
    image_url: '🥑',
    is_popular: true,
    is_available: true,
    total_sold_count: 110
  },
  {
    id: 'm-6',
    name: 'ส้มปั่นสด (Orange Smoothie)',
    category: 'Smoothie',
    base_price: 50,
    image_url: '🍊',
    is_popular: false,
    is_available: true,
    total_sold_count: 40
  },
  {
    id: 'm-7',
    name: 'แตงโมปั่น (Watermelon Smoothie)',
    category: 'Smoothie',
    base_price: 45,
    image_url: '🍉',
    is_popular: false,
    is_available: false, // Out of stock to show toggle
    total_sold_count: 50
  },
  {
    id: 'm-8',
    name: 'มิกซ์เบอร์รีปั่น (Mixed Berry)',
    category: 'Smoothie',
    base_price: 75,
    image_url: '🫐',
    is_popular: false,
    is_available: true,
    total_sold_count: 65
  },
  // Toppings (stored as distinct entities)
  {
    id: 't-1',
    name: 'วุ้นว่านหางจระเข้ (Aloe Vera)',
    category: 'Topping',
    base_price: 10,
    is_available: true
  },
  {
    id: 't-2',
    name: 'ไข่มุกบุก (Konjac Pearl)',
    category: 'Topping',
    base_price: 10,
    is_available: true
  },
  {
    id: 't-3',
    name: 'เยลลี่สีรุ้ง (Rainbow Jelly)',
    category: 'Topping',
    base_price: 10,
    is_available: true
  },
  {
    id: 't-4',
    name: 'วิปครีมทิปปิ้ง (Whipped Cream)',
    category: 'Topping',
    base_price: 10,
    is_available: true
  }
];

const INITIAL_ORDERS = [];

const INITIAL_TRANSACTIONS = [];

// Load helper
function loadData(key, initial) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
}

// Save helper
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Database state export interface
export const mockDb = {
  // USERS
  getUsers: () => loadData(DB_KEYS.USERS, INITIAL_USERS),
  saveUsers: (users) => saveData(DB_KEYS.USERS, users),
  
  // MENU
  getMenu: () => loadData(DB_KEYS.MENU, INITIAL_MENU),
  saveMenu: (menu) => saveData(DB_KEYS.MENU, menu),
  
  // ORDERS
  getOrders: () => loadData(DB_KEYS.ORDERS, INITIAL_ORDERS),
  saveOrders: (orders) => saveData(DB_KEYS.ORDERS, orders),
  
  // TRANSACTIONS
  getTransactions: () => loadData(DB_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS),
  saveTransactions: (tx) => saveData(DB_KEYS.TRANSACTIONS, tx),

  // DAILY CLOSINGS
  getDailyClosings: () => loadData(DB_KEYS.DAILY_CLOSINGS, []),
  saveDailyClosings: (closings) => saveData(DB_KEYS.DAILY_CLOSINGS, closings),
  
  // Clean all database data back to defaults
  resetAll: () => {
    localStorage.removeItem(DB_KEYS.USERS);
    localStorage.removeItem(DB_KEYS.MENU);
    localStorage.removeItem(DB_KEYS.ORDERS);
    localStorage.removeItem(DB_KEYS.TRANSACTIONS);
    localStorage.removeItem(DB_KEYS.DAILY_CLOSINGS);
    return {
      users: loadData(DB_KEYS.USERS, INITIAL_USERS),
      menu: loadData(DB_KEYS.MENU, INITIAL_MENU),
      orders: loadData(DB_KEYS.ORDERS, INITIAL_ORDERS),
      transactions: loadData(DB_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS),
      dailyClosings: loadData(DB_KEYS.DAILY_CLOSINGS, []),
    };
  }
};
