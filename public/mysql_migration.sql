-- ============================================================
-- MYSQL MIGRATION — Arabic Shinwari Restaurant POS
-- Generated: 2026-03-05
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- Ready to import: mysql -u root -p database_name < mysql_migration.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- ============================================================
-- SCHEMA: Tables
-- ============================================================

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `name` VARCHAR(255) DEFAULT 'User',
  `remember_token` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profiles
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `profiles_user_id_unique` (`user_id`),
  CONSTRAINT `profiles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Roles
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `role` ENUM('admin', 'manager', 'pos_user') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_unique` (`user_id`, `role`),
  CONSTRAINT `user_roles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ingredients
CREATE TABLE IF NOT EXISTS `ingredients` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `cost_per_unit` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `store_stock` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `kitchen_stock` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `low_stock_threshold` DECIMAL(12,4) NOT NULL DEFAULT 10,
  `category` VARCHAR(100) NOT NULL DEFAULT 'General',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu Categories
CREATE TABLE IF NOT EXISTS `menu_categories` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT 'UtensilsCrossed',
  `color` VARCHAR(50) NOT NULL DEFAULT 'bg-gray-100',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu Items
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `category_id` CHAR(36) DEFAULT NULL,
  `image` TEXT DEFAULT NULL,
  `recipe` JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `recipe_cost` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `profit_margin` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `menu_items_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `menu_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu Item Variants
CREATE TABLE IF NOT EXISTS `menu_item_variants` (
  `id` CHAR(36) NOT NULL,
  `menu_item_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `recipe` JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `recipe_cost` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `profit_margin` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `menu_item_variants_menu_item_id_foreign` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` CHAR(36) NOT NULL,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `order_type` ENUM('dine-in', 'online', 'takeaway') NOT NULL,
  `status` ENUM('pending', 'completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `tax` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `discount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `discount_type` ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed',
  `discount_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `discount_reason` TEXT DEFAULT NULL,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `payment_method` ENUM('cash', 'card', 'mobile') NOT NULL DEFAULT 'cash',
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `table_id` VARCHAR(36) DEFAULT NULL,
  `table_number` INT DEFAULT NULL,
  `waiter_id` VARCHAR(36) DEFAULT NULL,
  `waiter_name` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_by` CHAR(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `orders_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Items
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `menu_item_id` VARCHAR(36) NOT NULL,
  `menu_item_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `notes` TEXT DEFAULT NULL,
  `variant_id` CHAR(36) DEFAULT NULL,
  `variant_name` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `menu_item_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restaurant Tables
CREATE TABLE IF NOT EXISTS `restaurant_tables` (
  `id` CHAR(36) NOT NULL,
  `table_number` INT NOT NULL,
  `capacity` INT NOT NULL DEFAULT 4,
  `floor` ENUM('ground', 'first', 'family') NOT NULL DEFAULT 'ground',
  `status` ENUM('available', 'occupied') NOT NULL DEFAULT 'available',
  `current_order_id` CHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `restaurant_tables_current_order_id_foreign` FOREIGN KEY (`current_order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Waiters
CREATE TABLE IF NOT EXISTS `waiters` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock Purchases
CREATE TABLE IF NOT EXISTS `stock_purchases` (
  `id` CHAR(36) NOT NULL,
  `ingredient_id` CHAR(36) NOT NULL,
  `quantity` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `unit_cost` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `total_cost` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `purchase_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` CHAR(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `stock_purchases_ingredient_id_foreign` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_purchases_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock Transfers
CREATE TABLE IF NOT EXISTS `stock_transfers` (
  `id` CHAR(36) NOT NULL,
  `ingredient_id` CHAR(36) NOT NULL,
  `quantity` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `from_location` ENUM('store', 'kitchen') NOT NULL,
  `to_location` ENUM('store', 'kitchen') NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` CHAR(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `stock_transfers_ingredient_id_foreign` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfers_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock Removals
CREATE TABLE IF NOT EXISTS `stock_removals` (
  `id` CHAR(36) NOT NULL,
  `ingredient_id` CHAR(36) NOT NULL,
  `quantity` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `reason` TEXT NOT NULL,
  `location` ENUM('store', 'kitchen') NOT NULL DEFAULT 'kitchen',
  `removed_by` CHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `stock_removals_ingredient_id_foreign` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_removals_removed_by_foreign` FOREIGN KEY (`removed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock Sales
CREATE TABLE IF NOT EXISTS `stock_sales` (
  `id` CHAR(36) NOT NULL,
  `ingredient_id` CHAR(36) NOT NULL,
  `quantity` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `cost_per_unit` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `sale_price` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `total_cost` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `total_sale` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `profit` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `sold_by` CHAR(36) DEFAULT NULL,
  `sale_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `stock_sales_ingredient_id_foreign` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_sales_sold_by_foreign` FOREIGN KEY (`sold_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` CHAR(36) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `expense_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `created_by` CHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `expenses_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restaurant Settings
CREATE TABLE IF NOT EXISTS `restaurant_settings` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL DEFAULT 'Restaurant',
  `address` TEXT DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 16,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'PKR',
  `currency_symbol` VARCHAR(10) NOT NULL DEFAULT '₨',
  `invoice_title` VARCHAR(255) DEFAULT NULL,
  `invoice_footer` TEXT DEFAULT NULL,
  `invoice_show_logo` TINYINT(1) NOT NULL DEFAULT 0,
  `invoice_logo_url` LONGTEXT DEFAULT NULL,
  `invoice_gst_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `security_cancel_password` VARCHAR(255) NOT NULL DEFAULT '12345',
  `business_day_cutoff_hour` INT NOT NULL DEFAULT 5,
  `business_day_cutoff_minute` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- DATA: Users (from auth + profiles)
-- ============================================================

INSERT INTO `users` (`id`, `email`, `password`, `email_verified_at`, `name`, `created_at`) VALUES
('83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', 'admin@dhaba.pk', '$2y$10$placeholder_hash_change_me', '2026-01-08 01:04:34', 'Admin User', '2026-01-08 01:04:34'),
('93e96387-fcf3-4a23-a83b-c1cf3c14f107', 'manager@dhaba.pk', '$2y$10$placeholder_hash_change_me', '2026-03-03 00:21:48', 'Muhammad Rizwan', '2026-03-03 00:21:48'),
('3e6434ed-7662-44cb-b447-b8dfbf7c6195', 'pos@dhaba.pk', '$2y$10$placeholder_hash_change_me', '2026-03-03 00:23:30', 'Atta ur Rehman', '2026-03-03 00:23:30'),
('1fb18949-c3c0-46f9-b00e-6cece88fa812', 'dev@dhaba.pk', '$2y$10$placeholder_hash_change_me', '2026-03-03 00:55:32', 'Developer Account', '2026-03-03 00:55:32');

-- ============================================================
-- DATA: Profiles
-- ============================================================

INSERT INTO `profiles` (`id`, `user_id`, `name`, `phone`, `avatar_url`, `created_at`, `updated_at`) VALUES
('894bac66-9341-47b6-a1c0-e76b89da6b5d', '83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', 'Admin User', NULL, NULL, '2026-01-08 01:04:34', '2026-01-08 01:04:34'),
('5914f14b-f6c9-4702-8bd3-8a3f8fa4a5b0', '93e96387-fcf3-4a23-a83b-c1cf3c14f107', 'Muhammad Rizwan', '12341234121', NULL, '2026-03-03 00:21:48', '2026-03-03 00:21:49'),
('909d933b-6b66-43b9-956d-b4b0ef5245cf', '3e6434ed-7662-44cb-b447-b8dfbf7c6195', 'Atta ur Rehman', '1231231231', NULL, '2026-03-03 00:23:30', '2026-03-03 00:23:31'),
('b089b1d2-5121-4c97-999c-0a7e8f03a9b5', '1fb18949-c3c0-46f9-b00e-6cece88fa812', 'Developer Account', '+923481970534', NULL, '2026-03-03 00:55:32', '2026-03-03 00:55:33');

-- ============================================================
-- DATA: User Roles
-- ============================================================

INSERT INTO `user_roles` (`id`, `user_id`, `role`, `created_at`) VALUES
('44fd79de-bcf6-4231-bf62-550ca1a8b035', '83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', 'admin', '2026-01-08 01:04:35'),
('598ded7f-f02f-4df0-804c-fafbfe803c38', '93e96387-fcf3-4a23-a83b-c1cf3c14f107', 'manager', '2026-03-03 00:21:49'),
('1960fe3a-be02-457e-9fca-05ef8657efcf', '3e6434ed-7662-44cb-b447-b8dfbf7c6195', 'pos_user', '2026-03-03 00:23:30'),
('fe2d9da3-7421-4601-862c-01ee41ed6dd7', '1fb18949-c3c0-46f9-b00e-6cece88fa812', 'admin', '2026-03-03 00:55:33');

-- ============================================================
-- DATA: Restaurant Settings
-- ============================================================

INSERT INTO `restaurant_settings` (`id`, `name`, `address`, `phone`, `tax_rate`, `currency`, `currency_symbol`, `invoice_title`, `invoice_footer`, `invoice_show_logo`, `invoice_logo_url`, `invoice_gst_enabled`, `security_cancel_password`, `business_day_cutoff_hour`, `business_day_cutoff_minute`, `created_at`, `updated_at`) VALUES
('e2b00452-2dde-4b66-90d6-692d9358bcfd', 'Arabic Shinwari Restaurant', '123 Main Street', '+92 3481970534', 0.00, 'PKR', '₨', 'Arabic Shinwari Restaurant', 'Thank you for dining with us!', 1, NULL, 0, '12345', 5, 0, '2026-01-16 00:28:55', '2026-03-03 00:56:12');

-- ============================================================
-- DATA: Waiters
-- ============================================================

INSERT INTO `waiters` (`id`, `name`, `phone`, `is_active`, `created_at`) VALUES
('55555555-0000-0000-0000-000000000001', 'Ahmed Khan', '+92 301 1111111', 1, '2026-01-17 00:23:08'),
('55555555-0000-0000-0000-000000000002', 'Bilal Hussain', '+92 302 2222222', 1, '2026-01-17 00:23:08'),
('55555555-0000-0000-0000-000000000003', 'Usman Ali', '+92 303 3333333', 1, '2026-01-17 00:23:08'),
('55555555-0000-0000-0000-000000000004', 'Farhan Malik', '+92 304 4444444', 1, '2026-01-17 00:23:08'),
('6ceccd74-74f6-4589-9dc9-26dbb074427f', 'Saleem', '03331231232', 1, '2026-03-03 00:14:21');

-- ============================================================
-- DATA: Restaurant Tables
-- ============================================================

INSERT INTO `restaurant_tables` (`id`, `table_number`, `capacity`, `floor`, `status`, `current_order_id`, `created_at`) VALUES
('44444444-0000-0000-0000-000000000001', 1, 4, 'ground', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000002', 2, 4, 'ground', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000003', 3, 2, 'ground', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000004', 4, 6, 'ground', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000005', 5, 4, 'first', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000006', 6, 8, 'first', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000007', 7, 2, 'first', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000008', 8, 4, 'first', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000009', 9, 6, 'family', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000010', 10, 8, 'family', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000011', 11, 10, 'family', 'available', NULL, '2026-01-17 00:23:08'),
('44444444-0000-0000-0000-000000000012', 12, 12, 'family', 'available', NULL, '2026-01-17 00:23:08');

-- ============================================================
-- DATA: Expenses
-- ============================================================

INSERT INTO `expenses` (`id`, `category`, `description`, `amount`, `expense_date`, `created_by`, `created_at`) VALUES
('9d545f76-42f2-4429-a1b5-5264b4acd28c', 'utilities', 'KE', 1000.00, '2026-01-09', '83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', '2026-01-08 19:39:38'),
('e15a017b-5f63-4214-a90f-261a34b9060b', 'utilities', 'test', 111.00, '2026-01-12', '83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', '2026-01-12 18:33:05'),
('0c4cb6dc-9e54-4d89-aabb-963de616ce7f', 'rent', 'sada', 12.00, '2026-01-12', '83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', '2026-01-12 18:53:13'),
('8e9a3433-96f0-4d2d-b6cf-f877fa20dcaa', 'rent', 'as', 123.00, '2026-01-13', '83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', '2026-01-12 19:06:40'),
('a12c5b80-5e7c-465e-b618-74598a0889ed', 'utilities', 'ke', 123.00, '2026-01-13', '83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', '2026-01-12 19:17:29'),
('06da1605-a958-42ba-8db7-35941983b0de', 'utilities', 'KE', 1000.00, '2026-01-15', '83bd43bf-1de1-4cfc-9342-0d00a3ad35ad', '2026-01-15 01:23:58');

-- ============================================================
-- DATA: Stock Purchases
-- ============================================================

INSERT INTO `stock_purchases` (`id`, `ingredient_id`, `quantity`, `unit_cost`, `total_cost`, `purchase_date`, `created_at`, `created_by`) VALUES
('c83a9e39-499b-41c3-bf60-8391dce2428f', '33de35f5-9185-4295-947b-f4f23849926f', 10.0000, 100.0000, 1000.0000, '2026-01-30', '2026-01-30 00:37:10', NULL),
('a7594cb8-5d38-4ff5-bac1-bfa1ed1ee8f7', '33de35f5-9185-4295-947b-f4f23849926f', 15.0000, 105.0000, 1575.0000, '2026-01-30', '2026-01-30 00:37:35', NULL);

-- ============================================================
-- DATA: Stock Transfers
-- ============================================================

INSERT INTO `stock_transfers` (`id`, `ingredient_id`, `quantity`, `from_location`, `to_location`, `reason`, `created_at`, `created_by`) VALUES
('70e8629b-5941-470e-894a-c5c486d3e669', '33de35f5-9185-4295-947b-f4f23849926f', 10.0000, 'store', 'store', 'Stock received', '2026-01-30 00:37:12', NULL),
('8ea11e1f-d532-4f3a-94b3-be62a0eecb72', '33de35f5-9185-4295-947b-f4f23849926f', 15.0000, 'store', 'store', 'Stock received', '2026-01-30 00:37:37', NULL);

-- ============================================================
-- DATA: Stock Sales
-- ============================================================

INSERT INTO `stock_sales` (`id`, `ingredient_id`, `quantity`, `cost_per_unit`, `sale_price`, `total_cost`, `total_sale`, `profit`, `customer_name`, `notes`, `sold_by`, `sale_date`, `created_at`) VALUES
('01227bfd-441f-4d59-976b-76fb3e000bf0', '33de35f5-9185-4295-947b-f4f23849926f', 1.0000, 103.0000, 120.0000, 103.0000, 120.0000, 17.0000, NULL, NULL, NULL, '2026-01-30', '2026-01-30 01:46:20');

-- ============================================================
-- DATA: Orders
-- ============================================================

INSERT INTO `orders` (`id`, `order_number`, `order_type`, `status`, `subtotal`, `tax`, `discount`, `discount_type`, `discount_value`, `discount_reason`, `total`, `payment_method`, `customer_name`, `table_id`, `table_number`, `waiter_id`, `waiter_name`, `created_at`, `completed_at`, `created_by`) VALUES
('210b3ea8-730f-49f8-b42d-313890330ebe', 'ORD-ML07Y7KX', 'dine-in', 'completed', 1150.00, 184.00, 0.00, 'fixed', 0.00, NULL, 1334.00, 'cash', NULL, '44444444-0000-0000-0000-000000000002', 2, '55555555-0000-0000-0000-000000000004', 'Farhan Malik', '2026-01-30 01:43:12', '2026-01-30 01:43:31', NULL),
('a6a5ff0a-3e3d-468d-b58b-b0d5ee77262a', 'ORD-ML08028I', 'takeaway', 'completed', 1499.00, 0.00, 0.00, 'fixed', 0.00, NULL, 1499.00, 'cash', NULL, NULL, NULL, NULL, NULL, '2026-01-30 01:44:38', '2026-01-30 01:44:50', NULL),
('30c3be16-3b4b-48ac-8edf-ace9455409be', 'ORD-ML07SOPB', 'dine-in', 'completed', 850.00, 136.00, 0.00, 'fixed', 0.00, NULL, 986.00, 'cash', NULL, '44444444-0000-0000-0000-000000000001', 1, '55555555-0000-0000-0000-000000000002', 'Bilal Hussain', '2026-01-30 01:38:54', '2026-01-30 01:39:00', NULL),
('abc78651-abb1-427d-a3dd-c48af4a1ddcf', 'ORD-ML07TSK0', 'online', 'cancelled', 550.00, 88.00, 55.00, 'percentage', 10.00, 'Testing', 583.00, 'cash', NULL, NULL, NULL, NULL, NULL, '2026-01-30 01:39:46', NULL, NULL),
('d1ace0bd-bee5-47b8-afb4-66dac40b220c', 'ORD-ML07UX6V', 'online', 'completed', 1400.00, 224.00, 0.00, 'fixed', 0.00, NULL, 1624.00, 'cash', NULL, NULL, NULL, NULL, NULL, '2026-01-30 01:40:38', '2026-01-30 01:40:54', NULL),
('3d475c73-632b-4653-9634-66fed11f626d', 'ORD-ML07UJCI', 'online', 'completed', 1400.00, 224.00, 0.00, 'fixed', 0.00, NULL, 1624.00, 'cash', NULL, NULL, NULL, NULL, NULL, '2026-01-30 01:40:21', '2026-01-30 01:42:43', NULL),
('e857e4a7-aba8-4ea3-b020-c4cd19ca411c', 'ORD-ML07UPTW', 'online', 'cancelled', 1400.00, 224.00, 0.00, 'fixed', 0.00, NULL, 1624.00, 'cash', NULL, NULL, NULL, NULL, NULL, '2026-01-30 01:40:29', NULL, NULL),
('6cd95036-ab7c-4578-b48a-5284877a7347', 'ORD-MM6HSXTD', 'online', 'cancelled', 500.00, 0.00, 0.00, 'fixed', 0.00, NULL, 500.00, 'cash', NULL, NULL, NULL, NULL, NULL, '2026-02-28 15:45:22', NULL, NULL),
('8e1f6ed0-911f-431c-a35e-ae2896faaec9', 'ORD-MM6ROS6S', 'dine-in', 'completed', 4800.00, 0.00, 0.00, 'fixed', 0.00, NULL, 4800.00, 'cash', NULL, '44444444-0000-0000-0000-000000000001', 1, '55555555-0000-0000-0000-000000000002', 'Bilal Hussain', '2026-02-28 20:22:07', '2026-02-28 20:31:55', NULL),
('b5079034-27d9-47ce-bfcd-6e40ced2f0c8', 'ORD-MM6S1X2D', 'dine-in', 'completed', 1499.00, 0.00, 0.00, 'fixed', 0.00, NULL, 1499.00, 'cash', NULL, '44444444-0000-0000-0000-000000000002', 2, '55555555-0000-0000-0000-000000000004', 'Farhan Malik', '2026-02-28 20:32:17', '2026-02-28 20:32:21', NULL),
('260920b5-3769-4a9f-a231-8cee176c498f', 'ORD-MM6SLWEV', 'dine-in', 'completed', 190.00, 0.00, 0.00, 'fixed', 0.00, NULL, 190.00, 'cash', NULL, '44444444-0000-0000-0000-000000000003', 3, '55555555-0000-0000-0000-000000000001', 'Ahmed Khan', '2026-02-28 20:47:49', '2026-02-28 20:47:56', NULL),
('3d2843e6-db8d-40d4-b9a3-d2c2dbbed264', 'ORD-MM6TGBHD', 'dine-in', 'completed', 250.00, 0.00, 0.00, 'fixed', 0.00, NULL, 250.00, 'cash', NULL, '44444444-0000-0000-0000-000000000001', 1, '55555555-0000-0000-0000-000000000001', 'Ahmed Khan', '2026-02-28 21:01:53', '2026-02-28 21:01:57', NULL),
('c222df7a-afd4-4808-8009-0dd38a66ecf0', 'ORD-MM7YP3WC', 'dine-in', 'completed', 190.00, 0.00, 0.00, 'fixed', 0.00, NULL, 190.00, 'cash', NULL, '44444444-0000-0000-0000-000000000001', 1, '55555555-0000-0000-0000-000000000001', 'Ahmed Khan', '2026-03-02 20:23:41', '2026-03-02 20:23:47', NULL),
('ddbf87e4-92bf-48da-b266-f1c0a8ab73be', 'ORD-MM85VEZ8', 'dine-in', 'completed', 3849.00, 0.00, 0.00, 'fixed', 0.00, NULL, 3849.00, 'cash', NULL, '44444444-0000-0000-0000-000000000001', 1, '55555555-0000-0000-0000-000000000001', 'Ahmed Khan', '2026-03-03 00:52:47', '2026-03-03 00:53:02', NULL),
('dd8fdc0f-bc7c-4371-8bf3-7645fa551afc', 'ORD-MM85XKZP', 'dine-in', 'completed', 1280.00, 0.00, 0.00, 'fixed', 0.00, NULL, 1280.00, 'cash', NULL, '44444444-0000-0000-0000-000000000002', 2, '55555555-0000-0000-0000-000000000002', 'Bilal Hussain', '2026-03-03 00:58:24', '2026-03-03 00:58:33', NULL);

-- ============================================================
-- DATA: Order Items
-- ============================================================

INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `menu_item_name`, `quantity`, `unit_price`, `total`, `notes`, `variant_id`, `variant_name`, `created_at`) VALUES
('9869de32-1e67-4e2d-b107-7d79cd0d975e', '260920b5-3769-4a9f-a231-8cee176c498f', 'fccb4440-2061-4a62-b6db-17484393c399', '1 Litre Cold Drink', 1, 190.00, 190.00, NULL, NULL, NULL, '2026-02-28 20:47:49'),
('669214b3-0b90-42e3-b6d7-6e7b2e3301e5', 'c222df7a-afd4-4808-8009-0dd38a66ecf0', 'fccb4440-2061-4a62-b6db-17484393c399', '1 Litre Cold Drink', 1, 190.00, 190.00, NULL, NULL, NULL, '2026-03-02 20:23:41'),
('5ee092fb-f74c-4660-9dc6-197df7bb2bd7', '3d2843e6-db8d-40d4-b9a3-d2c2dbbed264', 'd7992f70-fd88-4243-af02-4b045a9a8600', '1.5 Litre Cold Drink', 1, 250.00, 250.00, NULL, NULL, NULL, '2026-02-28 21:01:53'),
('1162478b-03a0-420b-8896-6968cdd51771', 'a6a5ff0a-3e3d-468d-b58b-b0d5ee77262a', '7086ec1c-3877-4d8c-85e9-f4141a60c902', '1 Person Mandi', 1, 1499.00, 1499.00, NULL, NULL, NULL, '2026-01-30 01:44:38'),
('9a405ce1-b30c-4d08-9b7f-254d5873cc1a', 'b5079034-27d9-47ce-bfcd-6e40ced2f0c8', '7086ec1c-3877-4d8c-85e9-f4141a60c902', '1 Person Mandi', 1, 1499.00, 1499.00, NULL, NULL, NULL, '2026-02-28 20:39:54'),
('342c2dc7-1a5c-4522-abf5-1d274c1a4ea1', 'ddbf87e4-92bf-48da-b266-f1c0a8ab73be', '2455e468-bc80-47f8-85ed-2df8194b3bd5', '2 Person Mandi', 1, 2999.00, 2999.00, NULL, NULL, NULL, '2026-03-03 00:52:47'),
('a085d352-9b70-402c-b9a2-31fa87739fb7', 'ddbf87e4-92bf-48da-b266-f1c0a8ab73be', '9196f194-b522-4e86-b082-f59c63e4fd38', 'Garlic Naan', 2, 70.00, 140.00, NULL, NULL, NULL, '2026-03-03 00:52:47'),
('8c15efdf-37ec-4fd0-a531-ca4798af3133', 'ddbf87e4-92bf-48da-b266-f1c0a8ab73be', '9b2d9f93-ec79-4643-9883-d569ab9d8e2f', 'Chapati', 2, 30.00, 60.00, NULL, NULL, NULL, '2026-03-03 00:52:47'),
('0e4fda73-c9e3-4307-ba07-c9d1ccf981ae', 'ddbf87e4-92bf-48da-b266-f1c0a8ab73be', '3e01ebbf-4b4d-4aea-9c8d-c29f88e8344b', 'Chicken Tikka (Leg)', 1, 400.00, 400.00, NULL, NULL, NULL, '2026-03-03 00:52:47'),
('5af2ff49-ba9a-4b40-a6b5-fa6a0c720524', 'ddbf87e4-92bf-48da-b266-f1c0a8ab73be', '2ad04847-009e-4328-bb37-edae6da7b4cc', 'Large Water', 1, 110.00, 110.00, NULL, NULL, NULL, '2026-03-03 00:52:47'),
('13d83f12-39df-4b42-91b0-e48477c92bb3', 'ddbf87e4-92bf-48da-b266-f1c0a8ab73be', '3f6625eb-6d8d-4b64-a7c9-395dd2f3e49a', 'Raita Zeera', 1, 140.00, 140.00, NULL, NULL, NULL, '2026-03-03 00:52:47'),
('7d983023-13f8-48a0-a65c-d8bc47955f32', 'dd8fdc0f-bc7c-4371-8bf3-7645fa551afc', '16fbf748-52f0-4520-88ae-7a4e399868d9', 'Masala Broast (Chest)', 1, 580.00, 580.00, NULL, NULL, NULL, '2026-03-03 00:58:24'),
('ef1b3d0c-3b46-43fd-b607-5ff3efe2b362', 'dd8fdc0f-bc7c-4371-8bf3-7645fa551afc', 'e4687091-f9fd-4660-9d1c-928bbf795a04', 'Arabic Traditional Pizza (Medium)', 1, 700.00, 700.00, NULL, 'b2d7eebb-2f83-4cce-8804-997481b9093d', 'Medium', '2026-03-03 00:58:24'),
('bbb241ee-16bd-4ffc-bcc3-39294c334379', '30c3be16-3b4b-48ac-8edf-ace9455409be', '35d51fc9-3236-4f40-94e6-86584f9c50e2', 'Cheese Lover Pizza', 1, 400.00, 400.00, NULL, NULL, NULL, '2026-01-30 01:38:54'),
('81f880e2-120c-4adf-aa96-9d85bcfb0e5d', 'abc78651-abb1-427d-a3dd-c48af4a1ddcf', 'dc6687cb-b312-41e6-aa3c-2bf3191f3a1f', 'Pizza Paratha', 1, 550.00, 550.00, NULL, NULL, NULL, '2026-01-30 01:39:46'),
('1c526345-ec31-4825-8c68-4c2b76232774', '8e1f6ed0-911f-431c-a35e-ae2896faaec9', '2afcec97-154a-45b1-98f5-e7d00099507a', 'Dumba Arabic Sp. Zaitoon Karahi', 1, 2000.00, 2000.00, NULL, NULL, NULL, '2026-02-28 20:31:51'),
('54b3e58e-dab3-4aa7-957e-66c24b4e3dd3', '8e1f6ed0-911f-431c-a35e-ae2896faaec9', '2455e468-bc80-47f8-85ed-2df8194b3bd5', '2 Person Mandi', 1, 2999.00, 2800.00, NULL, NULL, NULL, '2026-02-28 20:22:07'),
('a1d2e3f4-0000-0000-0000-000000000001', '30c3be16-3b4b-48ac-8edf-ace9455409be', '35d51fc9-3236-4f40-94e6-86584f9c50e2', 'Cheese Lover Pizza', 1, 450.00, 450.00, NULL, NULL, NULL, '2026-01-30 01:38:54'),
('a1d2e3f4-0000-0000-0000-000000000002', '210b3ea8-730f-49f8-b42d-313890330ebe', '35d51fc9-3236-4f40-94e6-86584f9c50e2', 'Cheese Lover Pizza', 1, 400.00, 400.00, NULL, NULL, NULL, '2026-01-30 01:43:12'),
('a1d2e3f4-0000-0000-0000-000000000003', '210b3ea8-730f-49f8-b42d-313890330ebe', 'dc6687cb-b312-41e6-aa3c-2bf3191f3a1f', 'Pizza Paratha', 1, 550.00, 550.00, NULL, NULL, NULL, '2026-01-30 01:43:12'),
('a1d2e3f4-0000-0000-0000-000000000004', '210b3ea8-730f-49f8-b42d-313890330ebe', 'fccb4440-2061-4a62-b6db-17484393c399', '1 Litre Cold Drink', 1, 200.00, 200.00, NULL, NULL, NULL, '2026-01-30 01:43:12'),
('a1d2e3f4-0000-0000-0000-000000000005', 'd1ace0bd-bee5-47b8-afb4-66dac40b220c', '7086ec1c-3877-4d8c-85e9-f4141a60c902', '1 Person Mandi', 1, 1400.00, 1400.00, NULL, NULL, NULL, '2026-01-30 01:40:38'),
('a1d2e3f4-0000-0000-0000-000000000006', '3d475c73-632b-4653-9634-66fed11f626d', '7086ec1c-3877-4d8c-85e9-f4141a60c902', '1 Person Mandi', 1, 1400.00, 1400.00, NULL, NULL, NULL, '2026-01-30 01:40:21'),
('a1d2e3f4-0000-0000-0000-000000000007', 'e857e4a7-aba8-4ea3-b020-c4cd19ca411c', '7086ec1c-3877-4d8c-85e9-f4141a60c902', '1 Person Mandi', 1, 1400.00, 1400.00, NULL, NULL, NULL, '2026-01-30 01:40:29'),
('a1d2e3f4-0000-0000-0000-000000000008', '6cd95036-ab7c-4578-b48a-5284877a7347', '35d51fc9-3236-4f40-94e6-86584f9c50e2', 'Cheese Lover Pizza', 1, 500.00, 500.00, NULL, NULL, NULL, '2026-02-28 15:45:22');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- NOTE: Ingredients and Menu data are very large.
-- See the JSON export files for complete data.
-- The menu_categories, menu_items, menu_item_variants,
-- and ingredients data are exported separately.
-- ============================================================
