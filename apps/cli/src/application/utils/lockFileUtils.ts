import { normalizePath } from './pathUtils';
import { PackmindLockFileEntry } from '../../domain/repositories/PackmindLockFile';

export function findLockFileEntryForPath(
  normalizedFilePath: string,
  artifacts: Record<string, PackmindLockFileEntry>,
): PackmindLockFileEntry | undefined {
  const normalized = normalizePath(normalizedFilePath);
  for (const entry of Object.values(artifacts)) {
    for (const file of entry.files) {
      const normalizedFile = normalizePath(file.path);
      if (normalizedFile === normalized) {
        return entry;
      }
      if (
        entry.type === 'skill' &&
        normalizedFile.startsWith(normalized + '/')
      ) {
        return entry;
      }
    }
  }
  return undefined;
}
