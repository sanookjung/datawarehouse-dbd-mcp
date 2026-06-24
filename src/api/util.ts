/**
 * Split a 13-digit Thai juristic ID into the two-part form the
 * /v1/company-profiles and /v1/fin endpoints expect:
 *   "0107544000108" → ["7", "0107544000108"]
 *
 * The first part is the juristicTypeCode (4th digit of the 13-digit ID)
 * and the second part is the full 13-digit ID.
 */
export function splitJuristicId(id: string): [string, string] {
  const clean = id.replace(/\D/g, "");
  if (clean.length < 4) throw new Error(`invalid juristic id: ${id}`);
  // The 4th digit of a 13-digit Thai juristic ID represents the juristicTypeCode
  const typeCode = clean[3]!;
  return [typeCode, clean];
}
