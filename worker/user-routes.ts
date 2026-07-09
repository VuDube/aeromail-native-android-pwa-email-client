import { Hono } from "hono";
import { ok, bad, notFound } from './core-utils';
import { FolderType, Email, EmailThread, User } from "@shared/types";
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
// Binding Interface for Cloudflare D1
export interface Env {
  EMAIL_DB: D1Database;
  TOKENS: KVNamespace;
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // GET /api/init - Seed the database
  app.get('/api/init', async (c) => {
    try {
      // Check if seeded
      const check = await c.env.EMAIL_DB.prepare("SELECT COUNT(*) as count FROM users").first<{count: number}>();
      if (check && check.count > 0) return ok(c, { initialized: true, message: "Already seeded" });
      const statements = [];
      // Seed Users
      for (const u of MOCK_USERS) {
        statements.push(c.env.EMAIL_DB.prepare(
          "INSERT INTO users (id, name, email, avatar_url) VALUES (?, ?, ?, ?)"
        ).bind(u.id, u.name, u.email, u.avatarUrl || null));
      }
      // Seed Emails & Threads (Simplified for Init)
      for (const e of MOCK_EMAILS) {
        // Create Thread if not exists
        statements.push(c.env.EMAIL_DB.prepare(
          "INSERT OR IGNORE INTO threads (id, subject, last_message_at, snippet, unread_count, is_starred, folder) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(e.threadId, e.subject, e.timestamp, e.snippet, e.isRead ? 0 : 1, e.isStarred ? 1 : 0, e.folder));
        // Insert Email
        statements.push(c.env.EMAIL_DB.prepare(
          "INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, is_read, is_starred, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(e.id, e.threadId, e.from.name, e.from.email, JSON.stringify(e.to), e.subject, e.body, e.snippet, e.timestamp, e.isRead ? 1 : 0, e.isStarred ? 1 : 0, e.folder));
      }
      await c.env.EMAIL_DB.batch(statements);
      return ok(c, { initialized: true });
    } catch (e) {
      console.error("Init Error:", e);
      return bad(c, 'Failed to initialize: ' + String(e));
    }
  });
  // POST /api/init/reset - Factory Reset
  app.post('/api/init/reset', async (c) => {
    try {
      await c.env.EMAIL_DB.batch([
        c.env.EMAIL_DB.prepare("DELETE FROM emails"),
        c.env.EMAIL_DB.prepare("DELETE FROM threads"),
        c.env.EMAIL_DB.prepare("DELETE FROM users"),
        c.env.EMAIL_DB.prepare("DELETE FROM domains"),
        c.env.EMAIL_DB.prepare("DELETE FROM user_domains")
      ]);
      // Re-trigger init logic via redirect or internal call
      return ok(c, { reset: true });
    } catch (e) {
      return bad(c, 'Reset failed: ' + String(e));
    }
  });
  // GET /api/emails - List threads by folder
  app.get('/api/emails', async (c) => {
    const folder = (c.req.query('folder') as FolderType) || 'inbox';
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
    try {
      const { results } = await c.env.EMAIL_DB.prepare(
        "SELECT * FROM threads WHERE folder = ? OR (? = 'starred' AND is_starred = 1) ORDER BY last_message_at DESC LIMIT ?"
      ).bind(folder, folder, limit).all<any>();
      const threads: EmailThread[] = await Promise.all(results.map(async (t) => {
        const { results: messages } = await c.env.EMAIL_DB.prepare(
          "SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC"
        ).bind(t.id).all<any>();
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
      return bad(c, 'Failed to fetch mailbox: ' + String(e));
    }
  });
  // GET /api/emails/:id - Fetch single email with thread context
  app.get('/api/emails/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const email = await c.env.EMAIL_DB.prepare("SELECT * FROM emails WHERE id = ?").bind(id).first<any>();
      if (!email) return notFound(c, 'Email not found');
      const threadRecord = await c.env.EMAIL_DB.prepare("SELECT * FROM threads WHERE id = ?").bind(email.thread_id).first<any>();
      const { results: allMsgs } = await c.env.EMAIL_DB.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(email.thread_id).all<any>();
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
      return ok(c, {
        id: email.id,
        threadId: email.thread_id,
        from: { name: email.from_name, email: email.from_email },
        to: JSON.parse(email.to_json),
        subject: email.subject,
        body: email.body,
        snippet: email.snippet,
        timestamp: email.timestamp,
        isRead: !!email.is_read,
        isStarred: !!email.is_starred,
        folder: email.folder as FolderType,
        thread
      });
    } catch (e) {
      return bad(c, 'Database error');
    }
  });
  // PATCH /api/emails/:id - Update status
  app.patch('/api/emails/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    try {
      const email = await c.env.EMAIL_DB.prepare("SELECT * FROM emails WHERE id = ?").bind(id).first<any>();
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
        await c.env.EMAIL_DB.prepare(`UPDATE emails SET ${setClauses.join(', ')} WHERE id = ?`).bind(...params).run();
        // Recalculate thread metadata
        const { results: msgs } = await c.env.EMAIL_DB.prepare("SELECT is_read, is_starred FROM emails WHERE thread_id = ?").bind(email.thread_id).all<any>();
        const unreadCount = msgs.filter(m => !m.is_read).length;
        const isStarred = msgs.some(m => m.is_starred) ? 1 : 0;
        await c.env.EMAIL_DB.prepare(
          "UPDATE threads SET unread_count = ?, is_starred = ? WHERE id = ?"
        ).bind(unreadCount, isStarred, email.thread_id).run();
      }
      return ok(c, { success: true });
    } catch (e) {
      return bad(c, 'Update failed');
    }
  });
  // POST /api/threads/:id/read - Mark thread as read
  app.post('/api/threads/:id/read', async (c) => {
    const threadId = c.req.param('id');
    try {
      await c.env.EMAIL_DB.batch([
        c.env.EMAIL_DB.prepare("UPDATE emails SET is_read = 1 WHERE thread_id = ?").bind(threadId),
        c.env.EMAIL_DB.prepare("UPDATE threads SET unread_count = 0 WHERE id = ?").bind(threadId)
      ]);
      return ok(c, { success: true });
    } catch (e) {
      return bad(c, 'Batch update failed');
    }
  });
  // POST /api/emails/send - Send new email
  app.post('/api/emails/send', async (c) => {
    const { to, subject, body, threadId } = await c.req.json();
    const emailId = crypto.randomUUID();
    const targetThreadId = threadId || crypto.randomUUID();
    const timestamp = Date.now();
    const snippet = body.slice(0, 100);
    try {
      await c.env.EMAIL_DB.batch([
        // Upsert Thread
        c.env.EMAIL_DB.prepare(`
          INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, is_starred, folder) 
          VALUES (?, ?, ?, ?, 0, 0, 'sent')
          ON CONFLICT(id) DO UPDATE SET 
            last_message_at = excluded.last_message_at,
            snippet = excluded.snippet
        `).bind(targetThreadId, subject, timestamp, snippet),
        // Insert Email
        c.env.EMAIL_DB.prepare(`
          INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, is_read, is_starred, folder)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'sent')
        `).bind(emailId, targetThreadId, "Current User", "user@aeromail.dev", JSON.stringify([{email: to}]), subject, body, snippet, timestamp)
      ]);
      return ok(c, { id: emailId });
    } catch (e) {
      return bad(c, 'Failed to send');
    }
  });
  // GET /api/me - Current User
  app.get('/api/me', async (c) => {
    try {
      const user = await c.env.EMAIL_DB.prepare("SELECT * FROM users LIMIT 1").first<any>();
      if (!user) return ok(c, MOCK_USERS[0]);
      return ok(c, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url
      });
    } catch (e) {
      return ok(c, MOCK_USERS[0]);
    }
  });
}