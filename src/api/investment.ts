/**
 * Endpoints under /v1/investment — foreign investment statistics in Thai
 * juristic persons.
 */
import { apiCall } from "../session.ts";

const BASE = "/api/v1/investment";

/** ข้อมูลหลักของรายงานการลงทุน (ตามรหัส). */
export function getInvestmentMain<T = unknown>(code: string): Promise<T> {
  return apiCall<T>(`${BASE}/main/${encodeURIComponent(code)}`);
}

/** สัดส่วนการลงทุนแยกตามสัญชาติ. */
export function getInvestmentNationOverview<T = unknown>(code: string): Promise<T> {
  return apiCall<T>(`${BASE}/overviews/nations/${encodeURIComponent(code)}`);
}

/** ค้นหา/แสดงรายชื่อนิติบุคคลตามตัวกรองการลงทุน. */
export function searchInvestmentJuristic<T = unknown>(body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/juristic/infos`, { method: "POST", body });
}

/** เนื้อหา overview การลงทุนต่างชาติ. */
export function getInvestmentOverviewContents<T = unknown>(code: string, body: unknown): Promise<T> {
  return apiCall<T>(`${BASE}/overviews/contents/${encodeURIComponent(code)}`, { method: "POST", body });
}
