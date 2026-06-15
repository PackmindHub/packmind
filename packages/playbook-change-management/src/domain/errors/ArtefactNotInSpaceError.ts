import { RecipeId, SkillId, SpaceId, StandardId } from '@packmind/types';

export class ArtefactNotInSpaceError extends Error {
  constructor(artefactId: StandardId | RecipeId | SkillId, spaceId: SpaceId) {
    super(`Artefact ${artefactId} does not belong to space ${spaceId}`);
    this.name = 'ArtefactNotInSpaceError';
  }
}
