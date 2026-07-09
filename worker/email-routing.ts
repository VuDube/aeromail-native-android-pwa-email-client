import PostalMime from 'postal-mime';
import { Env } from './core-utils';
/**
 * Deterministic Thread ID Generation
 * Groups messages by sender and normalized subject to form conversations without IMAP headers.
 */
async function generateThreadId(subject: string, fromEmail: string): Promise<string> {
  const normalizedSubject = subject
    .replace(/^(re|fwd|aw|fw|reply|forward):\s*/i, '')
    .trim()
    .toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${normalizedSubject}-${fromEmail.toLowerCase()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    if (!env.EMAIL_DB) {
      console.error("Critical: D1 database binding 'EMAIL_DB' is missing. Email rejected.");
      return;
    }
    try {
      const parser = new PostalMime();
      // PostalMime.parse accepts ArrayBuffer, ReadableStream, or string
      const parsed = await parser.parse(message.raw);
      const fromEmail = message.from;
      const fromName = parsed.from?.name || fromEmail.split('@')[0];
      const subject = parsed.subject || '(No Subject)';
      const body = parsed.text || parsed.html || '(Empty Message)';
      const snippet = body.slice(0, 120).replace(/\s+/g, ' ').trim();
      const timestamp = Date.now();
      const threadId = await generateThreadId(subject, fromEmail);
      const emailId = crypto.randomUUID();
      // D1 Transactional Batch
      await env.EMAIL_DB.batch([
        // 1. Upsert Thread (Material You inspired density/interaction)
        env.EMAIL_DB.prepare(`
          INSERT INTO threads (id, subject, last_message_at, snippet, unread_count, folder)
          VALUES (?, ?, ?, ?, 1, 'inbox')
          ON CONFLICT(id) DO UPDATE SET
            last_message_at = excluded.last_message_at,
            snippet = excluded.snippet,
            unread_count = unread_count + 1,
            folder = 'inbox'
        `).bind(threadId, subject, timestamp, snippet),
        // 2. Insert individual Email
        env.EMAIL_DB.prepare(`
          INSERT INTO emails (id, thread_id, from_name, from_email, to_json, subject, body, snippet, timestamp, folder, is_read)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox', 0)
        `).bind(
          emailId,
          threadId,
          fromName,
          fromEmail,
          JSON.stringify([{ name: parsed.to?.[0]?.name || '', email: message.to }]),
          subject,
          body,
          snippet,
          timestamp
        )
      ]);
      console.log(`Routed inbound email ${emailId} to thread ${threadId}`);
    } catch (error) {
      console.error("Inbound email processing failed:", error);
    }
  }
};