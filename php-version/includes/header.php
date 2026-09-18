<?php
// includes/header.php
require_once __DIR__ . '/auth.php';
$currentUser = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ร้านน้ำปั่นพี่ต้อม - TomSmoothie WebOrder & Points</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Main Style -->
    <link rel="stylesheet" href="assets/css/style.css">

    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- QRCode JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <!-- HTML5 QRCode Scanner -->
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
</head>
<body>
<div class="app-container">
    <header>
        <div class="logo-container" onclick="window.location.href='index.php'" style="cursor: pointer;">
            <div class="logo-icon">🍹</div>
            <div class="logo-text">
                <h1>ร้านน้ำปั่นพี่ต้อม</h1>
                <p>TomSmoothie WebOrder & Points</p>
            </div>
        </div>

        <?php if ($currentUser): ?>
            <div class="user-header-actions">
                <span class="user-badge role-badge-<?= strtolower($currentUser['role']) ?>">
                    <?php if ($currentUser['role'] === 'CUSTOMER'): ?>
                        👤 <?= htmlspecialchars(explode(' ', $currentUser['full_name'])[0]) ?> (<strong id="header-user-points"><?= (int)$currentUser['current_points'] ?></strong> แต้ม)
                    <?php elseif ($currentUser['role'] === 'STAFF'): ?>
                        🧑‍🍳 พนักงาน: <?= htmlspecialchars(explode(' ', $currentUser['full_name'])[0]) ?>
                    <?php elseif ($currentUser['role'] === 'ADMIN'): ?>
                        👑 แอดมิน: พี่ต้อม
                    <?php endif; ?>
                </span>
                
                <a href="api/auth.php?action=logout" class="btn-logout" title="ออกจากระบบ">
                    <i data-lucide="log-out" style="width: 14px; height: 14px;"></i> ออกจากระบบ
                </a>
            </div>
        <?php endif; ?>
    </header>
    <main class="main-content">
