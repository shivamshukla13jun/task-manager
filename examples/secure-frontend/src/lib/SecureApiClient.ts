/**
 * SecureApiClient — browser client for the hybrid-encrypted API.
 *
 * Wire protocol (matches src/middlewares/encryption.ts):
 *   Request : headers { isencrypted: 'true', 'x-ek': <RSA-wrapped AES key> }
 *             body    { iv, data }  or multipart fields { iv, data, <files> }
 *   Response: { iv, data }
 *
 *   ek   = RSA-OAEP-SHA256(serverPublicKey, raw 32-byte AES key), base64
 *   iv   = 12-byte AES-GCM nonce (fresh per message), base64
 *   data = AES-256-GCM(JSON) — ciphertext || 16-byte auth tag, base64
 *
 * A `ts` timestamp is embedded in every encrypted payload; the server
 * rejects stale payloads (ENCRYPTION_MAX_AGE_MS → replay protection).
 *
 * No dependencies — WebCrypto only.
 */

const te = new TextEncoder();
const td = new TextDecoder();

const bufToB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return btoa(bin);
};

const b64ToBuf = (b64: string): ArrayBuffer => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

const pemToBuf = (pem: string): ArrayBuffer =>
  b64ToBuf(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));

export interface SecureResponse<T = unknown> {
  status: number;
  /** Decrypted response body */
  body: T;
  /** Literal bytes/JSON that crossed the wire — what a middleman sees */
  wire: { sent: unknown; received: unknown };
}

export interface SecureRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | string;
  /** JSON payload — sent encrypted as { iv, data } */
  body?: Record<string, unknown>;
  /** Text fields for multipart requests — encrypted inside `data` */
  fields?: Record<string, unknown>;
  /** File fields for multipart requests — sent raw alongside `iv`/`data` */
  files?: Record<string, File | File[] | null | undefined>;
  /** Bearer token */
  token?: string;
}

interface EncryptedEnvelope {
  iv: string;
  data: string;
}

export class SecureApiClient {
  private readonly baseUrl: string;
  private publicKey: CryptoKey | null = null;
  private aesKey: CryptoKey | null = null;
  private ek: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /** Fetch the server public key and create the AES session key. */
  async init(): Promise<this> {
    if (!globalThis.crypto?.subtle) {
      throw new Error(
        'WebCrypto is unavailable — crypto.subtle requires a secure context. ' +
          'Open this page via http://localhost or HTTPS, not a LAN IP.'
      );
    }

    const pem = await (
      await fetch(`${this.baseUrl}/encryption/public-key`)
    ).text();

    this.publicKey = await crypto.subtle.importKey(
      'spki',
      pemToBuf(pem),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );

    this.aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const rawKey = await crypto.subtle.exportKey('raw', this.aesKey);
    this.ek = bufToB64(
      await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, this.publicKey, rawKey)
    );
    return this;
  }

  private async encrypt(obj: unknown): Promise<EncryptedEnvelope> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.aesKey as CryptoKey,
      te.encode(JSON.stringify(obj))
    );
    // WebCrypto returns ciphertext || authTag — the layout the server expects
    return { iv: bufToB64(iv), data: bufToB64(ciphertext) };
  }

  private async decrypt(ivB64: string, dataB64: string): Promise<unknown> {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(ivB64)) },
      this.aesKey as CryptoKey,
      b64ToBuf(dataB64)
    );
    return JSON.parse(td.decode(plaintext));
  }

  async request<T = unknown>(
    path: string,
    opts: SecureRequestOptions = {}
  ): Promise<SecureResponse<T>> {
    if (!this.ek) throw new Error('SecureApiClient: call init() first');
    const { method = 'GET', body, fields, files, token } = opts;

    const headers: Record<string, string> = {
      isencrypted: 'true',
      'x-ek': this.ek,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = { ...(body || {}), ...(fields || {}), ts: Date.now() };
    const hasPayload = Object.keys(payload).length > 1; // ts alone isn't a payload

    let fetchBody: BodyInit | undefined;
    let sent: unknown = { headers };

    const fileEntries = Object.entries(files || {}).filter(
      ([, f]) => f != null
    );

    if (fileEntries.length) {
      const enc = await this.encrypt(payload);
      const fd = new FormData();
      fd.append('iv', enc.iv);
      fd.append('data', enc.data);
      for (const [name, file] of fileEntries) {
        (Array.isArray(file) ? file : [file]).forEach((f) =>
          fd.append(name, f as File)
        );
      }
      fetchBody = fd;
      sent = {
        headers,
        multipart: { iv: enc.iv, data: enc.data, files: fileEntries.map(([n]) => n) },
      };
    } else if (hasPayload) {
      const enc = await this.encrypt(payload);
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify({ iv: enc.iv, data: enc.data });
      sent = { headers, body: { iv: enc.iv, data: enc.data } };
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: fetchBody,
    });

    const json: any = await res.json().catch(() => null);
    const out =
      json && typeof json.iv === 'string' && typeof json.data === 'string'
        ? ((await this.decrypt(json.iv, json.data)) as T)
        : (json as T);

    return { status: res.status, body: out, wire: { sent, received: json } };
  }

  get<T = unknown>(path: string, opts: Omit<SecureRequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'GET' });
  }

  post<T = unknown>(path: string, body?: Record<string, unknown>, opts: SecureRequestOptions = {}) {
    return this.request<T>(path, { ...opts, method: 'POST', body });
  }
}

export default SecureApiClient;
