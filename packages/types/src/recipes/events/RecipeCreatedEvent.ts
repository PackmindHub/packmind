import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { RecipeId } from '../RecipeId';

export interface RecipeCreatedPayload {
  recipeId: RecipeId;
  spaceId: SpaceId;
}

export class RecipeCreatedEvent extends UserEvent<RecipeCreatedPayload> {
  static override readonly eventName = 'recipes.recipe.created';
}
