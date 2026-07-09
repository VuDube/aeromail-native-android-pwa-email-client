import { Hono } from "hono";
import { ok, bad, internalError, notFound, Env, getGmailAccessToken, constructMimeMessage, sendViaGmail, getCloudflareZones, getZoneEmailRoutingStatus } from './core-utils';
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
import { DomainInfo, EmailThread } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/status', async (c) => {
    return ok(c, {
      gmail_config: !!(c.env.GMAIL_CLIENT_ID && c.env.GMAIL_CLIENT_SECRET),
      cf_token_ready: !!c.env.CF_API_TOKEN,
      kv_ready: !!c.env.TOKENS,
      db_ready: !!c.env.EMAIL_DB,
      demo_mode: !c.env.EMAIL_DB,
      version: '1.9.1-resilience-patch'
    });
  });
  app.get('/api/domains', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return ok(c, []); // Silently return empty in demo mode
    try {
      const zones = await getCloudflareZones(c.env);
      const { results: localDomains } = await db.prepare("SELECT * FROM user_domains WHERE is_enabled = 1").all() as any;
      const domainList: DomainInfo[] = await Promise.all(zones.map(async (z) => {
        const isRouting = await getZoneEmailRoutingStatus(c.env, z.id);
        const local = localDomains.find((ld: any) => ld.domain_id === z.id);
        return {
          id: z.id,
          name: z.name,
          status: z.status,
          isRoutingEnabled: isRouting,
          localEnabled: !!local
        };
      }));
      return ok(c, domainList);
    } catch (e: any) {
      return ok(c, []); // Fallback to empty list instead of crashing UI
    }
  });
  app.get('/api/emails', async (c) => {
    const db = c.env.EMAIL_DB;
    const folder = c.req.query('folder') || 'inbox';
    if (!db) {
      // Demo Mode Fallback
      const mockThreads: EmailThread[] = MOCK_EMAILS
        .filter(e => e.folder === folder || (folder === 'starred' && e.isStarred))
        .map(e => ({
          id: e.threadId,
          lastMessageAt: e.timestamp,
          subject: e.subject,
          snippet: e.snippet,
          unreadCount: e.isRead ? 0 : 1,
          isStarred: e.isStarred,
          folder: e.folder as any,
          participantNames: [e.from.name]
        }));
      return c.json({ success: true, data: mockThreads, meta: { demo_mode: true } });
    }
    const { results } = await db.prepare(`
      SELECT t.*,
      (SELECT GROUP_CONCAT(from_name, ', ') FROM (SELECT DISTINCT from_name FROM emails WHERE thread_id = t.id)) as participantNames
      FROM threads t
      WHERE (? = 'starred' AND is_starred = 1) OR folder = ?
      ORDER BY last_message_at DESC
      LIMIT 100
    `).bind(folder, folder).all();
    const formatted = results.map((r: any) => ({
      ...r,
      participantNames: r.participantNames ? r.participantNames.split(', ') : [],
      isStarred: !!r.is_starred,
      unreadCount: r.unread_count || 0
    }));
    return ok(c, formatted);
  });
  app.get('/api/threads/:id', async (c) => {
    const db = c.env.EMAIL_DB;
    const id = c.req.param('id');
    if (!db) {
      const mockEmail = MOCK_EMAILS.find(e => e.threadId === id) || MOCK_EMAILS[0];
      return ok(c, {
        thread: {
          id: mockEmail.threadId,
          subject: mockEmail.subject,
          lastMessageAt: mockEmail.timestamp,
          unreadCount: 0,
          isStarred: mockEmail.isStarred,
          messages: [mockEmail]
        }
      });
    }
    const thread = await db.prepare("SELECT * FROM threads WHERE id = ?").bind(id).first() as any;
    if (!thread) return notFound(c, "Thread not found");
    const messages = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(id).all();
    const formattedMessages = messages.results.map((m: any) => ({
      ...m,
      from: { name: m.from_name, email: m.from_email },
      to: JSON.parse(m.to_json),
      isRead: !!m.is_read,
      isStarred: !!m.is_starred
    }));
    return ok(c, {
      thread: {
        ...thread,
        isStarred: !!thread.is_starred,
        unreadCount: thread.unread_count,
        messages: formattedMessages
      }
    });
  });
  app.post('/api/emails/send', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return bad(c, "Demo Mode: Email sending is simulated only. Connect D1 to persist.");
    const { to, subject, body, threadId, fromEmail } = await c.req.json();
    const accessToken = await getGmailAccessToken(c.env);
    let senderEmail = "user@aeromail.dev";
    const id = crypto.randomUUID();
    const tid = threadId || crypto.randomUUID();
    const ts = Date.now();
    const snippet = body.slice(0, 100);
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, folder, unread_count) VALUES (?, ?, ?, ?, 'sent', 0) ON CONFLICT(id) DO UPDATE SET last_message_at = excluded.last_message_at, snippet = excluded.snippet").bind(tid, subject, ts, snippet),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', 1)").bind(id, tid, "Aero User", senderEmail, JSON.stringify([{ email: to }]), subject, body, snippet, ts)
    ]);
    return ok(c, { id, delivered: !!accessToken, from: senderEmail });
  });
  app.post('/api/simulate/inbound', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return bad(c, "Demo Mode: Simulation requires an active D1 binding.");
    const id = crypto.randomUUID();
    const tid = crypto.randomUUID().slice(0, 8);
    const ts = Date.now();
    const subject = "Simulation: New Edge Capability";
    const body = "This is an automated simulation of an inbound email routing event.";
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder) VALUES (?, ?, ?, ?, 1, 'inbox')")
        .bind(tid, subject, ts, body.slice(0, 100)),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox', 0)")
        .bind(id, tid, "Edge Simulator", "bot@cloudflare.com", JSON.stringify([{ email: "user@aeromail.dev" }]), subject, body, body.slice(0, 100), ts)
    ]);
    return ok(c, { threadId: tid, success: true });
  });
  app.get('/api/me', (c) => ok(c, MOCK_USERS[0]));
}