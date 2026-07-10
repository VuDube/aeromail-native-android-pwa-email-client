import { ApiResponse } from "../../shared/types"
export class ApiRedirectError extends Error {
  constructor(public url: string) {
    super(`Redirecting to ${url}`);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isAuthPath = path.startsWith('/api/auth/');
  const controller = new AbortController();
  const timeoutMs = isAuthPath ? 45000 : 30000; // Increased for search/D1 cold-starts
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
      if (text.includes('D1_') || text.includes('DATABASE')) {
        throw new Error("AeroMail Database Error: The 'EMAIL_DB' D1 binding is missing or configured incorrectly. Refer to Step 1 of Docs (/docs).");
      }
      if (text.includes('KV_') || text.includes('NAMESPACE')) {
        throw new Error("AeroMail Storage Error: The 'TOKENS' KV namespace is missing. Refer to Step 2 of Docs (/docs).");
      }
      if (res.status === 404) {
        throw new Error(`Resource Unavailable: The requested endpoint (${path}) or thread was not found on the edge.`);
      }
      if (res.status >= 500) {
        throw new Error("AeroMail Edge Error: The worker encountered a failure. Check Wrangler logs for runtime stacktraces.");
      }
      throw new Error(`Unexpected Response Format (${res.status}).`);
    }
    if (!res.ok || !json.success) {
      const errorMessage = json.error || `Edge Request Failed (${res.status})`;
      throw new Error(errorMessage);
    }
    return json.data!;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error("Edge Timeout: The request was aborted because it took too long. This usually indicates high latency or missing DB indices.");
    }
    if (e instanceof ApiRedirectError) throw e;
    console.error("[API ERROR]", e.message);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}