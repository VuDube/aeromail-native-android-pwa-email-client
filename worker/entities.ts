import { IndexedEntity } from "./core-utils";
import type { User, Email, FolderType } from "@shared/types";
import { MOCK_USERS, MOCK_EMAILS } from "@shared/mock-data";
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", name: "", email: "" };
  static seedData = MOCK_USERS;
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
}
export class MailboxEntity {
  static async listByFolder(env: any, folder: FolderType, limit = 50): Promise<Email[]> {
    const { items: emails } = await EmailEntity.list(env, null, 200);
    return emails
      .filter(e => e.folder === folder)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  static async simulateInbound(env: any, subject: string): Promise<Email> {
    const email: Email = {
      id: crypto.randomUUID(),
      threadId: crypto.randomUUID(),
      from: { name: "System Simulator", email: "sim@aeromail.dev" },
      to: [{ name: "User", email: "user@aeromail.dev" }],
      subject,
      snippet: "This is a simulated incoming email.",
      body: "Generated automatically for testing.",
      timestamp: Date.now(),
      isRead: false,
      isStarred: false,
      folder: "inbox"
    };
    return await EmailEntity.create(env, email);
  }
}