import { v2 as cloudinary } from 'cloudinary';
import config from 'config/env';
import { AppError } from 'middlewares/error';
import type {
  IStorageProvider,
  UploadedFileResult,
  UploadOptions,
} from '../types';

class CloudinaryStorageProvider implements IStorageProvider {
  readonly name = 'cloudinary' as const;

  constructor() {
    const missing = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ].filter((k) => !config[k as keyof typeof config]);
    if (missing.length) {
      throw new AppError(
        `Missing Cloudinary configuration: ${missing.join(', ')}`,
        500
      );
    }

    cloudinary.config({
      cloud_name: config.CLOUDINARY_CLOUD_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
    });
  }

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions
  ): Promise<UploadedFileResult> {
    const folder = options?.folder || config.CLOUDINARY_FOLDER;

    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, res) => (error ? reject(error) : resolve(res))
      );
      stream.end(file.buffer);
    });

    return {
      key: result.public_id,
      url: result.secure_url,
      provider: this.name,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    };
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, { resource_type: 'image' }).catch(async () => {
      await cloudinary.uploader.destroy(key, { resource_type: 'raw' });
    });
  }

  getUrl(key: string): string {
    return cloudinary.url(key, { secure: true });
  }
}

export default CloudinaryStorageProvider;
