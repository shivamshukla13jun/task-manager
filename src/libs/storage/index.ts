import File from 'models/file.model';
import storageService from './storage.service';
import type { StoredFileRef } from './types';

export * from './types';
export { storageService };
export default storageService;

/**
 * Delete a previously stored file: removes the object from the
 * provider that stored it and the matching File document.
 */
export const deleteStoredFile = async (ref: StoredFileRef): Promise<void> => {
  await storageService.delete(ref);
  if (ref.fileId) {
    await File.deleteOne({ _id: ref.fileId });
  }
};

/**
 * Best-effort bulk delete used for rollback. Never throws —
 * individual failures are logged so the rest still get cleaned up.
 */
export const deleteStoredFiles = async (
  refs: StoredFileRef[]
): Promise<void> => {
  const results = await Promise.allSettled(refs.map(deleteStoredFile));
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(
        `Failed to delete stored file ${refs[i].key}:`,
        result.reason
      );
    }
  });
};
