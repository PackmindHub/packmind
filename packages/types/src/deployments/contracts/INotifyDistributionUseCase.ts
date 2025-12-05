import { IUseCase, PackmindCommand } from '../../UseCase';
import { DistributionId } from '../DistributionId';

export type NotifyDistributionCommand = PackmindCommand & {
  distributedPackages: string[];
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
};

export type NotifyDistributionResponse = {
  deploymentId: DistributionId;
};

export type INotifyDistributionUseCase = IUseCase<
  NotifyDistributionCommand,
  NotifyDistributionResponse
>;
