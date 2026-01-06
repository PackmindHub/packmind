import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { RecipeId } from '../RecipeId';

export interface CommandUpdatedPayload {
  id: RecipeId;
  spaceId: SpaceId;
  newVersion: number;
}

export class CommandUpdatedEvent extends UserEvent<CommandUpdatedPayload> {
  static override readonly eventName = 'recipes.recipe.updated';
}
