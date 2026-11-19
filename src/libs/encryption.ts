import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import config from 'config/env';
import { AppError } from 'middlewares/error';

export const ENCRYPTED_HEADER = 'isencrypted';
export const EK_HEADER = 'x-ek';

/**
 * True when encryption is enabled in env AND the client opted in via
 * the `isencrypted: true` request header.
 */
export const isEncryptedRequest = (req: Request): boolean =>
  config.ENCRYPTION_ENABLED &&
  String(req.headers[ENCRYPTED_HEADER] || '').toLowerCase() === 'true';

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

let keyPair: KeyPair | null = null;

/**
 * Load the server RSA keypair from the paths configured in env.
 * If the files don't exist yet, a 4096-bit pair is generated and
 * written there (private key with 0600 perms where supported).
 */
const getKeyPair = (): KeyPair => {
  if (keyPair) return keyPair;

  const privateKeyPath = path.resolve(
    process.cwd(),
    config.ENCRYPTION_PRIVATE_KEY_PATH
  );
  const publicKeyPath = path.resolve(
    process.cwd(),
    config.ENCRYPTION_PUBLIC_KEY_PATH
  );

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    keyPair = {
      publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
      privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
    };
    return keyPair;
  }

  const generated = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });
  fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });
  fs.writeFileSync(privateKeyPath, generated.privateKey, { mode: 0o600 });
  fs.writeFileSync(publicKeyPath, generated.publicKey);
  console.log(`🔐 Generated RSA keypair at ${privateKeyPath}`);

  keyPair = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
  };
  return keyPair;
};

/** PEM public key the client uses to wrap its per-request AES key. */
export const getPublicKeyPem = (): string => getKeyPair().publicKey;

/** Unwrap the client-generated AES session key (RSA-OAEP-SHA256). */
export const unwrapSessionKey = (ekBase64: string): Buffer => {
  try {
    return crypto.privateDecrypt(
      {
        key: getKeyPair().privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(ekBase64, 'base64')
    );
  } catch {
    throw new AppError('Invalid encrypted session key (ek)', 400);
  }
};

/**
 * Decrypt an AES-256-GCM payload. `data` is base64(ciphertext || 16-byte
 * auth tag). Throws if the ciphertext was modified in transit.
 */
export const decryptPayload = (
  dataBase64: string,
  ivBase64: string,
  sessionKey: Buffer
): string => {
  try {
    const raw = Buffer.from(dataBase64, 'base64');
    const tag = raw.subarray(raw.length - 16);
    const ciphertext = raw.subarray(0, raw.length - 16);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      sessionKey,
      Buffer.from(ivBase64, 'base64')
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError('Encrypted payload failed integrity check', 400);
  }
};

/** Encrypt a response body with the request's AES session key. */
export const encryptPayload = (
  data: unknown,
  sessionKey: Buffer
): { iv: string; data: string } => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    data: Buffer.concat([ciphertext, tag]).toString('base64'),
  };
};
