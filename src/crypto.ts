/**
 * Decrypt the envelope format returned by datawarehouse.dbd.go.th when
 * the response header `x-encrypted: true` is present.
 *
 * Envelope shape: { kid: number, salt: string, iv: string, ct: string }
 * where salt/iv/ct are base64url-encoded.
 *
 * The plaintext key is base64url(jwt.encKey), HKDF-SHA256-derived using
 * `bdw|v{kid}|{pathname}` as info and the envelope salt. The ciphertext
 * is AES-256-GCM with the same info as additional data. The plaintext is
 * zlib-compressed (deflate raw) JSON.
 */

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = "===".slice((s.length + 3) % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const ab = new ArrayBuffer(bin.length);
  const out = new Uint8Array(ab);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function parseJwtPayload(jwt: string): { encKey: string; exp: number } {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("invalid jwt");
  const json = new TextDecoder().decode(b64urlToBytes(part));
  return JSON.parse(json);
}

async function deriveAesKey(
  keyMaterial: Uint8Array<ArrayBuffer>,
  salt: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const km = await crypto.subtle.importKey("raw", keyMaterial, { name: "HKDF" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, km, 256);
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}

async function tryDecompress(data: Uint8Array, format: string): Promise<Uint8Array | null> {
  try {
    const ds = new (globalThis as any).DecompressionStream(format) as TransformStream<Uint8Array, Uint8Array>;
    const blob = new Blob([data as BlobPart]);
    const stream = blob.stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/**
 * Decompress what the Nuxt client passes through pako.inflate. The server may
 * use raw deflate, zlib-framed deflate, or gzip; try each. If none work the
 * payload is probably plain JSON (some endpoints skip compression).
 */
async function inflateMaybe(data: Uint8Array): Promise<Uint8Array> {
  for (const format of ["deflate-raw", "deflate", "gzip"]) {
    const out = await tryDecompress(data, format);
    if (out) return out;
  }
  // Last resort — treat as already plain
  return data;
}

export interface Envelope {
  kid: number;
  salt: string;
  iv: string;
  ct: string;
}

/**
 * Decrypt a DBD envelope. `path` is the URL pathname the response came from
 * (e.g. "/api/v1/company-profiles/info/0/107544000108"). The pathname is
 * baked into the AES-GCM additional data so we must pass the exact value the
 * server used.
 */
export async function decryptEnvelope<T = unknown>(env: Envelope, path: string, accessToken: string): Promise<T> {
  if (!accessToken) throw new Error("missing access token");
  const { encKey, exp } = parseJwtPayload(accessToken);
  if (!encKey) throw new Error("jwt missing encKey claim");
  if (exp && exp < Date.now() / 1000) throw new Error("access token expired");

  const keyMat = b64urlToBytes(encKey);
  const salt = b64urlToBytes(env.salt);
  const iv = b64urlToBytes(env.iv);
  const ct = b64urlToBytes(env.ct);
  const infoStr = `bdw|v${env.kid}|${path}`;
  const infoBytes = new TextEncoder().encode(infoStr);
  // TextEncoder().encode returns Uint8Array<ArrayBuffer> at runtime but the
  // older lib.dom typings narrow it to Uint8Array<ArrayBufferLike>; copy to
  // settle the type for WebCrypto's BufferSource overloads.
  const ab = new ArrayBuffer(infoBytes.length);
  const info = new Uint8Array(ab);
  info.set(infoBytes);

  const aesKey = await deriveAesKey(keyMat, salt, info);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: info }, aesKey, ct);
  const inflated = await inflateMaybe(new Uint8Array(plain));
  const json = new TextDecoder().decode(inflated);
  return JSON.parse(json) as T;
}
