import { Gateway, PublicGateway, IPullContentUseCase } from '@packmind/types';
import { IListPackagesUseCase } from '../useCases/IListPackagesUseCase';
import { IGetPackageSummaryUseCase } from '../useCases/IGetPackageSummaryUseCase';
import { IOnboardingDraft } from '../types/OnboardingDraft';
import { ILinterGateway } from './ILinterGateway';
import { IMcpGateway } from './IMcpGateway';
import { ISpacesGateway } from './ISpacesGateway';
import { ISkillsGateway } from './ISkillsGateway';

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

// Standard creation types (atomic)
export type CreateStandardInSpaceCommand = {
  name: string;
  description: string;
  scope: string;
  rules: Array<{
    content: string;
    examples?: {
      language: string;
      positive: string;
      negative: string;
    };
  }>;
};

export type CreateStandardInSpaceResult = {
  id: string;
  name: string;
};

export type RuleWithId = {
  id: string;
  content: string;
};

export type RuleExample = {
  language: string;
  positive: string;
  negative: string;
};

// Create command types
export type CreateCommandCommand = {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: Array<{ name: string; description: string; codeSnippet?: string }>;
};

export type CreateCommandResult = {
  id: string;
  name: string;
  slug: string;
};

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

// List Standards types
export type ListedStandard = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type ListStandardsResult = ListedStandard[];

// List Commands types
export type ListedCommand = {
  id: string;
  slug: string;
  name: string;
};

export type ListCommandsResult = ListedCommand[];

export interface IPackmindGateway {
  linter: ILinterGateway;
  mcp: IMcpGateway;
  spaces: ISpacesGateway;
  skills: ISkillsGateway;
  getPullData: Gateway<IPullContentUseCase>;
  listPackages: PublicGateway<IListPackagesUseCase>;
  getPackageSummary: PublicGateway<IGetPackageSummaryUseCase>;
  notifyDistribution: NotifyDistributionGateway;

  // Atomic gateways for standard creation
  createStandardInSpace(
    spaceId: string,
    data: CreateStandardInSpaceCommand,
  ): Promise<CreateStandardInSpaceResult>;

  getRulesForStandard(
    spaceId: string,
    standardId: string,
  ): Promise<RuleWithId[]>;

  addExampleToRule(
    spaceId: string,
    standardId: string,
    ruleId: string,
    example: RuleExample,
  ): Promise<void>;

  // Atomic gateway for command creation
  createCommand(
    spaceId: string,
    data: CreateCommandCommand,
  ): Promise<CreateCommandResult>;

  // Atomic gateway for package creation
  createPackage(
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult>;

  // Onboarding baseline
  pushOnboardingBaseline(
    draft: IOnboardingDraft,
  ): Promise<{ success: boolean }>;

  // List methods
  listStandards(): Promise<ListStandardsResult>;
  listCommands(): Promise<ListCommandsResult>;
}
