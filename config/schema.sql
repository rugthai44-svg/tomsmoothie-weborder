-- config/schema.sql
-- MySQL / MariaDB Schema for TomSmoothie WebOrder & Points

CREATE DATABASE IF NOT EXISTS `tomsmoothie_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tomsmoothie_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `role` ENUM('CUSTOMER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  `member_code` VARCHAR(20) UNIQUE NULL,
  `current_points` INT NOT NULL DEFAULT 0,
  `line_user_id` VARCHAR(100) NULL,
  `google_id` VARCHAR(100) NULL,
  `auth_provider` VARCHAR(20) DEFAULT 'LOCAL',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Menu Items Table
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(30) NOT NULL,
  `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `image_url` VARCHAR(255) NULL,
  `is_popular` TINYINT(1) NOT NULL DEFAULT 0,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `total_sold_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `customer_id` VARCHAR(50) NULL,
  `customer_name` VARCHAR(100) NULL,
  `customer_phone` VARCHAR(20) NULL,
  `total_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `order_status` ENUM('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `pickup_time` VARCHAR(50) NULL,
  `is_redeemed_free_cup` TINYINT(1) NOT NULL DEFAULT 0,
  `payment_method` VARCHAR(20) NOT NULL DEFAULT 'PROMPTPAY',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `order_id` VARCHAR(50) NOT NULL,
  `menu_id` VARCHAR(50) NULL,
  `name` VARCHAR(150) NOT NULL,
  `sweetness_level` VARCHAR(20) DEFAULT '100%',
  `toppings` TEXT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `notes` TEXT NULL,
  `subtotal_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_id` (`order_id`),
  CONSTRAINT `fk_order_items_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Point Transactions Table
CREATE TABLE IF NOT EXISTS `point_transactions` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `customer_id` VARCHAR(50) NOT NULL,
  `order_id` VARCHAR(50) NULL,
  `points_change` INT NOT NULL,
  `transaction_type` ENUM('EARN', 'REDEEM', 'ADJUST') NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cust_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Daily Closings Table
CREATE TABLE IF NOT EXISTS `daily_closings` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `date` DATE NOT NULL,
  `staff_id` VARCHAR(50) NULL,
  `staff_name` VARCHAR(100) NULL,
  `cups_sold` INT NOT NULL DEFAULT 0,
  `free_cups_redeemed` INT NOT NULL DEFAULT 0,
  `total_revenue` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `cash_actual` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
