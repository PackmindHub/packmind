import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { CommandId } from '../CommandId';

export interface CommandCreatedPayload {
  id: CommandId;
  spaceId: SpaceId;
  directUpdate?: boolean;
}

export class CommandCreatedEvent extends UserEvent<CommandCreatedPayload> {
  static override readonly eventName = 'recipes.recipe.created';
}
