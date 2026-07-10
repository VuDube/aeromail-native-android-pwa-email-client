import { Hono } from "hono";
import { ok, bad, internalError, notFound, Env, getGmailAccessToken, encrypt, decrypt, fetchCloudflare } from './core-utils';
import { MOCK_USERS, MOCK_EMAILS } from "../shared/mock-data";
import { DomainInfo, EmailThread } from "../shared/types";
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
    const scopes = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email', 'openid'].join(' ');
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
      return bad(c, "Missing callback parameters or server infrastructure");
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
      if (tokens.error) return bad(c, tokens.error_description || tokens.error);
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
    if (c.env.TOKENS) await c.env.TOKENS.delete("gmail_refresh_token");
    return ok(c, { success: true });
  });
  // --- DOMAIN MANAGEMENT ---
  app.get('/api/domains', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return ok(c, []);
    try {
      let apiZones: any[] = [];
      if (c.env.CF_API_TOKEN) {
        try {
          apiZones = await fetchCloudflare<any[]>(c.env, "/zones");
        } catch (e) {
          console.error("CF API Error:", e);
        }
      }
      const { results: localRegistrations } = await db.prepare(
        "SELECT domain_id FROM user_domains WHERE user_id = 'me'"
      ).all() as any;
      const localSet = new Set(localRegistrations?.map((r: any) => r.domain_id) || []);
      const domains: DomainInfo[] = apiZones.map(z => ({
        id: z.id,
        name: z.name,
        status: z.status === 'active' ? 'active' : 'pending',
        isRoutingEnabled: true,
        localEnabled: localSet.has(z.id)
      }));
      return ok(c, domains);
    } catch (e: any) {
      return internalError(c, e.message);
    }
  });
  app.post('/api/domains/toggle', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return bad(c, "D1 Database required");
    const { domainId, domainName, enabled } = await c.req.json();
    if (!domainId || !domainName) return bad(c, "Missing parameters");
    try {
      if (enabled) {
        await db.batch([
          db.prepare("INSERT OR IGNORE INTO domains (id, domain_name, is_active) VALUES (?, ?, 1)").bind(domainId, domainName),
          db.prepare("INSERT OR IGNORE INTO user_domains (user_id, domain_id) VALUES (?, ?)").bind('me', domainId)
        ]);
      } else {
        await db.prepare("DELETE FROM user_domains WHERE domain_id = ? AND user_id = ?").bind(domainId, 'me').run();
      }
      return ok(c, { domainId, enabled });
    } catch (e: any) {
      return internalError(c, e.message);
    }
  });
  // --- THREAD & EMAIL ENDPOINTS ---
  app.get('/api/emails', async (c) => {
    const db = c.env.EMAIL_DB;
    const folder = c.req.query('folder') || 'inbox';
    const searchQuery = c.req.query('q');
    if (!db) {
      let mock = MOCK_EMAILS.filter(e => folder === 'starred' ? e.isStarred : e.folder === folder);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        mock = mock.filter(e => e.subject.toLowerCase().includes(q) || e.body.toLowerCase().includes(q));
      }
      return ok(c, mock.map(e => ({
        id: e.threadId,
        lastMessageAt: e.timestamp,
        subject: e.subject,
        snippet: e.snippet,
        unreadCount: e.isRead ? 0 : 1,
        isStarred: e.isStarred,
        folder: e.folder as any,
        participantNames: [e.from.name]
      })));
    }
    let query: string;
    let params: any[] = [];
    if (searchQuery) {
      query = `
        SELECT t.*, (SELECT GROUP_CONCAT(from_name, ', ') FROM (SELECT DISTINCT from_name FROM emails WHERE thread_id = t.id)) as participantNames
        FROM threads t
        WHERE (subject LIKE ? OR snippet LIKE ?)
        ORDER BY last_message_at DESC
      `;
      params = [`%${searchQuery}%`, `%${searchQuery}%`];
    } else if (folder === 'starred') {
      query = "SELECT t.*, (SELECT GROUP_CONCAT(from_name, ', ') FROM (SELECT DISTINCT from_name FROM emails WHERE thread_id = t.id)) as participantNames FROM threads t WHERE is_starred = 1 ORDER BY last_message_at DESC";
    } else {
      query = "SELECT t.*, (SELECT GROUP_CONCAT(from_name, ', ') FROM (SELECT DISTINCT from_name FROM emails WHERE thread_id = t.id)) as participantNames FROM threads t WHERE folder = ? ORDER BY last_message_at DESC";
      params = [folder];
    }
    const { results } = await db.prepare(query).bind(...params).all();
    return ok(c, results.map((r: any) => ({
      ...r,
      participantNames: r.participantNames ? r.participantNames.split(', ') : [],
      isStarred: !!r.is_starred,
      unreadCount: r.unread_count || 0
    })));
  });
  app.post('/api/drafts', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return bad(c, "D1 required");
    const { subject, body, from, to } = await c.req.json();
    const id = crypto.randomUUID();
    const ts = Date.now();
    const tid = crypto.randomUUID().slice(0, 16);
    try {
      await db.batch([
        db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder) VALUES (?, ?, ?, ?, 0, 'drafts')")
          .bind(tid, subject, ts, body.slice(0, 100)),
        db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, 'Me', ?, ?, ?, ?, ?, ?, 'drafts', 1)")
          .bind(id, tid, from, JSON.stringify(to || []), subject, body, body.slice(0, 100), ts)
      ]);
      return ok(c, { id, threadId: tid });
    } catch (e: any) {
      console.error("[D1 DRAFT ERROR]", e);
      return internalError(c, "Failed to save draft");
    }
  });
  app.post('/api/emails/send', async (c) => {
    const db = c.env.EMAIL_DB;
    const { to, subject, body, fromEmail, threadId } = await c.req.json();
    if (!db) return bad(c, "Demo Mode: Connect D1 to send");
    const token = await getGmailAccessToken(c.env);
    const id = crypto.randomUUID();
    const ts = Date.now();
    const tid = threadId || id;
    try {
      await db.batch([
        db.prepare(`
          INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder)
          VALUES (?, ?, ?, ?, 0, 'sent')
          ON CONFLICT(id) DO UPDATE SET folder = 'sent', last_message_at = excluded.last_message_at
        `).bind(tid, subject, ts, body.slice(0, 100)),
        db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, 'Aero User', ?, ?, ?, ?, ?, ?, 'sent', 1)")
          .bind(id, tid, fromEmail || "user@aeromail.dev", JSON.stringify([{ email: to }]), subject, body, body.slice(0, 100), ts)
      ]);
      return ok(c, { id, delivered: !!token });
    } catch (e: any) {
      console.error("[D1 SEND ERROR]", e);
      return internalError(c, "Message persistence failed");
    }
  });
  app.get('/api/threads/:id', async (c) => {
    const db = c.env.EMAIL_DB;
    const id = c.req.param('id');
    if (!db) {
      const e = MOCK_EMAILS.find(x => x.threadId === id) || MOCK_EMAILS[0];
      return ok(c, { thread: { ...e, messages: [e] } });
    }
    const thread = await db.prepare("SELECT * FROM threads WHERE id = ?").bind(id).first() as any;
    if (!thread) return notFound(c);
    const messages = await db.prepare("SELECT * FROM emails WHERE thread_id = ? ORDER BY timestamp ASC").bind(id).all();
    return ok(c, {
      thread: {
        ...thread,
        isStarred: !!thread.is_starred,
        messages: messages.results.map((m: any) => ({
          ...m,
          from: { name: m.from_name, email: m.from_email },
          to: JSON.parse(m.to_json),
          isRead: !!m.is_read,
          isStarred: !!m.is_starred
        }))
      }
    });
  });
  app.patch('/api/threads/:id', async (c) => {
    const db = c.env.EMAIL_DB;
    const id = c.req.param('id');
    const body = await c.req.json();
    if (!db) return ok(c, { id });
    try {
      const statements = [];
      const threadUpdates: string[] = [];
      const threadParams: any[] = [];
      if (body.isRead !== undefined) {
        threadUpdates.push("unread_count = ?");
        threadParams.push(body.isRead ? 0 : 1);
        statements.push(db.prepare("UPDATE emails SET is_read = ? WHERE thread_id = ?").bind(body.isRead ? 1 : 0, id));
      }
      if (body.isStarred !== undefined) {
        threadUpdates.push("is_starred = ?");
        threadParams.push(body.isStarred ? 1 : 0);
        statements.push(db.prepare("UPDATE emails SET is_starred = ? WHERE thread_id = ?").bind(body.isStarred ? 1 : 0, id));
      }
      if (body.folder !== undefined) {
        threadUpdates.push("folder = ?");
        threadParams.push(body.folder);
        statements.push(db.prepare("UPDATE emails SET folder = ? WHERE thread_id = ?").bind(body.folder, id));
      }
      if (threadUpdates.length > 0) {
        statements.push(db.prepare(`UPDATE threads SET ${threadUpdates.join(', ')} WHERE id = ?`).bind(...threadParams, id));
      }
      if (statements.length > 0) {
        await db.batch(statements);
      }
      return ok(c, { id });
    } catch (e: any) {
      console.error("[D1 UPDATE ERROR]", e);
      return internalError(c, "Sync update failed");
    }
  });
  app.get('/api/status', async (c) => {
    return ok(c, {
      gmail_ready: !!(c.env.GMAIL_CLIENT_ID && c.env.TOKENS),
      cf_ready: !!c.env.CF_API_TOKEN,
      db_ready: !!c.env.EMAIL_DB,
      demo_mode: !c.env.EMAIL_DB
    });
  });
  app.post('/api/simulate/inbound', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return bad(c, "Simulation requires D1");
    const tid = crypto.randomUUID().slice(0, 8);
    const ts = Date.now();
    await db.batch([
      db.prepare("INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder) VALUES (?, 'Simulation', ?, 'Test message', 1, 'inbox')").bind(tid, ts),
      db.prepare("INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) VALUES (?, ?, 'Simulator', 'bot@cf.com', '[]', 'Simulation', 'Body', 'Snippet', ?, 'inbox', 0)").bind(crypto.randomUUID(), tid, ts)
    ]);
    return ok(c, { threadId: tid });
  });
}