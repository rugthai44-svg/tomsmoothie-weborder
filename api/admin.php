<?php
// api/admin.php
require_once __DIR__ . '/../includes/auth.php';

$pdo = getDB();
$user = getCurrentUser();

if (!$user || $user['role'] !== 'ADMIN') {
    jsonResponse(['success' => false, 'message' => 'เฉพาะแอดมินเท่านั้น'], 403);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'analytics') {
    header('Content-Type: application/json; charset=utf-8');

    // 1. Total Completed Sales Revenue
    $stmtRev = $pdo->query("SELECT SUM(total_price) as total_rev, COUNT(*) as total_orders FROM orders WHERE order_status = 'Completed'");
    $revData = $stmtRev->fetch();
    
    // Revenue from closings
    $stmtClosingsRev = $pdo->query("SELECT SUM(total_revenue) as closings_rev, SUM(free_cups_redeemed) as closings_free_cups, SUM(cups_sold) as closings_cups FROM daily_closings");
    $closingData = $stmtClosingsRev->fetch();

    $baseRev = (float)($revData['total_rev'] ?? 0) + (float)($closingData['closings_rev'] ?? 0);
    $freeDrinks = (int)($closingData['closings_free_cups'] ?? 0);

    // Count free drinks from online orders
    $stmtFree = $pdo->query("SELECT COUNT(*) as free_cnt FROM orders WHERE is_redeemed_free_cup = 1 AND order_status = 'Completed'");
    $freeDrinks += (int)($stmtFree->fetch()['free_cnt'] ?? 0);

    // Total Users
    $stmtUsers = $pdo->query("SELECT COUNT(*) as total_cust FROM users WHERE role = 'CUSTOMER'");
    $totalCust = (int)($stmtUsers->fetch()['total_cust'] ?? 0);

    // Best Sellers
    $stmtBest = $pdo->query("SELECT id, name, category, total_sold_count, image_url, base_price FROM menu_items WHERE category != 'Topping' ORDER BY total_sold_count DESC LIMIT 7");
    $bestSellers = $stmtBest->fetchAll();

    jsonResponse([
        'success' => true,
        'data' => [
            'total_revenue' => $baseRev,
            'today_revenue' => $baseRev + 130, // simulated active
            'total_customers' => $totalCust,
            'free_drinks_redeemed' => $freeDrinks,
            'best_sellers' => $bestSellers
        ]
    ]);

} else if ($action === 'staff_list') {
    header('Content-Type: application/json; charset=utf-8');
    $stmt = $pdo->query("SELECT id, email, full_name, phone, role, is_active, created_at FROM users WHERE role IN ('STAFF', 'ADMIN') ORDER BY role ASC, created_at DESC");
    $staff = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $staff]);

} else if ($action === 'add_staff') {
    header('Content-Type: application/json; charset=utf-8');
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $fullName = trim($_POST['full_name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');

    if (!$email || !$password || !$fullName) {
        jsonResponse(['success' => false, 'message' => 'กรุณากรอกข้อมูลให้ครบถ้วน'], 400);
    }

    $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)");
    $stmtCheck->execute([$email]);
    if ($stmtCheck->fetch()) {
        jsonResponse(['success' => false, 'message' => 'อีเมลนี้มีในระบบแล้ว'], 400);
    }

    $id = generateId('u-staff');
    $memberCode = 'STAFF' . rand(100, 999);
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmtInsert = $pdo->prepare("INSERT INTO users (id, email, password_hash, full_name, phone, role, member_code, current_points) VALUES (?, ?, ?, ?, ?, 'STAFF', ?, 0)");
    $stmtInsert->execute([$id, $email, $passwordHash, $fullName, $phone, $memberCode]);

    jsonResponse(['success' => true, 'message' => 'เพิ่มบัญชีพนักงานเรียบร้อยแล้ว']);

} else if ($action === 'toggle_staff') {
    header('Content-Type: application/json; charset=utf-8');
    $staffId = $_POST['staff_id'] ?? '';
    $isActive = (int)($_POST['is_active'] ?? 1);

    if ($staffId === $user['id']) {
        jsonResponse(['success' => false, 'message' => 'ไม่สามารถระงับบัญชีของตนเองได้'], 400);
    }

    $stmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
    $stmt->execute([$isActive, $staffId]);

    jsonResponse(['success' => true, 'message' => 'อัปเดตสถานะพนักงานเรียบร้อยแล้ว']);

} else if ($action === 'customer_list') {
    header('Content-Type: application/json; charset=utf-8');
    $search = trim($_GET['search'] ?? '');
    if ($search) {
        $stmt = $pdo->prepare("SELECT id, full_name, email, phone, member_code, current_points, is_active, created_at FROM users WHERE role = 'CUSTOMER' AND (full_name LIKE ? OR phone LIKE ? OR member_code LIKE ?) ORDER BY created_at DESC");
        $like = "%{$search}%";
        $stmt->execute([$like, $like, $like]);
    } else {
        $stmt = $pdo->query("SELECT id, full_name, email, phone, member_code, current_points, is_active, created_at FROM users WHERE role = 'CUSTOMER' ORDER BY created_at DESC LIMIT 50");
    }
    $customers = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $customers]);

} else if ($action === 'logs') {
    header('Content-Type: application/json; charset=utf-8');
    $stmt = $pdo->query("SELECT t.*, u.full_name as customer_name, u.phone as customer_phone FROM point_transactions t LEFT JOIN users u ON t.customer_id = u.id ORDER BY t.created_at DESC LIMIT 50");
    $logs = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $logs]);

} else if ($action === 'export_closings_csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="tomsmoothie_daily_closings_' . date('Ymd_His') . '.csv"');
    
    $output = fopen('php://output', 'w');
    // UTF-8 BOM for Excel in Thai
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

    fputcsv($output, ['วันที่', 'รหัสพนักงาน', 'ชื่อพนักงาน', 'จำนวนแก้วที่ขายได้', 'จำนวนแก้วแลกฟรี', 'ยอดขายตามระบบ (บาท)', 'ยอดเงินสดนับได้จริง (บาท)', 'หมายเหตุ', 'บันทึกเมื่อ']);

    $stmt = $pdo->query("SELECT * FROM daily_closings ORDER BY date DESC");
    while ($row = $stmt->fetch()) {
        fputcsv($output, [
            $row['date'],
            $row['staff_id'],
            $row['staff_name'],
            $row['cups_sold'],
            $row['free_cups_redeemed'],
            $row['total_revenue'],
            $row['cash_actual'],
            $row['notes'],
            $row['created_at']
        ]);
    }
    fclose($output);
    exit;

} else if ($action === 'reset_database') {
    header('Content-Type: application/json; charset=utf-8');
    
    // Clear and re-seed
    $pdo->exec("DELETE FROM point_transactions");
    $pdo->exec("DELETE FROM order_items");
    $pdo->exec("DELETE FROM orders");
    $pdo->exec("DELETE FROM daily_closings");
    $pdo->exec("DELETE FROM menu_items");
    $pdo->exec("DELETE FROM users");

    initSQLiteDatabase($pdo);

    jsonResponse(['success' => true, 'message' => 'รีเซ็ตฐานข้อมูลเป็นค่าตั้งต้นเรียบร้อยแล้ว']);

} else {
    header('Content-Type: application/json; charset=utf-8');
    jsonResponse(['error' => 'Invalid action'], 400);
}
