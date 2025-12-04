import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { RecipeId } from '../RecipeId';

export interface RecipeDeletedPayload {
  recipeId: RecipeId;
  spaceId: SpaceId;
}

export class RecipeDeletedEvent extends UserEvent<RecipeDeletedPayload> {
  static override readonly eventName = 'recipes.recipe.deleted';
}
