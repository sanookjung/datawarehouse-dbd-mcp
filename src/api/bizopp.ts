/**
 * Endpoints under /v1/bizopp — business opportunity data
 * (financial benchmarks, investment overviews by sector).
 */
import { apiCall } from "../session.ts";

const BASE = "/api/v1/bizopp";

export function getOverviewSummary<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/overviews/summary`, { method: "POST", body });
}

export function getOverviewContents<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/overviews/contents`, { method: "POST", body });
}

/** ข้อมูลพื้นฐานทางการเงินรายอุตสาหกรรม. */
export function getBasicFinBenchmark<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/fin/basics`, { method: "POST", body });
}

/** อัตราส่วนทางการเงินรายอุตสาหกรรม. */
export function getFinRatioBenchmark<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/fin/ratios`, { method: "POST", body });
}

export function getInvestmentDetail<T = unknown>(code: string, body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/investment/detail/${encodeURIComponent(code)}`, { method: "POST", body });
}

export function getInvestmentNations<T = unknown>(code: string, body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/investment/nations/${encodeURIComponent(code)}`, { method: "POST", body });
}
