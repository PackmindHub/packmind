import { GitRepo, RecipeVersion, Target } from '@packmind/types';
import { FileUpdates } from '../entities/FileUpdates';
import { CodingAgent } from '../CodingAgents';

export type PrepareRecipesDeploymentCommand = {
  recipeVersions: RecipeVersion[];
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
};

export interface IPrepareRecipesDeploymentUseCase {
  execute(command: PrepareRecipesDeploymentCommand): Promise<FileUpdates>;
}
