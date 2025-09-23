import { StandardVersion } from '@packmind/standards';
import { GitRepo } from '@packmind/git';
import { FileUpdates } from '../entities/FileUpdates';
import { CodingAgent } from '../CodingAgents';
import { Target } from '@packmind/shared';

export type PrepareStandardsDeploymentCommand = {
  standardVersions: StandardVersion[];
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
};

export interface IPrepareStandardsDeploymentUseCase {
  execute(command: PrepareStandardsDeploymentCommand): Promise<FileUpdates>;
}
