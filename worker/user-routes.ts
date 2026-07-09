import { Hono } from "hono";
import { ok, bad, notFound, Env } from './core-utils';
import { FolderType, Email, EmailThread, User } from "@shared/types";
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  const getDB = (c: any): D1Database | undefined => c.env.EMAIL_DB;
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
    if (!db) return ok(c, { initialized: true });
    try {
      await db.batch([
        db.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?) ON CONFLICT DO NOTHING").bind(MOCK_USERS[0].id, MOCK_USERS[0].name, MOCK_USERS[0].email),
        ...MOCK_EMAILS.map(e => db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, folder) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING").bind(e.threadId, e.subject, e.timestamp, e.snippet, e.folder)),
        ...MOCK_EMAILS.map(e => db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING").bind(e.id, e.threadId, e.from.name, e.from.email, JSON.stringify(e.to), e.subject, e.body, e.snippet, e.timestamp, e.folder))
      ]);
      return ok(c, { initialized: true });
    } catch (e) { 
      console.error("[INIT ERROR] D1 Database operation failed. Check if EMAIL_DB binding exists.", e);
      return bad(c, `Initialization failed: ${String(e)}`); 
    }
  });
  app.post('/api/init/reset', async (c) => {
    const db = getDB(c);
    if (!db) return bad(c, "No DB");
    await db.batch([db.prepare("DELETE FROM emails"), db.prepare("DELETE FROM threads")]);
    return ok(c, { reset: true });
  });
  app.post('/api/simulate/inbound', async (c) => {
    const db = getDB(c);
    if (!db) return bad(c, "Simulation unavailable: No D1 Database binding 'EMAIL_DB' found. You are running in Mock Mode.");
    const threadId = crypto.randomUUID();
    const ts = Date.now();
    const subject = "Urgent: Conversation Stream Testing";
    const body1 = "Hey, I noticed the new UI looks amazing. Can we check if multiple messages group correctly?";
    const body2 = "I just sent another one right after to test the 'same sender' visual grouping logic.";
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder) VALUES (?, ?, ?, ?, 2, 'inbox')").bind(threadId, subject, ts, body2.slice(0, 50)),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox')").bind(crypto.randomUUID(), threadId, "Alex Rivera", "alex@example.com", "[]", subject, body1, body1.slice(0, 50), ts - 10000, 'inbox'),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox')").bind(crypto.randomUUID(), threadId, "Alex Rivera", "alex@example.com", "[]", subject, body2, body2.slice(0, 50), ts, 'inbox')
    ]);
    return ok(c, { threadId });
  });
  app.get('/api/emails', async (c) => {
    const db = getDB(c);
    const folder = c.req.query('folder') || 'inbox';
    if (!db) { console.warn("[DB WARNING] EMAIL_DB binding missing. Returning empty mock list."); return ok(c, []); }
    const { results } = await db.prepare("SELECT * FROM threads WHERE folder = ? OR (? = 'starred' AND is_starred = 1) ORDER BY last_message_at DESC").bind(folder, folder).all();
    const threads = await Promise.all(results.map(async (t: any) => {
      const msgs = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(t.id).all();
      return { ...t, lastMessageAt: t.last_message_at, unreadCount: t.unread_count, isStarred: !!t.is_starred, participantNames: Array.from(new Set(msgs.results.map((m: any) => m.from_name))), messages: msgs.results.map((m: any) => ({ ...m, from: { name: m.from_name, email: m.from_email }, to: JSON.parse(m.to_json) })) };
    }));
    return ok(c, threads);
  });
  app.get('/api/emails/:id', async (c) => {
    const db = getDB(c);
    const id = c.req.param('id');
    if (!db) return notFound(c);
    const email = await db.prepare("SELECT * FROM emails WHERE id = ?").bind(id).first() as any;
    if (!email) return notFound(c);
    const threadRecord = await db.prepare("SELECT * FROM threads WHERE id = ?").bind(email.thread_id).first() as any;
    const msgs = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(email.thread_id).all();
    const thread = { ...threadRecord, lastMessageAt: threadRecord.last_message_at, isStarred: !!threadRecord.is_starred, unreadCount: threadRecord.unread_count, messages: msgs.results.map((m: any) => ({ ...m, from: { name: m.from_name, email: m.from_email }, to: JSON.parse(m.to_json) })) };
    return ok(c, { ...email, from: { name: email.from_name, email: email.from_email }, to: JSON.parse(email.to_json), thread });
  });
  app.patch('/api/emails/:id', async (c) => {
    const db = getDB(c);
    if (!db) return bad(c, "No DB");
    const id = c.req.param('id');
    const updates = await c.req.json() as any;
    if (updates.folder) await db.prepare("UPDATE emails SET folder = ? WHERE id = ?").bind(updates.folder, id).run();
    if (updates.isRead !== undefined) await db.prepare("UPDATE emails SET is_read = ? WHERE id = ?").bind(updates.isRead ? 1 : 0, id).run();
    if (updates.isStarred !== undefined) await db.prepare("UPDATE emails SET is_starred = ? WHERE id = ?").bind(updates.isStarred ? 1 : 0, id).run();
    return ok(c, { success: true });
  });
  app.post('/api/emails/send', async (c) => {
    const db = getDB(c);
    if (!db) return bad(c, "No DB");
    const { to, subject, body, threadId } = await c.req.json();
    const id = crypto.randomUUID();
    const tid = threadId || crypto.randomUUID();
    const ts = Date.now();
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, folder) VALUES (?, ?, ?, ?, 'sent') ON CONFLICT(id) DO UPDATE SET last_message_at = excluded.last_message_at, snippet = excluded.snippet").bind(tid, subject, ts, body.slice(0, 50)),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', 1)").bind(id, tid, "Aero User", "user@aeromail.dev", JSON.stringify([{ email: to }]), subject, body, body.slice(0, 50), ts)
    ]);
    return ok(c, { id });
  });
  app.post('/api/threads/:id/read', async (c) => {
    const db = getDB(c);
    if (!db) return bad(c, "No DB");
    const tid = c.req.param('id');
    await db.batch([
      db.prepare("UPDATE threads SET unread_count = 0 WHERE id = ?").bind(tid),
      db.prepare("UPDATE emails SET is_read = 1 WHERE thread_id = ?").bind(tid)
    ]);
    return ok(c, { success: true });
  });
  app.get('/api/me', (c) => ok(c, MOCK_USERS[0]));
}