import { ApiResponse } from "../../shared/types"
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
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
      if (rawText.toLowerCase().includes('worker routes failed') || rawText.includes('500 Internal Server Error')) {
        throw new Error("Edge Configuration Error: Ensure the 'EMAIL_DB' D1 binding is added to your wrangler.jsonc file.");
      }
      throw new Error(`Critical: Invalid API response format (Status: ${res.status}).`);
    }
    if (!res.ok || !json.success || json.data === undefined) {
      const errMsg = json.error || `Server responded with ${res.status}`;
      // Guide the user if they're trying to use features that require D1
      if (errMsg.toLowerCase().includes('binding') || errMsg.toLowerCase().includes('d1')) {
        throw new Error("Storage Unavailable: Feature requires a Cloudflare D1 binding. Running in mock fallback.");
      }
      throw new Error(errMsg);
    }
    return json.data;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error("Network latency is too high. Request timed out after 12s.");
    }
    // Forward the error for the component to handle
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}