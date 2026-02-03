import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { StandardId } from '../StandardId';

/**
 * Method used to create a standard.
 * - 'blank': Created via form in web app
 * - 'sample': Created from a sample template
 * - 'mcp': Created via MCP tool
 * - 'cli': Created via CLI command
 */
export type StandardCreationMethod = 'blank' | 'sample' | 'mcp' | 'cli';

export interface StandardCreatedPayload {
  standardId: StandardId;
  spaceId: SpaceId;
  method?: StandardCreationMethod;
}

export class StandardCreatedEvent extends UserEvent<StandardCreatedPayload> {
  static override readonly eventName = 'standards.standard.created';
}
