import { CodingAgent } from '../../coding-agent/CodingAgent';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { DistributionId } from '../DistributionId';

export type NotifyDistributionCommand = PackmindCommand & {
  distributedPackages: string[];
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
  agents?: CodingAgent[];
};

export type NotifyDistributionResponse = {
  // null when the distribution was not recorded because no provider/repo has
  // been set up for the remote (repos are created up front, not on notify).
  deploymentId: DistributionId | null;
};

export type INotifyDistributionUseCase = IUseCase<
  NotifyDistributionCommand,
  NotifyDistributionResponse
>;
