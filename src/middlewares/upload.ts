import { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import config from 'config/env';
import File from 'models/file.model';
import { storageService } from 'libs/storage';
import type { StoredFileRef } from 'libs/storage/types';
import { AppError } from './error';
import { decryptBodyFields } from './encryption';

type MimeGroup = 'image' | 'video' | 'document' | 'audio';

const mimeTypeMap: Record<MimeGroup, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
};

export interface UploadOptions {
  folder?: string;
  types?: MimeGroup[];
}

const resolveAllowedTypes = (types?: MimeGroup[]): string[] => {
  if (types && types.length) {
    return types.flatMap((t) => mimeTypeMap[t] || []);
  }
  return config.ALLOWED_FILE_TYPES;
};

const multerUpload = (types?: MimeGroup[]) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.UPLOAD_MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      const allowed = resolveAllowedTypes(types);
      if (!allowed.length || allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new AppError(
            `File type "${file.mimetype}" is not allowed`,
            400
          ) as any,
          false
        );
      }
    },
  });

const collectFiles = (req: Request): Express.Multer.File[] => {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      Object.values(req.files).forEach((list) => files.push(...list));
    }
  }
  return files;
};

/**
 * Push every parsed multipart file to the configured storage provider and
 * create its File document. Each uploaded file is tracked on
 * `req.uploadedFiles` so it can be rolled back (storage + DB) if any
 * later middleware or the handler fails. The generated File id is written
 * back into `req.body[fieldName]`.
 */
const persistFiles = async (req: Request, options?: UploadOptions) => {
  const files = collectFiles(req);
  if (!files.length) return;

  req.uploadedFiles = req.uploadedFiles || [];

  for (const file of files) {
    const uploaded = await storageService.upload(file, {
      folder: options?.folder,
    });

    const doc = await File.create({
      key: uploaded.key,
      url: uploaded.url,
      provider: uploaded.provider,
      originalName: uploaded.originalName,
      mimetype: uploaded.mimetype,
      size: uploaded.size,
      folder: options?.folder,
      uploadedBy: req.user?._id,
    });

    const ref: StoredFileRef = {
      key: uploaded.key,
      provider: uploaded.provider,
      fileId: doc._id,
    };
    req.uploadedFiles.push(ref);

    const fieldName = file.fieldname;
    const existing = req.body?.[fieldName];
    if (existing === undefined) {
      req.body[fieldName] = doc._id.toString();
    } else if (Array.isArray(existing)) {
      existing.push(doc._id.toString());
    } else {
      req.body[fieldName] = [existing, doc._id.toString()];
    }
  }
};

const wrap = (
  mw: RequestHandler,
  options?: UploadOptions,
  meta?: { kind: 'single' | 'array' | 'fields' | 'any'; fields: string[] }
): RequestHandler => {
  const handler = (req: Request, res: Response, next: NextFunction) => {
    mw(req, res, (err?: any) => {
      if (err) {
        return next(
          err instanceof multer.MulterError
            ? new AppError(`File upload failed: ${err.message}`, 400)
            : err
        );
      }
      // multipart fields are only available after multer — decrypt them now
      Promise.resolve(decryptBodyFields(req))
        .then(() => persistFiles(req, options))
        .then(() => next())
        .catch(next);
    });
  };
  // tagged so the auto-swagger generator renders binary file inputs
  (handler as any)._upload = meta;
  return handler;
};

/**
 * Upload middleware factory. Files are buffered in memory by multer,
 * persisted to the active storage provider, and recorded in the File
 * collection. On any downstream error they are deleted automatically.
 *
 * Usage: router.post('/', upload.single('avatar', { folder: 'users' }), handler)
 */
export const upload = {
  single: (fieldName: string, options?: UploadOptions): RequestHandler =>
    wrap(multerUpload(options?.types).single(fieldName), options, {
      kind: 'single',
      fields: [fieldName],
    }),

  array: (
    fieldName: string,
    maxCount?: number,
    options?: UploadOptions
  ): RequestHandler =>
    wrap(multerUpload(options?.types).array(fieldName, maxCount), options, {
      kind: 'array',
      fields: [fieldName],
    }),

  fields: (
    fields: { name: string; maxCount?: number }[],
    options?: UploadOptions
  ): RequestHandler =>
    wrap(multerUpload(options?.types).fields(fields), options, {
      kind: 'fields',
      fields: fields.map((f) => f.name),
    }),

  any: (options?: UploadOptions): RequestHandler =>
    wrap(multerUpload(options?.types).any(), options, { kind: 'any', fields: [] }),
};

export default upload;
