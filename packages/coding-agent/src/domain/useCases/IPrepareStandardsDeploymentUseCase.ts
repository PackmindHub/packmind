import { StandardVersion } from '@packmind/standards';
import { GitRepo } from '@packmind/git';
import { FileUpdates } from '../entities/FileUpdates';
import { CodingAgent } from '../CodingAgents';

export type PrepareStandardsDeploymentCommand = {
  standardVersions: StandardVersion[];
  gitRepo: GitRepo;
  codingAgents: CodingAgent[];
};

export interface IPrepareStandardsDeploymentUseCase {
  execute(command: PrepareStandardsDeploymentCommand): Promise<FileUpdates>;
}
