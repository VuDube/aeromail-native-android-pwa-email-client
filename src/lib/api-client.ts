import { ApiResponse } from "../../shared/types"
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });
  } catch (e) {
    console.error(`[API FETCH ERROR] ${path}:`, e);
    throw new Error(`Network error: Check your internet connection or Cloudflare Tunnel status.`);
  }
  const rawBody = await res.text();
  if (res.status === 500 && rawBody.includes('Worker routes failed to load')) {
    throw new Error("Cloudflare Worker configuration error: D1 or KV bindings may be missing in wrangler.jsonc.");
  }
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(rawBody) as ApiResponse<T>;
  } catch (e) {
    console.error(`[API JSON PARSE ERROR] for ${path}:`, e, "Raw body snippet:", rawBody.slice(0, 500));
    throw new Error(`Critical: Invalid response format from server (Status: ${res.status}). Check D1 bindings.`);
  }
  if (!res.ok || !json.success || json.data === undefined) {
    const errMsg = json.error || `Request failed with status ${res.status}`;
    // Actionable binding errors
    if (errMsg.toLowerCase().includes('email_db') || errMsg.toLowerCase().includes('binding missing')) {
      throw new Error("Deployment Error: Cloudflare D1 binding 'EMAIL_DB' not found. Visit Settings to use Mock Mode.");
    }
    console.warn(`[API REJECTION] ${path}:`, JSON.stringify(json));
    throw new Error(errMsg);
  }
  return json.data;
}