import { Hono } from "hono";
import { ok, bad, internalError, notFound, Env } from './core-utils';
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
/**
 * Mandatory D1 Binding Guard
 * Prevents execution if the EMAIL_DB binding is missing.
 */
const checkDB = (c: any) => {
  if (!c.env.EMAIL_DB) {
    return internalError(c, "Critical: D1 database binding 'EMAIL_DB' is missing. Please check your wrangler.jsonc configuration.");
  }
  return null;
};
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/status', (c) => {
    const db = c.env.EMAIL_DB;
    return ok(c, {
      mode: db ? 'production' : 'development',
      storage: db ? 'Cloudflare D1' : 'No Binding Found',
      healthy: true,
      version: '1.0.5-stable',
      location: 'Global Edge'
    });
  });
  app.get('/api/init', async (c) => {
    const err = checkDB(c);
    if (err) return err;
    const db = c.env.EMAIL_DB;
    try {
      await db.batch([
        db.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?) ON CONFLICT DO NOTHING").bind(MOCK_USERS[0].id, MOCK_USERS[0].name, MOCK_USERS[0].email),
        ...MOCK_EMAILS.map(e => db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, folder) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING").bind(e.threadId, e.subject, e.timestamp, e.snippet, e.folder)),
        ...MOCK_EMAILS.map(e => db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING").bind(e.id, e.threadId, e.from.name, e.from.email, JSON.stringify(e.to), e.subject, e.body, e.snippet, e.timestamp, e.folder))
      ]);
      return ok(c, { initialized: true });
    } catch (e) {
      return internalError(c, `Initialization failed: ${String(e)}`);
    }
  });
  app.post('/api/init/reset', async (c) => {
    const err = checkDB(c);
    if (err) return err;
    const db = c.env.EMAIL_DB;
    try {
      await db.batch([
        db.prepare("DELETE FROM emails"),
        db.prepare("DELETE FROM threads"),
        db.prepare("DELETE FROM users"),
        db.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)").bind(MOCK_USERS[0].id, MOCK_USERS[0].name, MOCK_USERS[0].email)
      ]);
      return ok(c, { success: true });
    } catch (e) {
      return internalError(c, `Reset failed: ${String(e)}`);
    }
  });
  app.get('/api/emails', async (c) => {
    const err = checkDB(c);
    if (err) return err;
    const db = c.env.EMAIL_DB;
    const folder = c.req.query('folder') || 'inbox';
    try {
      const { results } = await db.prepare(
        "SELECT * FROM threads WHERE folder = ? OR (? = 'starred' AND is_starred = 1) ORDER BY last_message_at DESC"
      ).bind(folder, folder).all();
      const threads = await Promise.all(results.map(async (t: any) => {
        const msgs = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(t.id).all();
        return {
          ...t,
          lastMessageAt: t.last_message_at,
          unreadCount: t.unread_count,
          isStarred: !!t.is_starred,
          participantNames: Array.from(new Set(msgs.results.map((m: any) => m.from_name))),
          messages: msgs.results.map((m: any) => ({ 
            ...m, 
            from: { name: m.from_name, email: m.from_email }, 
            to: JSON.parse(m.to_json) 
          }))
        };
      }));
      return ok(c, threads);
    } catch (e) {
      return internalError(c, `Fetch failed: ${String(e)}`);
    }
  });
  app.get('/api/threads/:id', async (c) => {
    const err = checkDB(c);
    if (err) return err;
    const db = c.env.EMAIL_DB;
    const id = c.req.param('id');
    const threadRecord = await db.prepare("SELECT * FROM threads WHERE id = ?").bind(id).first() as any;
    if (!threadRecord) return notFound(c);
    const msgs = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(id).all();
    const thread = {
      ...threadRecord,
      lastMessageAt: threadRecord.last_message_at,
      isStarred: !!threadRecord.is_starred,
      unreadCount: threadRecord.unread_count,
      messages: msgs.results.map((m: any) => ({ 
        ...m, 
        from: { name: m.from_name, email: m.from_email }, 
        to: JSON.parse(m.to_json) 
      }))
    };
    return ok(c, { ...thread.messages[thread.messages.length - 1], thread });
  });
  app.patch('/api/threads/:id', async (c) => {
    const err = checkDB(c);
    if (err) return err;
    const db = c.env.EMAIL_DB;
    const id = c.req.param('id');
    const updates = await c.req.json() as any;
    try {
      const batch = [];
      if (updates.folder) {
        batch.push(db.prepare("UPDATE threads SET folder = ? WHERE id = ?").bind(updates.folder, id));
        batch.push(db.prepare("UPDATE emails SET folder = ? WHERE thread_id = ?").bind(updates.folder, id));
      }
      if (updates.isStarred !== undefined) {
        batch.push(db.prepare("UPDATE threads SET is_starred = ? WHERE id = ?").bind(updates.isStarred ? 1 : 0, id));
      }
      if (updates.isRead !== undefined) {
        batch.push(db.prepare("UPDATE threads SET unread_count = ? WHERE id = ?").bind(updates.isRead ? 0 : 1, id));
      }
      if (batch.length > 0) await db.batch(batch);
      return ok(c, { success: true });
    } catch (e) {
      return internalError(c, `Update failed: ${String(e)}`);
    }
  });
  app.post('/api/emails/send', async (c) => {
    const err = checkDB(c);
    if (err) return err;
    const db = c.env.EMAIL_DB;
    const { to, subject, body, threadId } = await c.req.json();
    const id = crypto.randomUUID();
    const tid = threadId || crypto.randomUUID();
    const ts = Date.now();
    try {
      await db.batch([
        db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, folder) VALUES (?, ?, ?, ?, 'sent') ON CONFLICT(id) DO UPDATE SET last_message_at = excluded.last_message_at, snippet = excluded.snippet").bind(tid, subject, ts, body.slice(0, 100)),
        db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', 1)").bind(id, tid, "Aero User", "user@aeromail.dev", JSON.stringify([{ email: to }]), subject, body, body.slice(0, 100), ts)
      ]);
      return ok(c, { id });
    } catch (e) {
      return internalError(c, `Send failed: ${String(e)}`);
    }
  });
  app.post('/api/simulate/inbound', async (c) => {
    const err = checkDB(c);
    if (err) return err;
    const db = c.env.EMAIL_DB;
    const threadId = crypto.randomUUID();
    const ts = Date.now();
    const subject = "Urgent: Server Status Update";
    const body = "We've detected a significant performance improvement across the edge nodes after the D1 migration. Please review the new dashboard statistics.";
    try {
      await db.batch([
        db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder) VALUES (?, ?, ?, ?, 1, 'inbox')").bind(threadId, subject, ts, body.slice(0, 100)),
        db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox')").bind(crypto.randomUUID(), threadId, "Alex Rivera", "alex@example.com", "[]", subject, body, body.slice(0, 100), ts, 'inbox')
      ]);
      return ok(c, { threadId });
    } catch (e) {
      return internalError(c, `Simulation failed: ${String(e)}`);
    }
  });
  app.get('/api/me', (c) => ok(c, MOCK_USERS[0]));
}