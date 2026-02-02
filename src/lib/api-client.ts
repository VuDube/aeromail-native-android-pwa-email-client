import { ApiResponse } from "../../shared/types"

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init })
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>
  } catch (e) {
    console.error(`[API] JSON parse error for ${path}:`, e);
    throw new Error('Invalid response from server');
  }
  if (!res.ok || !json.success || json.data === undefined) {
    const errMsg = json.error || `Request failed with status ${res.status}`;
    console.warn(`[API ERROR] ${path}:`, JSON.stringify(json));
    throw new Error(errMsg);
  }
  return json.data;
}