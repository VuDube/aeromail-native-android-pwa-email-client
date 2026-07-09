import { Hono } from "hono";
import { ok, bad, internalError, notFound, Env, getGmailAccessToken, constructMimeMessage, sendViaGmail, encrypt, getCloudflareZones, getZoneEmailRoutingStatus } from './core-utils';
import { MOCK_USERS } from "@shared/mock-data";
import { DomainInfo } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/status', async (c) => {
    return ok(c, {
      gmail_config: !!(c.env.GMAIL_CLIENT_ID && c.env.GMAIL_CLIENT_SECRET && c.env.REDIRECT_URI && c.env.ENCRYPTION_SECRET),
      cf_token_ready: !!c.env.CF_API_TOKEN,
      kv_ready: !!c.env.TOKENS,
      db_ready: !!c.env.EMAIL_DB,
      version: '1.5.0-multi-domain'
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
    const userId = "u1"; // Mock single user for now
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
  app.post('/api/emails/send', async (c) => {
    const db = c.env.EMAIL_DB;
    const { to, subject, body, threadId, fromEmail } = await c.req.json();
    const accessToken = await getGmailAccessToken(c.env);
    // Validate fromEmail if provided
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
    const { results } = await db.prepare("SELECT * FROM threads WHERE folder = ? OR (? = 'starred' AND is_starred = 1) ORDER BY last_message_at DESC").bind(folder, folder).all();
    return ok(c, results);
  });
  app.get('/api/me', (c) => ok(c, MOCK_USERS[0]));
}