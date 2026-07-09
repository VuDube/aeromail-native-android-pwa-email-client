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
      // Use replace to avoid polluting history in PWA standalone mode
      window.location.replace(res.url);
      throw new ApiRedirectError(res.url);
    }
    const rawText = await res.text();
    let json: ApiResponse<T> & { meta?: { demo_mode?: boolean } };
    try {
      json = JSON.parse(rawText) as ApiResponse<T>;
    } catch (e) {
      const text = rawText.toUpperCase();
      if (text.includes('D1_') || text.includes('DATABASE') || text.includes('SQLITE') || res.status === 500) {
        throw new Error("D1 Infrastructure Error: The database is not properly bound or initialized. Ensure 'EMAIL_DB' is present in wrangler.jsonc.");
      }
      if (text.includes('KV_') || text.includes('NAMESPACE')) {
        throw new Error("KV Infrastructure Error: The 'TOKENS' namespace is not bound. Verify your worker configuration.");
      }
      throw new Error(`Server Error (${res.status}): Invalid response format from ${path}`);
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