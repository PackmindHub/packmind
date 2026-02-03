import { IOnboardingDraft } from '../types/OnboardingDraft';
import { ILinterGateway } from './ILinterGateway';
import { IMcpGateway } from './IMcpGateway';
import { ISpacesGateway } from './ISpacesGateway';
import { ISkillsGateway } from './ISkillsGateway';
import { ICommandsGateway } from './ICommandsGateway';
import { IStandardsGateway } from './IStandardsGateway';
import { IPackagesGateway } from './IPackagesGateway';
import { IDeploymentGateway } from './IDeploymentGateway';

// Re-export deployment types for backward compatibility
export type {
  NotifyDistributionCommand,
  NotifyDistributionResult,
  NotifyDistributionGateway,
} from './IDeploymentGateway';

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
  deployment: IDeploymentGateway;

  // Onboarding baseline
  pushOnboardingBaseline(
    draft: IOnboardingDraft,
  ): Promise<{ success: boolean }>;
}
