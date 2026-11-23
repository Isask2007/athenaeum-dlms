PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','librarian','member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','suspended')),
  department TEXT NOT NULL DEFAULT 'General Studies',
  member_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  authors TEXT NOT NULL DEFAULT '[]',
  isbn TEXT NOT NULL DEFAULT '',
  issn TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '',
  publication_year INTEGER NOT NULL DEFAULT 2020,
  edition TEXT NOT NULL DEFAULT '1st ed.',
  language TEXT NOT NULL DEFAULT 'English',
  format TEXT NOT NULL DEFAULT 'physical' CHECK (format IN ('physical','ebook','research_paper','audio_video')),
  category TEXT NOT NULL DEFAULT 'General',
  department TEXT NOT NULL DEFAULT 'General Studies',
  description TEXT NOT NULL DEFAULT '',
  abstract TEXT NOT NULL DEFAULT '',
  shelf_location TEXT NOT NULL DEFAULT '',
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  license_info TEXT NOT NULL DEFAULT '',
  page_count INTEGER NOT NULL DEFAULT 0,
  pages_json TEXT NOT NULL DEFAULT '[]',
  cover_url TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  views INTEGER NOT NULL DEFAULT 0,
  borrows INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  due_at TEXT NOT NULL,
  returned_at TEXT,
  renewed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','returned','overdue','lost')),
  fine_amount REAL NOT NULL DEFAULT 0,
  fine_waived REAL NOT NULL DEFAULT 0,
  digital_expires_at TEXT
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  reserved_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','fulfilled','cancelled')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS resource_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fine_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_id INTEGER REFERENCES loans(id) ON DELETE SET NULL,
  amount REAL NOT NULL DEFAULT 0,
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  method TEXT NOT NULL DEFAULT 'cash'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id INTEGER,
  detail TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_resources_filter ON resources(format, category, language, publication_year);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_resource ON loans(resource_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_due ON loans(due_at);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
