import { ArtifactType } from '../../deployments/FileUpdates';
import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';

export type PlaybookArtefactMovedPayload = {
  artifactType: ArtifactType;
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
};

export class PlaybookArtefactMovedEvent extends UserEvent<PlaybookArtefactMovedPayload> {
  static override readonly eventName = 'spaces.artefact.moved';
}
