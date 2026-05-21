/**
 * Endpoints under /v1/biztype — Thai Standard Industrial Classification (TSIC)
 * business type lookups and overviews.
 */
import { apiCall } from "../session.ts";

const BASE = "/api/v1/biztype";

/** ค้นหา/ดู TSIC ทั้งหมด (รายการ). */
export function getBizTypeIndex<T = unknown>(): Promise<T> {
  return apiCall<T>(`${BASE}/info`);
}

/** ข้อมูลหลักของประเภทธุรกิจ (รหัส TSIC). */
export function getBizTypeMain<T = unknown>(code: string): Promise<T> {
  return apiCall<T>(`${BASE}/main/${encodeURIComponent(code)}`);
}

/** หน้า overview ภาพรวมประเภทธุรกิจ. */
export function getBizTypeOverviews<T = unknown>(): Promise<T> {
  return apiCall<T>(`${BASE}/overviews`);
}

/** กราฟ overview ของประเภทธุรกิจ. */
export function getBizTypeOverviewCharts<T = unknown>(code: string): Promise<T> {
  return apiCall<T>(`${BASE}/overviews/charts/${encodeURIComponent(code)}`);
}

/** เนื้อหา overview ของประเภทธุรกิจ. */
export function getBizTypeOverviewContents<T = unknown>(code: string): Promise<T> {
  return apiCall<T>(`${BASE}/overviews/contents/${encodeURIComponent(code)}`);
}
