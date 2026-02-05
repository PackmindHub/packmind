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
  deploymentId: DistributionId;
};

export type INotifyDistributionUseCase = IUseCase<
  NotifyDistributionCommand,
  NotifyDistributionResponse
>;
