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
      // DIAGNOSTIC LAYER: Map raw CF errors to human-readable instructions
      if (text.includes('D1_') || text.includes('DATABASE')) {
        throw new Error("AeroMail Database Error: The 'EMAIL_DB' D1 binding is missing. Please refer to Step 1 of the Technical Documentation (/docs).");
      }
      if (text.includes('KV_') || text.includes('NAMESPACE')) {
        throw new Error("AeroMail Storage Error: The 'TOKENS' KV namespace is missing. Please refer to Step 2 of the Technical Documentation (/docs).");
      }
      if (res.status === 500) {
        throw new Error("AeroMail Edge Network Error: The server encountered a problem processing your request. Check Worker Logs for details.");
      }
      if (res.status === 404) {
        throw new Error(`Endpoint not found: ${path}. Ensure the worker is deployed with current routes.`);
      }
      throw new Error(`Invalid response from Edge Network (${res.status}).`);
    }
    if (!res.ok || !json.success) {
      const errorMessage = json.error || `Request failed (${res.status})`;
      throw new Error(errorMessage);
    }
    return json.data!;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error("The request timed out. This often happens if the Edge Function is cold-starting or the Gmail API is unresponsive.");
    }
    if (e instanceof ApiRedirectError) throw e;
    console.error("[API ERROR]", e.message);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}