import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { ArtifactReference } from '../ArtifactReference';

export type PlaybookArtefactMovedPayload = ArtifactReference & {
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
};

export class PlaybookArtefactMovedEvent extends UserEvent<PlaybookArtefactMovedPayload> {
  static override readonly eventName = 'spaces.artefact.moved';
}
