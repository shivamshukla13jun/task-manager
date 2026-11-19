import { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';
import File from 'models/file.model';
import { deleteStoredFiles, storageService } from 'libs/storage';

/**
 * Delete every file uploaded during this request — from the storage
 * provider AND from the File collection. Idempotent; safe to call from
 * both the transaction rollback and the global error handler.
 */
export const cleanupRequestFiles = async (req: Request): Promise<void> => {
  if (req.filesCleaned) return;
  req.filesCleaned = true;

  const files = req.uploadedFiles || [];
  if (!files.length) return;

  await deleteStoredFiles(files);
  req.uploadedFiles = [];
};

/**
 * Files pushed to `req.deleteOnCommit` are deleted only after the
 * transaction commits — e.g. an old avatar being replaced.
 */
const cleanupCommittedFiles = async (req: Request): Promise<void> => {
  const files = req.deleteOnCommit || [];
  if (!files.length) return;
  await deleteStoredFiles(files);
  req.deleteOnCommit = [];
};

/**
 * Mark an existing stored file for deletion after the current request's
 * transaction commits successfully.
 */
export const deleteFileOnCommit = (
  req: Request,
  ref: { key: string; provider: any; fileId?: any }
): void => {
  req.deleteOnCommit = req.deleteOnCommit || [];
  req.deleteOnCommit.push(ref);
};

/**
 * Wrap a request handler in a MongoDB session transaction.
 *
 * - `req.dbSession` is set so queries inside the handler can join the tx.
 * - On success: the transaction commits and `req.deleteOnCommit` files are removed.
 * - On error / abort / `next(err)`: the transaction rolls back and every
 *   file uploaded by the upload middleware is deleted from storage + DB.
 */
export const withTransaction = (handler: RequestHandler): RequestHandler => {
  return async (req, res, next) => {
    const session = await mongoose.startSession();
    req.dbSession = session;
    session.startTransaction();

    try {
      await new Promise<void>((resolve, reject) => {
        res.once('finish', () => resolve());
        res.once('close', () => {
          if (!res.writableFinished) {
            reject(new Error('Connection closed before response finished'));
          }
        });

        const wrappedNext = (err?: any) =>
          err ? reject(err) : resolve();

        Promise.resolve(handler(req, res, wrappedNext as any)).catch(reject);
      });

      await session.commitTransaction();
      await cleanupCommittedFiles(req);
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        // session may already be aborted
      }
      await cleanupRequestFiles(req);
      return next(error);
    } finally {
      session.endSession();
      req.dbSession = undefined;
    }
  };
};

export { storageService };
export default withTransaction;
