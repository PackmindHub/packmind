import { PackmindLockFile } from './PackmindLockFile';

export interface ILockFileRepository {
  read(baseDirectory: string): Promise<PackmindLockFile | null>;
  write(baseDirectory: string, lockFile: PackmindLockFile): Promise<void>;
  delete(baseDirectory: string): Promise<void>;
}
