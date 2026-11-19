import { API_URL } from './config';

/**
 * Hybrid payload encryption client — mirrors the backend protocol:
 *   request  → { ek, iv, data }
 *     ek   = AES-256 session key wrapped with the server RSA public key (OAEP-SHA256)
 *     iv   = base64 AES-GCM nonce (12 bytes)
 *     data = base64(ciphertext || 16-byte GCM auth tag)
 *   response → { iv, data } encrypted with the same session key
 */

export interface EncryptedBody {
  ek: string;
  iv: string;
  data: string;
}

export interface EncryptedResponse {
  iv: string;
  data: string;
}

const toBase64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const fromBase64 = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const pemToSpki = (pem: string): ArrayBuffer =>
  fromBase64(
    pem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s+/g, '')
  ).buffer as ArrayBuffer;

let publicKeyPromise: Promise<CryptoKey> | null = null;

/** Fetches the server RSA public key once (PEM → spki RSA-OAEP-SHA256). */
export const getServerPublicKey = (): Promise<CryptoKey> => {
  publicKeyPromise ??= fetch(`${API_URL}/encryption/public-key`)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch encryption public key (${res.status})`);
      return res.text();
    })
    .then((pem) =>
      crypto.subtle.importKey(
        'spki',
        pemToSpki(pem),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
      )
    )
    .catch((err) => {
      publicKeyPromise = null; // allow retry on next request
      throw err;
    });
  return publicKeyPromise;
};

/** Fresh AES-256-GCM session key for a single request/response pair. */
const generateSessionKey = (): Promise<CryptoKey> =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

const wrapSessionKey = async (key: CryptoKey): Promise<string> => {
  const publicKey = await getServerPublicKey();
  const raw = await crypto.subtle.exportKey('raw', key);
  const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, raw);
  return toBase64(wrapped);
};

const encrypt = async (
  key: CryptoKey,
  plaintext: string
): Promise<{ iv: string; data: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { iv: toBase64(iv), data: toBase64(ciphertext) };
};

const decrypt = async (key: CryptoKey, iv: string, data: string): Promise<string> => {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) as BufferSource },
    key,
    fromBase64(data) as BufferSource
  );
  return new TextDecoder().decode(plaintext);
};

export interface EncryptedRequest {
  /** Session key to decrypt the response. */
  key: CryptoKey;
  /** { ek, iv, data } for requests with a body. */
  body?: EncryptedBody;
  /** ek for bodiless requests — send as the `x-ek` header. */
  ek?: string;
}

/**
 * Prepares an encrypted request: returns the wrapped session key and,
 * when a payload is provided, the encrypted body. `ts` is embedded for
 * server-side replay protection.
 */
export const encryptRequest = async (payload?: unknown): Promise<EncryptedRequest> => {
  const key = await generateSessionKey();
  const ek = await wrapSessionKey(key);

  if (payload === undefined || payload === null) {
    return { key, ek };
  }

  const withTs =
    typeof payload === 'object' && !Array.isArray(payload)
      ? { ...payload, ts: Date.now() }
      : payload;

  const { iv, data } = await encrypt(key, JSON.stringify(withTs));
  return { key, body: { ek, iv, data } };
};

/** True when a response body looks like the { iv, data } encrypted envelope. */
export const isEncryptedResponse = (body: unknown): body is EncryptedResponse =>
  !!body &&
  typeof body === 'object' &&
  typeof (body as EncryptedResponse).iv === 'string' &&
  typeof (body as EncryptedResponse).data === 'string';

/** Decrypts a { iv, data } response envelope and parses it as JSON. */
export const decryptResponse = async (
  key: CryptoKey,
  body: EncryptedResponse
): Promise<unknown> => JSON.parse(await decrypt(key, body.iv, body.data));
