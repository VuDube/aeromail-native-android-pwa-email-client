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
      if (text.includes('binding') || text.includes('d1_error') || res.status === 500) {
        throw new Error("Infrastructure Error: The database (D1) or storage (KV) binding is missing or disconnected. Please verify your wrangler.jsonc configuration.");
      }
      throw new Error(`Critical Server Error (${res.status}): The backend returned an invalid response format.`);
    }
    if (!res.ok || !json.success) {
      const errorMessage = json.error || `Request failed with status ${res.status}`;
      // Special handling for D1 specific errors returned in payload
      if (errorMessage.includes("D1_ERROR") || errorMessage.includes("prepare")) {
        throw new Error("Cloudflare D1 Database Error: Failed to execute query. Check binding 'EMAIL_DB'.");
      }
      throw new Error(errorMessage);
    }
    // Handle cases where success is true but data is null/undefined unexpectedly
    if (json.data === undefined) {
      throw new Error("The server completed the request but did not return any data.");
    }
    return json.data;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error("Connection timed out. The edge network is taking too long to respond.");
    }
    console.error("[API CLIENT ERROR]", e.message);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}