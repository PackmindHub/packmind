import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitRepoId } from '../../git/GitRepoId';
import { TargetId } from '../TargetId';
import { LockFileSyncStatus, LockFileSyncWarning } from '../PackmindLockFile';

export type LockFileTargetSyncResult = {
  targetId: TargetId;
  path: string;
  status: LockFileSyncStatus;
  warnings: LockFileSyncWarning[];
};

export type SyncDistributionsFromLockFilesCommand = PackmindCommand & {
  gitRepoId: GitRepoId;
  targetPaths?: string[];
};

export type SyncDistributionsFromLockFilesResponse = {
  targets: LockFileTargetSyncResult[];
};

export type ISyncDistributionsFromLockFilesUseCase = IUseCase<
  SyncDistributionsFromLockFilesCommand,
  SyncDistributionsFromLockFilesResponse
>;
