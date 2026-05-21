/**
 * Endpoints under /v1/company-profiles — Thai juristic person profile data.
 * All per-juristic endpoints use the two-part ID split (see util.ts).
 */
import { apiCall } from "../session.ts";
import { splitJuristicId } from "./util.ts";

const BASE = "/api/v1/company-profiles";

export interface SearchRequest {
  keyword: string;
  type?: string;
  sortBy?: string;
  currentPage?: number;
}

/** ค้นหานิติบุคคล / Search juristic persons by keyword. */
export function searchJuristic<T = unknown>(req: SearchRequest): Promise<T> {
  return apiCall<T>(`${BASE}/infos`, {
    method: "POST",
    body: {
      keyword: req.keyword,
      type: req.type ?? "",
      sortBy: req.sortBy ?? "jpName",
      currentPage: req.currentPage ?? 1,
    },
  });
}

/**
 * ข้อมูลพื้นฐาน / Basic profile (status, address, capital, business type,
 * latest financial summary, etc.).
 *
 * The dedicated GET /v1/company-profiles/info/{a}/{c} endpoint returns HTTP
 * 404 with an empty body for anonymous users, so the public-tier path to
 * single-juristic detail is via the search endpoint with the ID as keyword.
 * We pick the row whose jpNo matches exactly.
 */
export async function getProfile<T = unknown>(juristicId: string): Promise<T | null> {
  const clean = juristicId.replace(/\D/g, "");
  const res = (await searchJuristic({ keyword: clean })) as { contents?: Array<{ jpNo: string }> };
  const list = res?.contents ?? [];
  const match = list.find((r) => r.jpNo === clean) ?? list[0] ?? null;
  return (match as unknown as T) ?? null;
}

/** Raw GET /v1/company-profiles/info/{a}/{c} — empty for anonymous tier. */
export function getProfileInfoRaw<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/info/${a}/${c}`);
}

/** กรรมการบริษัท / List of directors (committees). */
export function getCommittees<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/committees/${a}/${c}`);
}

/** อำนาจกรรมการลงนาม / Authorized signatories. */
export function getSignCommittees<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/committee-signs/${a}/${c}`);
}

/** วัตถุประสงค์ / Business objective descriptions. */
export function getDescriptions<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/descriptions/${a}/${c}`);
}

/** ผู้ถือหุ้น/หุ้นส่วน / Shareholders / partners list. */
export function getPartners<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/partners/${a}/${c}`);
}

/** การควบรวม/แปรสภาพ / Merger and transformation events. */
export function getMergers<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/mergers/${a}/${c}`);
}

/** ผู้ชำระบัญชี / Liquidators (when applicable). */
export function getLiquidators<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/liquidators/${a}/${c}`);
}

/** ประวัติการเปลี่ยนชื่อ / History of name changes. */
export function getNameHistory<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/names/${a}/${c}`);
}

/** ประวัติการเปลี่ยนทุนจดทะเบียน / History of registered capital changes. */
export function getCapitalHistory<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/capitals/${a}/${c}`);
}

/** สัดส่วนสัญชาติผู้ถือหุ้น / Shareholder nationalities. */
export function getNations<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/nations/${a}/${c}`);
}

/** ข้อมูลกราฟสัดส่วนสัญชาติ / Nationality breakdown chart data. */
export function getNationCharts<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/nations/charts/${a}/${c}`);
}
