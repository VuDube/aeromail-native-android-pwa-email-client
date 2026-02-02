import { Hono } from "hono";
import type { Env } from './core-utils';
import { EmailEntity, MailboxEntity, UserEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import { FolderType } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // SEED INITIAL DATA
  app.get('/api/init', async (c) => {
    await UserEntity.ensureSeed(c.env);
    await EmailEntity.ensureSeed(c.env);
    return ok(c, { initialized: true });
  });
  // EMAILS
  app.get('/api/emails', async (c) => {
    const folder = (c.req.query('folder') as FolderType) || 'inbox';
    const limit = Number(c.req.query('limit')) || 50;
    const emails = await MailboxEntity.listByFolder(c.env, folder, limit);
    return ok(c, emails);
  });
  app.get('/api/emails/:id', async (c) => {
    const id = c.req.param('id');
    const entity = new EmailEntity(c.env, id);
    if (!await entity.exists()) return notFound(c, 'Email not found');
    return ok(c, await entity.getState());
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