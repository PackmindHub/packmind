import { IUseCase, PackmindCommand } from '../../UseCase';
import { DistributionId } from '../DistributionId';
import {
  LockFileSyncStatus,
  LockFileSyncWarning,
  PackmindLockFile,
} from '../PackmindLockFile';

export type NotifyArtefactsDistributionCommand = PackmindCommand & {
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
  packmindLockFile: PackmindLockFile;
  packageVersions?: Record<string, string>;
};

export type NotifyArtefactsDistributionResponse = {
  deploymentId: DistributionId | null;
  status: Exclude<LockFileSyncStatus, 'ignored'>;
  warnings: LockFileSyncWarning[];
};

export type INotifyArtefactsDistribution = IUseCase<
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse
>;
