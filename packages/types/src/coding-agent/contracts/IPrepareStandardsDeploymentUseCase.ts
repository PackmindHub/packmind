import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardVersion } from '../../standards';
import { GitRepo } from '../../git';
import { FileUpdates } from '../../deployments';
import { Target } from '../../deployments';
import { CodingAgent } from './IPrepareRecipesDeploymentUseCase';

export type PrepareStandardsDeploymentCommand = PackmindCommand & {
  standardVersions: StandardVersion[];
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
};

export type PrepareStandardsDeploymentResponse = FileUpdates;

export type IPrepareStandardsDeploymentUseCase = IUseCase<
  PrepareStandardsDeploymentCommand,
  PrepareStandardsDeploymentResponse
>;
