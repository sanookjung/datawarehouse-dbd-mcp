/**
 * Endpoints under /v1/fin — financial statement data per juristic person.
 */
import { apiCall } from "../session.ts";
import { splitJuristicId } from "./util.ts";

const BASE = "/api/v1/fin";

/** งบการเงินรายการสำคัญ / Basic financial figures for a juristic person. */
export function getBasics<T = unknown>(juristicId: string, fiscalYear?: number): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/basics/${a}/${c}`, { query: { fiscalYear } });
}

/** ประวัติการนำส่งงบการเงิน / Submission history for the financial statement. */
export function getSubmitHistory<T = unknown>(juristicId: string, fiscalYear?: number): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/submit/${a}/${c}`, { query: { fiscalYear } });
}

/** กราฟแสดงผลรายการสำคัญ / Chart data for basic financial figures. */
export function getBasicCharts<T = unknown>(juristicId: string): Promise<T> {
  const [a, c] = splitJuristicId(juristicId);
  return apiCall<T>(`${BASE}/basics/charts/${a}/${c}`);
}
