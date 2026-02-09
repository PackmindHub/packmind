import {
  GitRepo,
  RecipeVersion,
  Target,
  FileUpdates,
  CodingAgent,
} from '@packmind/types';

export type PrepareRecipesDeploymentCommand = {
  recipeVersions: RecipeVersion[];
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
};

export interface IPrepareRecipesDeploymentUseCase {
  execute(command: PrepareRecipesDeploymentCommand): Promise<FileUpdates>;
}
