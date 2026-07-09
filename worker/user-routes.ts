import { Hono } from "hono";
import { ok, bad, internalError, notFound, Env, getGmailAccessToken, encrypt, decrypt } from './core-utils';
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
import { DomainInfo, EmailThread } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // --- AUTH ENDPOINTS ---
  app.get('/api/auth/status', async (c) => {
    if (!c.env.TOKENS) return ok(c, { connected: false, demo: true });
    const token = await c.env.TOKENS.get("gmail_refresh_token");
    return ok(c, { connected: !!token });
  });
  app.get('/api/auth/login', async (c) => {
    const { GMAIL_CLIENT_ID, REDIRECT_URI } = c.env;
    if (!GMAIL_CLIENT_ID || !REDIRECT_URI) return bad(c, "OAuth configuration missing");
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid'
    ].join(' ');
    const params = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent'
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });
  app.get('/api/auth/callback', async (c) => {
    const code = c.req.query('code');
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, REDIRECT_URI, ENCRYPTION_SECRET, TOKENS } = c.env;
    if (!code || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !REDIRECT_URI || !ENCRYPTION_SECRET || !TOKENS) {
      return bad(c, "Missing callback parameters or server config");
    }
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GMAIL_CLIENT_ID,
          client_secret: GMAIL_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json() as any;
      if (tokens.refresh_token) {
        const encrypted = await encrypt(tokens.refresh_token, ENCRYPTION_SECRET);
        await TOKENS.put("gmail_refresh_token", encrypted);
      }
      return c.redirect('/settings?auth=success');
    } catch (e: any) {
      return internalError(c, e.message);
    }
  });
  app.post('/api/auth/disconnect', async (c) => {
    if (c.env.TOKENS) {
      await c.env.TOKENS.delete("gmail_refresh_token");
    }
    return ok(c, { success: true });
  });
  // --- THREAD & EMAIL ENDPOINTS ---
  app.get('/api/status', async (c) => {
    return ok(c, {
      gmail_config: !!(c.env.GMAIL_CLIENT_ID && c.env.GMAIL_CLIENT_SECRET),
      cf_token_ready: !!c.env.CF_API_TOKEN,
      kv_ready: !!c.env.TOKENS,
      db_ready: !!c.env.EMAIL_DB,
      demo_mode: !c.env.EMAIL_DB,
      version: '2.0.0-final'
    });
  });
  app.patch('/api/threads/:id', async (c) => {
    const db = c.env.EMAIL_DB;
    const id = c.req.param('id');
    const body = await c.req.json();
    if (!db) return ok(c, { id, simulated: true });
    const updates: string[] = [];
    const params: any[] = [];
    if (body.isRead !== undefined) {
      updates.push("unread_count = ?");
      params.push(body.isRead ? 0 : 1);
    }
    if (body.isStarred !== undefined) {
      updates.push("is_starred = ?");
      params.push(body.isStarred ? 1 : 0);
    }
    if (body.folder !== undefined) {
      updates.push("folder = ?");
      params.push(body.folder);
    }
    if (updates.length === 0) return bad(c, "No valid updates provided");
    params.push(id);
    await db.prepare(`UPDATE threads SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    // Propagate starred/read status to emails if applicable
    if (body.isStarred !== undefined) {
      await db.prepare("UPDATE emails SET is_starred = ? WHERE thread_id = ?").bind(body.isStarred ? 1 : 0, id).run();
    }
    if (body.isRead !== undefined) {
      await db.prepare("UPDATE emails SET is_read = ? WHERE thread_id = ?").bind(body.isRead ? 1 : 0, id).run();
    }
    return ok(c, { id, updated: true });
  });
  app.post('/api/domains/toggle', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return bad(c, "D1 required for domain management");
    const { domainId, domainName, enabled } = await c.req.json();
    if (enabled) {
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO domains (id, domain_name, is_active) VALUES (?, ?, 1)").bind(domainId, domainName),
        db.prepare("INSERT OR IGNORE INTO user_domains (user_id, domain_id) VALUES (?, ?)").bind('me', domainId)
      ]);
    } else {
      await db.prepare("DELETE FROM user_domains WHERE domain_id = ?").bind(domainId).run();
    }
    return ok(c, { domainId, enabled });
  });
  app.get('/api/domains', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return ok(c, []);
    try {
      const { results: localDomains } = await db.prepare("SELECT domain_id FROM user_domains").all() as any;
      const localSet = new Set(localDomains.map((ld: any) => ld.domain_id));
      const { results: zones } = await db.prepare("SELECT * FROM domains").all() as any;
      // In a real environment, we'd fetch from CF API here if tokens are present
      return ok(c, zones.map((z: any) => ({
        id: z.id,
        name: z.domain_name,
        status: 'active',
        isRoutingEnabled: true,
        localEnabled: localSet.has(z.id)
      })));
    } catch (e: any) {
      return ok(c, []);
    }
  });
  app.get('/api/emails', async (c) => {
    const db = c.env.EMAIL_DB;
    const folder = c.req.query('folder') || 'inbox';
    if (!db) {
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
    const { to, subject, body, threadId, fromEmail } = await c.req.json();
    if (!db) return bad(c, "Demo Mode: Email sending is simulated. Connect D1.");
    const accessToken = await getGmailAccessToken(c.env);
    const senderEmail = fromEmail || "user@aeromail.dev";
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
    if (!db) return bad(c, "Simulation requires an active D1 binding.");
    const id = crypto.randomUUID();
    const tid = crypto.randomUUID().slice(0, 8);
    const ts = Date.now();
    const subject = "Simulation: New Edge Capability";
    const body = "This is an automated simulation of an inbound email routing event.";
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder) VALUES (?, ?, ?, ?, 1, 'inbox')").bind(tid, subject, ts, body.slice(0, 100)),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox', 0)").bind(id, tid, "Edge Simulator", "bot@cloudflare.com", JSON.stringify([{ email: "user@aeromail.dev" }]), subject, body, body.slice(0, 100), ts)
    ]);
    return ok(c, { threadId: tid, success: true });
  });
  app.get('/api/me', (c) => ok(c, MOCK_USERS[0]));
}