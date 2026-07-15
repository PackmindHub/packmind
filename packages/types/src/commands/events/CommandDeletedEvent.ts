import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { CommandId } from '../CommandId';

export interface CommandDeletedPayload {
  id: CommandId;
  spaceId: SpaceId;
}

export class CommandDeletedEvent extends UserEvent<CommandDeletedPayload> {
  static override readonly eventName = 'recipes.recipe.deleted';
}
