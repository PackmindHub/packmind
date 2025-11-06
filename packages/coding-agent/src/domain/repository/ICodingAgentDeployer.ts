import { RecipeVersion } from '@packmind/recipes';
import { GitRepo } from '@packmind/git';
import { StandardVersion } from '@packmind/standards';
import { FileUpdates } from '../entities/FileUpdates';
import { Target } from '@packmind/shared';

export interface ICodingAgentDeployer {
  deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates>;
  deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates>;
  generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates>;
  generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates>;
}
