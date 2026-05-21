/**
 * Endpoints under /v1/area — area-based juristic person statistics.
 */
import { apiCall } from "../session.ts";

const BASE = "/api/v1/area";

/** สรุปข้อมูลรายพื้นที่. */
export function getAreaSummary<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/summary`, { method: "POST", body });
}

/** แผนที่ความหนาแน่นของนิติบุคคล. */
export function getAreaMap<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/map`, { method: "POST", body });
}

/** การจัดอันดับนิติบุคคลในพื้นที่. */
export function getAreaRanking<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/ranking`, { method: "POST", body });
}
