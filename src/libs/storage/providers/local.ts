import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from 'config/env';
import { ensureDirectoryExists } from 'libs';
import { AppError } from 'middlewares/error';
import type {
  IStorageProvider,
  UploadedFileResult,
  UploadOptions,
} from '../types';

class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local' as const;
  private baseDir: string;

  constructor() {
    if (!config.UPLOAD_BASE_DIR) {
      throw new AppError('UPLOAD_BASE_DIR is required for local storage', 500);
    }
    this.baseDir = path.resolve(process.cwd(), config.UPLOAD_BASE_DIR);
    ensureDirectoryExists(this.baseDir);
  }

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions
  ): Promise<UploadedFileResult> {
    const folder = options?.folder ? options.folder.replace(/^\/+|\/+$/g, '') : '';
    const dir = folder ? path.join(this.baseDir, folder) : this.baseDir;
    ensureDirectoryExists(dir);

    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const key = folder ? `${folder}/${filename}` : filename;

    await fs.promises.writeFile(path.join(this.baseDir, key), file.buffer);

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
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  getUrl(key: string): string {
    return `${config.BASE_URL}/uploads/${key.split(path.sep).join('/')}`;
  }
}

export default LocalStorageProvider;
