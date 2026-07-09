import PostalMime from 'postal-mime';
import { Env } from './core-utils';
/**
 * Deterministic Thread ID Generation
 * Groups messages by sender and normalized subject to form conversations without IMAP headers.
 */
async function generateThreadId(subject: string, fromEmail: string): Promise<string> {
  const normalizedSubject = subject
    .replace(/^(re|fwd|aw|fw):\s*/i, '')
    .trim()
    .toLowerCase();
  const msgUint8 = new TextEncoder().encode(`${normalizedSubject}-${fromEmail.toLowerCase()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    if (!env.EMAIL_DB) {
      console.error("D1 database binding 'EMAIL_DB' is missing. Email rejected.");
      return;
    }
    try {
      const parser = new PostalMime();
      const raw = await new Response(message.raw).arrayBuffer();
      const parsed = await parser.parse(raw);
      const fromEmail = message.from;
      const fromName = parsed.from?.name || fromEmail.split('@')[0];
      const subject = parsed.subject || '(No Subject)';
      const body = parsed.text || parsed.html || '';
      const snippet = body.slice(0, 120).replace(/\s+/g, ' ').trim();
      const timestamp = Date.now();
      const threadId = await generateThreadId(subject, fromEmail);
      const emailId = crypto.randomUUID();
      // D1 Atomic Transaction
      await env.EMAIL_DB.batch([
        // 1. Upsert Thread
        env.EMAIL_DB.prepare(`
          INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder)
          VALUES (?, ?, ?, ?, 1, 'inbox')
          ON CONFLICT(id) DO UPDATE SET
            last_message_at = excluded.last_message_at,
            snippet = excluded.snippet,
            unread_count = unread_count + 1
        `).bind(threadId, subject, timestamp, snippet),
        // 2. Insert Email
        env.EMAIL_DB.prepare(`
          INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox', 0)
        `).bind(
          emailId, 
          threadId, 
          fromName, 
          fromEmail, 
          JSON.stringify([{ email: message.to }]), 
          subject, 
          body, 
          snippet, 
          timestamp
        )
      ]);
      console.log(`Successfully routed email ${emailId} to thread ${threadId}`);
    } catch (error) {
      console.error("Email processing failed:", error);
      // We don't want to lose the message if it's a transient error, 
      // but in this environment we log and fail gracefully.
    }
  }
};