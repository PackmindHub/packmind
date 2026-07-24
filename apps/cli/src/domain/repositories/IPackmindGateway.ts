import { IChangeProposalGateway } from './IChangeProposalGateway';
import { ILinterGateway } from './ILinterGateway';
import { ISpacesGateway } from './ISpacesGateway';
import { ISkillsGateway } from './ISkillsGateway';
import { ICommandsGateway } from './ICommandsGateway';
import { IStandardsGateway } from './IStandardsGateway';
import { IPackagesGateway } from './IPackagesGateway';
import { IDeploymentGateway } from './IDeploymentGateway';
import { IOrganizationGateway } from './IOrganizationGateway';
import { IRepositoryTrackingGateway } from './IRepositoryTrackingGateway';
import { IGitGateway } from './IGitGateway';

// Re-export standard types from IStandardsGateway for backward compatibility
export type {
  CreateStandardInSpaceCommand,
  CreateStandardInSpaceResult,
  RuleWithId,
  RuleExample,
  ListedStandard,
  ListStandardsResult,
} from './IStandardsGateway';

export interface IPackmindGateway {
  readonly changeProposals: IChangeProposalGateway;
  readonly linter: ILinterGateway;
  readonly spaces: ISpacesGateway;
  readonly skills: ISkillsGateway;
  readonly commands: ICommandsGateway;
  readonly standards: IStandardsGateway;
  readonly packages: IPackagesGateway;
  readonly deployment: IDeploymentGateway;
  readonly organization: IOrganizationGateway;
  readonly repositoryTracking: IRepositoryTrackingGateway;
  readonly git: IGitGateway;
}
