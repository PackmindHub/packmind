import { RecipeVersion } from '@packmind/recipes';
import { GitRepo } from '@packmind/git';
import { StandardVersion } from '@packmind/standards';
import { FileUpdates } from '../entities/FileUpdates';

export interface ICodingAgentDeployer {
  deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
  ): Promise<FileUpdates>;
  deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
  ): Promise<FileUpdates>;
}
