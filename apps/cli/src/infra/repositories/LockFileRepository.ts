import * as fs from 'fs/promises';
import * as path from 'path';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';

export class LockFileRepository implements ILockFileRepository {
  private readonly LOCK_FILENAME = 'packmind-lock.json';

  async read(baseDirectory: string): Promise<PackmindLockFile | null> {
    const lockFilePath = this.getLockFilePath(baseDirectory);

    try {
      const content = await fs.readFile(lockFilePath, 'utf-8');
      return JSON.parse(content) as PackmindLockFile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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

  private getLockFilePath(baseDirectory: string): string {
    return path.join(baseDirectory, this.LOCK_FILENAME);
  }
}
