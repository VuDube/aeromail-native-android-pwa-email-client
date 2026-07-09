import type { ApiResponse } from "@shared/types";
import type { Context } from "hono";
export interface Env {
  EMAIL_DB: D1Database;
  TOKENS: KVNamespace;
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  REDIRECT_URI?: string;
  ENCRYPTION_SECRET?: string;
}
export const ok = <T>(c: Context, data: T) => {
  return c.json({ success: true, data } as ApiResponse<T>);
};
export const bad = (c: Context, error: string) => {
  return c.json({ success: false, error } as ApiResponse, 400);
};
export const notFound = (c: Context, error = 'Resource not found') => {
  return c.json({ success: false, error } as ApiResponse, 404);
};
export const internalError = (c: Context, error: string) => {
  return c.json({ success: false, error } as ApiResponse, 500);
};
/**
 * Basic AES-GCM Encryption/Decryption Helpers using Web Crypto
 */
async function getCryptoKey(secret: string) {
  const enc = new TextEncoder();
  // Ensure secret is 32 bytes for AES-256
  const keyData = enc.encode(secret.padEnd(32, '0').slice(0, 32));
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}
export async function encrypt(text: string, secret: string): Promise<string> {
  const key = await getCryptoKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  // Return as Base64 string
  return btoa(String.fromCharCode(...combined));
}
export async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const key = await getCryptoKey(secret);
  const combined = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
/**
 * Gmail OAuth2 & API Helpers
 */
export async function getGmailAccessToken(env: Env): Promise<string | null> {
  if (!env.TOKENS || !env.ENCRYPTION_SECRET || !env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) {
    console.warn("Gmail config or TOKENS binding missing");
    return null;
  }
  const encryptedToken = await env.TOKENS.get("gmail_refresh_token");
  if (!encryptedToken) return null;
  try {
    const refreshToken = await decrypt(encryptedToken, env.ENCRYPTION_SECRET);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await response.json() as any;
    if (data.error) {
      console.error("Gmail Token Refresh Error:", data.error_description || data.error);
      return null;
    }
    return data.access_token || null;
  } catch (e) {
    console.error("Token refresh operation failed:", e);
    return null;
  }
}
export function constructMimeMessage(to: string, subject: string, body: string): string {
  const mime = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    '',
    body
  ].join('\r\n');
  // Base64Url encode (standard for Gmail API)
  return btoa(mime)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
export async function sendViaGmail(accessToken: string, rawMessage: string) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawMessage }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gmail API Error: ${err}`);
  }
  return response.json();
}