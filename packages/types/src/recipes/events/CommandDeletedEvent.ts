import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { RecipeId } from '../RecipeId';

export interface CommandDeletedPayload {
  id: RecipeId;
  spaceId: SpaceId;
}

export class CommandDeletedEvent extends UserEvent<CommandDeletedPayload> {
  static override readonly eventName = 'recipes.recipe.deleted';
}
