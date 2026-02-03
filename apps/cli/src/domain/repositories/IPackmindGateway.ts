import { Gateway, PublicGateway, IPullContentUseCase } from '@packmind/types';
import { IListPackagesUseCase } from '../useCases/IListPackagesUseCase';
import { IGetPackageSummaryUseCase } from '../useCases/IGetPackageSummaryUseCase';
import { IOnboardingDraft } from '../types/OnboardingDraft';
import { ILinterGateway } from './ILinterGateway';
import { IMcpGateway } from './IMcpGateway';
import { ISpacesGateway } from './ISpacesGateway';
import { ISkillsGateway } from './ISkillsGateway';
import { ICommandsGateway } from './ICommandsGateway';
import { IStandardsGateway } from './IStandardsGateway';

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

// Create package types
export type CreatePackageCommand = {
  name: string;
  description?: string;
};

export type CreatePackageResult = {
  id: string;
  name: string;
  slug: string;
};

export interface IPackmindGateway {
  linter: ILinterGateway;
  mcp: IMcpGateway;
  spaces: ISpacesGateway;
  skills: ISkillsGateway;
  commands: ICommandsGateway;
  standards: IStandardsGateway;
  getPullData: Gateway<IPullContentUseCase>;
  listPackages: PublicGateway<IListPackagesUseCase>;
  getPackageSummary: PublicGateway<IGetPackageSummaryUseCase>;
  notifyDistribution: NotifyDistributionGateway;

  // Atomic gateway for package creation
  createPackage(
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult>;

  // Onboarding baseline
  pushOnboardingBaseline(
    draft: IOnboardingDraft,
  ): Promise<{ success: boolean }>;
}
