import { RecipesDeployment } from '../RecipesDeployment';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitRepoId } from '../../git';
import { RecipeVersionId } from '../../recipes';

export type PublishRecipesCommand = PackmindCommand & {
  gitRepoIds: GitRepoId[];
  recipeVersionIds: RecipeVersionId[];
};

export type IPublishRecipes = IUseCase<
  PublishRecipesCommand,
  RecipesDeployment[]
>;
