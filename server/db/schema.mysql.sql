CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','librarian','member') NOT NULL DEFAULT 'member',
  status ENUM('pending','active','suspended') NOT NULL DEFAULT 'active',
  department VARCHAR(120) NOT NULL DEFAULT 'General Studies',
  member_id VARCHAR(40) UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resources (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  authors JSON NOT NULL,
  isbn VARCHAR(32) NOT NULL DEFAULT '',
  issn VARCHAR(32) NOT NULL DEFAULT '',
  publisher VARCHAR(160) NOT NULL DEFAULT '',
  publication_year SMALLINT NOT NULL DEFAULT 2020,
  edition VARCHAR(60) NOT NULL DEFAULT '1st ed.',
  language VARCHAR(40) NOT NULL DEFAULT 'English',
  format ENUM('physical','ebook','research_paper','audio_video') NOT NULL DEFAULT 'physical',
  category VARCHAR(80) NOT NULL DEFAULT 'General',
  department VARCHAR(120) NOT NULL DEFAULT 'General Studies',
  description TEXT NOT NULL,
  abstract TEXT NOT NULL,
  shelf_location VARCHAR(40) NOT NULL DEFAULT '',
  total_copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1,
  file_url VARCHAR(500) NOT NULL DEFAULT '',
  file_type VARCHAR(20) NOT NULL DEFAULT '',
  license_info VARCHAR(255) NOT NULL DEFAULT '',
  page_count INT NOT NULL DEFAULT 0,
  pages_json JSON NOT NULL,
  cover_url VARCHAR(500) NOT NULL DEFAULT '',
  tags JSON NOT NULL,
  views INT NOT NULL DEFAULT 0,
  borrows INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_resources_filter (format, category, language, publication_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS loans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at DATETIME NOT NULL,
  returned_at DATETIME NULL,
  renewed_count INT NOT NULL DEFAULT 0,
  status ENUM('active','returned','overdue','lost') NOT NULL DEFAULT 'active',
  fine_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  fine_waived DECIMAL(8,2) NOT NULL DEFAULT 0,
  digital_expires_at DATETIME NULL,
  INDEX idx_loans_user (user_id, status),
  INDEX idx_loans_resource (resource_id, status),
  INDEX idx_loans_due (due_at),
  CONSTRAINT fk_loans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_loans_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reservations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  reserved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending','approved','fulfilled','cancelled') NOT NULL DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  expires_at DATETIME NULL,
  INDEX idx_reservations_user (user_id, status),
  CONSTRAINT fk_res_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_res_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bookmark (user_id, resource_id),
  INDEX idx_bookmarks_user (user_id),
  CONSTRAINT fk_bm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bm_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resource_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(160) NOT NULL DEFAULT '',
  note TEXT NOT NULL,
  status ENUM('pending','approved','declined') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fine_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  loan_id BIGINT UNSIGNED NULL,
  amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  method VARCHAR(40) NOT NULL DEFAULT 'cash',
  CONSTRAINT fk_fp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40) NOT NULL DEFAULT '',
  target_id BIGINT UNSIGNED NULL,
  detail JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
