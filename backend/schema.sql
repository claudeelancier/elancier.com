-- Luckyverse MySQL schema (Laravel migrations should mirror these tables)

CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE prizes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  type VARCHAR(40) NOT NULL,
  value INT NOT NULL DEFAULT 0,
  image VARCHAR(255) NULL,
  quantity INT NOT NULL DEFAULT 0,
  remaining_quantity INT NOT NULL DEFAULT 0,
  weight INT NOT NULL DEFAULT 0,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE spins (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  prize_id BIGINT UNSIGNED NULL,
  result VARCHAR(40) NOT NULL,
  wheel_index TINYINT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (prize_id) REFERENCES prizes(id)
);

CREATE TABLE rewards (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  spin_id BIGINT UNSIGNED NULL,
  prize_id BIGINT UNSIGNED NOT NULL,
  status ENUM('available','processing','claimed','expired') NOT NULL DEFAULT 'available',
  claimed_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE lucky_draws (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  prize_id BIGINT UNSIGNED NULL,
  start_at DATETIME NOT NULL,
  status ENUM('draft','scheduled','live','published','closed') NOT NULL DEFAULT 'draft',
  winner_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL
);

CREATE TABLE draw_entries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  draw_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  entry_code VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NULL
);

CREATE TABLE draw_winners (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  draw_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  prize_id BIGINT UNSIGNED NULL,
  position INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL
);

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(160) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NULL
);
