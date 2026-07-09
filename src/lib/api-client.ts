import { ApiResponse } from "../../shared/types"
export class ApiRedirectError extends Error {
  constructor(public url: string) {
    super(`Redirecting to ${url}`);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isAuthPath = path.startsWith('/api/auth/');
  const controller = new AbortController();
  // Extended timeout for auth operations and domain lookups to avoid race conditions
  const timeoutMs = isAuthPath ? 45000 : 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal,
      ...init
    });
    if (res.redirected) {
      // Handle the redirect manually to ensure PWA doesn't lose context
      window.location.href = res.url;
      throw new ApiRedirectError(res.url);
    }
    const rawText = await res.text();
    let json: ApiResponse<T> & { meta?: { demo_mode?: boolean } };
    try {
      json = JSON.parse(rawText) as ApiResponse<T>;
    } catch (e) {
      const text = rawText.toLowerCase();
      if (text.includes('binding') || text.includes('db_error') || res.status === 500) {
        throw new Error("Missing Infrastructure: D1 or KV storage not bound. Check your wrangler.jsonc or environment secrets.");
      }
      throw new Error(`Server Error (${res.status}): Invalid response format from ${path}`);
    }
    if (!res.ok || !json.success) {
      const errorMessage = json.error || `Request failed (${res.status})`;
      throw new Error(errorMessage);
    }
    if (json.meta?.demo_mode) {
      console.warn(`[AeroMail] Serving data in Demo Mode for ${path}`);
    }
    return json.data!;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error("Request timed out.");
    if (e instanceof ApiRedirectError) throw e;
    // Check for common developer mistakes and provide actionable advice
    if (e.message.includes('fetch')) {
      console.error("[NET ERROR]", e.message);
      throw new Error("Connection failed. Check if the Worker is running.");
    }
    console.error("[API ERROR]", e.message);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}