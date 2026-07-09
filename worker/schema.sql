-- AeroMail Production Relational Schema
-- Optimized for Cloudflare D1
-- 1. Identity & Profile
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT
);
-- 2. Message Threads (Conversation Metadata)
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  last_message_at INTEGER NOT NULL,
  snippet TEXT,
  unread_count INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  folder TEXT NOT NULL
);
-- 3. Individual Emails
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_json TEXT NOT NULL, -- JSON formatted recipient list
  subject TEXT NOT NULL,
  body TEXT NOT NULL,    -- Using TEXT for unlimited MIME body storage
  snippet TEXT,
  timestamp INTEGER NOT NULL,
  is_read INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  folder TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);
-- 4. Multi-Domain Infrastructure
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
-- 5. Global Indices for High-Performance Reads
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder_ts ON emails(folder, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_threads_folder_ts ON threads(folder, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_starred ON emails(is_starred) WHERE is_starred = 1;