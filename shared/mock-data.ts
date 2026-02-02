import type { User, Email, EmailThread } from './types';
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Aero User', email: 'user@aeromail.dev' },
  { id: 'u2', name: 'Alex Rivera', email: 'alex@example.com' },
  { id: 'u3', name: 'Cloudflare Team', email: 'no-reply@cloudflare.com' }
];
export const MOCK_EMAILS: Email[] = [
  {
    id: 'e1',
    threadId: 't1',
    from: { name: 'Cloudflare Team', email: 'no-reply@cloudflare.com' },
    to: [{ name: 'Aero User', email: 'user@aeromail.dev' }],
    subject: 'Welcome to AeroMail',
    snippet: 'Experience the next generation of email built on the edge.',
    body: 'Hello!\n\nWelcome to AeroMail. This is a Progressive Web App powered by Cloudflare Workers and Durable Objects.\n\nEnjoy the speed!',
    timestamp: Date.now() - 3600000,
    isRead: false,
    isStarred: true,
    folder: 'inbox'
  },
  {
    id: 'e2',
    threadId: 't2',
    from: { name: 'Alex Rivera', email: 'alex@example.com' },
    to: [{ name: 'Aero User', email: 'user@aeromail.dev' }],
    subject: 'Project Update: Phase 1 Complete',
    snippet: 'The foundation of the Material Design 3 shell is now ready for review.',
    body: 'Hey,\n\nI just finished the M3 shell implementation. Take a look at the navigation rail and bottom bar.\n\nBest,\nAlex',
    timestamp: Date.now() - 7200000,
    isRead: true,
    isStarred: false,
    folder: 'inbox'
  },
  {
    id: 'e3',
    threadId: 't3',
    from: { name: 'Vercel', email: 'notifs@vercel.com' },
    to: [{ name: 'Aero User', email: 'user@aeromail.dev' }],
    subject: 'Deployment Successful',
    snippet: 'Your project aeromail-pwa has been deployed to production.',
    body: 'Success! Your latest changes are live.',
    timestamp: Date.now() - 86400000,
    isRead: true,
    isStarred: false,
    folder: 'inbox'
  }
];
export const MOCK_CHATS = [];
export const MOCK_CHAT_MESSAGES = [];