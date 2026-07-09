import { ApiResponse } from "../../shared/types"
/**
 * Standardized API Client for AeroMail
 * Enforces production D1 bindings and handles edge errors gracefully.
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
    const rawText = await res.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(rawText) as ApiResponse<T>;
    } catch (e) {
      // Catch common Cloudflare Worker error pages/responses
      const isConfigError = rawText.toLowerCase().includes('worker routes failed') || 
                          rawText.includes('500 Internal Server Error') ||
                          rawText.toLowerCase().includes('binding');
      if (isConfigError) {
        throw new Error("Production Configuration Error: The 'EMAIL_DB' D1 binding is missing from your wrangler.jsonc or was not properly initialized.");
      }
      throw new Error(`Critical: Unexpected API response (Status: ${res.status}).`);
    }
    if (!res.ok || !json.success || json.data === undefined) {
      const errMsg = json.error || `Request failed with status ${res.status}`;
      // Specifically guide users on D1 requirements
      if (errMsg.toLowerCase().includes('binding') || errMsg.toLowerCase().includes('d1')) {
        throw new Error("Relational Storage Unavailable: This action requires a Cloudflare D1 database. Please ensure your environment is configured for production.");
      }
      throw new Error(errMsg);
    }
    return json.data;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error("Edge latency timeout: The request took longer than 15s to respond.");
    }
    // Re-throw for react-query to catch and handle via UI
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}