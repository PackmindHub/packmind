import { RecipesDeployment } from '../RecipesDeployment';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../Target';
import { GitRepoId } from '../../git';
import { RecipeVersionId } from '../../recipes';

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
