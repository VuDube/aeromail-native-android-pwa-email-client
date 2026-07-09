import { ApiResponse } from "../../shared/types"
/**
 * Standardized API Client for AeroMail
 * Handles production D1/KV bindings, OAuth redirects, and configuration errors.
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
    // Handle OAuth redirections (Google/Callback)
    if (res.redirected) {
      console.log("[API] Navigating to redirect URL:", res.url);
      window.location.href = res.url;
      // Return a promise that never resolves as the page is unloading
      return new Promise(() => {});
    }
    const rawText = await res.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(rawText) as ApiResponse<T>;
    } catch (e) {
      const text = rawText.toLowerCase();
      // Detect common backend-specific error patterns
      if (text.includes('gmail_config_missing')) {
        throw new Error("Outbound integration is not configured. Please set GMAIL_CLIENT_ID and other secrets in Cloudflare.");
      }
      if (text.includes('binding') || res.status === 500) {
        throw new Error("System binding error. Check if EMAIL_DB or TOKENS is correctly attached.");
      }
      throw new Error(`Invalid response format (${res.status}).`);
    }
    if (!res.ok || !json.success || json.data === undefined) {
      throw new Error(json.error || `Request failed with status ${res.status}`);
    }
    return json.data;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error("Connection timed out. Check your network or the Cloudflare status.");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}