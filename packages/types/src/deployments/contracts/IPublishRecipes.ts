import { RecipesDeployment } from '../RecipesDeployment';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../TargetId';
import { GitRepoId } from '../../git/GitRepoId';
import { RecipeVersionId } from '../../recipes/RecipeVersion';

export type PublishRecipesCommand = PackmindCommand & {
  recipeVersionIds: RecipeVersionId[];
} & (
    | {
        gitRepoIds: GitRepoId[];
        targetIds?: never;
      }
    | {
        gitRepoIds?: never;
        targetIds: TargetId[];
      }
  );

export type IPublishRecipes = IUseCase<
  PublishRecipesCommand,
  RecipesDeployment[]
>;
