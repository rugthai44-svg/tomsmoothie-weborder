<?php
// config/database.php

define('DB_DRIVER', 'mysql'); // 'mysql' or 'sqlite'

// MySQL Settings (XAMPP default)
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'tomsmoothie_db');
define('DB_USER', 'root');
define('DB_PASS', '');

// SQLite File Path
define('SQLITE_FILE', __DIR__ . '/../database.sqlite');

function getDB() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        if (DB_DRIVER === 'mysql') {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ]);
            return $pdo;
        }
    } catch (PDOException $e) {
        // Fallback to SQLite if MySQL is not reachable
    }

    try {
        $isNew = !file_exists(SQLITE_FILE);
        $pdo = new PDO('sqlite:' . SQLITE_FILE);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON;');
        
        if ($isNew) {
            initSQLiteDatabase($pdo);
        }
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
    }
}

function initSQLiteDatabase($pdo) {
    // 1. Create Tables
    $queries = [
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'CUSTOMER',
            member_code TEXT UNIQUE,
            current_points INTEGER DEFAULT 0,
            line_user_id TEXT,
            google_id TEXT,
            auth_provider TEXT DEFAULT 'LOCAL',
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS menu_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            base_price REAL NOT NULL,
            image_url TEXT,
            is_popular INTEGER DEFAULT 0,
            is_available INTEGER DEFAULT 1,
            total_sold_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            total_price REAL NOT NULL,
            order_status TEXT NOT NULL DEFAULT 'Pending',
            pickup_time TEXT,
            is_redeemed_free_cup INTEGER DEFAULT 0,
            payment_method TEXT DEFAULT 'PROMPTPAY',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            menu_id TEXT,
            name TEXT NOT NULL,
            sweetness_level TEXT DEFAULT '100%',
            toppings TEXT DEFAULT '[]',
            quantity INTEGER DEFAULT 1,
            notes TEXT,
            subtotal_price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS point_transactions (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            order_id TEXT,
            points_change INTEGER NOT NULL,
            transaction_type TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS daily_closings (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            staff_id TEXT,
            staff_name TEXT,
            cups_sold INTEGER DEFAULT 0,
            free_cups_redeemed INTEGER DEFAULT 0,
            total_revenue REAL DEFAULT 0,
            cash_actual REAL DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )"
    ];

    foreach ($queries as $q) {
        $pdo->exec($q);
    }

    // 2. Seed Initial Users
    $seedUsers = [
        [
            'id' => 'u-admin-1',
            'email' => 'admin@tomsmoothie.com',
            'password_hash' => password_hash('TomAdmin@99!', PASSWORD_DEFAULT),
            'full_name' => 'แอดมิน พี่ต้อม',
            'phone' => '089-999-9999',
            'role' => 'ADMIN',
            'member_code' => 'ADMIN001',
            'current_points' => 0
        ],
        [
            'id' => 'u-staff-1',
            'email' => 'staff@tomsmoothie.com',
            'password_hash' => password_hash('staff123', PASSWORD_DEFAULT),
            'full_name' => 'น้องส้ม (บาริสต้า)',
            'phone' => '088-888-8888',
            'role' => 'STAFF',
            'member_code' => 'STAFF001',
            'current_points' => 0
        ],
        [
            'id' => 'u-cust-1',
            'email' => 'customer1@tomsmoothie.com',
            'password_hash' => password_hash('cust123', PASSWORD_DEFAULT),
            'full_name' => 'คุณมานะ รักสุขภาพ',
            'phone' => '081-234-5678',
            'role' => 'CUSTOMER',
            'member_code' => 'CUST001',
            'current_points' => 6
        ]
    ];

    $stmtUser = $pdo->prepare("INSERT OR IGNORE INTO users (id, email, password_hash, full_name, phone, role, member_code, current_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($seedUsers as $u) {
        $stmtUser->execute([$u['id'], $u['email'], $u['password_hash'], $u['full_name'], $u['phone'], $u['role'], $u['member_code'], $u['current_points']]);
    }

    // 3. Seed Initial Menu Items
    $seedMenu = [
        ['m-1', 'มะม่วงเสาวรสปั่น (Mango Passionfruit)', 'Smoothie', 65, '🍊', 1, 1, 145],
        ['m-2', 'สตรอว์เบอร์รีโยเกิร์ตปั่น (Strawberry Yogurt)', 'Smoothie', 70, '🍓', 1, 1, 180],
        ['m-3', 'มะพร้าวนมสดปั่น (Coconut Fresh Milk)', 'Smoothie', 60, '🥥', 1, 1, 120],
        ['m-4', 'โกโก้ปั่นเข้มข้น (Cocoa Intense)', 'Smoothie', 55, '🍫', 1, 1, 95],
        ['m-5', 'อะโวคาโดน้ำผึ้งปั่น (Avocado Honey)', 'Smoothie', 85, '🥑', 1, 1, 110],
        ['m-6', 'ส้มปั่นสด (Orange Smoothie)', 'Smoothie', 50, '🍊', 0, 1, 40],
        ['m-7', 'แตงโมปั่น (Watermelon Smoothie)', 'Smoothie', 45, '🍉', 0, 0, 50],
        ['m-8', 'มิกซ์เบอร์รีปั่น (Mixed Berry)', 'Smoothie', 75, '🫐', 0, 1, 65],
        ['m-iced-1', 'ชาไทยนมสดเย็น (Iced Thai Milk Tea)', 'Iced', 50, '🍹', 1, 1, 85],
        ['m-iced-2', 'ชาเขียวมัทฉะเย็น (Iced Matcha Latte)', 'Iced', 55, '🍵', 0, 1, 60],
        ['m-iced-3', 'กาแฟเอสเปรสโซ่เย็น (Iced Espresso)', 'Iced', 55, '🥤', 0, 1, 70],
        ['m-iced-4', 'นมสดสตรอว์เบอร์รีเย็น (Iced Strawberry Milk)', 'Iced', 50, '🥛', 1, 1, 90],
        ['m-hot-1', 'โกโก้ร้อน (Hot Cocoa)', 'Hot', 45, '☕', 0, 1, 35],
        ['m-hot-2', 'กาแฟคาปูชิโน่ร้อน (Hot Cappuccino)', 'Hot', 50, '☕', 1, 1, 45],
        ['m-hot-3', 'นมสดน้ำผึ้งร้อน (Hot Honey Milk)', 'Hot', 40, '🥛', 0, 1, 20],
        ['t-1', 'วุ้นว่านหางจระเข้ (Aloe Vera)', 'Topping', 10, '🌱', 0, 1, 0],
        ['t-2', 'ไข่มุกบุก (Konjac Pearl)', 'Topping', 10, '🧋', 0, 1, 0],
        ['t-3', 'เยลลี่สีรุ้ง (Rainbow Jelly)', 'Topping', 10, '🌈', 0, 1, 0],
        ['t-4', 'วิปครีมทิปปิ้ง (Whipped Cream)', 'Topping', 10, '🍦', 0, 1, 0]
    ];

    $stmtMenu = $pdo->prepare("INSERT OR IGNORE INTO menu_items (id, name, category, base_price, image_url, is_popular, is_available, total_sold_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($seedMenu as $m) {
        $stmtMenu->execute($m);
    }
}
