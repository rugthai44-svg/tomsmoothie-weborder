<?php
// api/staff.php
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$user = getCurrentUser();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (!$user || !in_array($user['role'], ['STAFF', 'ADMIN'])) {
    jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์เข้าถึง'], 403);
}

if ($action === 'close_shift') {
    $date = $_POST['date'] ?? date('Y-m-d');
    $cupsSold = (int)($_POST['cups_sold'] ?? 0);
    $freeCups = (int)($_POST['free_cups_redeemed'] ?? 0);
    $totalRevenue = (float)($_POST['total_revenue'] ?? 0);
    $cashActual = (float)($_POST['cash_actual'] ?? 0);
    $notes = trim($_POST['notes'] ?? '');

    $id = generateId('cls');
    $stmt = $pdo->prepare("INSERT INTO daily_closings (id, date, staff_id, staff_name, cups_sold, free_cups_redeemed, total_revenue, cash_actual, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $id,
        $date,
        $user['id'],
        $user['full_name'],
        $cupsSold,
        $freeCups,
        $totalRevenue,
        $cashActual,
        $notes
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'บันทึกรายงานปิดยอดขายประจำวันเรียบร้อยแล้ว!',
        'id' => $id
    ]);

} else if ($action === 'get_closings') {
    $stmt = $pdo->query("SELECT * FROM daily_closings ORDER BY date DESC, created_at DESC");
    $closings = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $closings]);

} else {
    jsonResponse(['error' => 'Invalid action'], 400);
}
