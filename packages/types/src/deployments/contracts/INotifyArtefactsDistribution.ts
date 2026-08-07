import { IUseCase, PackmindCommand } from '../../UseCase';
import { DistributionId } from '../DistributionId';
import { PackmindLockFile } from '../PackmindLockFile';

export type NotifyArtefactsDistributionCommand = PackmindCommand & {
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
  packmindLockFile: PackmindLockFile;
};

export type NotifyArtefactsDistributionResponse = {
  // null when the distribution was not recorded because no provider/repo has
  // been set up for the remote (repos are created up front, not on notify).
  deploymentId: DistributionId | null;
};

export type INotifyArtefactsDistribution = IUseCase<
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse
>;
