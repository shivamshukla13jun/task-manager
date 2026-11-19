import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from 'config/env';
import { admin, firebaseApp } from 'libs/firebase/firebase';
import { AppError } from 'middlewares/error';
import type {
  IStorageProvider,
  UploadedFileResult,
  UploadOptions,
} from '../types';

class FirebaseStorageProvider implements IStorageProvider {
  readonly name = 'firebase' as const;
  private bucket: ReturnType<
    ReturnType<typeof admin.storage>['bucket']
  >;

  constructor() {
    if (!config.FIREBASE_STORAGE_BUCKET) {
      throw new AppError(
        'FIREBASE_STORAGE_BUCKET is required for firebase storage',
        500
      );
    }
    this.bucket = admin
      .storage(firebaseApp)
      .bucket(config.FIREBASE_STORAGE_BUCKET);
  }

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions
  ): Promise<UploadedFileResult> {
    const folder = options?.folder ? options.folder.replace(/^\/+|\/+$/g, '') : '';
    const ext = path.extname(file.originalname);
    const key = folder ? `${folder}/${uuidv4()}${ext}` : `${uuidv4()}${ext}`;

    const bucketFile = this.bucket.file(key);
    await bucketFile.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });
    await bucketFile.makePublic();

    return {
      key,
      url: this.getUrl(key),
      provider: this.name,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.file(key).delete({ ignoreNotFound: true });
  }

  getUrl(key: string): string {
    return `https://storage.googleapis.com/${this.bucket.name}/${key}`;
  }
}

export default FirebaseStorageProvider;
