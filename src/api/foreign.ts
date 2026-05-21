/**
 * Endpoints under /v1/foreign — foreign juristic persons licensed in Thailand.
 * These use a single-segment ID (no first-char split).
 */
import { apiCall } from "../session.ts";

const BASE = "/api/v1/foreign";

export interface ForeignSearchRequest {
  keyword: string;
  sortBy?: string;
  currentPage?: number;
}

/** ค้นหานิติบุคคลต่างประเทศ / Search foreign juristic persons. */
export function searchForeign<T = unknown>(req: ForeignSearchRequest): Promise<T> {
  return apiCall<T>(`${BASE}/info`, {
    query: {
      keyword: req.keyword,
      sortBy: req.sortBy ?? "jpName",
      currentPage: req.currentPage ?? 1,
    },
  });
}

/** ข้อมูลพื้นฐานนิติบุคคลต่างประเทศ. */
export function getForeignProfile<T = unknown>(juristicId: string): Promise<T> {
  return apiCall<T>(`${BASE}/profile/${encodeURIComponent(juristicId)}`);
}

/** ประเภทธุรกิจที่ได้รับใบอนุญาต. */
export function getForeignBusinessTypes<T = unknown>(juristicId: string): Promise<T> {
  return apiCall<T>(`${BASE}/business-types/${encodeURIComponent(juristicId)}`);
}

/** รายชื่อกรรมการนิติบุคคลต่างประเทศ. */
export function getForeignDirectors<T = unknown>(juristicId: string): Promise<T> {
  return apiCall<T>(`${BASE}/directors/${encodeURIComponent(juristicId)}`);
}

/** อำนาจกรรมการลงนาม (รูปแบบข้อความ). */
export function getForeignDirectorsText<T = unknown>(juristicId: string): Promise<T> {
  return apiCall<T>(`${BASE}/directors-text/${encodeURIComponent(juristicId)}`);
}
