import 'multer';
import type { StorageProviderName } from 'config/env';
import type { Types } from 'mongoose';

export interface UploadOptions {
  folder?: string;
}

export interface UploadedFileResult {
  key: string;
  url: string;
  provider: StorageProviderName;
  size: number;
  mimetype: string;
  originalName: string;
}

export interface IStorageProvider {
  readonly name: StorageProviderName;
  upload(
    file: Express.Multer.File,
    options?: UploadOptions
  ): Promise<UploadedFileResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

// Reference to a stored object — enough info to delete it later
// from both the provider bucket/dir and the File collection.
export interface StoredFileRef {
  key: string;
  provider: StorageProviderName;
  fileId?: Types.ObjectId | string;
}

export type { StorageProviderName };
