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
    throw new Error(`Network error while fetching ${path}`);
  }
  const rawBody = await res.text();
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(rawBody) as ApiResponse<T>;
  } catch (e) {
    console.error(`[API JSON PARSE ERROR] for ${path}:`, e, "Raw body snippet:", rawBody.slice(0, 200));
    throw new Error(`Invalid JSON response from ${path} (Status: ${res.status})`);
  }
  if (!res.ok || !json.success || json.data === undefined) {
    const errMsg = json.error || `Request to ${path} failed with status ${res.status}`;
    console.warn(`[API REJECTION] ${path}:`, JSON.stringify(json));
    throw new Error(errMsg);
  }
  return json.data;
}