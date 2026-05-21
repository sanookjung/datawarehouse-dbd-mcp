/**
 * Endpoints under /v1/stats — registration statistics and rankings.
 */
import { apiCall } from "../session.ts";

const BASE = "/api/v1/stats";

/** สถิติการจดทะเบียน. */
export function getRegisterStat<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/register-stat`, { method: "POST", body });
}

/** การจัดอันดับการจดทะเบียน. */
export function getRegisterRanking<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/register-ranking`, { method: "POST", body });
}

/** การจัดอันดับนิติบุคคล. */
export function getJuristicRanking<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/juristic-ranking`, { method: "POST", body });
}

/** สถิติรายพื้นที่. */
export function getAreaStat<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/area-stat`, { method: "POST", body });
}
