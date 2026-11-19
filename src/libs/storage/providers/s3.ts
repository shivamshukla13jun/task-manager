import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import config from 'config/env';
import { AppError } from 'middlewares/error';
import type {
  IStorageProvider,
  UploadedFileResult,
  UploadOptions,
} from '../types';

class S3StorageProvider implements IStorageProvider {
  readonly name = 's3' as const;
  private client: S3Client;
  private bucket: string;

  constructor() {
    const missing = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_S3_BUCKET',
    ].filter((k) => !config[k as keyof typeof config]);
    if (missing.length) {
      throw new AppError(
        `Missing AWS S3 configuration: ${missing.join(', ')}`,
        500
      );
    }

    this.bucket = config.AWS_S3_BUCKET as string;
    this.client = new S3Client({
      region: config.AWS_REGION as string,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY as string,
      },
      ...(config.AWS_S3_ENDPOINT
        ? { endpoint: config.AWS_S3_ENDPOINT, forcePathStyle: true }
        : {}),
    });
  }

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions
  ): Promise<UploadedFileResult> {
    const folder = options?.folder ? options.folder.replace(/^\/+|\/+$/g, '') : '';
    const ext = path.extname(file.originalname);
    const key = folder ? `${folder}/${uuidv4()}${ext}` : `${uuidv4()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

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
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  getUrl(key: string): string {
    if (config.AWS_PUBLIC_URL) {
      return `${config.AWS_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
    }
    return `https://${this.bucket}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;
  }
}

export default S3StorageProvider;
