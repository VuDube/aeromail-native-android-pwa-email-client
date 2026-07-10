export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type FolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'starred' | 'spam' | 'archive';
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
  url?: string;
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
}
export interface EmailThread {
  id: string;
  lastMessageAt: number;
  snippet: string;
  subject: string;
  messages?: Email[];
  participantNames: string[];
  unreadCount: number;
  isStarred: boolean;
  folder: FolderType;
}
export interface DomainInfo {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'deleted';
  isRoutingEnabled: boolean;
  localEnabled: boolean;
}
export interface DraftInfo {
  id?: string;
  threadId?: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
}
export interface SimulateResponse {
  success: boolean;
  threadId: string;
}