import { UserEvent } from '../../events';
import { RecipeId } from '../../recipes';
import { SkillId } from '../../skills';
import { SpaceId } from '../../spaces';
import { StandardId } from '../../standards';

export interface PlaybookArtefactMovedPayload {
  artifactId: StandardId | SkillId | RecipeId;
  artifactType: 'standard' | 'skill' | 'command';
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
}

export class PlaybookArtefactMovedEvent extends UserEvent<PlaybookArtefactMovedPayload> {
  static override readonly eventName = 'spaces.artefact.moved';
}
