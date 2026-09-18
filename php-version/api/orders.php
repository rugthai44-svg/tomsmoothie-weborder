<?php
// api/orders.php
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$user = getCurrentUser();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบ'], 401);
    }

    $scope = $_GET['scope'] ?? '';

    if ($user['role'] === 'CUSTOMER') {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user['id']]);
    } else {
        if ($scope === 'active') {
            $stmt = $pdo->query("SELECT * FROM orders WHERE order_status IN ('Pending', 'Preparing', 'Ready') ORDER BY created_at ASC");
        } else {
            $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100");
        }
    }

    $orders = $stmt->fetchAll();

    // Fetch order items for each order
    foreach ($orders as &$order) {
        $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $stmtItems->execute([$order['id']]);
        $items = $stmtItems->fetchAll();
        foreach ($items as &$it) {
            $it['toppings'] = json_decode($it['toppings'] ?? '[]', true) ?: [];
        }
        $order['items'] = $items;
    }

    jsonResponse(['success' => true, 'data' => $orders]);

} else if ($method === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create') {
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบก่อนสั่งซื้อ'], 401);
        }

        $itemsJson = $_POST['items'] ?? '[]';
        $items = json_decode($itemsJson, true);
        $pickupTime = $_POST['pickup_time'] ?? '15 นาที';
        $isRedeemed = !empty($_POST['is_redeemed']) && $_POST['is_redeemed'] !== 'false';

        if (empty($items) || !is_array($items)) {
            jsonResponse(['success' => false, 'message' => 'ตะกร้าสินค้าว่างเปล่า'], 400);
        }

        $totalCups = 0;
        $totalPrice = 0;

        foreach ($items as $item) {
            $qty = max(1, (int)($item['quantity'] ?? 1));
            $subtotal = (float)($item['subtotal_price'] ?? 0);
            $totalCups += $qty;
            $totalPrice += $subtotal;
        }

        // Validate Point Redemption
        if ($isRedeemed) {
            if ($user['current_points'] < 10) {
                jsonResponse(['success' => false, 'message' => 'แต้มสะสมไม่เพียงพอสำหรับการแลกเครื่องดื่มฟรี (ต้องการ 10 แต้ม)'], 400);
            }
            if ($totalCups !== 1) {
                jsonResponse(['success' => false, 'message' => 'สิทธิ์แลกฟรี 1 แก้ว ใช้ได้เฉพาะออเดอร์ที่มี 1 แก้วเท่านั้น'], 400);
            }
            $totalPrice = 0.00; // Free Drink!
        }

        $orderId = 'ORD-' . strtoupper(substr(uniqid(), -6));

        $pdo->beginTransaction();
        try {
            // 1. Insert Order
            $stmtOrder = $pdo->prepare("INSERT INTO orders (id, customer_id, customer_name, customer_phone, total_price, order_status, pickup_time, is_redeemed_free_cup, payment_method) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, 'PROMPTPAY')");
            $stmtOrder->execute([
                $orderId,
                $user['id'],
                $user['full_name'],
                $user['phone'],
                $totalPrice,
                $pickupTime,
                $isRedeemed ? 1 : 0
            ]);

            // 2. Insert Order Items
            $stmtItem = $pdo->prepare("INSERT INTO order_items (id, order_id, menu_id, name, sweetness_level, toppings, quantity, notes, subtotal_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $itemId = generateId('item');
                $toppingsJson = json_encode($item['toppings'] ?? [], JSON_UNESCAPED_UNICODE);
                $stmtItem->execute([
                    $itemId,
                    $orderId,
                    $item['menu_id'] ?? null,
                    $item['name'],
                    $item['sweetness_level'] ?? '100%',
                    $toppingsJson,
                    (int)($item['quantity'] ?? 1),
                    $item['notes'] ?? '',
                    $isRedeemed ? 0.00 : (float)($item['subtotal_price'] ?? 0)
                ]);

                // Increment total sold count on menu
                if (!empty($item['menu_id'])) {
                    $stmtSold = $pdo->prepare("UPDATE menu_items SET total_sold_count = total_sold_count + ? WHERE id = ?");
                    $stmtSold->execute([(int)($item['quantity'] ?? 1), $item['menu_id']]);
                }
            }

            // 3. Handle Points Deduction if Redeemed
            if ($isRedeemed) {
                $stmtDeduct = $pdo->prepare("UPDATE users SET current_points = current_points - 10 WHERE id = ?");
                $stmtDeduct->execute([$user['id']]);

                $stmtTx = $pdo->prepare("INSERT INTO point_transactions (id, customer_id, order_id, points_change, transaction_type, description) VALUES (?, ?, ?, -10, 'REDEEM', ?)");
                $stmtTx->execute([generateId('tx'), $user['id'], $orderId, 'แลกรับเครื่องดื่มฟรี 1 แก้ว (ออเดอร์ #' . $orderId . ')']);
            }

            $pdo->commit();

            jsonResponse([
                'success' => true,
                'message' => 'ส่งออเดอร์เรียบร้อยแล้ว!',
                'order_id' => $orderId
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการบันทึกออเดอร์: ' . $e->getMessage()], 500);
        }

    } else if ($action === 'update_status') {
        if (!$user || !in_array($user['role'], ['STAFF', 'ADMIN'])) {
            jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์ดำเนินการ'], 403);
        }

        $orderId = $_POST['order_id'] ?? '';
        $newStatus = $_POST['order_status'] ?? '';

        $validStatuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
        if (!in_array($newStatus, $validStatuses)) {
            jsonResponse(['success' => false, 'message' => 'สถานะไม่ถูกต้อง'], 400);
        }

        $stmtGet = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
        $stmtGet->execute([$orderId]);
        $order = $stmtGet->fetch();

        if (!$order) {
            jsonResponse(['success' => false, 'message' => 'ไม่พบออเดอร์นี้'], 404);
        }

        $pdo->beginTransaction();
        try {
            $stmtUpdate = $pdo->prepare("UPDATE orders SET order_status = ? WHERE id = ?");
            $stmtUpdate->execute([$newStatus, $orderId]);

            // If moving to Completed and not free redemption, auto-award points to customer (+1 point per cup)
            if ($newStatus === 'Completed' && $order['order_status'] !== 'Completed' && !$order['is_redeemed_free_cup'] && $order['customer_id']) {
                // Check if already awarded
                $stmtCheckTx = $pdo->prepare("SELECT id FROM point_transactions WHERE order_id = ? AND transaction_type = 'EARN'");
                $stmtCheckTx->execute([$orderId]);
                if (!$stmtCheckTx->fetch()) {
                    // Count total cups in order
                    $stmtCount = $pdo->prepare("SELECT SUM(quantity) as total_cups FROM order_items WHERE order_id = ?");
                    $stmtCount->execute([$orderId]);
                    $row = $stmtCount->fetch();
                    $cups = (int)($row['total_cups'] ?? 1);

                    if ($cups > 0) {
                        $stmtAddPoints = $pdo->prepare("UPDATE users SET current_points = current_points + ? WHERE id = ?");
                        $stmtAddPoints->execute([$cups, $order['customer_id']]);

                        $stmtEarnTx = $pdo->prepare("INSERT INTO point_transactions (id, customer_id, order_id, points_change, transaction_type, description) VALUES (?, ?, ?, ?, 'EARN', ?)");
                        $stmtEarnTx->execute([
                            generateId('tx'),
                            $order['customer_id'],
                            $orderId,
                            $cups,
                            "ได้รับแต้มสะสม +{$cups} แต้ม จากการสั่งซื้อ #{$orderId}"
                        ]);
                    }
                }
            }

            $pdo->commit();
            jsonResponse(['success' => true, 'message' => "อัปเดตสถานะออเดอร์เป็น {$newStatus} แล้ว"]);

        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], 500);
        }

    } else if ($action === 'cancel') {
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบ'], 401);
        }

        $orderId = $_POST['order_id'] ?? '';
        $stmtGet = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
        $stmtGet->execute([$orderId]);
        $order = $stmtGet->fetch();

        if (!$order) {
            jsonResponse(['success' => false, 'message' => 'ไม่พบออเดอร์นี้'], 404);
        }

        if ($user['role'] === 'CUSTOMER' && $order['customer_id'] !== $user['id']) {
            jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์ยกเลิกออเดอร์นี้'], 403);
        }

        if ($order['order_status'] !== 'Pending') {
            jsonResponse(['success' => false, 'message' => 'ไม่สามารถยกเลิกได้เนื่องจากร้านกำลังเตรียมเครื่องดื่มแล้ว'], 400);
        }

        $pdo->beginTransaction();
        try {
            $stmtCancel = $pdo->prepare("UPDATE orders SET order_status = 'Cancelled' WHERE id = ?");
            $stmtCancel->execute([$orderId]);

            // If redeemed free cup, refund points!
            if ($order['is_redeemed_free_cup'] && $order['customer_id']) {
                $stmtRefund = $pdo->prepare("UPDATE users SET current_points = current_points + 10 WHERE id = ?");
                $stmtRefund->execute([$order['customer_id']]);

                $stmtTx = $pdo->prepare("INSERT INTO point_transactions (id, customer_id, order_id, points_change, transaction_type, description) VALUES (?, ?, ?, 10, 'ADJUST', ?)");
                $stmtTx->execute([generateId('tx'), $order['customer_id'], $orderId, 'คืนแต้มสะสม 10 แต้ม เนื่องจากยกเลิกออเดอร์ #' . $orderId]);
            }

            $pdo->commit();
            jsonResponse(['success' => true, 'message' => 'ยกเลิกออเดอร์เรียบร้อยแล้ว']);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], 500);
        }
    } else {
        jsonResponse(['error' => 'Invalid action'], 400);
    }
}
