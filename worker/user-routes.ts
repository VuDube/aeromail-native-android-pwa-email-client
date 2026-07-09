import { Hono } from "hono";
import { ok, bad, internalError, notFound, Env, getGmailAccessToken, constructMimeMessage, sendViaGmail, encrypt, getCloudflareZones, getZoneEmailRoutingStatus, decrypt } from './core-utils';
import { MOCK_USERS } from "@shared/mock-data";
import { DomainInfo, EmailThread } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/status', async (c) => {
    return ok(c, {
      gmail_config: !!(c.env.GMAIL_CLIENT_ID && c.env.GMAIL_CLIENT_SECRET && c.env.REDIRECT_URI && c.env.ENCRYPTION_SECRET),
      cf_token_ready: !!c.env.CF_API_TOKEN,
      kv_ready: !!c.env.TOKENS,
      db_ready: !!c.env.EMAIL_DB,
      version: '1.7.0-final'
    });
  });
  app.get('/api/domains', async (c) => {
    try {
      const db = c.env.EMAIL_DB;
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
      if (e.message === "CF_API_TOKEN_MISSING") return bad(c, "Cloudflare API Token missing");
      return internalError(c, e.message);
    }
  });
  app.post('/api/domains/toggle', async (c) => {
    const { domainId, domainName, enabled } = await c.req.json();
    const db = c.env.EMAIL_DB;
    const userId = "u1";
    await db.batch([
      db.prepare("INSERT INTO domains (id, domain_name, is_active) VALUES (?, ?, 1) ON CONFLICT(id) DO NOTHING").bind(domainId, domainName),
      db.prepare("INSERT INTO user_domains (user_id, domain_id, is_enabled) VALUES (?, ?, ?) ON CONFLICT(user_id, domain_id) DO UPDATE SET is_enabled = excluded.is_enabled").bind(userId, domainId, enabled ? 1 : 0)
    ]);
    return ok(c, { success: true });
  });
  app.get('/api/auth/login', (c) => {
    const { GMAIL_CLIENT_ID, REDIRECT_URI } = c.env;
    if (!GMAIL_CLIENT_ID || !REDIRECT_URI) return bad(c, "GMAIL_CONFIG_MISSING");
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: REDIRECT_URI,
      client_id: GMAIL_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/userinfo.email"].join(" "),
      state: crypto.randomUUID()
    };
    return c.redirect(`${rootUrl}?${new URLSearchParams(options).toString()}`);
  });
  app.get('/api/auth/callback', async (c) => {
    const code = c.req.query('code');
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, REDIRECT_URI, TOKENS, ENCRYPTION_SECRET } = c.env;
    if (!code || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !REDIRECT_URI || !TOKENS || !ENCRYPTION_SECRET) return bad(c, "Missing config");
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: "authorization_code" }),
      });
      const data = await response.json() as any;
      if (data.refresh_token) {
        await TOKENS.put("gmail_refresh_token", await encrypt(data.refresh_token, ENCRYPTION_SECRET));
        return c.redirect('/settings?auth=success');
      }
      return bad(c, "No refresh token received");
    } catch (e) { return internalError(c, String(e)); }
  });
  app.get('/api/auth/status', async (c) => {
    const kv = c.env.TOKENS;
    if (!kv) return ok(c, { connected: false });
    const token = await kv.get("gmail_refresh_token");
    return ok(c, { connected: !!token });
  });
  app.post('/api/auth/disconnect', async (c) => {
    const kv = c.env.TOKENS;
    if (kv) await kv.delete("gmail_refresh_token");
    return ok(c, { success: true });
  });
  app.post('/api/emails/send', async (c) => {
    const db = c.env.EMAIL_DB;
    const { to, subject, body, threadId, fromEmail } = await c.req.json();
    const accessToken = await getGmailAccessToken(c.env);
    let senderEmail = "user@aeromail.dev";
    if (fromEmail) {
      const parts = fromEmail.split('@');
      if (parts.length === 2) {
        const domain = parts[1];
        const { results } = await db.prepare("SELECT * FROM domains WHERE domain_name = ?").bind(domain).all();
        if (results.length > 0) senderEmail = fromEmail;
      }
    }
    let gmailSuccess = false;
    if (accessToken) {
      try {
        const raw = constructMimeMessage(to, subject, body, senderEmail);
        await sendViaGmail(accessToken, raw);
        gmailSuccess = true;
      } catch (e) { console.error("Gmail Error:", e); }
    }
    const id = crypto.randomUUID();
    const tid = threadId || crypto.randomUUID();
    const ts = Date.now();
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, folder) VALUES (?, ?, ?, ?, 'sent') ON CONFLICT(id) DO UPDATE SET last_message_at = excluded.last_message_at, snippet = excluded.snippet").bind(tid, subject, ts, body.slice(0, 100)),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', 1)").bind(id, tid, "Aero User", senderEmail, JSON.stringify([{ email: to }]), subject, body, body.slice(0, 100), ts)
    ]);
    return ok(c, { id, delivered: gmailSuccess, from: senderEmail });
  });
  app.get('/api/emails', async (c) => {
    const db = c.env.EMAIL_DB;
    const folder = c.req.query('folder') || 'inbox';
    const { results } = await db.prepare(`
      SELECT t.*,
      (SELECT GROUP_CONCAT(from_name, ', ') FROM (SELECT DISTINCT from_name FROM emails WHERE thread_id = t.id)) as participantNames
      FROM threads t
      WHERE folder = ? OR (? = 'starred' AND is_starred = 1)
      ORDER BY last_message_at DESC
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
  app.patch('/api/threads/:id', async (c) => {
    const db = c.env.EMAIL_DB;
    const id = c.param('id');
    const { folder, isStarred, isRead } = await c.req.json();
    const updates: string[] = [];
    const params: any[] = [];
    // Batch updates for both threads and emails tables
    const batchOps = [];
    if (folder !== undefined) { 
      updates.push("folder = ?"); 
      params.push(folder); 
      batchOps.push(db.prepare("UPDATE emails SET folder = ? WHERE thread_id = ?").bind(folder, id));
    }
    if (isStarred !== undefined) { 
      updates.push("is_starred = ?"); 
      params.push(isStarred ? 1 : 0); 
    }
    if (isRead !== undefined) {
      updates.push("unread_count = ?");
      params.push(isRead ? 0 : 1); // Mock behavior: unread_count is simplified
      batchOps.push(db.prepare("UPDATE emails SET is_read = ? WHERE thread_id = ?").bind(isRead ? 1 : 0, id));
    }
    if (updates.length > 0) {
      params.push(id);
      batchOps.unshift(db.prepare(`UPDATE threads SET ${updates.join(", ")} WHERE id = ?`).bind(...params));
    }
    try {
      if (batchOps.length > 0) {
        await db.batch(batchOps);
      }
      return ok(c, { success: true });
    } catch (e: any) {
      console.error("[D1 ERROR]", e.message);
      return internalError(c, "Failed to update thread state");
    }
  });
  app.post('/api/simulate/inbound', async (c) => {
    const db = c.env.EMAIL_DB;
    const id = crypto.randomUUID();
    const tid = crypto.randomUUID().slice(0, 8);
    const ts = Date.now();
    const subject = "Simulation: New Edge Capability";
    const body = "This is an automated simulation of an inbound email routing event through Cloudflare Workers.";
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