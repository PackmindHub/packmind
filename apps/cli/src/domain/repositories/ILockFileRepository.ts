import { PackmindLockFile } from './PackmindLockFile';

export interface ILockFileRepository {
  read(baseDirectory: string): Promise<PackmindLockFile | null>;
  readAll(baseDirectory: string): Promise<PackmindLockFile[]>;
  write(baseDirectory: string, lockFile: PackmindLockFile): Promise<void>;
  delete(baseDirectory: string): Promise<void>;
}
