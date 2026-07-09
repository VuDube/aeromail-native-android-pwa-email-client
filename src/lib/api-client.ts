import { ApiResponse } from "../../shared/types"
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...init
    });
    const rawBody = await res.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(rawBody) as ApiResponse<T>;
    } catch (e) {
      if (rawBody.includes('Worker routes failed to load')) {
        throw new Error("Worker Binding Missing: Please ensure 'EMAIL_DB' D1 database is created and bound in wrangler.jsonc.");
      }
      throw new Error(`Critical: Invalid server response (Status: ${res.status}).`);
    }
    if (!res.ok || !json.success || json.data === undefined) {
      const errMsg = json.error || `Request failed with status ${res.status}`;
      if (errMsg.toLowerCase().includes('binding')) {
        throw new Error("Infrastructure Error: D1 Binding 'EMAIL_DB' not found. Run in local mock mode.");
      }
      throw new Error(errMsg);
    }
    return json.data;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error("Request timed out. The edge network is experiencing high latency.");
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}