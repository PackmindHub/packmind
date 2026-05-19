import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';

export interface SpaceRenamedPayload {
  spaceId: SpaceId;
  spaceSlug: string;
  oldName: string;
  newName: string;
}

export class SpaceRenamedEvent extends UserEvent<SpaceRenamedPayload> {
  static override readonly eventName = 'spaces.space.renamed';
}
