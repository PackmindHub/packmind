import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeVersionId } from '../../recipes/RecipeVersion';
import { TargetId } from '../TargetId';
import { Distribution } from '../Distribution';

export type PublishRecipesCommand = PackmindCommand & {
  recipeVersionIds: RecipeVersionId[];
  targetIds: TargetId[];
};

export type IPublishRecipes = IUseCase<PublishRecipesCommand, Distribution[]>;
