import {
  GitRepo,
  RecipeVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { FileUpdates } from '../entities/FileUpdates';

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
