import { PackmindLockFile } from './PackmindLockFile';

export interface ILockFileRepository {
  read(baseDirectory: string): Promise<PackmindLockFile | null>;
}
