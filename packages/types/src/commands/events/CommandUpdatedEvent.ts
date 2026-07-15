import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { CommandId } from '../CommandId';

export interface CommandUpdatedPayload {
  id: CommandId;
  spaceId: SpaceId;
  newVersion: number;
}

export class CommandUpdatedEvent extends UserEvent<CommandUpdatedPayload> {
  static override readonly eventName = 'recipes.recipe.updated';
}
