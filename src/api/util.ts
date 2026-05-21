/**
 * Split a 13-digit Thai juristic ID into the two-part form the
 * /v1/company-profiles and /v1/fin endpoints expect:
 *   "0107544000108" → ["0", "107544000108"]
 *
 * The split is "first character / the rest" — matches the Nuxt route logic
 * `code[0]` + `code.slice(1)`.
 */
export function splitJuristicId(id: string): [string, string] {
  const clean = id.replace(/\D/g, "");
  if (clean.length < 2) throw new Error(`invalid juristic id: ${id}`);
  return [clean[0]!, clean.slice(1)];
}
