import { Gateway, IPullContentUseCase } from '@packmind/types';
import { IOnboardingDraft } from '../types/OnboardingDraft';
import { ILinterGateway } from './ILinterGateway';
import { IMcpGateway } from './IMcpGateway';
import { ISpacesGateway } from './ISpacesGateway';
import { ISkillsGateway } from './ISkillsGateway';
import { ICommandsGateway } from './ICommandsGateway';
import { IStandardsGateway } from './IStandardsGateway';
import { IPackagesGateway } from './IPackagesGateway';

// Notify Distribution types
export type NotifyDistributionCommand = {
  distributedPackages: string[];
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
};

export type NotifyDistributionResult = {
  deploymentId: string;
};

export type NotifyDistributionGateway = (
  command: NotifyDistributionCommand,
) => Promise<NotifyDistributionResult>;

// Re-export standard types from IStandardsGateway for backward compatibility
export type {
  CreateStandardInSpaceCommand,
  CreateStandardInSpaceResult,
  RuleWithId,
  RuleExample,
  ListedStandard,
  ListStandardsResult,
} from './IStandardsGateway';

// Re-export command types from ICommandsGateway for backward compatibility
export type {
  CreateCommandCommand,
  CreateCommandResult,
  ListedCommand,
  ListCommandsResult,
} from './ICommandsGateway';

// Re-export package types from IPackagesGateway for backward compatibility
export type {
  CreatePackageCommand,
  CreatePackageResult,
} from './IPackagesGateway';

export interface IPackmindGateway {
  linter: ILinterGateway;
  mcp: IMcpGateway;
  spaces: ISpacesGateway;
  skills: ISkillsGateway;
  commands: ICommandsGateway;
  standards: IStandardsGateway;
  packages: IPackagesGateway;
  getPullData: Gateway<IPullContentUseCase>;
  notifyDistribution: NotifyDistributionGateway;

  // Onboarding baseline
  pushOnboardingBaseline(
    draft: IOnboardingDraft,
  ): Promise<{ success: boolean }>;
}
