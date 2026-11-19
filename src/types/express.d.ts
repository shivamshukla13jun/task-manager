import type { ClientSession } from 'mongoose';
import type { StoredFileRef } from 'libs/storage/types';

declare global {
  namespace Express {
    interface Request {
      dbSession?: ClientSession;
      uploadedFiles?: StoredFileRef[];
      deleteOnCommit?: StoredFileRef[];
      filesCleaned?: boolean;
      _encryptionKey?: Buffer;
      _nonceChecked?: boolean;
    }
  }
}

export {};
