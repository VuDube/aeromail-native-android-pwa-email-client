import { Hono } from "hono";
import { ok, bad, internalError, notFound, Env, getGmailAccessToken, constructMimeMessage, sendViaGmail, encrypt } from './core-utils';
import { MOCK_USERS } from "@shared/mock-data";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/status', (c) => {
    return ok(c, {
      gmail_config: !!(c.env.GMAIL_CLIENT_ID && c.env.GMAIL_CLIENT_SECRET && c.env.REDIRECT_URI && c.env.ENCRYPTION_SECRET),
      kv_ready: !!c.env.TOKENS,
      db_ready: !!c.env.EMAIL_DB,
      version: '1.4.0-gmail-ready'
    });
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
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email"
      ].join(" "),
      state: crypto.randomUUID()
    };
    const qs = new URLSearchParams(options).toString();
    return c.redirect(`${rootUrl}?${qs}`);
  });
  app.get('/api/auth/callback', async (c) => {
    const code = c.req.query('code');
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, REDIRECT_URI, TOKENS, ENCRYPTION_SECRET } = c.env;
    if (!code || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !REDIRECT_URI || !TOKENS || !ENCRYPTION_SECRET) {
      return bad(c, "Missing parameters for auth callback");
    }
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GMAIL_CLIENT_ID,
          client_secret: GMAIL_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      const data = await response.json() as any;
      if (data.refresh_token) {
        const encrypted = await encrypt(data.refresh_token, ENCRYPTION_SECRET);
        await TOKENS.put("gmail_refresh_token", encrypted);
        return c.redirect('/settings?auth=success');
      }
      // If user already authorized, refresh_token might not be present unless prompt=consent was used
      return bad(c, "No refresh token received. Try disconnecting and reconnecting.");
    } catch (e) {
      return internalError(c, String(e));
    }
  });
  app.get('/api/auth/status', async (c) => {
    const kv = c.env.TOKENS;
    if (!kv) return ok(c, { connected: false });
    const token = await kv.get("gmail_refresh_token");
    return ok(c, { connected: !!token });
  });
  app.post('/api/auth/disconnect', async (c) => {
    if (c.env.TOKENS) {
      await c.env.TOKENS.delete("gmail_refresh_token");
    }
    return ok(c, { success: true });
  });
  app.post('/api/emails/send', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return internalError(c, "D1 Missing");
    const { to, subject, body, threadId } = await c.req.json();
    const accessToken = await getGmailAccessToken(c.env);
    let gmailSuccess = false;
    if (accessToken) {
      try {
        const raw = constructMimeMessage(to, subject, body);
        await sendViaGmail(accessToken, raw);
        gmailSuccess = true;
      } catch (e) {
        console.error("Gmail sending failed, falling back to local storage only:", e);
      }
    }
    const id = crypto.randomUUID();
    const tid = threadId || crypto.randomUUID();
    const ts = Date.now();
    // Persist to D1 Sent Folder
    await db.batch([
      db.prepare(`
        INSERT INTO threads (id, subject, last_message_at, snippet, folder) 
        VALUES (?, ?, ?, ?, 'sent') 
        ON CONFLICT(id) DO UPDATE SET 
          last_message_at = excluded.last_message_at, 
          snippet = excluded.snippet
      `).bind(tid, subject, ts, body.slice(0, 100)),
      db.prepare(`
        INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', 1)
      `).bind(id, tid, "Aero User", "user@aeromail.dev", JSON.stringify([{ email: to }]), subject, body, body.slice(0, 100), ts)
    ]);
    return ok(c, { id, delivered: gmailSuccess });
  });
  app.get('/api/emails', async (c) => {
    const db = c.env.EMAIL_DB;
    if (!db) return internalError(c, "D1 Missing");
    const folder = c.req.query('folder') || 'inbox';
    try {
      const { results } = await db.prepare("SELECT * FROM threads WHERE folder = ? OR (? = 'starred' AND is_starred = 1) ORDER BY last_message_at DESC").bind(folder, folder).all();
      return ok(c, results);
    } catch (e) { return internalError(c, String(e)); }
  });
  app.get('/api/me', (c) => ok(c, MOCK_USERS[0]));
}