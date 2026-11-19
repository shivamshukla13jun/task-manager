import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import config from 'config/env';
import { AppError } from './error';
import {
  decryptPayload,
  encryptPayload,
  EK_HEADER,
  isEncryptedRequest,
  unwrapSessionKey,
} from 'libs/encryption';

/**
 * Decrypts req.body in place.
 *
 * Wire format (JSON body or multipart fields):
 *   ek   — AES-256 session key, RSA-OAEP wrapped with the server public key
 *   iv   — base64 AES-GCM nonce
 *   data — base64(ciphertext || gcm auth tag)
 *
 * `ek` may also be sent as the `x-ek` header (e.g. GET requests with no
 * body). Any plaintext fields alongside ek/iv/data are merged back into
 * the decrypted body — note they are NOT integrity-protected.
 *
 * For multipart requests this must run after multer — the upload
 * middleware calls it again.
 */
export const decryptBodyFields = async (req: Request): Promise<void> => {
  if (!isEncryptedRequest(req)) return;

  const body = req.body;

  // Unwrap the session key — from the body or the x-ek header.
  const ek =
    (body && typeof body === 'object' && typeof body.ek === 'string'
      ? body.ek
      : undefined) || (req.headers[EK_HEADER] as string | undefined);

  if (ek && !req._encryptionKey) {
    req._encryptionKey = unwrapSessionKey(ek);
  }

  if (!body || typeof body !== 'object' || Buffer.isBuffer(body)) return;
  if (body.data === undefined) return; // no encrypted payload

  if (!req._encryptionKey || typeof body.iv !== 'string') {
    throw new AppError(
      'Encrypted payload requires "ek", "iv" and "data"',
      400
    );
  }

  let decrypted: unknown;
  try {
    decrypted = JSON.parse(
      decryptPayload(body.data, body.iv, req._encryptionKey)
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Decrypted payload is not valid JSON', 400);
  }

  // Replay protection — if the client embedded `ts`, it must be fresh.
  if (
    decrypted &&
    typeof decrypted === 'object' &&
    (decrypted as any).ts !== undefined
  ) {
    const age = Math.abs(Date.now() - Number((decrypted as any).ts));
    if (!Number.isFinite(age) || age > config.ENCRYPTION_MAX_AGE_MS) {
      throw new AppError('Encrypted payload expired', 400);
    }
    delete (decrypted as any).ts;
  }



  const { ek: _ek, iv: _iv, data: _d, ...plainFields } = body;
  req.body =
    decrypted && typeof decrypted === 'object' && !Array.isArray(decrypted)
      ? { ...decrypted, ...plainFields }
      : decrypted;
};

/**
 * Global encryption middleware. Mounted once after the body parsers:
 * - unwraps the client's AES session key and decrypts the request body
 *   (multipart fields are decrypted by the upload middleware, which calls
 *   decryptBodyFields again after multer parses them)
 * - wraps res.json so every JSON response is AES-256-GCM encrypted under
 *   the request's session key and sent as { iv, data }
 *
 * No-op unless ENCRYPTION_ENABLED=true and the request carries the
 * `isencrypted: true` header.
 */
export const encryptionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!config.ENCRYPTION_ENABLED || !isEncryptedRequest(req)) {
    return next();
  }

  try {
    await decryptBodyFields(req);
  } catch (error) {
    return next(error);
  }

  const sessionKey = req._encryptionKey;
  if (sessionKey) {
    const originalJson = res.json.bind(res);
    res.json = ((body: any) =>
      originalJson(encryptPayload(body, sessionKey))) as any;
  }

  next();
};
