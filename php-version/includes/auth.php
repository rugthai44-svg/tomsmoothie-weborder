<?php
// includes/auth.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/database.php';

function getCurrentUser() {
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    
    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT id, email, full_name, phone, role, member_code, current_points, line_user_id, is_active, created_at FROM users WHERE id = ? AND is_active = 1");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        unset($_SESSION['user_id']);
        return null;
    }
    
    return $user;
}

function requireLogin($requiredRole = null) {
    $user = getCurrentUser();
    if (!$user) {
        header('Location: login.php');
        exit;
    }
    
    if ($requiredRole !== null) {
        if (is_array($requiredRole)) {
            if (!in_array($user['role'], $requiredRole)) {
                header('Location: index.php');
                exit;
            }
        } else if ($user['role'] !== $requiredRole) {
            header('Location: index.php');
            exit;
        }
    }
    return $user;
}

function generateId($prefix = '') {
    return ($prefix ? $prefix . '-' : '') . bin2hex(random_bytes(6)) . '-' . time();
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
