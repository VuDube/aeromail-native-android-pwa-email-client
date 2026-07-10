import { ApiResponse } from "../../shared/types"
export class ApiRedirectError extends Error {
  constructor(public url: string) {
    super(`Redirecting to ${url}`);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isAuthPath = path.startsWith('/api/auth/');
  const controller = new AbortController();
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
      window.location.replace(res.url);
      throw new ApiRedirectError(res.url);
    }
    const rawText = await res.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(rawText) as ApiResponse<T>;
    } catch (e) {
      const text = rawText.toUpperCase();
      // Handle known Cloudflare environment errors specifically
      if (text.includes('D1_') || text.includes('DATABASE') || res.status === 500) {
        throw new Error("AeroMail Database Error: The D1 database binding 'EMAIL_DB' is missing or not initialized. Check your Cloudflare dashboard.");
      }
      if (text.includes('KV_') || text.includes('NAMESPACE')) {
        throw new Error("AeroMail Tokens Error: The 'TOKENS' KV namespace is not bound. Verify your worker settings.");
      }
      throw new Error(`Server Error (${res.status}): Invalid response from ${path}`);
    }
    if (!res.ok || !json.success) {
      const errorMessage = json.error || `Request failed (${res.status})`;
      throw new Error(errorMessage);
    }
    return json.data!;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error("Request timed out. The edge function took too long to respond.");
    if (e instanceof ApiRedirectError) throw e;
    if (e.message.includes('fetch')) {
      console.error("[NET ERROR]", e.message);
      throw new Error("Network connection failed. Ensure the AeroMail Worker is deployed and reachable.");
    }
    console.error("[API ERROR]", e.message);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}