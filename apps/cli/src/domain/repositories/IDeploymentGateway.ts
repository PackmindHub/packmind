import { Gateway, IPullContentUseCase } from '@packmind/types';

// Notify Distribution types
export type NotifyDistributionCommand = {
  distributedPackages: string[];
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
  agents?: string[];
};

export type NotifyDistributionResult = {
  deploymentId: string;
};

export type NotifyDistributionGateway = (
  command: NotifyDistributionCommand,
) => Promise<NotifyDistributionResult>;

export interface IDeploymentGateway {
  pull: Gateway<IPullContentUseCase>;
  notifyDistribution: NotifyDistributionGateway;
}
