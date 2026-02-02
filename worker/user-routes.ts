import { Hono } from "hono";
import type { Env } from './core-utils';
import { EmailEntity, MailboxEntity, UserEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import { FolderType, Email } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // SEED INITIAL DATA
  app.get('/api/init', async (c) => {
    await UserEntity.ensureSeed(c.env);
    await EmailEntity.ensureSeed(c.env);
    return ok(c, { initialized: true });
  });
  // RESET SYSTEM
  app.post('/api/init/reset', async (c) => {
    const { items: emails } = await EmailEntity.list(c.env, null, 1000);
    const { items: users } = await UserEntity.list(c.env, null, 100);
    await EmailEntity.deleteMany(c.env, emails.map(e => e.id));
    await UserEntity.deleteMany(c.env, users.map(u => u.id));
    await UserEntity.ensureSeed(c.env);
    await EmailEntity.ensureSeed(c.env);
    return ok(c, { reset: true });
  });
  // EMAILS
  app.get('/api/emails', async (c) => {
    const folder = (c.req.query('folder') as FolderType) || 'inbox';
    const limit = Number(c.req.query('limit')) || 50;
    const { items: allEmails } = await EmailEntity.list(c.env, null, 200);
    // Improved folder logic: Starred folder shows all starred items regardless of original folder
    const filtered = allEmails
      .filter(e => {
        if (folder === 'starred') return e.isStarred && e.folder !== 'trash';
        if (folder === 'trash') return e.folder === 'trash';
        return e.folder === folder;
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    return ok(c, filtered);
  });
  app.get('/api/emails/:id', async (c) => {
    const id = c.req.param('id');
    const entity = new EmailEntity(c.env, id);
    if (!await entity.exists()) return notFound(c, 'Email not found');
    return ok(c, await entity.getState());
  });
  app.patch('/api/emails/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const entity = new EmailEntity(c.env, id);
    if (!await entity.exists()) return notFound(c, 'Email not found');
    await entity.patch(updates);
    return ok(c, await entity.getState());
  });
  app.post('/api/emails/send', async (c) => {
    const { to, subject, body } = await c.req.json() as { to: string, subject: string, body: string };
    const email: Email = {
      id: crypto.randomUUID(),
      threadId: crypto.randomUUID(),
      from: { name: "Current User", email: "user@aeromail.dev" },
      to: [{ name: to.split('@')[0], email: to }],
      subject,
      snippet: body.slice(0, 100),
      body,
      timestamp: Date.now(),
      isRead: true,
      isStarred: false,
      folder: "sent"
    };
    const created = await EmailEntity.create(c.env, email);
    return ok(c, created);
  });
  // SIMULATION
  app.post('/api/simulation/inbound', async (c) => {
    const { subject } = await c.req.json() as { subject?: string };
    const email = await MailboxEntity.simulateInbound(c.env, subject || "Test Inbound Email");
    return ok(c, email);
  });
  // USERS
  app.get('/api/me', async (c) => {
    const users = await UserEntity.list(c.env, null, 1);
    if (users.items.length === 0) {
      await UserEntity.ensureSeed(c.env);
      const seeded = await UserEntity.list(c.env, null, 1);
      return ok(c, seeded.items[0]);
    }
    return ok(c, users.items[0]);
  });
}