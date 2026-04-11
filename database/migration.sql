CREATE DATABASE IF NOT EXISTS `sticky`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sticky`;

CREATE TABLE IF NOT EXISTS `boards` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` CHAR(6) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `supervised_mode` TINYINT(1) NOT NULL DEFAULT 0,
  `teacher_pin_hash` VARCHAR(255) DEFAULT NULL,
  `teacher_token_hash` VARCHAR(255) DEFAULT NULL,
  `teacher_client_id` VARCHAR(64) DEFAULT NULL,
  `allow_only_own_move` TINYINT(1) NOT NULL DEFAULT 0,
  `allow_only_own_delete` TINYINT(1) NOT NULL DEFAULT 0,
  `allow_only_own_edit` TINYINT(1) NOT NULL DEFAULT 0,
  `allow_viewer_create_notes` TINYINT(1) NOT NULL DEFAULT 1,
  `likes_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `max_notes_per_user` INT NOT NULL DEFAULT 0,
  `max_board_columns` INT NOT NULL DEFAULT 20,
  `max_board_rows` INT NOT NULL DEFAULT 10,
  `line_columns` INT NOT NULL DEFAULT 0,
  `line_rows` INT NOT NULL DEFAULT 0,
  `kick_block_minutes` INT NOT NULL DEFAULT 15,
  `created_at` VARCHAR(35) NOT NULL,
  `updated_at` VARCHAR(35) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_boards_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` BIGINT UNSIGNED NOT NULL,
  `owner_client_id` VARCHAR(64) NOT NULL,
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

CREATE TABLE IF NOT EXISTS `board_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` BIGINT UNSIGNED NOT NULL,
  `client_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(60) NOT NULL,
  `is_teacher` TINYINT(1) NOT NULL DEFAULT 0,
  `joined_at` VARCHAR(35) NOT NULL,
  `last_seen` VARCHAR(35) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_board_members_board_client` (`board_id`, `client_id`),
  KEY `idx_board_members_board_id` (`board_id`),
  CONSTRAINT `fk_board_members_board`
    FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `note_likes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` BIGINT UNSIGNED NOT NULL,
  `note_id` BIGINT UNSIGNED NOT NULL,
  `client_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(60) NOT NULL,
  `created_at` VARCHAR(35) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_note_likes_note_client` (`note_id`, `client_id`),
  KEY `idx_note_likes_board_id` (`board_id`),
  KEY `idx_note_likes_note_id` (`note_id`),
  CONSTRAINT `fk_note_likes_board`
    FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_note_likes_note`
    FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `board_labels` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` BIGINT UNSIGNED NOT NULL,
  `owner_client_id` VARCHAR(64) NOT NULL,
  `author` VARCHAR(60) NOT NULL,
  `text` VARCHAR(180) NOT NULL,
  `font_size` INT NOT NULL DEFAULT 26,
  `pos_x` INT NOT NULL DEFAULT 48,
  `pos_y` INT NOT NULL DEFAULT 48,
  `z_index` INT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(35) NOT NULL,
  `updated_at` VARCHAR(35) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_board_labels_board_id` (`board_id`),
  CONSTRAINT `fk_board_labels_board`
    FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `board_bans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` BIGINT UNSIGNED NOT NULL,
  `client_id` VARCHAR(64) NOT NULL,
  `banned_until` VARCHAR(35) NOT NULL,
  `created_at` VARCHAR(35) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_board_bans_board_client` (`board_id`, `client_id`),
  KEY `idx_board_bans_board_id` (`board_id`),
  CONSTRAINT `fk_board_bans_board`
    FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
