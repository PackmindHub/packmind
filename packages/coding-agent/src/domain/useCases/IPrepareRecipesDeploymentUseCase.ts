import { GitRepo, RecipeVersion, Target, FileUpdates } from '@packmind/types';
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
