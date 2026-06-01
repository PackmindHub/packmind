import { RecipeId, SkillId, StandardId } from '@packmind/types';

export class ArtefactNotFoundError extends Error {
  constructor(artefactId: StandardId | RecipeId | SkillId) {
    super(`Artefact ${artefactId} not found`);
    this.name = 'ArtefactNotFoundError';
  }
}
