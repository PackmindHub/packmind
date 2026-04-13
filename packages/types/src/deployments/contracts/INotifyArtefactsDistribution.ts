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
  deploymentId: DistributionId;
};

export type INotifyArtefactsDistribution = IUseCase<
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse
>;
