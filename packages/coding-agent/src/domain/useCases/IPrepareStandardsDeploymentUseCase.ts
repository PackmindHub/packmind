import { GitRepo, StandardVersion, Target } from '@packmind/types';
import { FileUpdates } from '../entities/FileUpdates';
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
