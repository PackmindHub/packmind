import * as fs from 'fs/promises';
import * as path from 'path';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import {
  PackmindLockFile,
  PackmindLockFileEntry,
} from '../../domain/repositories/PackmindLockFile';
import { logWarningConsole } from '../utils/consoleLogger';

export class LockFileRepository implements ILockFileRepository {
  private readonly LOCK_FILENAME = 'packmind-lock.json';
  private readonly CURRENT_LOCKFILE_VERSION = 2;

  async read(baseDirectory: string): Promise<PackmindLockFile | null> {
    const lockFilePath = this.getLockFilePath(baseDirectory);

    try {
      const content = await fs.readFile(lockFilePath, 'utf-8');
      const parsed: unknown = JSON.parse(content);

      if (!this.isValidLockFile(parsed)) {
        logWarningConsole(`Malformed lock file: ${lockFilePath}`);
        return null;
      }

      // Silently migrate v1 lockfiles to v2 in memory. The on-disk file is
      // NOT rewritten by `read` alone — the migrated form is only persisted
      // when a subsequent mutating command calls `write`.
      if (parsed.lockfileVersion === 1) {
        return this.migrateV1ToV2(parsed);
      }

      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      if (error instanceof SyntaxError) {
        logWarningConsole(`Malformed lock file: ${lockFilePath}`);
        return null;
      }
      throw error;
    }
  }

  async write(
    baseDirectory: string,
    lockFile: PackmindLockFile,
  ): Promise<void> {
    const lockFilePath = this.getLockFilePath(baseDirectory);
    const serialized = JSON.stringify(lockFile, null, 2) + '\n';
    await fs.writeFile(lockFilePath, serialized, 'utf-8');
  }

  private isValidLockFile(data: unknown): data is PackmindLockFile {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    const lockfileVersionValid =
      obj.lockfileVersion === 1 || obj.lockfileVersion === 2;

    return (
      lockfileVersionValid &&
      Array.isArray(obj.packageSlugs) &&
      Array.isArray(obj.agents) &&
      (obj.targetId === undefined || typeof obj.targetId === 'string') &&
      (obj.cliVersion === undefined || typeof obj.cliVersion === 'string') &&
      typeof obj.artifacts === 'object' &&
      obj.artifacts !== null &&
      !Array.isArray(obj.artifacts)
    );
  }

  /**
   * Migrate a v1 lockfile to v2 in memory.
   *
   * v1 entries had no `source` field and used `${type}:${slug}` map keys.
   * v2 requires `source: 'default' | 'user'` on every entry and uses
   * `${source}:${type}:${slug}` keys. Because pre-spec lockfiles could only
   * have been produced by the user/package flow (default skills were never
   * tracked before v2), every existing entry is tagged `source: 'user'` and
   * re-keyed under the `user:` prefix.
   *
   * The migration is silent: no log, no on-disk rewrite. Subsequent
   * `write` calls persist the migrated form.
   */
  private migrateV1ToV2(lockFile: PackmindLockFile): PackmindLockFile {
    const migratedArtifacts: Record<string, PackmindLockFileEntry> = {};

    for (const [oldKey, entry] of Object.entries(lockFile.artifacts)) {
      const migratedEntry: PackmindLockFileEntry = {
        ...entry,
        source: 'user',
      };
      const newKey = `user:${oldKey}`;
      migratedArtifacts[newKey] = migratedEntry;
    }

    return {
      ...lockFile,
      lockfileVersion: this.CURRENT_LOCKFILE_VERSION,
      artifacts: migratedArtifacts,
    };
  }

  private getLockFilePath(baseDirectory: string): string {
    return path.join(baseDirectory, this.LOCK_FILENAME);
  }
}
