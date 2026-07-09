-- AeroMail Production Schema for Cloudflare D1
-- Initializing core tables for the relational email architecture
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT
);
-- 2. Threads Table (Aggregated conversation metadata)
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  last_message_at INTEGER NOT NULL,
  snippet TEXT,
  unread_count INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  folder TEXT NOT NULL
);
-- 3. Emails Table (Individual messages)
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_json TEXT NOT NULL, -- JSON array of recipients
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  snippet TEXT,
  timestamp INTEGER NOT NULL,
  is_read INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  folder TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);
-- 4. Infrastructure Management
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  domain_name TEXT UNIQUE NOT NULL,
  dkim_selector TEXT,
  dkim_private_key TEXT,
  is_active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_domains (
  user_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  PRIMARY KEY (user_id, domain_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);
-- 5. Performance Indices
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder_ts ON emails(folder, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_threads_folder_ts ON threads(folder, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_starred ON emails(is_starred) WHERE is_starred = 1;