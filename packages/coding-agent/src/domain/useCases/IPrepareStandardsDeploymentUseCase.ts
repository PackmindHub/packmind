import {
  GitRepo,
  StandardVersion,
  Target,
  FileUpdates,
  CodingAgent,
} from '@packmind/types';

export type PrepareStandardsDeploymentCommand = {
  standardVersions: StandardVersion[];
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
};

export interface IPrepareStandardsDeploymentUseCase {
  execute(command: PrepareStandardsDeploymentCommand): Promise<FileUpdates>;
}
