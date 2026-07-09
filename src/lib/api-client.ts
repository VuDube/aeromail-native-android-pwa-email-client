import { ApiResponse } from "../../shared/types"
/**
 * Standardized API Client for AeroMail
 * Enforces production D1/KV bindings and handles edge errors gracefully.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal,
      ...init
    });
    // Handle redirecting logic if redirected (uncommon for JSON fetch, but possible)
    if (res.redirected) {
      window.location.href = res.url;
      // Return a dummy promise that never resolves as the page is unloading
      return new Promise(() => {});
    }
    const rawText = await res.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(rawText) as ApiResponse<T>;
    } catch (e) {
      const text = rawText.toLowerCase();
      if (text.includes('gmail_config_missing')) {
        throw new Error("Configuration Error: GMAIL_CLIENT_ID or REDIRECT_URI is missing from worker secrets.");
      }
      if (text.includes('binding') || text.includes('500 internal server error')) {
        throw new Error("Relational Storage Error: The 'EMAIL_DB' or 'TOKENS' binding is missing or failed.");
      }
      throw new Error(`Unexpected Response: ${res.status}. Check system status.`);
    }
    if (!res.ok || !json.success || json.data === undefined) {
      throw new Error(json.error || `Request failed (${res.status})`);
    }
    return json.data;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error("Request timeout (15s)");
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}