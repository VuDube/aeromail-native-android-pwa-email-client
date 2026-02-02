export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type FolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'starred';
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
}
export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
}
export interface Email {
  id: string;
  threadId: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  subject: string;
  body: string;
  snippet: string;
  timestamp: number;
  isRead: boolean;
  isStarred: boolean;
  folder: FolderType;
  attachments?: EmailAttachment[];
  // Composite key for indexing: folder:timestamp:id
  indexKey?: string;
}
export interface EmailThread {
  id: string;
  lastMessageAt: number;
  snippet: string;
  subject: string;
  messages: Email[];
  participantNames: string[];
  unreadCount: number;
  isStarred: boolean; // Computed: true if any message in thread is starred
  folder: FolderType;
}