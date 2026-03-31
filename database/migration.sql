CREATE DATABASE IF NOT EXISTS `sticky`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sticky`;

CREATE TABLE IF NOT EXISTS `boards` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` CHAR(6) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `created_at` VARCHAR(35) NOT NULL,
  `updated_at` VARCHAR(35) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_boards_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` BIGINT UNSIGNED NOT NULL,
  `author` VARCHAR(60) NOT NULL,
  `content` TEXT NOT NULL,
  `color` VARCHAR(20) NOT NULL DEFAULT 'yellow',
  `font_family` VARCHAR(20) NOT NULL DEFAULT 'comic',
  `font_size` INT NOT NULL DEFAULT 22,
  `is_bold` TINYINT(1) NOT NULL DEFAULT 0,
  `is_italic` TINYINT(1) NOT NULL DEFAULT 0,
  `is_underline` TINYINT(1) NOT NULL DEFAULT 0,
  `pos_x` INT NOT NULL DEFAULT 48,
  `pos_y` INT NOT NULL DEFAULT 48,
  `z_index` INT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(35) NOT NULL,
  `updated_at` VARCHAR(35) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notes_board_id` (`board_id`),
  CONSTRAINT `fk_notes_board`
    FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
