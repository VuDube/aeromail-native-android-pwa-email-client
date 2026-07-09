import { Hono } from "hono";
import { ok, bad, notFound } from './core-utils';
import { FolderType, Email, EmailThread, User } from "@shared/types";
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
export interface Env {
  EMAIL_DB?: D1Database; // Made optional for fallback check
  TOKENS: KVNamespace;
}
const SIMULATED_SENDERS = [
  { name: "GitHub", email: "noreply@github.com" },
  { name: "Stripe", email: "support@stripe.com" },
  { name: "Figma Team", email: "notifications@figma.com" },
  { name: "Linear", email: "updates@linear.app" },
  { name: "Discord", email: "no-reply@discord.com" }
];
const SIMULATED_SUBJECTS = [
  "New sign-in to your account",
  "Your weekly activity report is ready",
  "Invoice for your latest subscription",
  "You were mentioned in a comment",
  "Action required: Verify your email address"
];
const SIMULATED_BODIES = [
  "We detected a new sign-in to your AeroMail account from a new device. If this wasn't you, please secure your account immediately.",
  "Here is a summary of your team's progress this week. You've completed 24 tasks and have 5 new notifications pending.",
  "Your payment of $29.00 was successful. You can download your invoice from your billing dashboard at any time.",
  "Hey! I just replied to your thread regarding the Phase 13 deployment. Let me know what you think about the container strategy.",
  "Please click the button below to verify your email address and finish setting up your account."
];
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Helper to check if DB is available
  const getDB = (c: any) => c.env.EMAIL_DB;
  app.get('/api/status', (c) => {
    const db = getDB(c);
    return ok(c, {
      mode: db ? 'production' : 'mock',
      storage: db ? 'Cloudflare D1' : 'In-Memory Fallback',
      healthy: true
    });
  });
  app.get('/api/init', async (c) => {
    const db = getDB(c);
    if (!db) return ok(c, { initialized: true, message: "Running in Mock Mode (No D1 Binding Found)" });
    try {
      const check = await db.prepare("SELECT COUNT(*) as count FROM users").first<{count: number}>();
      if (check && check.count > 0) return ok(c, { initialized: true, message: "Already seeded" });
      const statements = [];
      for (const u of MOCK_USERS) {
        statements.push(db.prepare("INSERT INTO users (id, name, email, avatar_url) VALUES (?, ?, ?, ?)").bind(u.id, u.name, u.email, u.avatarUrl || null));
      }
      for (const e of MOCK_EMAILS) {
        statements.push(db.prepare("INSERT OR IGNORE INTO threads (id, subject, last_message_at, snippet, unread_count, is_starred, folder) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(e.threadId, e.subject, e.timestamp, e.snippet, e.isRead ? 0 : 1, e.isStarred ? 1 : 0, e.folder));
        statements.push(db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, is_read, is_starred, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(e.id, e.threadId, e.from.name, e.from.email, JSON.stringify(e.to), e.subject, e.body, e.snippet, e.timestamp, e.isRead ? 1 : 0, e.isStarred ? 1 : 0, e.folder));
      }
      await db.batch(statements);
      return ok(c, { initialized: true });
    } catch (e) {
      return bad(c, 'Failed to initialize: ' + String(e));
    }
  });
  app.post('/api/init/reset', async (c) => {
    const db = getDB(c);
    if (!db) return bad(c, 'Reset failed: Database binding missing (Read-Only Mock Mode)');
    try {
      await db.batch([
        db.prepare("DELETE FROM emails"),
        db.prepare("DELETE FROM threads"),
        db.prepare("DELETE FROM users"),
        db.prepare("DELETE FROM domains"),
        db.prepare("DELETE FROM user_domains")
      ]);
      return ok(c, { reset: true });
    } catch (e) {
      return bad(c, 'Reset failed: ' + String(e));
    }
  });
  app.post('/api/simulate/inbound', async (c) => {
    const db = getDB(c);
    if (!db) return bad(c, 'Simulation failed: Database binding missing (Read-Only Mock Mode)');
    try {
      const sender = SIMULATED_SENDERS[Math.floor(Math.random() * SIMULATED_SENDERS.length)];
      const subject = SIMULATED_SUBJECTS[Math.floor(Math.random() * SIMULATED_SUBJECTS.length)];
      const body = SIMULATED_BODIES[Math.floor(Math.random() * SIMULATED_BODIES.length)];
      const emailId = crypto.randomUUID();
      const threadId = crypto.randomUUID();
      const timestamp = Date.now();
      const snippet = body.slice(0, 100);
      await db.batch([
        db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, is_starred, folder) VALUES (?, ?, ?, ?, 1, 0, 'inbox')").bind(threadId, subject, timestamp, snippet),
        db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, is_read, is_starred, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'inbox')").bind(emailId, threadId, sender.name, sender.email, JSON.stringify([{ email: "user@aeromail.dev" }]), subject, body, snippet, timestamp)
      ]);
      return ok(c, { id: emailId, threadId });
    } catch (e) {
      return bad(c, 'Simulation failed: ' + String(e));
    }
  });
  app.get('/api/emails', async (c) => {
    const db = getDB(c);
    const folder = (c.req.query('folder') as FolderType) || 'inbox';
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
    if (!db) {
      // Mock Fallback Logic
      const filtered = MOCK_EMAILS.filter(e => e.folder === folder || (folder === 'starred' && e.isStarred));
      const threads: EmailThread[] = filtered.map(e => ({
        id: e.threadId,
        subject: e.subject,
        lastMessageAt: e.timestamp,
        snippet: e.snippet,
        unreadCount: e.isRead ? 0 : 1,
        isStarred: e.isStarred,
        folder: e.folder,
        participantNames: [e.from.name],
        messages: [e]
      }));
      return ok(c, threads);
    }
    try {
      const { results } = await db.prepare(
        "SELECT * FROM threads WHERE folder = ? OR (? = 'starred' AND is_starred = 1) ORDER BY last_message_at DESC LIMIT ?"
      ).bind(folder, folder, limit).all<any>();
      const threads: EmailThread[] = await Promise.all(results.map(async (t) => {
        const { results: messages } = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(t.id).all<any>();
        return {
          id: t.id,
          subject: t.subject,
          lastMessageAt: t.last_message_at,
          snippet: t.snippet,
          unreadCount: t.unread_count,
          isStarred: !!t.is_starred,
          folder: t.folder as FolderType,
          participantNames: Array.from(new Set(messages.map(m => m.from_name))),
          messages: messages.map(m => ({
            id: m.id,
            threadId: m.thread_id,
            from: { name: m.from_name, email: m.from_email },
            to: JSON.parse(m.to_json),
            subject: m.subject,
            body: m.body,
            snippet: m.snippet,
            timestamp: m.timestamp,
            isRead: !!m.is_read,
            isStarred: !!m.is_starred,
            folder: m.folder as FolderType
          }))
        };
      }));
      return ok(c, threads);
    } catch (e) {
      return bad(c, 'Failed to fetch mailbox');
    }
  });
  app.get('/api/emails/:id', async (c) => {
    const db = getDB(c);
    const id = c.req.param('id');
    if (!db) {
      const email = MOCK_EMAILS.find(e => e.id === id);
      if (!email) return notFound(c, 'Email not found');
      return ok(c, { ...email, thread: { id: email.threadId, subject: email.subject, messages: [email], unreadCount: 0, isStarred: email.isStarred, folder: email.folder, lastMessageAt: email.timestamp, participantNames: [email.from.name] } });
    }
    try {
      const email = await db.prepare("SELECT * FROM emails WHERE id = ?").bind(id).first<any>();
      if (!email) return notFound(c, 'Email not found');
      const threadRecord = await db.prepare("SELECT * FROM threads WHERE id = ?").bind(email.thread_id).first<any>();
      const { results: allMsgs } = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(email.thread_id).all<any>();
      const thread: EmailThread = {
        id: threadRecord.id,
        subject: threadRecord.subject,
        lastMessageAt: threadRecord.last_message_at,
        snippet: threadRecord.snippet,
        unreadCount: threadRecord.unread_count,
        isStarred: !!threadRecord.is_starred,
        folder: threadRecord.folder as FolderType,
        participantNames: Array.from(new Set(allMsgs.map(m => m.from_name))),
        messages: allMsgs.map(m => ({
          id: m.id,
          threadId: m.thread_id,
          from: { name: m.from_name, email: m.from_email },
          to: JSON.parse(m.to_json),
          subject: m.subject,
          body: m.body,
          snippet: m.snippet,
          timestamp: m.timestamp,
          isRead: !!m.is_read,
          isStarred: !!m.is_starred,
          folder: m.folder as FolderType
        }))
      };
      return ok(c, { ...email, thread });
    } catch (e) {
      return bad(c, 'Database error');
    }
  });
  app.patch('/api/emails/:id', async (c) => {
    const db = getDB(c);
    const id = c.req.param('id');
    const updates = await c.req.json();
    if (!db) return bad(c, 'Update failed: Database binding missing (Read-Only Mock Mode)');
    try {
      const email = await db.prepare("SELECT * FROM emails WHERE id = ?").bind(id).first<any>();
      if (!email) return notFound(c, 'Email not found');
      const setClauses: string[] = [];
      const params: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        if (key === 'isRead') { setClauses.push("is_read = ?"); params.push(val ? 1 : 0); }
        else if (key === 'isStarred') { setClauses.push("is_starred = ?"); params.push(val ? 1 : 0); }
        else if (key === 'folder') { setClauses.push("folder = ?"); params.push(val); }
      }
      params.push(id);
      if (setClauses.length > 0) {
        await db.prepare(`UPDATE emails SET ${setClauses.join(', ')} WHERE id = ?`).bind(...params).run();
        const { results: msgs } = await db.prepare("SELECT is_read, is_starred FROM emails WHERE thread_id = ?").bind(email.thread_id).all<any>();
        const unreadCount = msgs.filter(m => !m.is_read).length;
        const isStarred = msgs.some(m => m.is_starred) ? 1 : 0;
        await db.prepare("UPDATE threads SET unread_count = ?, is_starred = ? WHERE id = ?").bind(unreadCount, isStarred, email.thread_id).run();
      }
      return ok(c, { success: true });
    } catch (e) {
      return bad(c, 'Update failed');
    }
  });
  app.post('/api/emails/send', async (c) => {
    const db = getDB(c);
    if (!db) return bad(c, 'Send failed: Database binding missing (Read-Only Mock Mode)');
    const { to, subject, body, threadId } = await c.req.json();
    const emailId = crypto.randomUUID();
    const targetThreadId = threadId || crypto.randomUUID();
    const timestamp = Date.now();
    const snippet = body.slice(0, 100);
    try {
      await db.batch([
        db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, is_starred, folder) VALUES (?, ?, ?, ?, 0, 0, 'sent') ON CONFLICT(id) DO UPDATE SET last_message_at = excluded.last_message_at, snippet = excluded.snippet").bind(targetThreadId, subject, timestamp, snippet),
        db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, is_read, is_starred, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'sent')").bind(emailId, targetThreadId, "Current User", "user@aeromail.dev", JSON.stringify([{email: to}]), subject, body, snippet, timestamp)
      ]);
      return ok(c, { id: emailId });
    } catch (e) {
      return bad(c, 'Failed to send');
    }
  });
  app.get('/api/me', async (c) => {
    const db = getDB(c);
    if (!db) return ok(c, MOCK_USERS[0]);
    try {
      const user = await db.prepare("SELECT * FROM users LIMIT 1").first<any>();
      if (!user) return ok(c, MOCK_USERS[0]);
      return ok(c, { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url });
    } catch (e) {
      return ok(c, MOCK_USERS[0]);
    }
  });
}