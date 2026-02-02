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
  // Composite Indexing implementation for Relational-style queries
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
      // Key format: [padded_timestamp]:[id] - allows lexicographical sorting by time
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
    const { items: sortKeys } = await compositeIdx.page(null, 500); // Fetch bulk to group into threads
    // Extract IDs and fetch Emails
    const emailIds = sortKeys.map(key => key.split(':')[1]);
    const emails = await Promise.all(emailIds.map(id => new EmailEntity(env, id).getState()));
    // Group into threads
    const threadMap = new Map<string, EmailThread>();
    for (const email of emails) {
      if (!email.id) continue;
      let thread = threadMap.get(email.threadId);
      if (!thread) {
        const threadInstance = new ThreadEntity(env, email.threadId);
        const threadData = await threadInstance.getState();
        // If thread doesn't exist in storage yet (legacy or first message), initialize it
        thread = threadData.id ? threadData : {
          id: email.threadId,
          subject: email.subject,
          messages: [],
          participantNames: [],
          lastMessageAt: 0,
          snippet: "",
          unreadCount: 0,
          isStarred: false,
          folder: email.folder
        };
      }
      thread.messages.push(email);
      if (email.timestamp > thread.lastMessageAt) {
        thread.lastMessageAt = email.timestamp;
        thread.snippet = email.snippet;
      }
      if (!email.isRead) thread.unreadCount++;
      if (email.isStarred) thread.isStarred = true;
      if (!thread.participantNames.includes(email.from.name)) {
        thread.participantNames.push(email.from.name);
      }
      threadMap.set(email.threadId, thread);
    }
    return Array.from(threadMap.values())
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
      const participants = isExisting ? [...s.participantNames] : [];
      if (!participants.includes(email.from.name)) participants.push(email.from.name);
      return {
        id: email.threadId,
        subject: isExisting ? s.subject : email.subject,
        lastMessageAt: Math.max(s.lastMessageAt || 0, email.timestamp),
        snippet: email.timestamp >= (s.lastMessageAt || 0) ? email.snippet : s.snippet,
        messages: isExisting ? [...s.messages, email] : [email],
        participantNames: participants,
        unreadCount: (s.unreadCount || 0) + (email.isRead ? 0 : 1),
        isStarred: s.isStarred || email.isStarred,
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