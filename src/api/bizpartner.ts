/**
 * Endpoints under /v1/partner — supply-chain / business-partner data.
 */
import { apiCall } from "../session.ts";

const BASE = "/api/v1/partner";

/** แผนที่คู่ค้า supply chain. */
export function getSupplyChain<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/scm`, { method: "POST", body });
}

/** ลิสต์รายชื่อธุรกิจในเครือข่ายคู่ค้า. */
export function getSupplyChainBusinesses<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/scm/bizs`, { method: "POST", body });
}
