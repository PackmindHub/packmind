import { RecipeVersion } from '@packmind/recipes';
import { GitRepo } from '@packmind/git';
import { FileUpdates } from '../entities/FileUpdates';
import { CodingAgent } from '../CodingAgents';

export type PrepareRecipesDeploymentCommand = {
  recipeVersions: RecipeVersion[];
  gitRepo: GitRepo;
  codingAgents: CodingAgent[];
};

export interface IPrepareRecipesDeploymentUseCase {
  execute(command: PrepareRecipesDeploymentCommand): Promise<FileUpdates>;
}
