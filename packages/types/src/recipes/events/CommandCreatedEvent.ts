import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { RecipeId } from '../RecipeId';

export interface CommandCreatedPayload {
  id: RecipeId;
  spaceId: SpaceId;
}

export class CommandCreatedEvent extends UserEvent<CommandCreatedPayload> {
  static override readonly eventName = 'recipes.recipe.created';
}
