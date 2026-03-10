import * as fs from 'fs/promises';
import * as path from 'path';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';
import { logWarningConsole } from '../utils/consoleLogger';

export class LockFileRepository implements ILockFileRepository {
  private readonly LOCK_FILENAME = 'packmind-lock.json';

  async read(baseDirectory: string): Promise<PackmindLockFile | null> {
    const lockFilePath = this.getLockFilePath(baseDirectory);

    try {
      const content = await fs.readFile(lockFilePath, 'utf-8');
      const parsed: unknown = JSON.parse(content);

      if (!this.isValidLockFile(parsed)) {
        logWarningConsole(`Malformed lock file: ${lockFilePath}`);
        return null;
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
    const content = JSON.stringify(lockFile, null, 2) + '\n';
    await fs.writeFile(lockFilePath, content, 'utf-8');
  }

  private isValidLockFile(data: unknown): data is PackmindLockFile {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    return (
      typeof obj.cliVersion === 'string' &&
      typeof obj.installedAt === 'string' &&
      Array.isArray(obj.packageSlugs) &&
      Array.isArray(obj.agents) &&
      typeof obj.artifacts === 'object' &&
      obj.artifacts !== null &&
      !Array.isArray(obj.artifacts)
    );
  }

  private getLockFilePath(baseDirectory: string): string {
    return path.join(baseDirectory, this.LOCK_FILENAME);
  }
}
