<?php
// api/menu.php
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $category = $_GET['category'] ?? '';
    if ($category && $category !== 'ALL') {
        $stmt = $pdo->prepare("SELECT * FROM menu_items WHERE category = ? ORDER BY total_sold_count DESC");
        $stmt->execute([$category]);
    } else {
        $stmt = $pdo->query("SELECT * FROM menu_items ORDER BY category ASC, total_sold_count DESC");
    }
    $items = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $items]);

} else if ($method === 'POST') {
    $user = getCurrentUser();
    if (!$user || !in_array($user['role'], ['ADMIN', 'STAFF'])) {
        jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์ดำเนินการ'], 403);
    }

    $action = $_POST['action'] ?? '';

    if ($action === 'toggle_stock') {
        $id = $_POST['id'] ?? '';
        $isAvailable = (int)($_POST['is_available'] ?? 0);
        $stmt = $pdo->prepare("UPDATE menu_items SET is_available = ? WHERE id = ?");
        $stmt->execute([$isAvailable, $id]);
        jsonResponse(['success' => true, 'message' => 'อัปเดตสถานะสต็อกเรียบร้อยแล้ว']);

    } else if ($action === 'add' || $action === 'update') {
        if ($user['role'] !== 'ADMIN') {
            jsonResponse(['success' => false, 'message' => 'เฉพาะแอดมินเท่านั้น'], 403);
        }

        $name = trim($_POST['name'] ?? '');
        $category = trim($_POST['category'] ?? 'Smoothie');
        $basePrice = (float)($_POST['base_price'] ?? 0);
        $imageUrl = trim($_POST['image_url'] ?? '🥤');
        $isPopular = (int)($_POST['is_popular'] ?? 0);

        if (!$name || $basePrice < 0) {
            jsonResponse(['success' => false, 'message' => 'กรุณากรอกข้อมูลให้ถูกต้อง'], 400);
        }

        if ($action === 'add') {
            $id = generateId('m');
            $stmt = $pdo->prepare("INSERT INTO menu_items (id, name, category, base_price, image_url, is_popular, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)");
            $stmt->execute([$id, $name, $category, $basePrice, $imageUrl, $isPopular]);
            jsonResponse(['success' => true, 'message' => 'เพิ่มเมนูสำเร็จ', 'id' => $id]);
        } else {
            $id = $_POST['id'] ?? '';
            $stmt = $pdo->prepare("UPDATE menu_items SET name = ?, category = ?, base_price = ?, image_url = ?, is_popular = ? WHERE id = ?");
            $stmt->execute([$name, $category, $basePrice, $imageUrl, $isPopular, $id]);
            jsonResponse(['success' => true, 'message' => 'บันทึกการแก้ไขเมนูสำเร็จ']);
        }

    } else if ($action === 'delete') {
        if ($user['role'] !== 'ADMIN') {
            jsonResponse(['success' => false, 'message' => 'เฉพาะแอดมินเท่านั้น'], 403);
        }
        $id = $_POST['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM menu_items WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'ลบเมนูเรียบร้อยแล้ว']);
    } else {
        jsonResponse(['error' => 'Invalid action'], 400);
    }
}
