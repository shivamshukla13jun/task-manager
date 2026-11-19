import config from 'config/env';
import { AppError } from 'middlewares/error';
import type {
  IStorageProvider,
  StorageProviderName,
  StoredFileRef,
  UploadedFileResult,
  UploadOptions,
} from './types';

class StorageService {
  private providers = new Map<StorageProviderName, IStorageProvider>();

  /**
   * Returns the active provider (or a named one) — instantiated lazily so
   * SDKs for unused providers are never loaded.
   */
  getProvider(name?: StorageProviderName): IStorageProvider {
    const providerName = name || config.STORAGE_PROVIDER;
    let provider = this.providers.get(providerName);
    if (!provider) {
      provider = this.createProvider(providerName);
      this.providers.set(providerName, provider);
    }
    return provider;
  }

  private createProvider(name: StorageProviderName): IStorageProvider {
    try {
      switch (name) {
        case 'local': {
          const { default: LocalStorageProvider } = require('./providers/local');
          return new LocalStorageProvider();
        }
        case 's3': {
          const { default: S3StorageProvider } = require('./providers/s3');
          return new S3StorageProvider();
        }
        case 'cloudinary': {
          const {
            default: CloudinaryStorageProvider,
          } = require('./providers/cloudinary');
          return new CloudinaryStorageProvider();
        }
        case 'firebase': {
          const {
            default: FirebaseStorageProvider,
          } = require('./providers/firebase');
          return new FirebaseStorageProvider();
        }
        default:
          throw new AppError(`Unsupported storage provider: ${name}`, 500);
      }
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      if (error?.code === 'MODULE_NOT_FOUND') {
        throw new AppError(
          `Storage provider "${name}" requires an npm package that is not installed: ${error.message}`,
          500
        );
      }
      throw error;
    }
  }

  upload(
    file: Express.Multer.File,
    options?: UploadOptions
  ): Promise<UploadedFileResult> {
    return this.getProvider().upload(file, options);
  }

  /**
   * Delete an object. Accepts either a bare key (deleted from the active
   * provider) or a StoredFileRef that carries its own provider.
   */
  async delete(ref: StoredFileRef | string): Promise<void> {
    const fileRef: StoredFileRef =
      typeof ref === 'string'
        ? { key: ref, provider: config.STORAGE_PROVIDER }
        : ref;
    return this.getProvider(fileRef.provider).delete(fileRef.key);
  }

  getUrl(key: string, provider?: StorageProviderName): string {
    return this.getProvider(provider).getUrl(key);
  }
}

const storageService = new StorageService();
export default storageService;
