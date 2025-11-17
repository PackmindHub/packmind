import { GitRepo, StandardVersion, Target, FileUpdates } from '@packmind/types';
import { CodingAgent } from '../CodingAgents';

export type PrepareStandardsDeploymentCommand = {
  standardVersions: StandardVersion[];
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
};

export interface IPrepareStandardsDeploymentUseCase {
  execute(command: PrepareStandardsDeploymentCommand): Promise<FileUpdates>;
}
