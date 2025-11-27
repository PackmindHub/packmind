import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { RecipeId } from '../RecipeId';

export interface RecipeUpdatedPayload {
  recipeId: RecipeId;
  spaceId: SpaceId;
  newVersion: number;
}

export class RecipeUpdatedEvent extends UserEvent<RecipeUpdatedPayload> {
  static override readonly eventName = 'recipes.recipe.updated';
}
