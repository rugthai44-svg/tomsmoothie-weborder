<?php
// api/loyalty.php
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$user = getCurrentUser();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'lookup') {
    if (!$user || !in_array($user['role'], ['STAFF', 'ADMIN'])) {
        jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์เข้าถึง'], 403);
    }

    $query = trim($_GET['q'] ?? '');
    if (!$query) {
        jsonResponse(['success' => false, 'message' => 'กรุณาระบุรหัสสมาชิกหรือเบอร์โทร'], 400);
    }

    $stmt = $pdo->prepare("SELECT id, full_name, phone, member_code, current_points, role FROM users WHERE (member_code = ? OR phone = ? OR id = ?) AND is_active = 1");
    $stmt->execute([$query, $query, $query]);
    $targetUser = $stmt->fetch();

    if ($targetUser) {
        // Fetch recent transactions for this customer
        $stmtTx = $pdo->prepare("SELECT * FROM point_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5");
        $stmtTx->execute([$targetUser['id']]);
        $targetUser['transactions'] = $stmtTx->fetchAll();

        jsonResponse(['success' => true, 'data' => $targetUser]);
    } else {
        jsonResponse(['success' => false, 'message' => 'ไม่พบข้อมูลสมาชิกลูกค้านี้'], 404);
    }

} else if ($action === 'award_points') {
    if (!$user || !in_array($user['role'], ['STAFF', 'ADMIN'])) {
        jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์ทำรายการ'], 403);
    }

    $customerId = $_POST['customer_id'] ?? '';
    $cups = max(1, (int)($_POST['cups'] ?? 1));

    $stmtCust = $pdo->prepare("SELECT id, full_name, current_points FROM users WHERE id = ?");
    $stmtCust->execute([$customerId]);
    $cust = $stmtCust->fetch();

    if (!$cust) {
        jsonResponse(['success' => false, 'message' => 'ไม่พบสมาชิกลูกค้า'], 404);
    }

    $pdo->beginTransaction();
    try {
        $stmtAdd = $pdo->prepare("UPDATE users SET current_points = current_points + ? WHERE id = ?");
        $stmtAdd->execute([$cups, $customerId]);

        $newPoints = $cust['current_points'] + $cups;

        $stmtTx = $pdo->prepare("INSERT INTO point_transactions (id, customer_id, points_change, transaction_type, description) VALUES (?, ?, ?, 'EARN', ?)");
        $stmtTx->execute([
            generateId('tx'),
            $customerId,
            $cups,
            "สะสมแต้มหน้าร้าน +{$cups} แต้ม โดยพนักงาน: {$user['full_name']}"
        ]);

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'message' => "เพิ่มแต้มให้คุณ {$cust['full_name']} สำเร็จ (+{$cups} แต้ม)",
            'current_points' => $newPoints
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], 500);
    }

} else if ($action === 'redeem_free_cup') {
    if (!$user || !in_array($user['role'], ['STAFF', 'ADMIN'])) {
        jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์ทำรายการ'], 403);
    }

    $customerId = $_POST['customer_id'] ?? '';
    $stmtCust = $pdo->prepare("SELECT id, full_name, current_points FROM users WHERE id = ?");
    $stmtCust->execute([$customerId]);
    $cust = $stmtCust->fetch();

    if (!$cust) {
        jsonResponse(['success' => false, 'message' => 'ไม่พบสมาชิกลูกค้า'], 404);
    }

    if ($cust['current_points'] < 10) {
        jsonResponse(['success' => false, 'message' => 'แต้มสะสมไม่เพียงพอ (มี ' . $cust['current_points'] . ' แต้ม, ต้องการ 10 แต้ม)'], 400);
    }

    $pdo->beginTransaction();
    try {
        $stmtDeduct = $pdo->prepare("UPDATE users SET current_points = current_points - 10 WHERE id = ?");
        $stmtDeduct->execute([$customerId]);

        $newPoints = $cust['current_points'] - 10;

        $stmtTx = $pdo->prepare("INSERT INTO point_transactions (id, customer_id, points_change, transaction_type, description) VALUES (?, ?, -10, 'REDEEM', ?)");
        $stmtTx->execute([
            generateId('tx'),
            $customerId,
            "แลกรับเครื่องดื่มฟรี 1 แก้วหน้าร้าน โดยพนักงาน: {$user['full_name']}"
        ]);

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'message' => "แลกรับเครื่องดื่มฟรี 1 แก้วสำเร็จ! (หัก 10 แต้ม)",
            'current_points' => $newPoints
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], 500);
    }

} else if ($action === 'my_transactions') {
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบ'], 401);
    }

    $stmt = $pdo->prepare("SELECT * FROM point_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20");
    $stmt->execute([$user['id']]);
    $txs = $stmt->fetchAll();

    jsonResponse(['success' => true, 'data' => $txs]);

} else if ($action === 'admin_adjust') {
    if (!$user || $user['role'] !== 'ADMIN') {
        jsonResponse(['success' => false, 'message' => 'เฉพาะแอดมินเท่านั้น'], 403);
    }

    $customerId = $_POST['customer_id'] ?? '';
    $pointsChange = (int)($_POST['points_change'] ?? 0);
    $reason = trim($_POST['reason'] ?? 'ปรับปรุงแต้มโดยแอดมิน');

    if ($pointsChange === 0) {
        jsonResponse(['success' => false, 'message' => 'จำนวนแต้มต้องไม่เป็น 0'], 400);
    }

    $pdo->beginTransaction();
    try {
        $stmtAdjust = $pdo->prepare("UPDATE users SET current_points = MAX(0, current_points + ?) WHERE id = ?");
        $stmtAdjust->execute([$pointsChange, $customerId]);

        $stmtTx = $pdo->prepare("INSERT INTO point_transactions (id, customer_id, points_change, transaction_type, description) VALUES (?, ?, ?, 'ADJUST', ?)");
        $stmtTx->execute([generateId('tx'), $customerId, $pointsChange, $reason]);

        $pdo->commit();
        jsonResponse(['success' => true, 'message' => 'ปรับปรุงแต้มสะสมเรียบร้อยแล้ว']);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], 500);
    }

} else {
    jsonResponse(['error' => 'Invalid action'], 400);
}
