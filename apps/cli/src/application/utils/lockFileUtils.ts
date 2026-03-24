import { normalizePath } from './pathUtils';
import {
  PackmindLockFileEntry,
  PackmindLockFileFile,
} from '../../domain/repositories/PackmindLockFile';

export function findLockFileEntryForPath(
  normalizedFilePath: string,
  artifacts: Record<string, PackmindLockFileEntry>,
): PackmindLockFileEntry | undefined {
  const result = findLockFileEntryAndFileForPath(normalizedFilePath, artifacts);
  return result?.entry;
}

export function findLockFileEntryAndFileForPath(
  normalizedFilePath: string,
  artifacts: Record<string, PackmindLockFileEntry>,
): { entry: PackmindLockFileEntry; file: PackmindLockFileFile } | undefined {
  const normalized = normalizePath(normalizedFilePath);
  for (const entry of Object.values(artifacts)) {
    for (const file of entry.files) {
      const normalizedFile = normalizePath(file.path);
      if (normalizedFile === normalized) {
        return { entry, file };
      }
      if (
        entry.type === 'skill' &&
        normalizedFile.startsWith(normalized + '/')
      ) {
        return { entry, file };
      }
    }
  }
  return undefined;
}
