import { ApiResponse } from "../../shared/types"
export class ApiRedirectError extends Error {
  constructor(public url: string) {
    super(`Redirecting to ${url}`);
  }
}
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
    if (res.redirected) {
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
        throw new Error("Missing Infrastructure: D1 or KV storage not bound. Check your wrangler.jsonc.");
      }
      throw new Error(`Server Error (${res.status}): Invalid response format.`);
    }
    if (!res.ok || !json.success) {
      const errorMessage = json.error || `Request failed (${res.status})`;
      throw new Error(errorMessage);
    }
    if (json.meta?.demo_mode) {
      console.warn("[AeroMail] Serving data in Demo Mode (Mocked)");
    }
    return json.data!;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error("Request timed out.");
    if (e instanceof ApiRedirectError) throw e;
    console.error("[API ERROR]", e.message);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}