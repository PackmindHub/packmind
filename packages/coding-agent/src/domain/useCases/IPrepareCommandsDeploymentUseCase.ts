import {
  GitRepo,
  CommandVersion,
  Target,
  FileUpdates,
  CodingAgent,
} from '@packmind/types';

export type PrepareCommandsDeploymentCommand = {
  recipeVersions: CommandVersion[];
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
};

export interface IPrepareCommandsDeploymentUseCase {
  execute(command: PrepareCommandsDeploymentCommand): Promise<FileUpdates>;
}
