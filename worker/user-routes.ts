import { Hono } from "hono";
import type { Env } from './core-utils';
import { EmailEntity, MailboxEntity, UserEntity, ThreadEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import { FolderType, Email } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/init', async (c) => {
    try {
      await UserEntity.ensureSeed(c.env);
      await EmailEntity.ensureSeed(c.env);
      const { items: emails } = await EmailEntity.list(c.env, null, 100);
      for (const email of emails) {
        await MailboxEntity.processNewEmail(c.env, email);
      }
      return ok(c, { initialized: true });
    } catch (e) {
      return bad(c, 'Failed to initialize: ' + String(e));
    }
  });
  app.post('/api/init/reset', async (c) => {
    try {
      const { items: emails } = await EmailEntity.list(c.env, null, 1000);
      const { items: threads } = await ThreadEntity.list(c.env, null, 1000);
      const { items: users } = await UserEntity.list(c.env, null, 100);
      await EmailEntity.deleteMany(c.env, emails.map(e => e.id));
      await ThreadEntity.deleteMany(c.env, threads.map(t => t.id));
      await UserEntity.deleteMany(c.env, users.map(u => u.id));
      const folders: FolderType[] = ['inbox', 'sent', 'drafts', 'trash', 'starred'];
      for (const f of folders) {
        const idx = await EmailEntity.getCompositeIndex(c.env, f);
        await idx.clear();
      }
      await UserEntity.ensureSeed(c.env);
      await EmailEntity.ensureSeed(c.env);
      const { items: freshEmails } = await EmailEntity.list(c.env, null, 100);
      for (const e of freshEmails) {
        await MailboxEntity.processNewEmail(c.env, e);
      }
      return ok(c, { reset: true });
    } catch (e) {
      return bad(c, 'Reset failed: ' + String(e));
    }
  });
  app.get('/api/emails', async (c) => {
    const folder = (c.req.query('folder') as FolderType) || 'inbox';
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
    try {
      const threads = await MailboxEntity.listThreadsByFolder(c.env, folder, limit);
      return ok(c, threads);
    } catch (e) {
      return bad(c, 'Failed to fetch mailbox: ' + String(e));
    }
  });
  app.get('/api/emails/:id', async (c) => {
    const id = c.req.param('id');
    const entity = new EmailEntity(c.env, id);
    if (!await entity.exists()) return notFound(c, 'Email not found');
    const email = await entity.getState();
    const threadEntity = new ThreadEntity(c.env, email.threadId);
    const thread = await threadEntity.getState();
    return ok(c, { ...email, thread });
  });
  app.patch('/api/emails/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const entity = new EmailEntity(c.env, id);
    if (!await entity.exists()) return notFound(c, 'Email not found');
    const oldState = await entity.getState();
    const newState = await entity.mutate(s => ({ ...s, ...updates }));
    // Sync to ThreadEntity messages list
    const threadInst = new ThreadEntity(c.env, newState.threadId);
    await threadInst.mutate(s => ({
      ...s,
      messages: s.messages.map(m => m.id === id ? newState : m)
    }));
    await threadInst.refreshMetadata(c.env);
    if (oldState.folder !== newState.folder || oldState.isStarred !== newState.isStarred) {
      await EmailEntity.updateCompositeIndexes(c.env, oldState, true);
      await EmailEntity.updateCompositeIndexes(c.env, newState);
    }
    return ok(c, newState);
  });
  app.post('/api/threads/:id/read', async (c) => {
    const threadId = c.req.param('id');
    const threadInst = new ThreadEntity(c.env, threadId);
    if (!await threadInst.exists()) return notFound(c, 'Thread not found');
    const thread = await threadInst.mutate(s => ({
      ...s,
      messages: s.messages.map(m => ({ ...m, isRead: true })),
      unreadCount: 0
    }));
    // Cascade to individual emails
    for (const msg of thread.messages) {
      const e = new EmailEntity(c.env, msg.id);
      await e.patch({ isRead: true });
    }
    return ok(c, thread);
  });
  app.post('/api/emails/send', async (c) => {
    const { to, subject, body, threadId } = await c.req.json();
    const email: Email = {
      id: crypto.randomUUID(),
      threadId: threadId || crypto.randomUUID(),
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
    await MailboxEntity.processNewEmail(c.env, email);
    return ok(c, email);
  });
  app.post('/api/simulation/inbound', async (c) => {
    const { subject } = await c.req.json();
    const email = await MailboxEntity.simulateInbound(c.env, subject || "New Message");
    return ok(c, email);
  });
  app.get('/api/me', async (c) => {
    const users = await UserEntity.list(c.env, null, 1);
    return ok(c, users.items[0] || MOCK_USERS[0]);
  });
}