import { Hono } from "hono";
import { ok, bad, notFound } from './core-utils';
import { FolderType, Email, EmailThread, User } from "@shared/types";
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
export interface Env {
  EMAIL_DB: D1Database;
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
  app.get('/api/init', async (c) => {
    try {
      const check = await c.env.EMAIL_DB.prepare("SELECT COUNT(*) as count FROM users").first<{count: number}>();
      if (check && check.count > 0) return ok(c, { initialized: true, message: "Already seeded" });
      const statements = [];
      for (const u of MOCK_USERS) {
        statements.push(c.env.EMAIL_DB.prepare(
          "INSERT INTO users (id, name, email, avatar_url) VALUES (?, ?, ?, ?)"
        ).bind(u.id, u.name, u.email, u.avatarUrl || null));
      }
      for (const e of MOCK_EMAILS) {
        statements.push(c.env.EMAIL_DB.prepare(
          "INSERT OR IGNORE INTO threads (id, subject, last_message_at, snippet, unread_count, is_starred, folder) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(e.threadId, e.subject, e.timestamp, e.snippet, e.isRead ? 0 : 1, e.isStarred ? 1 : 0, e.folder));
        statements.push(c.env.EMAIL_DB.prepare(
          "INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, is_read, is_starred, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(e.id, e.threadId, e.from.name, e.from.email, JSON.stringify(e.to), e.subject, e.body, e.snippet, e.timestamp, e.isRead ? 1 : 0, e.isStarred ? 1 : 0, e.folder));
      }
      await c.env.EMAIL_DB.batch(statements);
      return ok(c, { initialized: true });
    } catch (e) {
      return bad(c, 'Failed to initialize: ' + String(e));
    }
  });
  app.post('/api/init/reset', async (c) => {
    try {
      await c.env.EMAIL_DB.batch([
        c.env.EMAIL_DB.prepare("DELETE FROM emails"),
        c.env.EMAIL_DB.prepare("DELETE FROM threads"),
        c.env.EMAIL_DB.prepare("DELETE FROM users"),
        c.env.EMAIL_DB.prepare("DELETE FROM domains"),
        c.env.EMAIL_DB.prepare("DELETE FROM user_domains")
      ]);
      return ok(c, { reset: true });
    } catch (e) {
      return bad(c, 'Reset failed: ' + String(e));
    }
  });
  app.post('/api/simulate/inbound', async (c) => {
    try {
      const sender = SIMULATED_SENDERS[Math.floor(Math.random() * SIMULATED_SENDERS.length)];
      const subject = SIMULATED_SUBJECTS[Math.floor(Math.random() * SIMULATED_SUBJECTS.length)];
      const body = SIMULATED_BODIES[Math.floor(Math.random() * SIMULATED_BODIES.length)];
      const emailId = crypto.randomUUID();
      const threadId = crypto.randomUUID();
      const timestamp = Date.now();
      const snippet = body.slice(0, 100);
      await c.env.EMAIL_DB.batch([
        c.env.EMAIL_DB.prepare(`
          INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, is_starred, folder)
          VALUES (?, ?, ?, ?, 1, 0, 'inbox')
        `).bind(threadId, subject, timestamp, snippet),
        c.env.EMAIL_DB.prepare(`
          INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, is_read, is_starred, folder)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'inbox')
        `).bind(emailId, threadId, sender.name, sender.email, JSON.stringify([{ email: "user@aeromail.dev" }]), subject, body, snippet, timestamp)
      ]);
      return ok(c, { id: emailId, threadId });
    } catch (e) {
      return bad(c, 'Simulation failed: ' + String(e));
    }
  });
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
      return bad(c, 'Failed to fetch mailbox');
    }
  });
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
      return ok(c, { ...email, thread });
    } catch (e) {
      return bad(c, 'Database error');
    }
  });
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
        const { results: msgs } = await c.env.EMAIL_DB.prepare("SELECT is_read, is_starred FROM emails WHERE thread_id = ?").bind(email.thread_id).all<any>();
        const unreadCount = msgs.filter(m => !m.is_read).length;
        const isStarred = msgs.some(m => m.is_starred) ? 1 : 0;
        await c.env.EMAIL_DB.prepare("UPDATE threads SET unread_count = ?, is_starred = ? WHERE id = ?").bind(unreadCount, isStarred, email.thread_id).run();
      }
      return ok(c, { success: true });
    } catch (e) {
      return bad(c, 'Update failed');
    }
  });
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
  app.post('/api/emails/send', async (c) => {
    const { to, subject, body, threadId } = await c.req.json();
    const emailId = crypto.randomUUID();
    const targetThreadId = threadId || crypto.randomUUID();
    const timestamp = Date.now();
    const snippet = body.slice(0, 100);
    try {
      await c.env.EMAIL_DB.batch([
        c.env.EMAIL_DB.prepare(`
          INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, is_starred, folder)
          VALUES (?, ?, ?, ?, 0, 0, 'sent')
          ON CONFLICT(id) DO UPDATE SET last_message_at = excluded.last_message_at, snippet = excluded.snippet
        `).bind(targetThreadId, subject, timestamp, snippet),
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
  app.get('/api/me', async (c) => {
    try {
      const user = await c.env.EMAIL_DB.prepare("SELECT * FROM users LIMIT 1").first<any>();
      if (!user) return ok(c, MOCK_USERS[0]);
      return ok(c, { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url });
    } catch (e) {
      return ok(c, MOCK_USERS[0]);
    }
  });
}