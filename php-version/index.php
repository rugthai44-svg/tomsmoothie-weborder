<?php
// index.php - Main Router
require_once __DIR__ . '/includes/auth.php';

$user = getCurrentUser();

if (!$user) {
    header('Location: login.php');
    exit;
}

if ($user['role'] === 'CUSTOMER') {
    header('Location: customer.php');
    exit;
} else if ($user['role'] === 'STAFF') {
    header('Location: staff.php');
    exit;
} else if ($user['role'] === 'ADMIN') {
    header('Location: admin.php');
    exit;
} else {
    header('Location: login.php');
    exit;
}
