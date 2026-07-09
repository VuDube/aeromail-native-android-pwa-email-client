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
      healthy: true,
      version: '1.0.4-stable',
      location: 'Edge'
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
      return bad(c, `Initialization failed: ${String(e)}`);
    }
  });
  app.post('/api/init/reset', async (c) => {
    const db = getDB(c);
    if (!db) return ok(c, { success: true });
    try {
      await db.batch([
        db.prepare("DELETE FROM emails"),
        db.prepare("DELETE FROM threads"),
        db.prepare("DELETE FROM users"),
        db.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)").bind(MOCK_USERS[0].id, MOCK_USERS[0].name, MOCK_USERS[0].email)
      ]);
      return ok(c, { success: true });
    } catch (e) {
      return bad(c, `Reset failed: ${String(e)}`);
    }
  });
  app.get('/api/emails', async (c) => {
    const db = getDB(c);
    const folder = c.req.query('folder') || 'inbox';
    if (!db) return ok(c, MOCK_EMAILS.filter(e => e.folder === folder).map(({ id, ...rest }) => ({
      ...rest,
      id: rest.threadId,
      lastMessageAt: rest.timestamp,
      participantNames: [rest.from.name],
      unreadCount: 0,
      messages: [{ ...rest, id }]
    })));
    const { results } = await db.prepare("SELECT * FROM threads WHERE folder = ? OR (? = 'starred' AND is_starred = 1) ORDER BY last_message_at DESC").bind(folder, folder).all();
    const threads = await Promise.all(results.map(async (t: any) => {
      const msgs = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(t.id).all();
      return {
        ...t,
        lastMessageAt: t.last_message_at,
        unreadCount: t.unread_count,
        isStarred: !!t.is_starred,
        participantNames: Array.from(new Set(msgs.results.map((m: any) => m.from_name))),
        messages: msgs.results.map((m: any) => ({ ...m, from: { name: m.from_name, email: m.from_email }, to: JSON.parse(m.to_json) }))
      };
    }));
    return ok(c, threads);
  });
  app.get('/api/threads/:id', async (c) => {
    const db = getDB(c);
    const id = c.req.param('id');
    if (!db) {
      const mock = MOCK_EMAILS.find(e => e.threadId === id || e.id === id);
      if (!mock) return notFound(c);
      return ok(c, { ...mock, thread: { id: mock.threadId, subject: mock.subject, messages: [mock], unreadCount: 0 } });
    }
    const threadRecord = await db.prepare("SELECT * FROM threads WHERE id = ?").bind(id).first() as any;
    if (!threadRecord) return notFound(c);
    const msgs = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(id).all();
    const thread = {
      ...threadRecord,
      lastMessageAt: threadRecord.last_message_at,
      isStarred: !!threadRecord.is_starred,
      unreadCount: threadRecord.unread_count,
      messages: msgs.results.map((m: any) => ({ ...m, from: { name: m.from_name, email: m.from_email }, to: JSON.parse(m.to_json) }))
    };
    return ok(c, { ...thread.messages[thread.messages.length - 1], thread });
  });
  app.patch('/api/threads/:id', async (c) => {
    const db = getDB(c);
    const id = c.req.param('id');
    const updates = await c.req.json() as any;
    if (!db) return ok(c, { success: true });
    if (updates.folder) await db.prepare("UPDATE threads SET folder = ? WHERE id = ?").bind(updates.folder, id).run();
    if (updates.isStarred !== undefined) await db.prepare("UPDATE threads SET is_starred = ? WHERE id = ?").bind(updates.isStarred ? 1 : 0, id).run();
    if (updates.isRead !== undefined) await db.prepare("UPDATE threads SET unread_count = ? WHERE id = ?").bind(updates.isRead ? 0 : 1, id).run();
    return ok(c, { success: true });
  });
  app.post('/api/emails/send', async (c) => {
    const db = getDB(c);
    const { to, subject, body, threadId } = await c.req.json();
    if (!db) return ok(c, { id: crypto.randomUUID(), success: true, mock: true });
    const id = crypto.randomUUID();
    const tid = threadId || crypto.randomUUID();
    const ts = Date.now();
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, folder) VALUES (?, ?, ?, ?, 'sent') ON CONFLICT(id) DO UPDATE SET last_message_at = excluded.last_message_at, snippet = excluded.snippet").bind(tid, subject, ts, body.slice(0, 50)),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', 1)").bind(id, tid, "Aero User", "user@aeromail.dev", JSON.stringify([{ email: to }]), subject, body, body.slice(0, 50), ts)
    ]);
    return ok(c, { id });
  });
  app.post('/api/simulate/inbound', async (c) => {
    const db = getDB(c);
    if (!db) return ok(c, { success: true, mock: true });
    const threadId = crypto.randomUUID();
    const ts = Date.now();
    const subject = "Project Sync Request";
    const body = "I've reviewed the design tokens. The Material Design 3 surface elevations look correct.";
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder) VALUES (?, ?, ?, ?, 1, 'inbox')").bind(threadId, subject, ts, body.slice(0, 50)),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox')").bind(crypto.randomUUID(), threadId, "Alex Rivera", "alex@example.com", "[]", subject, body, body.slice(0, 50), ts, 'inbox')
    ]);
    return ok(c, { threadId });
  });
  app.get('/api/me', (c) => ok(c, MOCK_USERS[0]));
}