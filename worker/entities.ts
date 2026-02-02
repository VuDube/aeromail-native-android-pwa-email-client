import { IndexedEntity, Index } from "./core-utils";
import type { User, Email, FolderType, EmailThread } from "@shared/types";
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", name: "", email: "" };
  static seedData = MOCK_USERS;
}
export class ThreadEntity extends IndexedEntity<EmailThread> {
  static readonly entityName = "thread";
  static readonly indexName = "threads";
  static readonly initialState: EmailThread = {
    id: "",
    lastMessageAt: 0,
    snippet: "",
    subject: "",
    messages: [],
    participantNames: [],
    unreadCount: 0,
    isStarred: false,
    folder: "inbox"
  };
  /**
   * Synchronizes thread metadata based on its constituent messages.
   * Useful when an individual message is updated (e.g., marked as read).
   */
  async refreshMetadata(env: any): Promise<EmailThread> {
    return this.mutate(s => {
      const messages = s.messages || [];
      if (messages.length === 0) return s;
      const unreadCount = messages.filter(m => !m.isRead).length;
      const isStarred = messages.some(m => m.isStarred);
      const lastMsg = [...messages].sort((a, b) => b.timestamp - a.timestamp)[0];
      return {
        ...s,
        unreadCount,
        isStarred,
        lastMessageAt: lastMsg.timestamp,
        snippet: lastMsg.snippet
      };
    });
  }
}
export class EmailEntity extends IndexedEntity<Email> {
  static readonly entityName = "email";
  static readonly indexName = "emails";
  static readonly initialState: Email = {
    id: "",
    threadId: "",
    from: { name: "", email: "" },
    to: [],
    subject: "",
    body: "",
    snippet: "",
    timestamp: 0,
    isRead: false,
    isStarred: false,
    folder: "inbox"
  };
  static seedData = MOCK_EMAILS;
  static async getCompositeIndex(env: any, folder: FolderType) {
    return new Index<string>(env, `composite:folder:${folder}`);
  }
  static async updateCompositeIndexes(env: any, email: Email, isRemoving = false) {
    const folders: FolderType[] = [email.folder];
    if (email.isStarred && email.folder !== 'trash') {
      folders.push('starred');
    }
    for (const f of folders) {
      const idx = await this.getCompositeIndex(env, f);
      const sortKey = `${String(email.timestamp).padStart(15, '0')}:${email.id}`;
      if (isRemoving) {
        await idx.remove(sortKey);
      } else {
        await idx.add(sortKey);
      }
    }
  }
}
export class MailboxEntity {
  static async listThreadsByFolder(env: any, folder: FolderType, limit = 50): Promise<EmailThread[]> {
    const compositeIdx = await EmailEntity.getCompositeIndex(env, folder);
    // Page for IDs
    const { items: sortKeys } = await compositeIdx.page(null, 200);
    const emailIds = sortKeys.map(key => key.split(':')[1]);
    // Fetch unique threads involved
    const emails = await Promise.all(emailIds.map(id => new EmailEntity(env, id).getState()));
    const threadIds = Array.from(new Set(emails.map(e => e.threadId).filter(Boolean)));
    // Fetch and sort threads
    const threads = await Promise.all(threadIds.map(tid => new ThreadEntity(env, tid).getState()));
    return threads
      .filter(t => t.id && t.folder === folder || (folder === 'starred' && t.isStarred))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .slice(0, limit);
  }
  static async processNewEmail(env: any, email: Email) {
    // 1. Save Email
    await EmailEntity.create(env, email);
    // 2. Update Composite Indexes
    await EmailEntity.updateCompositeIndexes(env, email);
    // 3. Atomic Thread Update
    const threadInst = new ThreadEntity(env, email.threadId);
    await threadInst.mutate(s => {
      const isExisting = !!s.id;
      const messages = isExisting ? [...s.messages, email] : [email];
      const participants = isExisting ? [...s.participantNames] : [];
      if (!participants.includes(email.from.name)) participants.push(email.from.name);
      return {
        id: email.threadId,
        subject: isExisting ? s.subject : email.subject,
        lastMessageAt: Math.max(s.lastMessageAt || 0, email.timestamp),
        snippet: email.timestamp >= (s.lastMessageAt || 0) ? email.snippet : s.snippet,
        messages: messages.sort((a, b) => a.timestamp - b.timestamp),
        participantNames: participants,
        unreadCount: messages.filter(m => !m.isRead).length,
        isStarred: messages.some(m => m.isStarred),
        folder: email.folder
      };
    });
    // 4. Update Thread Index
    const threadIdx = new Index<string>(env, ThreadEntity.indexName);
    await threadIdx.add(email.threadId);
  }
  static async simulateInbound(env: any, subject: string): Promise<Email> {
    const email: Email = {
      id: crypto.randomUUID(),
      threadId: crypto.randomUUID(),
      from: { name: "System Simulator", email: "sim@aeromail.dev" },
      to: [{ name: "User", email: "user@aeromail.dev" }],
      subject,
      snippet: "This is a simulated incoming email.",
      body: "Generated automatically for testing high-performance indexing.",
      timestamp: Date.now(),
      isRead: false,
      isStarred: false,
      folder: "inbox"
    };
    await this.processNewEmail(env, email);
    return email;
  }
}