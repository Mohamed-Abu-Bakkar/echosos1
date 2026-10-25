-- EchoSOS MySQL Schema DDL
-- Generated for MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `echosos_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `echosos_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Beacons Table
CREATE TABLE IF NOT EXISTS `beacons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `mac_address` VARCHAR(50) NOT NULL UNIQUE,
  `device_name` VARCHAR(100) NOT NULL DEFAULT 'ESP32-S3',
  `signal_dbm` INT NOT NULL DEFAULT -45,
  `status` ENUM('CONNECTED', 'READY_TO_PAIR', 'DISCONNECTED') DEFAULT 'CONNECTED',
  `battery_percent` INT NOT NULL DEFAULT 88,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Emergency Contacts Table
CREATE TABLE IF NOT EXISTS `emergency_contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `relationship` VARCHAR(50) NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT FALSE,
  `photo_url` VARCHAR(500) NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Alert History Table
CREATE TABLE IF NOT EXISTS `alert_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `beacon_id` INT NULL,
  `event_type` ENUM('SOS_ALERT', 'CONTACT_DELIVERED', 'BEACON_CONNECTED', 'SYSTEM_UPDATE', 'LOW_BATTERY') NOT NULL,
  `status_badge` VARCHAR(50) NOT NULL,
  `latitude` DECIMAL(10, 7) NULL,
  `longitude` DECIMAL(10, 7) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`beacon_id`) REFERENCES `beacons`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` ENUM('SOS', 'SYSTEM', 'UPDATES') NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed Data
INSERT INTO `users` (`id`, `name`, `phone`, `password_hash`) VALUES
(1, 'Nithish', '+91 98765 43210', '$2b$10$w8T0U1yN7a5k5dZ6...') ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

INSERT INTO `beacons` (`id`, `user_id`, `mac_address`, `device_name`, `signal_dbm`, `status`, `battery_percent`) VALUES
(1, 1, 'C7:3A:5B:12:4E:9F', 'ESP32-S3', -45, 'CONNECTED', 88) ON DUPLICATE KEY UPDATE `status`=VALUES(`status`);

INSERT INTO `emergency_contacts` (`id`, `user_id`, `name`, `phone`, `relationship`, `is_primary`) VALUES
(1, 1, 'Mother (MS)', '+91 98765 11111', 'Mother', TRUE),
(2, 1, 'Father (FS)', '+91 98765 22222', 'Father', FALSE),
(3, 1, 'Police Station (AP)', '112', 'Emergency Services', FALSE) ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

INSERT INTO `alert_history` (`id`, `user_id`, `beacon_id`, `event_type`, `status_badge`, `latitude`, `longitude`, `created_at`) VALUES
(1, 1, 1, 'SOS_ALERT', 'Alert Sent', 10.8247000, 78.6956000, '2025-04-28 10:24:00'),
(2, 1, 1, 'CONTACT_DELIVERED', 'Delivered', 10.8247000, 78.6956000, '2025-04-28 10:24:30'),
(3, 1, 1, 'BEACON_CONNECTED', 'Connected', 10.8247000, 78.6956000, '2025-04-28 09:15:00'),
(4, 1, 1, 'SYSTEM_UPDATE', 'Updated', NULL, NULL, '2025-04-27 18:30:00'),
(5, 1, 1, 'LOW_BATTERY', 'Warning', 10.8210000, 78.6910000, '2025-04-26 14:10:00');

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `is_read`, `created_at`) VALUES
(1, 1, 'SOS', 'Emergency Alert Triggered', 'SOS signal dispatched to 3 emergency contacts and police.', FALSE, '2025-04-28 10:24:00'),
(2, 1, 'SOS', 'Dispatch Delivered to Mother', 'Location coordinates delivered via SMS and push alert.', FALSE, '2025-04-28 10:24:30'),
(3, 1, 'SYSTEM', 'ESP32-S3 Beacon Connected', 'Bluetooth Low Energy connection established successfully.', TRUE, '2025-04-28 09:15:00'),
(4, 1, 'UPDATES', 'Firmware v2.4 Available', 'Security and battery optimization update for ESP32 beacon.', TRUE, '2025-04-27 15:00:00'),
(5, 1, 'SYSTEM', 'Beacon Battery Low (18%)', 'Please recharge your EchoSOS beacon soon to maintain uptime.', TRUE, '2025-04-26 14:10:00');
